import express from 'express';
import path from 'path';
import fs from 'fs';
import * as systemConfigController from '#controllers/systemConfigController';
import { authenticateToken } from '#middlewares/authMiddleware';
import { validatePermissions } from '#middlewares/permissionMiddleware';

import { upload } from '#middlewares/uploadMiddleware';

const router = express.Router();

// Public routes
router.get('/', systemConfigController.getPublicSystemConfigCtrl);

// Admin routes
router.get('/admin', authenticateToken, validatePermissions(['admin']), systemConfigController.getSystemConfigCtrl);

router.post('/', authenticateToken, validatePermissions(['admin']), systemConfigController.createSystemConfigCtrl);

router.put('/', authenticateToken, validatePermissions(['admin']), systemConfigController.updateSystemConfigCtrl);

router.post('/:id/logo', upload.single('image'), systemConfigController.uploadLogoCtrl);

router.delete('/:id/logo', authenticateToken, validatePermissions(['admin']), systemConfigController.deleteLogoCtrl);

export default router;
