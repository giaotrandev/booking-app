import { z } from 'zod';
import { CommonValidations } from '#middlewares/validationMiddleware';

// Post Status Enum
export const PostStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED']);

/**
 * Schema validation for creating a post
 */
const basePostSchema = z.object({
  title: z.string().min(5, { message: 'validation.titleTooShort' }).max(250, { message: 'validation.titleTooLong' }),
  content: z.string().min(10, { message: 'validation.contentTooShort' }),
  excerpt: z.string().optional(),
  featuredImage: z.string().url().optional(),
  categoryId: z.string().nullable().optional(), // MongoDB ObjectId
  tags: z.array(z.string()).optional(), // Array of MongoDB ObjectIds
  metaTitle: z.string().max(60, { message: 'validation.metaTitleTooLong' }).optional(),
  metaDescription: z.string().max(160, { message: 'validation.metaDescriptionTooLong' }).optional(),
  metaKeywords: z.string().optional(),
  status: PostStatusEnum.default('DRAFT'),
  scheduledAt: z.preprocess((arg) => {
    if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
    return null;
  }, z.date().nullable().optional()),
});

export const createPostSchema = basePostSchema.superRefine((data, ctx) => {
  if (data.status === 'SCHEDULED' && !data.scheduledAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'validation.scheduledAtRequired',
      path: ['scheduledAt'],
    });
  }
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

/**
 * Schema validation for updating a post
 */
export const updatePostSchema = basePostSchema.partial().extend({
  changeReason: z.string().optional(),
});

export type UpdatePostInput = z.infer<typeof updatePostSchema>;

/**
 * Schema validation for post listing query parameters
 */
export const postListingSchema = z.object({
  page: z.preprocess((val) => Number(val), z.number().int().positive().optional().default(1)),
  limit: z.preprocess((val) => Number(val), z.number().int().positive().optional().default(10)),
  categoryId: z.string().optional(), // MongoDB ObjectId
  tagId: z.string().optional(), // MongoDB ObjectId
  status: PostStatusEnum.optional(),
  search: z.string().optional(),
});

export type PostListingInput = z.infer<typeof postListingSchema>;

/**
 * Schema validation for post history query parameters
 */
export const postHistorySchema = z.object({
  page: z.preprocess((val) => Number(val), z.number().int().positive().optional().default(1)),
  limit: z.preprocess((val) => Number(val), z.number().int().positive().optional().default(10)),
});

export type PostHistoryInput = z.infer<typeof postHistorySchema>;

const CommonStatus = ['ACTIVE', 'INACTIVE'] as const;

// Category Creation Schema
export const createCategorySchema = z.object({
  name: z
    .string()
    .min(2, { message: 'Category name must be at least 2 characters long' })
    .max(100, { message: 'Category name must be less than 100 characters' }),
  description: z.string().optional().nullable(),
});

export type CreateCategorySchema = z.infer<typeof createCategorySchema>;

// Category Update Body Schema
export const updateCategorySchema = z.object({
  name: z
    .string()
    .min(2, { message: 'Category name must be at least 2 characters long' })
    .max(100, { message: 'Category name must be less than 100 characters' })
    .optional(),
  description: z.string().optional().nullable(),
  status: z.enum(CommonStatus).optional(),
});

// Types for TypeScript
export type UpdateCategorySchema = z.infer<typeof updateCategorySchema>;

// Tag Creation Schema
export const createTagSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'Tag name must be at least 2 characters long' })
    .max(50, { message: 'Tag name must be less than 50 characters' }),
});

export type CreateTagSchema = z.infer<typeof createTagSchema>;

// Tag Update Schema
export const updateTagSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'Tag name must be at least 2 characters long' })
    .max(50, { message: 'Tag name must be less than 50 characters' })
    .optional(),
  status: z.enum(CommonStatus).optional(),
});

export type UpdateTagSchema = z.infer<typeof updateTagSchema>;
