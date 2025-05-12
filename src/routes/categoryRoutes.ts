import express from 'express';
import * as postController from '#controllers/postController';
import { createCategorySchema, updateCategorySchema } from '#schemas/postSchemas';
import { validateSchema } from '#middlewares/validationMiddleware';
import { authenticateToken } from '#middlewares/authMiddleware';
import { validatePermissions } from '#middlewares/permissionMiddleware';
import { createRateLimiter } from '#middlewares/rateLimitMiddleware';

const router = express.Router();

// Category Routes
router.post('/', authenticateToken, validateSchema(createCategorySchema), postController.createCategory);

router.put('/:slugOrId', authenticateToken, validateSchema(updateCategorySchema), postController.updateCategory);

router.get('/:slugOrId', postController.getCategoryDetails);

router.get('/', postController.getCategories);

router.delete('/:slugOrId', authenticateToken, postController.deleteCategory);
export default router;
