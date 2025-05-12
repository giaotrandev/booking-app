import express from 'express';
import { validatePermissions } from '#middlewares/permissionMiddleware';
import { authenticateToken } from '#src/middlewares/authMiddleware';
import { upload } from '#middlewares/uploadMiddleware';

import * as RouteStopController from '#controllers/routeStopController';

const router = express.Router();

/**
 * @route GET /api/route-stops
 * @desc Get all route stops
 * @access Admin
 */
router.get('/', authenticateToken, RouteStopController.getRouteStopList);

/**
 * @route GET /api/route-stops/:id
 * @desc Get route stop by ID
 * @access Admin
 */
router.get('/:id', authenticateToken, RouteStopController.getRouteStopDetails);

/**
 * @route GET /api/route-stops/route/:routeId
 * @desc Get all stops for a specific route
 * @access Public
 */
router.get('/route/:routeId', RouteStopController.getRouteStopsByRoute);

/**
 * @route GET /api/route-stops/bus-stop/:busStopId
 * @desc Get all routes that stop at a specific bus stop
 * @access Public
 */
router.get('/bus-stop/:busStopId', RouteStopController.getRouteStopsByBusStop);

/**
 * @route POST /api/route-stops
 * @desc Create a new route stop
 * @access Admin
 */
router.post('/', authenticateToken, RouteStopController.createRouteStop);

/**
 * @route POST /api/route-stops/bulk
 * @desc Bulk create route stops
 * @access Admin
 */
router.post('/bulk', authenticateToken, RouteStopController.bulkCreateRouteStops);

/**
 * @route PUT /api/route-stops/:id
 * @desc Update a route stop
 * @access Admin
 */
router.put('/:id', authenticateToken, RouteStopController.updateRouteStop);

/**
 * @route PUT /api/route-stops/reorder/:routeId
 * @desc Reorder route stops
 * @access Admin
 */
router.put('/reorder/:routeId', authenticateToken, RouteStopController.reorderRouteStops);

/**
 * @route DELETE /api/route-stops/:id
 * @desc Soft delete a route stop
 * @access Admin
 */
router.delete('/:id', authenticateToken, RouteStopController.softDeleteRouteStop);

/**
 * @route PUT /api/route-stops/:id/restore
 * @desc Restore a deleted route stop
 * @access Admin
 */
router.put('/:id/restore', authenticateToken, RouteStopController.restoreRouteStop);

export default router;
