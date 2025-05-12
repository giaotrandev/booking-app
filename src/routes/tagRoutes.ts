import express from 'express';
import * as postController from '#controllers/postController';
import { createTagSchema, updateTagSchema } from '#schemas/postSchemas';
import { validateSchema } from '#middlewares/validationMiddleware';
import { authenticateToken } from '#middlewares/authMiddleware';
import { validatePermissions } from '#middlewares/permissionMiddleware';
import { createRateLimiter } from '#middlewares/rateLimitMiddleware';

const router = express.Router();

// Tag Routes
router.post('/', authenticateToken, validateSchema(createTagSchema), postController.createTag);

router.put('/:slugOrId', authenticateToken, validateSchema(updateTagSchema), postController.updateTag);

router.get('/:slugOrId', postController.getTagDetails);

router.get('/', postController.getTags);

export default router;
