import express from 'express';
import { validatePermissions } from '#middlewares/permissionMiddleware';
import { authenticateToken } from '#src/middlewares/authMiddleware';
import { upload } from '#middlewares/uploadMiddleware';

import * as BusStopController from '#controllers/busStopController';

const router = express.Router();

/**
 * @route GET /api/bus-stops
 * @desc Get all bus stops
 * @access Public
 */
router.get('/', BusStopController.getBusStopList);

/**
 * @route GET /api/bus-stops/:id
 * @desc Get bus stop by ID
 * @access Public
 */
router.get('/:id', BusStopController.getBusStopDetails);

/**
 * @route GET /api/bus-stops/:id/routes
 * @desc Get routes that pass through a bus stop
 * @access Public
 */
router.get('/:id/routes', BusStopController.getRoutesByBusStop);

/**
 * @route GET /api/bus-stops/nearby
 * @desc Get nearby bus stops based on coordinates
 * @access Public
 */
router.get('/nearby', BusStopController.getNearbyBusStops);

/**
 * @route POST /api/bus-stops
 * @desc Create a new bus stop
 * @access Admin
 */
router.post('/', authenticateToken, BusStopController.createBusStop);

/**
 * @route PUT /api/bus-stops/:id
 * @desc Update a bus stop
 * @access Admin
 */
router.put('/:id', authenticateToken, BusStopController.updateBusStop);

/**
 * @route DELETE /api/bus-stops/:id
 * @desc Soft delete a bus stop
 * @access Admin
 */
router.delete('/:id', authenticateToken, BusStopController.softDeleteBusStop);

/**
 * @route PUT /api/bus-stops/:id/restore
 * @desc Restore a deleted bus stop
 * @access Admin
 */
router.put('/:id/restore', authenticateToken, BusStopController.restoreBusStop);

export default router;
