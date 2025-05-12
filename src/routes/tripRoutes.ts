import express from 'express';
import * as tripController from '#controllers/tripController';
import { validateSchema } from '#middlewares/validationMiddleware';
import { authenticateToken } from '#middlewares/authMiddleware';
import { validatePermissions } from '#middlewares/permissionMiddleware';

import { upload } from '#middlewares/uploadMiddleware';

const router = express.Router();

// Public routes
router.get('/search', tripController.searchTrips);
router.get('/:id/seats/availability', tripController.checkSeatAvailability);
router.get('/:id', tripController.getTripDetails);
router.get('/', tripController.getTripList);

// Authenticated routes
router.get('/calendar-view', authenticateToken, tripController.getTripsByDateRange);
router.get('/:id/history', authenticateToken, tripController.getTripHistory);
router.get('/:id/seats', authenticateToken, tripController.getTripSeats);

// Admin routes
router.post('/', authenticateToken, upload.single('image'), tripController.createTrip);
router.put('/:id', authenticateToken, upload.single('image'), tripController.updateTrip);
router.put('/:id/seats/:seatId', authenticateToken, tripController.updateSeatStatus);
router.delete('/:id', authenticateToken, tripController.deleteTrip);
router.post('/:id/restore', authenticateToken, tripController.restoreTrip);
router.get('/export/data', authenticateToken, tripController.exportTripsData);

export default router;
