import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import i18next from 'i18next';
import { Request } from 'express';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpire?: Date;
  role: 'user' | 'admin';
  gender: 'male' | 'female';
  phoneNumber: string;
  googleId?: string;
  avatar?: string;
  age: number;
  address?: string;
  status: 'available' | 'disabled' | 'pending';
  comparePassword(candidatePassword: string): Promise<boolean>;
  getResetPasswordToken(): string;
  getEmailVerificationToken(): string;
  getLocalizedErrorMessage(key: string, req: Request, language?: string): string;
}

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [
        true,
        // 'Please add a name',
        // function (this: IUser, req?: Request) {
        //   // Sử dụng ngôn ngữ từ request nếu có
        //   const lng = req?.language || 'en';
        //   return i18next.t('errors.name.required', { lng });
        // },
        function (this: IUser, req?: Request) {
          // Sử dụng ngôn ngữ từ request nếu có
          const lng = global.currentLanguage || 'en';
          console.log(lng);
          return i18next.t('errors.name.required', { lng });
        },
        // function (this: IUser, req: Request) {
        //   return this.getLocalizedErrorMessage('errors.name.required', req);
        // },
      ],
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email'],
    },
    password: {
      type: String,
      required: function (this: IUser): boolean {
        return !this.googleId; // Không bắt buộc nếu đăng nhập bằng Google
      },
      minlength: 6,
    },
    googleId: {
      type: String, // Chỉ có khi đăng nhập với Google
      default: null,
    },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationExpire: {
      type: Date,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    gender: {
      type: String,
      enum: ['male', 'female'],
      required: function (this: IUser): boolean {
        return !this.googleId; // Không bắt buộc nếu có googleId
      },
    },
    phoneNumber: {
      type: String,
      // required: function (this: IUser): boolean {
      //   return !this.googleId; // Không bắt buộc nếu có googleId
      // },
    },
    age: {
      type: Number,
      // required: function (this: IUser): boolean {
      //   return !this.googleId; // Không bắt buộc nếu có googleId
      // },
      min: [0, 'Age must be a positive number'],
    },
    address: {
      type: String,
    },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
    status: {
      type: String,
      enum: ['available', 'disabled', 'pending'],
      default: 'pending',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false; // Nếu không có password, luôn trả về false
  return await bcrypt.compare(candidatePassword, this.password);
};

// Creating token to reset password
userSchema.methods.getResetPasswordToken = function (): string {
  const resetToken = crypto.randomBytes(20).toString('hex');

  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + parseInt(process.env.RESET_PASSWORD_EXPIRATION || '600000'); // Default expired 10 minutes

  return this.resetPasswordToken;
};

// Creating token for email verification
userSchema.methods.getEmailVerificationToken = function (): string {
  const verificationToken = crypto.randomBytes(20).toString('hex');

  this.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
  this.emailVerificationExpire = Date.now() + parseInt(process.env.EMAIL_VERIFICATION_EXPIRATION || '600000'); // Default expired in 10 minutes

  return this.emailVerificationToken;
};

// userSchema.methods.getLocalizedErrorMessage = function (key: string, req?: Request, language?: string): string {
//   console.log(req);
//   const lng = language || (req?.query?.lang as string) || (req?.headers['accept-language'] as string) || 'en';

//   return i18next.t(key, { lng });
// };

export default mongoose.model<IUser>('User', userSchema);
