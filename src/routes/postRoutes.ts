import express from 'express';
import * as postController from '#controllers/postController';
import {
  createPostSchema,
  updatePostSchema,
  postListingSchema,
  postHistorySchema,
  createCategorySchema,
  updateCategorySchema,
  createTagSchema,
  updateTagSchema,
} from '#schemas/postSchemas';
import { validateSchema } from '#middlewares/validationMiddleware';
import { authenticateToken } from '#middlewares/authMiddleware';
import { validatePermissions } from '#middlewares/permissionMiddleware';
import { createRateLimiter } from '#middlewares/rateLimitMiddleware';
import { parseRequestData } from '#middlewares/formDataParser';
import { upload } from '#middlewares/uploadMiddleware';

const router = express.Router();

// Create a new post
router.post(
  '/',
  upload.single('featuredImage'),
  authenticateToken,
  parseRequestData,
  // validatePermissions(['ADMIN', 'CONTENT_MANAGER']),
  validateSchema(createPostSchema),
  // createRateLimiter('createPost'),
  postController.createPost
);

// Update an existing post
router.put(
  '/:slugOrId',
  upload.single('featuredImage'),
  authenticateToken,
  parseRequestData,
  // validatePermissions(['ADMIN', 'CONTENT_MANAGER']),
  validateSchema(updatePostSchema),
  // createRateLimiter('updatePost'),
  postController.updatePost
);

// Get post details by slug or ID
router.get('/:slugOrId', postController.getPostDetails);

// Get paginated list of posts
router.get('/', postController.getPosts);

// Soft delete a post
router.delete(
  '/:slugOrId',
  authenticateToken,
  validatePermissions(['ADMIN', 'CONTENT_MANAGER']),
  // createRateLimiter('deletePost'),
  postController.deletePost
);

// Get post edit history
router.get(
  '/:slugOrId/history',
  authenticateToken,
  validatePermissions(['ADMIN', 'CONTENT_MANAGER']),
  validateSchema(postHistorySchema),
  postController.getPostHistory
);

export default router;
