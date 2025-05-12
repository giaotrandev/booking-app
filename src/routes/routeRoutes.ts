import express from 'express';
import { validatePermissions } from '#middlewares/permissionMiddleware';
import { authenticateToken } from '#src/middlewares/authMiddleware';
import { upload } from '#middlewares/uploadMiddleware';

import * as RouteController from '#controllers/routeController';

const router = express.Router();

/**
 * @route GET /api/routes
 * @desc Get all routes
 * @access Public
 */
router.get('/', RouteController.getRouteList);

/**
 * @route GET /api/routes/:id
 * @desc Get route by ID
 * @access Public
 */
router.get('/:id', RouteController.getRouteDetails);

/**
 * @route GET /api/routes/:id/image
 * @desc Get route image
 * @access Public
 */
router.get('/:id/image', RouteController.getRouteImage);

/**
 * @route GET /api/routes/:id/history
 * @desc Get route history
 * @access Admin
 */
router.get(
  '/:id/history',
  authenticateToken,

  RouteController.getRouteHistory
);

/**
 * @route POST /api/routes
 * @desc Create a new route
 * @access Admin
 */
router.post('/', authenticateToken, upload.single('image'), RouteController.createRoute);

/**
 * @route PUT /api/routes/:id
 * @desc Update a route
 * @access Admin
 */
router.put('/:id', authenticateToken, upload.single('image'), RouteController.updateRoute);

/**
 * @route POST /api/routes/:id/image
 * @desc Upload route image
 * @access Admin
 */
router.post('/:id/image', authenticateToken, upload.single('image'), RouteController.uploadRouteImage);

/**
 * @route DELETE /api/routes/:id
 * @desc Soft delete a route
 * @access Admin
 */
router.delete('/:id', authenticateToken, RouteController.softDeleteRoute);

/**
 * @route PUT /api/routes/:id/restore
 * @desc Restore a deleted route
 * @access Admin
 */
router.put('/:id/restore', authenticateToken, RouteController.restoreRoute);

export default router;
