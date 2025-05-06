import express from 'express';
import * as permissionController from '#controllers/permissionController';
import { validatePermissions } from '#middlewares/permissionMiddleware';
import { authenticateToken } from '#src/middlewares/authMiddleware';

const router = express.Router();

router.get('/', authenticateToken, permissionController.getPermissionList);
router.get('/:id', authenticateToken, permissionController.getPermissionDetails);
router.post('/', authenticateToken, permissionController.createPermission);
router.put('/:id', authenticateToken, permissionController.updatePermission);
router.delete('/:id', authenticateToken, permissionController.deletePermission);

export default router;
