import express from 'express';
import { validatePermissions } from '#middlewares/permissionMiddleware';
import { authenticateToken } from '#src/middlewares/authMiddleware';
import { upload } from '#middlewares/uploadMiddleware';

import * as VehicleTypeController from '#controllers/vehicleTypeController';

const router = express.Router();

/**
 * @route GET /api/vehicle-types
 * @desc Get all vehicle types
 * @access Public
 */
router.get('/', VehicleTypeController.getVehicleTypeList);

/**
 * @route GET /api/vehicle-types/:id
 * @desc Get vehicle type by ID
 * @access Public
 */
router.get('/:id', VehicleTypeController.getVehicleTypeDetails);

/**
 * @route GET /api/vehicle-types/:id/vehicles
 * @desc Get vehicles by type
 * @access Admin
 */
router.get('/:id/vehicles', authenticateToken, VehicleTypeController.getVehiclesByType);

/**
 * @route GET /api/vehicle-types/:id/history
 * @desc Get vehicle type history
 * @access Admin
 */
router.get('/:id/history', authenticateToken, VehicleTypeController.getVehicleTypeHistory);

/**
 * @route POST /api/vehicle-types
 * @desc Create a new vehicle type
 * @access Admin
 */
router.post('/', authenticateToken, VehicleTypeController.createVehicleType);

/**
 * @route PUT /api/vehicle-types/:id
 * @desc Update a vehicle type
 * @access Admin
 */
router.put('/:id', authenticateToken, VehicleTypeController.updateVehicleType);

/**
 * @route DELETE /api/vehicle-types/:id
 * @desc Soft delete a vehicle type
 * @access Admin
 */
router.delete('/:id', authenticateToken, VehicleTypeController.softDeleteVehicleType);

/**
 * @route PUT /api/vehicle-types/:id/restore
 * @desc Restore a deleted vehicle type
 * @access Admin
 */
router.put('/:id/restore', authenticateToken, VehicleTypeController.restoreVehicleType);

export default router;
