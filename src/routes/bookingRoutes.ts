import express from 'express';
import * as bookingController from '../controllers/bookingController';
import { authenticateToken } from '#middlewares/authMiddleware';
import { validatePermissions } from '#middlewares/permissionMiddleware';
import { createRateLimiter } from '#src/middlewares/rateLimitMiddleware';

const router = express.Router();

// Public webhook endpoint (no auth required)
router.post('/webhook/payment', bookingController.handlePaymentWebhook);

// Static routes first (to avoid conflict with /:id)
router.post('/calculate', bookingController.calculateBookingWithVoucher);
router.get('/my-bookings', authenticateToken, bookingController.getUserBookings);

// Admin routes (must come before /:id routes)
router.get('/admin/all', authenticateToken, validatePermissions(['admin']), bookingController.getAllBookings);
router.get('/admin/stats', authenticateToken, validatePermissions(['admin']), bookingController.getBookingStats);
router.get('/admin/export', authenticateToken, validatePermissions(['admin']), bookingController.exportBookingData);

// Root CRUD operations
router.post('/', bookingController.createBooking);
router.put('/', bookingController.updateBooking);

// Specific /:id routes (must come before general /:id route)
router.post('/:id/resend-payment', authenticateToken, bookingController.resendPaymentQR);
router.post('/:id/payment/qr-code', bookingController.generatePaymentQR);
router.get('/:id/payment/qr-code', bookingController.getPaymentQR);
router.post('/:id/cancel', authenticateToken, bookingController.cancelBooking);
router.get('/:id/history', authenticateToken, bookingController.getBookingHistory);
router.post(
  '/:id/admin/confirm',
  authenticateToken,
  validatePermissions(['admin']),
  bookingController.confirmBookingManually
);

// General /:id route (must be last)
router.get('/:id', bookingController.getBookingDetails);

export default router;
