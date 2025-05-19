import express from 'express';
import * as bookingController from '../controllers/bookingController';
import { authenticateToken } from '#middlewares/authMiddleware';
import { validatePermissions } from '#middlewares/permissionMiddleware';

const router = express.Router();

// Public webhook endpoint (no auth required)
router.post('/webhook/payment', bookingController.handlePaymentWebhook);

// Authenticated user routes
router.post('/calculate', authenticateToken, bookingController.calculateBookingWithVoucher);
router.post('/', authenticateToken, bookingController.createBooking);
router.get('/my-bookings', authenticateToken, bookingController.getUserBookings);
router.post('/:id/resend-payment', authenticateToken, bookingController.resendPaymentQR);
router.post('/:id/cancel', authenticateToken, bookingController.cancelBooking);
router.get('/:id/history', authenticateToken, bookingController.getBookingHistory);
router.get('/:id', authenticateToken, bookingController.getBookingDetails); // Keep this after specific routes

// Admin routes (with permission validation)
router.get('/admin/all', authenticateToken, validatePermissions(['admin']), bookingController.getAllBookings);
router.get('/admin/stats', authenticateToken, validatePermissions(['admin']), bookingController.getBookingStats);
router.get('/admin/export', authenticateToken, validatePermissions(['admin']), bookingController.exportBookingData);
router.post(
  '/:id/admin/confirm',
  authenticateToken,
  validatePermissions(['admin']),
  bookingController.confirmBookingManually
);

export default router;
