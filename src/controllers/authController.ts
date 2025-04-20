import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User, { IUser } from '#models/userModel';
import { sendEmail } from '#emails/sendEmail';
import { resetPasswordEmailTemplate } from '#emails/templates/resetPasswordEmail';
import { verificationEmailTemplate } from '#emails/templates/verificationEmail';
import {
  sendSuccess,
  sendBadRequest,
  sendNotFound,
  sendUnauthorized,
  sendCreated,
  sendServerError,
} from '#src/utils/apiResponse';

// Generate JWT
const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: '30d',
  });
};

/**
 * @desc    Register user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const language = (req.query.lang as string) || 'en';
    const { name, email, password, gender, phoneNumber, age, address } = req.body;

    // Check if user exists and if verified
    const existingUser = await User.findOne({ email });

    // if (existingUser) {
    //   // Nếu đã tồn tại và đã xác thực => không cho đăng ký
    //   if (existingUser.isEmailVerified) {
    //     sendBadRequest(res, 'auth.emailExists', null, language);
    //     return;
    //   }

    //   // Nếu đã tồn tại nhưng chưa xác thực => cho phép ghi đè
    //   // Cập nhật thông tin
    //   existingUser.name = name;
    //   existingUser.password = password;
    //   existingUser.gender = gender;
    //   existingUser.phoneNumber = phoneNumber;
    //   existingUser.age = age;
    //   existingUser.address = address;

    //   // Tạo token xác thực mới
    //   const verificationToken = existingUser.getEmailVerificationToken();
    //   await existingUser.save();

    //   // Tạo verification link
    //   const verificationLink = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    //   // Gửi email xác thực
    //   await sendEmail(email, 'Xác thực tài khoản của bạn', verificationEmailTemplate, {
    //     username: name,
    //     verificationLink,
    //   });

    //   // Set timeout để xóa user nếu không xác thực sau 10 phút
    //   setTimeout(
    //     async () => {
    //       const user = await User.findOne({
    //         email,
    //         isEmailVerified: false,
    //         emailVerificationExpire: { $lt: Date.now() },
    //       });

    //       if (user) {
    //         await User.deleteOne({ _id: user._id });
    //         console.log(`User ${email} deleted due to verification timeout`);
    //       }
    //     },
    //     parseInt(process.env.EMAIL_VERIFICATION_EXPIRATION || '600000')
    //   );

    //   sendCreated(
    //     res,
    //     'auth.verificationEmailSent',
    //     {
    //       _id: existingUser._id,
    //       name: existingUser.name,
    //       email: existingUser.email,
    //     },
    //     language
    //   );
    //   return;
    // }

    // Create new user
    const newUser = await User.create({
      name,
      email,
      password,
      gender,
      phoneNumber,
      age,
      address,
      isEmailVerified: false,
    });

    // Generate verification token
    const verificationToken = newUser.getEmailVerificationToken();
    await newUser.save();

    // Tạo verification link
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    // Gửi email xác thực
    await sendEmail(email, 'Xác thực tài khoản của bạn', verificationEmailTemplate, {
      username: name,
      verificationLink,
    });

    // Set timeout để xóa user nếu không xác thực sau 10 phút
    setTimeout(
      async () => {
        const user = await User.findOne({
          email,
          isEmailVerified: false,
          emailVerificationExpire: { $lt: Date.now() },
        });

        if (user) {
          await User.deleteOne({ _id: user._id });
          console.log(`User ${email} deleted due to verification timeout`);
        }
      },
      parseInt(process.env.EMAIL_VERIFICATION_EXPIRATION || '600000')
    );

    sendCreated(
      res,
      'auth.verificationEmailSent',
      {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },
      language
    );
  } catch (error) {
    next(error);
    // console.log('Error code: ', error?.statusCode);
    // console.error('Register error:', error);

    // sendServerError(
    //   res,
    //   'common.serverError',
    //   error instanceof Error ? { message: error.message } : null,
    //   (req.query.lang as string) || 'en'
    // );
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const language = (req.query.lang as string) || 'en';
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email });

    if (!user) {
      sendUnauthorized(res, 'auth.invalidCredentials', null, language);
      return;
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      sendUnauthorized(res, 'auth.emailNotVerified', null, language);
      return;
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      sendUnauthorized(res, 'auth.invalidCredentials', null, language);
      return;
    }

    // Đăng nhập thành công
    sendSuccess(
      res,
      'auth.loginSuccess',
      {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        gender: user.gender,
        phoneNumber: user.phoneNumber,
        age: user.age,
        address: user.address,
        token: generateToken(user._id.toHexString()),
      },
      language
    );
  } catch (error) {
    console.error('Login error:', error);
    sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      (req.query.lang as string) || 'en'
    );
  }
};

/**
 * @desc    Verify email
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const language = (req.query.lang as string) || 'en';
    const { token } = req.params;

    // Hash token
    // const emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user by token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpire: { $gt: Date.now() },
    });

    if (!user) {
      sendBadRequest(res, 'auth.invalidToken', null, language);
      return;
    }

    // Update user
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    sendSuccess(
      res,
      'auth.emailVerified',
      {
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id.toHexString()),
      },
      language
    );
  } catch (error) {
    console.error('Email verification error:', error);
    sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      (req.query.lang as string) || 'en'
    );
  }
};

/**
 * @desc    Resend verification email
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
export const resendVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const language = (req.query.lang as string) || 'en';
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      sendNotFound(res, 'auth.userNotFound', null, language);
      return;
    }

    // Check if already verified
    if (user.isEmailVerified) {
      sendBadRequest(res, 'auth.alreadyVerified', null, language);
      return;
    }

    // Generate new verification token
    const verificationToken = user.getEmailVerificationToken();
    await user.save();

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    // Send verification email
    // await sendVerificationEmail(email, user.name, verificationToken);
    await sendEmail(email, 'Xác thực tài khoản của bạn', verificationEmailTemplate, {
      username: user.name,
      verificationLink,
    });

    // Set timeout để xóa user nếu không xác thực sau 10 phút
    setTimeout(
      async () => {
        const updatedUser = await User.findOne({
          email,
          isEmailVerified: false,
          emailVerificationExpire: { $lt: Date.now() },
        });

        if (updatedUser) {
          await User.deleteOne({ _id: updatedUser._id });
          console.log(`User ${email} deleted due to verification timeout`);
        }
      },
      parseInt(process.env.EMAIL_VERIFICATION_EXPIRATION || '600000')
    );

    sendSuccess(res, 'auth.verificationEmailResent', null, language);
  } catch (error) {
    console.error('Resend verification error:', error);
    sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      (req.query.lang as string) || 'en'
    );
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id).select('-password');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const lang = req.language || res.locals.language || (req.query.lang as string) || 'en';
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      sendNotFound(res, 'auth.userNotFound', null, lang);
      return;
    }

    // Generate reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
    const message = `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;
    try {
      await sendEmail(email, 'Reset Your Password', resetPasswordEmailTemplate, {
        username: user.name || '',
        resetLink: resetUrl,
      });
      sendSuccess(res, 'auth.emailSent', null, lang);
    } catch (error) {
      sendServerError(res, 'auth.emailNotSent', error, lang);
    }
  } catch (error) {
    console.error('Error in forgotPassword:', error);
    sendServerError(res, 'common.serverError', error, lang);
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const lang = req.language || res.locals.language || (req.query.lang as string) || 'en';
  try {
    const { newPassword, token } = req.body;

    if (!newPassword || !token) {
      sendBadRequest(res, 'auth.passwordAndTokenRequired', null, lang);
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: new Date() },
    });

    if (!user) {
      sendBadRequest(res, 'auth.invalidOrExpiredToken', null, lang);
      return;
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    sendSuccess(res, 'auth.passwordResetSuccess', null, lang);
  } catch (error) {
    console.error('Error in resetPassword:', error);
    sendServerError(res, 'common.serverError', error, lang);
  }
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: 'http://localhost:5000/api/auth/google/callback',
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails?.[0].value,
            avatar: profile.photos?.[0].value,
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, undefined);
      }
    }
  )
);

passport.serializeUser((user: IUser, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});
