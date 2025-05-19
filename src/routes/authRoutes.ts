import express from 'express';
import * as authController from '#controllers/authController';
import {
  userRegisterSchema,
  userLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  resendVerificationSchema,
} from '#schemas/userSchemas';
import { validateSchema } from '#middlewares/validationMiddleware';
import { authenticateToken } from '#middlewares/authMiddleware';
import { createRateLimiter } from '#middlewares/rateLimitMiddleware';

const router = express.Router();

router.post('/register', validateSchema(userRegisterSchema), authController.registerUser);
router.post('/login', authController.loginUser);
// router.get('/profile', getUserProfile);
router.post(
  '/forgot-password',
  validateSchema(forgotPasswordSchema),
  createRateLimiter('forgotPassword'),
  authController.forgotPassword
);
router.get('/check-verification-token/:token', authController.checkVerificationToken);
router.get('/check-reset-token/:token', authController.checkResetToken);
router.post('/reset-password', validateSchema(resetPasswordSchema), authController.resetPassword);

router.post('/verify-email/:token', authController.verifyEmail);

router.post(
  '/resend-verification',
  validateSchema(resendVerificationSchema),
  createRateLimiter('emailVerification'),
  authController.resendVerification
);

router.get('/google', authController.googleAuthRoutes.initiateGoogleAuth);

router.get('/google/callback', authController.googleAuthRoutes.handleGoogleCallback);

router.post('/refresh-access-token', authController.refreshAccessToken);

router.post('/change-password', authenticateToken, validateSchema(changePasswordSchema), authController.changePassword);

router.post('/logout', authenticateToken, authController.logoutUser);
router.post('/logout-all-device', authenticateToken, authController.logoutAllDevices);

export default router;
