import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  role: 'user' | 'admin';
  gender: 'male' | 'female';
  phoneNumber: string;
  googleId: string,
  avatar: string,
  age: number;
  address: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getResetPasswordToken(): string; 
}

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
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
      required: function (this: IUser): boolean {
        return !this.googleId; // Không bắt buộc nếu có googleId
      },
    },
    age: {
      type: Number,
      required: function (this: IUser): boolean {
        return !this.googleId; // Không bắt buộc nếu có googleId
      },
      min: [0, 'Age must be a positive number'],
    },
    address: {
      type: String,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
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
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // expired 10 minutes

  return resetToken;
};

export default mongoose.model<IUser>('User', userSchema);