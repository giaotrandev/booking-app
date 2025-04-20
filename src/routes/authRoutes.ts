import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import {
  registerUser,
  loginUser,
  getUserProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from '#controllers/authController';
import { protect } from '#middleware/authMiddleware';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.get('/verify-email/:token', verifyEmail);

router.post('/resend-verification', resendVerification);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    const user = req.user as any;
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string, { expiresIn: '1h' });

    res.json({ message: 'Login successful', token });
  }
);

export default router;
