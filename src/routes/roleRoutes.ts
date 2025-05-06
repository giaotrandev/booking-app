import express from 'express';
import * as roleController from '#controllers/roleController';
import { validatePermissions } from '#middlewares/permissionMiddleware';
import { authenticateToken } from '#src/middlewares/authMiddleware';

const router = express.Router();

router.get('/', authenticateToken, roleController.getRoleList);
router.get('/:id', authenticateToken, roleController.getRoleDetails);
router.post('/', authenticateToken, roleController.createRole);
router.put('/:id', authenticateToken, roleController.updateRole);
router.delete('/:id', authenticateToken, roleController.deleteRole);
router.put('/:id/permissions', authenticateToken, roleController.updateRolePermissions);

export default router;
