import express from 'express';
import * as ticketController from '#controllers/ticketController';
import { authenticateToken } from '#middlewares/authMiddleware';
import { validatePermissions } from '#middlewares/permissionMiddleware';

const router = express.Router();

// Authenticated user routes
router.post('/generate/:bookingId', authenticateToken, ticketController.generateTickets);
router.get(
  '/unchecked-in/:bookingTripId',
  authenticateToken,
  validatePermissions(['staff', 'admin']),
  ticketController.getUnCheckedInTicketsCtrl
);
router.patch(
  '/check-in/:ticketId',
  authenticateToken,
  validatePermissions(['staff', 'admin']),
  ticketController.checkInTicketCtrl
);
router.patch(
  '/check-in/bulk/:bookingTripId',
  authenticateToken,
  validatePermissions(['staff', 'admin']),
  ticketController.checkInBulkTicketsCtrl
);
router.get('/pdf/:ticketId', authenticateToken, ticketController.getTicketPDF);
router.post('/regenerate/:ticketId', authenticateToken, ticketController.regenerateTicket);

export default router;
