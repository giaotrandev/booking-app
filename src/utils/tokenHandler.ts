import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import ms from 'ms';
import { TokenPayload } from '../types/auth';

export const generateRandomToken = (length: number = 20): string => {
  return crypto.randomBytes(length).toString('hex');
};

export const generateEmailVerificationToken = () => {
  const verificationToken = generateRandomToken();
  const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

  const EMAIL_VERIFICATION_EXPIRATION = process.env.EMAIL_VERIFICATION_EXPIRATION || '10m';
  const expirationMs = ms(EMAIL_VERIFICATION_EXPIRATION as ms.StringValue);

  const emailVerificationExpire = new Date(Date.now() + expirationMs);

  return {
    verificationToken,
    hashedToken,
    emailVerificationExpire,
  };
};

export const generateResetPasswordToken = () => {
  const resetToken = generateRandomToken();
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  const RESET_PASSWORD_EXPIRATION = process.env.RESET_PASSWORD_EXPIRATION || '10m';
  const expirationMs = ms(RESET_PASSWORD_EXPIRATION as ms.StringValue);

  const resetTokenExpire = new Date(Date.now() + expirationMs);

  return {
    resetToken,
    hashedToken,
    resetTokenExpire,
  };
};

export const generateAccessToken = (payload: TokenPayload, expiresIn?: string) => {
  return jwt.sign(
    payload,
    process.env.ACCESS_TOKEN_SECRET! as Secret,
    {
      expiresIn: expiresIn || process.env.ACCESS_TOKEN_EXPIRATION || '1d',
    } as SignOptions
  );
};

export const generateRefreshToken = (payload: Pick<TokenPayload, 'userId' | 'sessionId'>) => {
  return jwt.sign(
    payload,
    process.env.REFRESH_TOKEN_SECRET! as Secret,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRATION || '30d',
    } as SignOptions
  );
};

export const verifyToken = (token: string, type: 'access' | 'refresh' = 'access') => {
  const secret = type === 'access' ? process.env.ACCESS_TOKEN_SECRET : process.env.REFRESH_TOKEN_SECRET;

  if (!secret) {
    throw new Error(`${type.toUpperCase()}_TOKEN_SECRET is not defined`);
  }

  return jwt.verify(token, secret);
};

export const hashToken = (token: string) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const comparePassword = async (candidatePassword: string, hashedPassword: string) => {
  return bcrypt.compare(candidatePassword, hashedPassword);
};

export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};
