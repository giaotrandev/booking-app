import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import ms from 'ms';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import {
  sendSuccess,
  sendBadRequest,
  sendNotFound,
  sendUnauthorized,
  sendCreated,
  sendServerError,
} from '#utils/apiResponse';
import * as TokenHandler from '#utils/tokenHandler';
import { sendEmail } from '#emails/sendEmail';
import { resetPasswordEmailTemplate } from '#emails/templates/resetPasswordEmail';
import { verificationEmailTemplate } from '#emails/templates/verificationEmail';
import { prisma } from '#config/db';
import { translate } from '#src/services/translationService';
import { TokenPayload } from '#src/types/auth';

// Generate JWT
const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: '30d',
  });
};

const EMAIL_VERIFICATION_EXPIRATION = process.env.EMAIL_VERIFICATION_EXPIRATION || '10m';

export const registerUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';
    const { firstName, lastName, email, password, gender, phoneNumber, birthday, address } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.isEmailVerified) {
      sendBadRequest(res, 'auth.emailExists', null, language);
      return;
    }

    // Hash password
    const hashedPassword = await TokenHandler.hashPassword(password);

    // Create or update user (if exists)
    const { verificationToken, hashedToken, emailVerificationExpire } = TokenHandler.generateEmailVerificationToken();

    const newUser = await prisma.user.upsert({
      where: { email },
      update: {
        firstName,
        lastName,
        password: hashedPassword, // Hash password here
        gender: gender as 'MALE' | 'FEMALE',
        phoneNumber,
        birthday,
        address,
        emailVerificationToken: hashedToken,
        emailVerificationExpire,
        isEmailVerified: false,
      },
      create: {
        firstName,
        lastName,
        email,
        password: hashedPassword, // Hash password here
        gender: gender as 'MALE' | 'FEMALE',
        phoneNumber,
        birthday,
        address,
        emailVerificationToken: hashedToken,
        emailVerificationExpire,
        isEmailVerified: false,
        role: {
          connect: { name: 'USER' },
        },
        status: 'PENDING',
      },
    });

    // Create verification URL
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    // Send verification email
    await sendEmail(email, translate('auth.verifyEmail', language), verificationEmailTemplate, {
      username: firstName + ' ' + lastName,
      verificationLink,
      language,
    });

    // Set timeout to delete user if not verified
    setTimeout(
      async () => {
        await prisma.user.deleteMany({
          where: {
            email,
            isEmailVerified: false,
            emailVerificationExpire: { lt: new Date() },
          },
        });
      },
      ms(EMAIL_VERIFICATION_EXPIRATION as ms.StringValue)
    );

    sendCreated(
      res,
      'auth.verificationEmailSent',
      {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
      },
      language
    );
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';
  try {
    const { email, password, rememberMe } = req.body;

    // Check for user email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

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
    const isMatch = await TokenHandler.comparePassword(password, user.password);

    if (!isMatch) {
      sendUnauthorized(res, 'auth.invalidCredentials', null, language);
      return;
    }

    // Parse token expiration from environment variables
    const ACCESS_TOKEN_EXPIRATION = process.env.ACCESS_TOKEN_EXPIRATION || '1d';
    const REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION || '30d';

    // Convert time strings to milliseconds
    const accessTokenExpirationMs = ms(ACCESS_TOKEN_EXPIRATION as ms.StringValue);
    const refreshTokenExpirationMs = ms(REFRESH_TOKEN_EXPIRATION as ms.StringValue);

    // Remove old login sessions
    await prisma.loginSession.deleteMany({
      where: {
        userId: user.id,
        lastActivityAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 days
      },
    });

    // Create new login session
    const session = await prisma.loginSession.create({
      data: {
        userId: user.id,
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        isActive: true,
      },
    });

    // Create access token
    const accessToken = TokenHandler.generateAccessToken({
      userId: user.id,
      role: user.role.name,
      sessionId: session.id,
    });

    // Prepare cookie options with environment-based configuration
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? ('strict' as const) : ('lax' as const),
      expires: new Date(Date.now() + accessTokenExpirationMs),
      path: '/',
    };

    // Conditional cookie name based on environment
    const accessTokenCookieName = process.env.NODE_ENV === 'production' ? '__Host-at' : 'at';

    const refreshTokenCookieName = process.env.NODE_ENV === 'production' ? '__Host-rt' : 'rt';

    // Set access token cookie
    res.cookie(accessTokenCookieName, accessToken, {
      ...cookieOptions,
      ...(process.env.NODE_ENV === 'production' && {
        secure: true,
      }),
    });

    // Initialize refresh token as null
    let refreshToken = null;

    // Handle remember me functionality
    if (rememberMe) {
      const refreshTokenString = TokenHandler.generateRefreshToken({
        userId: user.id,
        sessionId: session.id,
      });

      // Store refresh token in database
      await prisma.refreshToken.create({
        data: {
          token: refreshTokenString,
          sessionId: session.id,
          expiresAt: new Date(Date.now() + refreshTokenExpirationMs),
          isRevoked: false,
        },
      });

      // Set refresh token cookie
      res.cookie(refreshTokenCookieName, refreshTokenString, {
        ...cookieOptions,
        expires: new Date(Date.now() + refreshTokenExpirationMs),
        ...(process.env.NODE_ENV === 'production' && {
          secure: true,
        }),
      });

      refreshToken = refreshTokenString;
    }

    // Successful login response
    sendSuccess(
      res,
      'auth.loginSuccess',
      {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role.name,
        permissions: user.role.permissions.map((p) => p.code),
        gender: user.gender,
        phoneNumber: user.phoneNumber,
        birthday: user.birthday,
        address: user.address,
        accessToken,
        // refreshToken,
      },
      language
    );
  } catch (error) {
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';
  try {
    // Lấy refresh token từ cookie hoặc body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      sendUnauthorized(res, 'auth.noRefreshToken', null, language);
      return;
    }

    // Xác thực refresh token
    const decoded = TokenHandler.verifyToken(refreshToken, 'refresh') as { userId: string; sessionId: string };

    // Kiểm tra refresh token trong DB
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      include: { session: { include: { user: { include: { role: true } } } } },
    });

    if (!storedToken) {
      sendUnauthorized(res, 'auth.invalidRefreshToken', null, language);
      return;
    }

    // Tạo access token mới
    const accessToken = TokenHandler.generateAccessToken({
      userId: storedToken.session.userId,
      role: storedToken.session.user.role.name,
      sessionId: storedToken.sessionId,
    });

    // Cập nhật hoạt động của phiên
    await prisma.loginSession.update({
      where: { id: storedToken.sessionId },
      data: { lastActivityAt: new Date() },
    });

    sendSuccess(res, 'auth.tokenRefreshed', { accessToken }, language);
  } catch (error) {
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';
  try {
    const { token } = req.params;

    const hashedToken = TokenHandler.hashToken(token);

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationExpire: { gt: new Date() },
      },
    });

    if (!user) {
      sendBadRequest(res, 'auth.invalidToken', null, language);
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpire: null,
      },
    });

    sendSuccess(
      res,
      'auth.emailVerified',
      {},
      // {
      //   id: user.id,
      //   name: user.name,
      //   email: user.email,
      //   token: generateToken(user.id),
      // },
      language
    );
  } catch (error) {
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

export const resendVerification = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      sendNotFound(res, 'auth.userNotFound', null, language);
      return;
    }

    if (user.isEmailVerified) {
      sendBadRequest(res, 'auth.alreadyVerified', null, language);
      return;
    }

    if (!user.emailVerificationToken) {
      sendBadRequest(res, 'auth.noVerificationTokenFound', null, language);
      return;
    }

    const { verificationToken, hashedToken, emailVerificationExpire } = TokenHandler.generateEmailVerificationToken();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: hashedToken,
        emailVerificationExpire,
      },
    });

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    await sendEmail(email, translate('auth.verifyEmail', language), verificationEmailTemplate, {
      username: user.firstName + ' ' + user.lastName,
      verificationLink,
      language,
    });

    setTimeout(
      async () => {
        await prisma.user.deleteMany({
          where: {
            email,
            isEmailVerified: false,
            emailVerificationExpire: { lt: new Date() },
          },
        });
        console.log(`User ${email} deleted due to verification timeout`);
      },
      ms(EMAIL_VERIFICATION_EXPIRATION as ms.StringValue)
    );

    sendSuccess(res, 'auth.verificationEmailResent', null, language);
  } catch (error) {
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const lang = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      sendNotFound(res, 'auth.userNotFound', null, lang);
      return;
    }

    // Generate reset token
    const { resetToken, hashedToken, resetTokenExpire } = TokenHandler.generateResetPasswordToken();

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpire: resetTokenExpire,
      },
    });

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    try {
      await sendEmail(email, 'Reset Your Password', resetPasswordEmailTemplate, {
        username: user.firstName + ' ' + user.lastName || '',
        resetLink: resetUrl,
      });
      sendSuccess(res, 'auth.emailSent', null, lang);
    } catch (error) {
      sendServerError(res, 'auth.emailNotSent', error, lang);
    }
  } catch (error) {
    sendServerError(res, 'common.serverError', error, lang);
  }
};

export const checkVerificationToken = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';
  try {
    const { token } = req.params;

    if (!token) {
      sendBadRequest(res, 'auth.tokenRequired', null, language);
      return;
    }

    const hashedToken = TokenHandler.hashToken(token);

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationExpire: { gt: new Date() },
      },
    });

    if (!user) {
      sendBadRequest(res, 'auth.invalidOrExpiredToken', null, language);
      return;
    }

    sendSuccess(res, 'auth.validToken', { isValid: true }, language);
  } catch (error) {
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

export const checkResetToken = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';
  try {
    const { token } = req.params;

    if (!token) {
      sendBadRequest(res, 'auth.tokenRequired', null, language);
      return;
    }

    const hashedToken = TokenHandler.hashToken(token);

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { gt: new Date() },
      },
    });

    if (!user) {
      sendBadRequest(res, 'auth.invalidOrExpiredToken', null, language);
      return;
    }

    sendSuccess(res, 'auth.validToken', { isValid: true }, language);
  } catch (error) {
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const lang =
    req.language || res.locals.language || (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';
  try {
    const { token, password, confirmPassword } = req.body;

    if (!password || !token || !confirmPassword) {
      sendBadRequest(res, 'auth.passwordAndTokenRequired', null, lang);
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { gt: new Date() },
      },
    });

    if (!user) {
      sendBadRequest(res, 'auth.invalidOrExpiredToken', null, lang);
      return;
    }

    // Hash new password
    const bcrypt = await import('bcrypt');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpire: null,
      },
    });

    sendSuccess(res, 'auth.passwordResetSuccess', null, lang);
  } catch (error) {
    sendServerError(res, 'common.serverError', error, lang);
  }
};

// Configure Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      callbackURL: `${process.env.FRONTEND_URL}/api/callback-google`,
      passReqToCallback: true,
      scope: ['profile', 'email'],
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Extract necessary information from Google profile
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const googleId = profile.id;
        const avatar = profile.photos?.[0]?.value || null;

        if (!email) {
          return done(new Error('No email found in Google profile'));
        }

        // Find existing user
        const existingUser = await prisma.user.findUnique({
          where: {
            email: email,
          },
          include: {
            role: {
              include: {
                permissions: true,
              },
            },
          },
        });

        let user;
        if (existingUser) {
          // If user exists and already has a password, don't overwrite
          if (existingUser.password && !existingUser.googleId) {
            // User has a password but hasn't linked Google account
            return done(null, false, {
              message: 'Account already exists with a different login method',
            });
          }

          // Update existing user with Google ID if not already set
          if (!existingUser.googleId) {
            user = await prisma.user.update({
              where: { email },
              data: {
                googleId,
                // Only update these if they're not already set
                ...(existingUser.avatar ? {} : { avatar }),
                ...(existingUser.lastName === 'User' ? { name } : {}),
                isEmailVerified: true,
                status: 'AVAILABLE',
              },
              include: {
                role: {
                  include: {
                    permissions: true,
                  },
                },
              },
            });
          } else {
            user = existingUser;
          }
        } else {
          // Create new user
          user = await prisma.user.create({
            data: {
              email,
              firstName: name.split(' ')[0],
              lastName: name.split(' ').slice(1).join(' '),
              googleId,
              isEmailVerified: true,
              // Only set a random password if no existing password
              password: await TokenHandler.hashPassword(TokenHandler.generateRandomToken()),
              role: {
                connect: { name: 'USER' },
              },
              status: 'AVAILABLE',
              birthday: new Date(), // Default value for required field
              gender: 'MALE', // Default value for required field
              phoneNumber: '', // Default value for required field
              address: '', // Default value for required field
              avatar,
            },
            include: {
              role: {
                include: {
                  permissions: true,
                },
              },
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Google OAuth Routes
export const googleAuthRoutes = {
  // Initiate Google OAuth
  initiateGoogleAuth: (req: Request, res: Response, next: NextFunction) => {
    const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state: language,
    })(req, res, next);
  },

  // Google OAuth Callback
  handleGoogleCallback: async (req: Request, res: Response, next: NextFunction) => {
    const language = (req.query.state as string) || process.env.DEFAULT_LANGUAGE || 'en';

    const requestPath = req.path; // Chỉ lấy path, ví dụ: /auth/google/callback
    const fullUrl = req.originalUrl; // Lấy toàn bộ URL, bao gồm query string

    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('Full URL:', fullUrl);

    passport.authenticate('google', async (err: Error | null, user: any, info: any) => {
      // Create a universal error response script
      console.log('User: ', {
        user: user,
        info: info,
      });
      const nonce = TokenHandler.generateRandomToken(16);
      res.setHeader('Content-Security-Policy', `script-src 'self' 'nonce-${nonce}'`);
      const createErrorResponseScript = (errorMessage: string) => `
        <html>
        <head>
          <script nonce="${nonce}">
            // try {
            //   window.opener.postMessage({
            //     success: false,
            //     message: '${errorMessage}',
            //     type: 'AUTH_ERROR'
            //   }, '*');
            // } catch (e) {
            //   console.error('Error sending message to opener', e);
            // }
            
            // Always attempt to close
            window.close();
          </script>
        </head>
        <body>
          <h1>Authentication Error</h1>
          <p>${errorMessage}</p>
        </body>
        </html>
      `;

      // Various error scenarios
      if (err) {
        console.error('Google OAuth Authentication Error:', err);
        return res.status(400).send(createErrorResponseScript('Authentication failed'));
      }

      // Policy rejection or user cancellation
      if (info && info.message === 'User cancelled login') {
        return res.status(403).send(createErrorResponseScript('Login cancelled by user'));
      }

      // No user found
      if (!user) {
        return res.status(401).send(createErrorResponseScript('No user account found'));
      }

      try {
        // Parse token expiration from environment variables
        const ACCESS_TOKEN_EXPIRATION = process.env.ACCESS_TOKEN_EXPIRATION || '1d';
        const REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION || '30d';

        // Convert time strings to milliseconds
        const accessTokenExpirationMs = ms(ACCESS_TOKEN_EXPIRATION as ms.StringValue);
        const refreshTokenExpirationMs = ms(REFRESH_TOKEN_EXPIRATION as ms.StringValue);

        // Find old login sessions to delete
        const oldSessions = await prisma.loginSession.findMany({
          where: {
            userId: user.id,
            lastActivityAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 days
          },
          select: { id: true },
        });

        // Delete refresh tokens first (child records)
        if (oldSessions.length > 0) {
          await prisma.refreshToken.deleteMany({
            where: {
              sessionId: { in: oldSessions.map((session) => session.id) },
            },
          });

          // Then delete login sessions (parent records)
          await prisma.loginSession.deleteMany({
            where: {
              id: { in: oldSessions.map((session) => session.id) },
            },
          });
        }

        // Create new login session
        const session = await prisma.loginSession.create({
          data: {
            userId: user.id,
            ip: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            isActive: true,
          },
        });

        // Create access token
        const accessToken = TokenHandler.generateAccessToken({
          userId: user.id,
          role: user.role.name,
          sessionId: session.id,
        });

        // Prepare cookie options with environment-based configuration
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? ('strict' as const) : ('lax' as const),
          expires: new Date(Date.now() + accessTokenExpirationMs),
          path: '/',
        };

        // Conditional cookie name based on environment
        const accessTokenCookieName = 'at';
        const refreshTokenCookieName = 'rt';

        // Set access token cookie
        res.cookie(accessTokenCookieName, accessToken, {
          ...cookieOptions,
          ...(process.env.NODE_ENV === 'production' && {
            secure: true,
          }),
        });

        // Generate refresh token
        const refreshTokenString = TokenHandler.generateRefreshToken({
          userId: user.id,
          sessionId: session.id,
        });

        // Store refresh token in database
        await prisma.refreshToken.create({
          data: {
            token: refreshTokenString,
            sessionId: session.id,
            expiresAt: new Date(Date.now() + refreshTokenExpirationMs),
            isRevoked: false,
          },
        });

        // Set refresh token cookie
        res.cookie(refreshTokenCookieName, refreshTokenString, {
          ...cookieOptions,
          expires: new Date(Date.now() + refreshTokenExpirationMs),
          ...(process.env.NODE_ENV === 'production' && {
            secure: true,
          }),
        });

        const createSuccessResponseScript = () => `
          <html>
          <head>
            <script nonce="${nonce}">
              // window.opener.postMessage({
              //   success: true,
              //   token: '${accessToken}',
              //   user: {
              //     id: '${user.id}',
              //     name: '${user.name}',
              //     email: '${user.email}'
              //   }
              // }, '*');
              
              // Đóng cửa sổ sau khi gửi message
              // window.close();
            </script>
          </head>
          <body>Đang xử lý...</body>
          </html>
        `;

        console.log('Google OAuth login completed successfully for user:', user.id);

        return res.status(200).send(createSuccessResponseScript());
      } catch (processingError) {
        console.error('Error processing Google OAuth login:', processingError);
        return res.status(500).send(createErrorResponseScript('Internal server error'));
      }
    })(req, res, next);
  },
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!req.user || !(req.user as { userId: string }).userId) {
      sendUnauthorized(res, 'auth.userNotAuthenticated', null, language);
      return;
    }

    const userId = (req.user as { userId: string }).userId;

    // Find the user record
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      sendNotFound(res, 'auth.userNotFound', null, language);
      return;
    }

    // Validate password confirmation
    if (newPassword !== confirmPassword) {
      sendBadRequest(res, 'auth.passwordsDoNotMatch', null, language);
      return;
    }

    // Verify current password
    const isPasswordValid = await TokenHandler.comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      sendBadRequest(res, 'auth.currentPasswordIncorrect', null, language);
      return;
    }

    // Hash the new password
    const hashedPassword = await TokenHandler.hashPassword(newPassword);

    // Update the user's password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Revoke other sessions (optional)
    if ((req.user as { sessionId: string }).sessionId) {
      // Keep current session active, deactivate others
      await prisma.loginSession.updateMany({
        where: {
          userId,
          isActive: true,
          id: { not: (req.user as { sessionId: string }).sessionId },
        },
        data: {
          isActive: false,
          logoutAt: new Date(),
        },
      });

      // Revoke other refresh tokens
      await prisma.refreshToken.updateMany({
        where: {
          session: {
            userId,
            id: { not: (req.user as { sessionId: string }).sessionId },
          },
          isRevoked: false,
        },
        data: {
          isRevoked: true,
        },
      });
    }

    sendSuccess(res, 'auth.passwordChanged', null, language);
  } catch (error) {
    console.error('Change Password Error:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

export const logoutUser = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    // Extract access token from cookies
    const accessTokenCookieName = process.env.NODE_ENV === 'production' ? '__Host-at' : 'at';
    const refreshTokenCookieName = process.env.NODE_ENV === 'production' ? '__Host-rt' : 'rt';

    const accessToken = req.cookies[accessTokenCookieName];
    const refreshToken = req.cookies[refreshTokenCookieName];

    // If no access token, return early
    if (!accessToken) {
      sendUnauthorized(res, 'auth.noActiveSession', null, language);
      return;
    }

    // Verify the access token to get user and session information
    let decoded: TokenPayload;
    try {
      decoded = TokenHandler.verifyToken(accessToken) as TokenPayload;
    } catch (error) {
      sendUnauthorized(res, 'auth.invalidToken', null, language);
      return;
    }

    // Deactivate the login session
    await prisma.loginSession.updateMany({
      where: {
        id: decoded.sessionId,
        userId: decoded.userId,
        isActive: true,
      },
      data: {
        isActive: false,
        logoutAt: new Date(),
      },
    });

    // Revoke refresh token if it exists
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: {
          token: refreshToken,
          sessionId: decoded.sessionId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
        },
      });
    }

    // Prepare cookie options for clearing
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? ('strict' as const) : ('lax' as const),
      path: '/',
    };

    // Clear access token cookie
    res.clearCookie(accessTokenCookieName, cookieOptions);

    // Clear refresh token cookie if it exists
    if (refreshToken) {
      res.clearCookie(refreshTokenCookieName, cookieOptions);
    }

    // Successful logout response
    sendSuccess(res, 'auth.logoutSuccess', {}, language);
  } catch (error) {
    console.error('Logout Error:', error);

    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

// Logout from all devices
export const logoutAllDevices = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    // Extract access token from cookies
    const accessTokenCookieName = process.env.NODE_ENV === 'production' ? '__Host-at' : 'at';
    const refreshTokenCookieName = process.env.NODE_ENV === 'production' ? '__Host-rt' : 'rt';

    const accessToken = req.cookies[accessTokenCookieName];

    // If no access token, return early
    if (!accessToken) {
      sendUnauthorized(res, 'auth.noActiveSession', null, language);
      return;
    }

    // Verify the access token to get user information
    let decoded: TokenPayload;
    try {
      decoded = TokenHandler.verifyToken(accessToken) as TokenPayload;
    } catch (error) {
      sendUnauthorized(res, 'auth.invalidToken', null, language);
      return;
    }

    // Deactivate all active login sessions for the user
    const { count: sessionsUpdated } = await prisma.loginSession.updateMany({
      where: {
        userId: decoded.userId,
        isActive: true,
      },
      data: {
        isActive: false,
        logoutAt: new Date(),
      },
    });

    // Revoke all active refresh tokens for the user
    const { count: tokensRevoked } = await prisma.refreshToken.updateMany({
      where: {
        session: {
          userId: decoded.userId,
        },
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    });

    // Prepare cookie options for clearing
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? ('strict' as const) : ('lax' as const),
      path: '/',
    };

    // Clear access token cookie
    res.clearCookie(accessTokenCookieName, cookieOptions);

    // Clear refresh token cookie
    res.clearCookie(refreshTokenCookieName, cookieOptions);

    // Successful logout from all devices response
    sendSuccess(res, 'auth.logoutAllDevicesSuccess', {}, language);
  } catch (error) {
    console.error('Logout All Devices Error:', error);

    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};
