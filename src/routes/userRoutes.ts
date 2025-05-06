import express from 'express';
import * as userController from '#controllers/userController';
import { validatePermissions } from '#middlewares/permissionMiddleware';
import { authenticateToken } from '#src/middlewares/authMiddleware';
import { upload } from '#middlewares/uploadMiddleware';

const router = express.Router();

// Lấy danh sách user (yêu cầu quyền quản lý user)
router.get('/', authenticateToken, validatePermissions('ADMIN_USER_MANAGE'), userController.getUserList);

// Lấy chi tiết user (yêu cầu quyền quản lý user hoặc là user đó)
// router.get(
//   '/:id',
//   authenticateToken,
//   validatePermissions(['ADMIN_USER_MANAGE', 'SELF_ACCESS']),
//   userController.getUserDetails
// );

router.post(
  '/avatar/:id',
  authenticateToken,
  validatePermissions(['ADMIN_USER_MANAGE', 'SELF_ACCESS']),
  upload.single('avatar'),
  userController.uploadAvatar
);

router.get('/avatar/:id', userController.getUserAvatar);

// Protected routes - need authentication
// router.use(authenticate);

// User profile routes - for currently logged in user
router.get('/profile', authenticateToken, userController.getCurrentUserProfile);
router.put('/profile', authenticateToken, upload.single('avatar'), userController.updateUser);

router.get('/:id', authenticateToken, validatePermissions('ADMIN_USER_MANAGE'), userController.getUserDetails);
router.put(
  '/:id',
  authenticateToken,
  validatePermissions('ADMIN_USER_MANAGE'),
  upload.single('avatar'),
  userController.updateUser
);
router.post(
  '/:id/change-password',
  authenticateToken,
  validatePermissions('ADMIN_USER_MANAGE'),
  userController.changePassword
);
router.delete('/:id', authenticateToken, validatePermissions('ADMIN_USER_MANAGE'), userController.softDeleteUser);
router.post('/:id/restore', authenticateToken, validatePermissions('ADMIN_USER_MANAGE'), userController.restoreUser);

router.put('/:id/role', authenticateToken, validatePermissions('ADMIN_USER_MANAGE'), userController.assignUserRole);
router.put(
  '/role/:roleName',
  authenticateToken,
  validatePermissions('ADMIN_USER_MANAGE'),
  userController.getUsersByRole
);

export default router;
