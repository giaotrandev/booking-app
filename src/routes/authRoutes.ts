import express from 'express';
// import passport from 'passport';
// import jwt from 'jsonwebtoken';
import {
  registerUser,
  loginUser,
  // getUserProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  googleAuthRoutes,
  logoutUser,
  logoutAllDevices,
} from '#controllers/authController';
// import { protect } from '#middlewares/authMiddleware';
import {
  userRegisterSchema,
  userLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  resendVerificationSchema,
} from '../schemas/userSchemas';
import { validateSchema } from '#middlewares/validationMiddleware';
import { authenticateToken } from '#src/middlewares/authMiddleware';
import { createRateLimiter } from '#src/middlewares/rateLimitMiddleware';

const router = express.Router();

router.post('/register', validateSchema(userRegisterSchema), registerUser);
router.post('/login', loginUser);
// router.get('/profile', getUserProfile);
router.post(
  '/forgot-password',
  validateSchema(forgotPasswordSchema),
  createRateLimiter('forgotPassword'),
  forgotPassword
);
router.post('/reset-password', validateSchema(resetPasswordSchema), resetPassword);

router.post('/verify-email/:token', verifyEmail);

router.post(
  '/resend-verification',
  validateSchema(resendVerificationSchema),
  createRateLimiter('emailVerification'),
  resendVerification
);

router.get('/google', googleAuthRoutes.initiateGoogleAuth);

router.get('/google/callback', googleAuthRoutes.handleGoogleCallback);

router.post('/logout', authenticateToken, logoutUser);
router.post('/logout-all-device', authenticateToken, logoutAllDevices);

export default router;
