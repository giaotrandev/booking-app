import express from 'express';
import { validatePermissions } from '#middlewares/permissionMiddleware';
import { authenticateToken } from '#src/middlewares/authMiddleware';
import { upload } from '#middlewares/uploadMiddleware';

import * as VehicleController from '#controllers/vehicleController';

const router = express.Router();

/**
 * @route GET /api/vehicles
 * @desc Get all vehicles
 * @access Admin, Driver
 */
router.get('/', authenticateToken, VehicleController.getVehicleList);

/**
 * @route GET /api/vehicles/:id
 * @desc Get vehicle by ID
 * @access Admin, Driver
 */
router.get('/:id', authenticateToken, VehicleController.getVehicleDetails);

/**
 * @route GET /api/vehicles/:id/image
 * @desc Get vehicle image
 * @access Public
 */
router.get('/:id/image', VehicleController.getVehicleImage);

/**
 * @route GET /api/vehicles/:id/history
 * @desc Get vehicle history
 * @access Admin
 */
router.get('/:id/history', authenticateToken, VehicleController.getVehicleHistory);

/**
 * @route POST /api/vehicles
 * @desc Create a new vehicle
 * @access Admin
 */
router.post('/', authenticateToken, upload.single('image'), VehicleController.createVehicle);

/**
 * @route PUT /api/vehicles/:id
 * @desc Update a vehicle
 * @access Admin
 */
router.put('/:id', authenticateToken, upload.single('image'), VehicleController.updateVehicle);

/**
 * @route POST /api/vehicles/:id/image
 * @desc Upload vehicle image
 * @access Admin
 */
router.post('/:id/image', authenticateToken, upload.single('image'), VehicleController.uploadVehicleImage);

/**
 * @route PUT /api/vehicles/:id/assign-driver
 * @desc Assign driver to vehicle
 * @access Admin
 */
router.put('/:id/assign-driver', authenticateToken, VehicleController.assignDriver);

/**
 * @route DELETE /api/vehicles/:id
 * @desc Soft delete a vehicle
 * @access Admin
 */
router.delete('/:id', authenticateToken, VehicleController.softDeleteVehicle);

/**
 * @route PUT /api/vehicles/:id/restore
 * @desc Restore a deleted vehicle
 * @access Admin
 */
router.put('/:id/restore', authenticateToken, VehicleController.restoreVehicle);

export default router;
