import { Request, Response } from 'express';
import { prisma } from '#config/db';
import { sendSuccess, sendBadRequest, sendNotFound, sendServerError } from '#utils/apiResponse';
import slugify from 'slugify';
import * as PostImageService from '#utils/postImgHandler';

export const createPost = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const {
      title,
      content,
      excerpt,
      featuredImage,
      categoryId,
      tags, // Changed from tagIds to tags (array of tag names)
      metaTitle,
      metaDescription,
      metaKeywords,
      status,
      scheduledAt,
    } = req.body;

    // Handle file upload if it came through multer
    const uploadedFeaturedImage = req.file || featuredImage;

    // Validate required fields
    if (!title || !content) {
      sendBadRequest(res, 'post.missingRequiredFields', null, language);
      return;
    }

    // Process content images (handles base64 images in content)
    const processedContent = await PostImageService.processContentImages(content);

    // Process featured image if provided (handles multiple formats)
    const processedFeaturedImage = uploadedFeaturedImage
      ? await PostImageService.handleFeaturedImage(uploadedFeaturedImage)
      : null;

    // Generate slug
    let slug = slugify(title, {
      lower: true,
      strict: true,
      trim: true,
    });

    // Ensure unique slug
    let uniqueSlug = slug;
    let counter = 1;
    while (
      await prisma.post.findUnique({
        where: { slug: uniqueSlug },
      })
    ) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    // Handle tags - process tags before creating the post
    let tagConnections = undefined;

    if (tags && Array.isArray(tags) && tags.length > 0) {
      // Create/connect tags
      const processedTags = await Promise.all(
        tags.map(async (tagName: string) => {
          // Trim tag name to remove whitespace
          const trimmedTagName = tagName.trim();
          if (!trimmedTagName) return null;

          // Create slug for the tag
          const tagSlug = slugify(trimmedTagName, {
            lower: true,
            strict: true,
            trim: true,
          });

          // Try to find existing tag
          let tag = await prisma.tag.findFirst({
            where: {
              OR: [{ name: trimmedTagName }, { slug: tagSlug }],
            },
          });

          // If tag doesn't exist, create it
          if (!tag) {
            tag = await prisma.tag.create({
              data: {
                name: trimmedTagName,
                slug: tagSlug,
                status: 'ACTIVE',
              },
            });
          }

          return tag.id;
        })
      );

      // Filter out null values and create connections
      const validTagIds = processedTags.filter((id) => id !== null) as string[];

      if (validTagIds.length > 0) {
        tagConnections = {
          create: validTagIds.map((tagId) => ({
            tag: { connect: { id: tagId } },
          })),
        };
      }
    }

    // Create post
    const newPost = await prisma.post.create({
      data: {
        title,
        slug: uniqueSlug,
        content: processedContent,
        excerpt,
        featuredImage: processedFeaturedImage,
        authorId: (req.user as { userId: string }).userId,
        // authorId: '6808697d2e2f10cfc98f34ae',
        categoryId,
        metaTitle: metaTitle || title,
        metaDescription: metaDescription || excerpt,
        metaKeywords,
        status: status || 'DRAFT',
        scheduledAt,
        postTags: tagConnections, // Use the processed tag connections
      },
      include: {
        category: true,
        postTags: {
          include: {
            tag: true,
          },
        },
      },
    });

    sendSuccess(res, 'post.created', { post: newPost }, language);
  } catch (error) {
    console.error('Error creating post:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

// Update an existing post
export const updatePost = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { slugOrId } = req.params;
    // Build the OR conditions for the query
    const orConditions: any[] = [{ slug: slugOrId }];

    if (isValidObjectId(slugOrId)) {
      orConditions.push({ id: slugOrId });
    }

    // Lấy dữ liệu từ request body
    let {
      title,
      content,
      excerpt,
      featuredImage,
      categoryId,
      tags, // Changed from tagIds to tags (array of tag names)
      metaTitle,
      metaDescription,
      metaKeywords,
      status,
      scheduledAt,
      changeReason,
    } = req.body;

    // Find existing post
    const existingPost = await prisma.post.findFirst({
      where: {
        OR: orConditions,
      },
      include: {
        postTags: {
          include: {
            tag: true,
          },
        },
        category: true,
      },
    });

    if (!existingPost) {
      sendNotFound(res, 'post.notFound', null, language);
      return;
    }

    // Khởi tạo object updateData trống - chỉ chứa các trường thực sự thay đổi
    const updateData: Record<string, any> = {};

    // Xử lý các trường text/dữ liệu chỉ khi có giá trị trong request
    if (title !== undefined) updateData.title = title;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
    if (metaKeywords !== undefined) updateData.metaKeywords = metaKeywords;
    if (status !== undefined) updateData.status = status;
    if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt;
    if (categoryId !== undefined) updateData.categoryId = categoryId;

    // Xử lý các trường phức tạp

    // 1. Content: xử lý base64 images
    if (content !== undefined) {
      updateData.content = await PostImageService.processContentImages(content);
    }

    // 2. Featured Image: xử lý file upload hoặc URL
    if (req.file) {
      updateData.featuredImage = await PostImageService.handleFeaturedImage(req.file);
    } else if (featuredImage !== undefined) {
      updateData.featuredImage = await PostImageService.handleFeaturedImage(featuredImage);
    }

    // 3. Slug: cập nhật nếu title thay đổi
    if (title !== undefined && title !== existingPost.title) {
      const baseSlug = slugify(title, {
        lower: true,
        strict: true,
        trim: true,
      });

      // Ensure unique slug
      let uniqueSlug = baseSlug;
      let counter = 1;
      let isSlugUnique = false;

      while (!isSlugUnique) {
        const existingSlugPost = await prisma.post.findFirst({
          where: {
            slug: uniqueSlug,
            NOT: { id: existingPost.id },
          },
        });

        if (!existingSlugPost) {
          isSlugUnique = true;
        } else {
          uniqueSlug = `${baseSlug}-${counter}`;
          counter++;
        }
      }

      updateData.slug = uniqueSlug;
    }

    // 4. Tags: xử lý các liên kết nhiều-nhiều
    if (tags !== undefined) {
      // Get the existing tag names for history tracking
      const existingTagNames = existingPost.postTags.map((pt) => pt.tag.name);

      // Process tags - create new ones if needed and get IDs
      const processedTags = await Promise.all(
        tags.map(async (tagName: string) => {
          // Trim tag name to remove whitespace
          const trimmedTagName = tagName.trim();
          if (!trimmedTagName) return null;

          // Create slug for the tag
          const tagSlug = slugify(trimmedTagName, {
            lower: true,
            strict: true,
            trim: true,
          });

          // Try to find existing tag
          let tag = await prisma.tag.findFirst({
            where: {
              OR: [{ name: trimmedTagName }, { slug: tagSlug }],
            },
          });

          // If tag doesn't exist, create it
          if (!tag) {
            tag = await prisma.tag.create({
              data: {
                name: trimmedTagName,
                slug: tagSlug,
                status: 'ACTIVE',
              },
            });
          }

          return tag.id;
        })
      );

      // Filter out null values
      const validTagIds = processedTags.filter((id) => id !== null) as string[];

      // Update the postTags relation
      updateData.postTags = {
        deleteMany: {}, // Remove all existing tag connections
        create: validTagIds.map((tagId) => ({
          tag: { connect: { id: tagId } },
        })),
      };

      // Store original tag names for history tracking
      tags = Array.isArray(tags) ? tags.filter((t) => t.trim() !== '') : [];
    }

    console.log('Update data:', JSON.stringify(updateData, null, 2));

    // Kiểm tra nếu không có dữ liệu để cập nhật
    if (Object.keys(updateData).length === 0) {
      sendSuccess(res, 'post.noChange', { post: existingPost }, language);
      return;
    }

    // Update post with history tracking
    const updatedPost = await prisma.$transaction(async (tx) => {
      // Prepare changed fields for history
      const changedFields: Record<string, any> = {};

      // So sánh và theo dõi thay đổi cho tất cả các trường trong updateData
      Object.keys(updateData).forEach((field) => {
        // Skip postTags field as it requires special handling
        if (field !== 'postTags') {
          changedFields[field] = {
            from: existingPost[field as keyof typeof existingPost],
            to: updateData[field],
          };
        }
      });

      // Theo dõi thay đổi tags nếu có
      if (tags !== undefined) {
        const oldTags = existingPost.postTags.map((pt: any) => pt.tag.name);
        changedFields['tags'] = {
          from: oldTags,
          to: Array.isArray(tags) ? tags : [],
        };
      }

      // Tạo bản ghi lịch sử nếu có thay đổi
      if (Object.keys(changedFields).length > 0) {
        await tx.postHistory.create({
          data: {
            postId: existingPost.id,
            changedFields: changedFields,
            changedBy: (req.user as { userId: string })?.userId || '6808697d2e2f10cfc98f34ae', // Fallback for testing
            changeReason: changeReason || 'General Update',
          },
        });
      }

      // Dọn dẹp hình ảnh không sử dụng nếu nội dung hoặc hình ảnh nổi bật thay đổi
      if (updateData.content || updateData.featuredImage) {
        await PostImageService.cleanupUnusedImages(
          existingPost.content,
          updateData.content || existingPost.content,
          existingPost.featuredImage,
          updateData.featuredImage || existingPost.featuredImage
        );
      }

      // Cập nhật bài viết CHỈ với các trường đã được chỉ định
      return tx.post.update({
        where: { id: existingPost.id },
        data: updateData,
        include: {
          category: true,
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          postTags: {
            include: {
              tag: true,
            },
          },
        },
      });
    });

    sendSuccess(res, 'post.updated', { post: updatedPost }, language);
  } catch (error) {
    console.error('Error updating post:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};
// Get post by slug or ID
export const getPostDetails = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { slugOrId } = req.params;
    // Build the OR conditions for the query
    const orConditions: any[] = [{ slug: slugOrId }];

    if (isValidObjectId(slugOrId)) {
      orConditions.push({ id: slugOrId });
    }

    const post = await prisma.post.findFirst({
      where: {
        OR: orConditions,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        category: true,
        postTags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!post) {
      sendNotFound(res, 'post.notFound', null, language);
      return;
    }

    sendSuccess(res, 'post.retrieved', { post }, language);
  } catch (error) {
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Get paginated list of posts
export const getPosts = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { page = 1, limit = 10, categoryId, tagId, status, search } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Prepare where conditions
    const whereConditions: any = {
      isDeleted: false,
    };

    // Filter by category
    if (categoryId) {
      whereConditions.categoryId = categoryId as string;
    }

    // Filter by tag
    if (tagId) {
      whereConditions.postTags = {
        some: {
          tagId: tagId as string,
        },
      };
    }

    // Filter by status
    if (status) {
      whereConditions.status = status as string;
    }

    // Search conditions
    if (search) {
      whereConditions.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } },
        { excerpt: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Fetch posts
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: whereConditions,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          category: true,
          postTags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limitNum,
      }),
      prisma.post.count({ where: whereConditions }),
    ]);

    sendSuccess(
      res,
      'post.listRetrieved',
      {
        posts,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalPosts: total,
        },
      },
      language
    );
  } catch (error) {
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

// Soft delete a post
export const deletePost = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { slugOrId } = req.params;
    // Build the OR conditions for the query
    const orConditions: any[] = [{ slug: slugOrId }];

    if (isValidObjectId(slugOrId)) {
      orConditions.push({ id: slugOrId });
    }

    // Find existing post
    const existingPost = await prisma.post.findFirst({
      where: {
        OR: orConditions,
      },
    });

    if (!existingPost) {
      sendNotFound(res, 'post.notFound', null, language);
      return;
    }

    // Soft delete
    const deletedPost = await prisma.post.update({
      where: { id: existingPost.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    sendSuccess(res, 'post.deleted', { post: deletedPost }, language);
  } catch (error) {
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

// Get post history
export const getPostHistory = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { slugOrId } = req.params;
    // Build the OR conditions for the query
    const orConditions: any[] = [{ slug: slugOrId }];

    if (isValidObjectId(slugOrId)) {
      orConditions.push({ id: slugOrId });
    }

    const { page = 1, limit = 10 } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Verify post exists
    const postExists = await prisma.post.findFirst({
      where: {
        OR: orConditions,
      },
    });

    if (!postExists) {
      sendNotFound(res, 'post.notFound', null, language);
      return;
    }

    // Fetch history
    const [histories, total] = await Promise.all([
      prisma.postHistory.findMany({
        where: { postId: postExists.id },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limitNum,
        include: {
          post: {
            select: {
              title: true,
            },
          },
        },
      }),
      prisma.postHistory.count({ where: { postId: postExists.id } }),
    ]);

    sendSuccess(
      res,
      'post.historyRetrieved',
      {
        histories,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalHistoryEntries: total,
        },
      },
      language
    );
  } catch (error) {
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

// Create a new category
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { name, description } = req.body;

    // Validate required fields
    if (!name) {
      sendBadRequest(res, 'category.missingName', null, language);
      return;
    }

    // Generate slug
    let slug = slugify(name, {
      lower: true,
      strict: true,
      trim: true,
    });

    // Ensure unique slug
    let uniqueSlug = slug;
    let counter = 1;
    while (
      await prisma.category.findUnique({
        where: { slug: uniqueSlug },
      })
    ) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    // Create category
    const newCategory = await prisma.category.create({
      data: {
        name,
        slug: uniqueSlug,
        description,
      },
    });

    sendSuccess(res, 'category.created', { category: newCategory }, language);
  } catch (error) {
    console.error('Error creating category:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

// Update an existing category
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { slugOrId } = req.params;
    // Build the OR conditions for the query
    const orConditions: any[] = [{ slug: slugOrId }];

    if (isValidObjectId(slugOrId)) {
      orConditions.push({ id: slugOrId });
    }
    const { name, description, status } = req.body;

    // Find existing category
    const existingCategory = await prisma.category.findFirst({
      where: {
        OR: orConditions,
      },
    });

    if (!existingCategory) {
      sendNotFound(res, 'category.notFound', null, language);
      return;
    }

    // Generate new slug if name changed
    let slug = existingCategory.slug;
    if (name && name !== existingCategory.name) {
      slug = slugify(name, {
        lower: true,
        strict: true,
        trim: true,
      });

      // Ensure unique slug
      let uniqueSlug = slug;
      let counter = 1;
      while (
        await prisma.category.findUnique({
          where: {
            slug: uniqueSlug,
            NOT: { id: existingCategory.id },
          },
        })
      ) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }
      slug = uniqueSlug;
    }

    // Update category
    const updatedCategory = await prisma.category.update({
      where: { id: existingCategory.id },
      data: {
        name: name || undefined,
        slug,
        description: description || undefined,
        status: status || undefined,
      },
    });

    sendSuccess(res, 'category.updated', { category: updatedCategory }, language);
  } catch (error) {
    console.error('Error updating category:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

// Get category by slug or ID
export const getCategoryDetails = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { slugOrId } = req.params;

    // Build the OR conditions for the query
    const orConditions: any[] = [{ slug: slugOrId }];

    if (isValidObjectId(slugOrId)) {
      orConditions.push({ id: slugOrId });
    }

    const category = await prisma.category.findFirst({
      where: {
        OR: orConditions,
        isDeleted: false,
      },
      include: {
        posts: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    if (!category) {
      sendNotFound(res, 'category.notFound', null, language);
      return;
    }

    sendSuccess(res, 'category.retrieved', { category }, language);
  } catch (error) {
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

// Get paginated list of categories
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { page = 1, limit = 10, status, search } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Prepare where conditions
    const whereConditions: any = {
      isDeleted: false,
    };

    // Filter by status
    if (status) {
      whereConditions.status = status as string;
    }

    // Search conditions
    if (search) {
      whereConditions.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Fetch categories
    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where: whereConditions,
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limitNum,
      }),
      prisma.category.count({ where: whereConditions }),
    ]);

    sendSuccess(
      res,
      'category.listRetrieved',
      {
        categories,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalCategories: total,
        },
      },
      language
    );
  } catch (error) {
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

// Soft delete a category
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { slugOrId } = req.params;
    // Build the OR conditions for the query
    const orConditions: any[] = [{ slug: slugOrId }];

    if (isValidObjectId(slugOrId)) {
      orConditions.push({ id: slugOrId });
    }

    // Find existing category
    const existingCategory = await prisma.category.findFirst({
      where: {
        OR: orConditions,
      },
    });

    if (!existingCategory) {
      sendNotFound(res, 'category.notFound', null, language);
      return;
    }

    // Check if category has associated posts
    const postCount = await prisma.post.count({
      where: { categoryId: existingCategory.id },
    });

    if (postCount > 0) {
      sendBadRequest(res, 'category.hasAssociatedPosts', null, language);
      return;
    }

    // Soft delete
    const deletedCategory = await prisma.category.update({
      where: { id: existingCategory.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    sendSuccess(res, 'category.deleted', { category: deletedCategory }, language);
  } catch (error) {
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

// Create a new tag
export const createTag = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { name } = req.body;

    // Validate required fields
    if (!name) {
      sendBadRequest(res, 'tag.missingName', null, language);
      return;
    }

    // Generate slug
    let slug = slugify(name, {
      lower: true,
      strict: true,
      trim: true,
    });

    // Ensure unique slug
    let uniqueSlug = slug;
    let counter = 1;
    while (
      await prisma.tag.findUnique({
        where: { slug: uniqueSlug },
      })
    ) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    // Create tag
    const newTag = await prisma.tag.create({
      data: {
        name,
        slug: uniqueSlug,
      },
    });

    sendSuccess(res, 'tag.created', { tag: newTag }, language);
  } catch (error) {
    console.error('Error creating tag:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

// Update an existing tag
export const updateTag = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { slugOrId } = req.params;
    console.log('Request params:', req.params);
    console.log('Request body:', req.body);
    console.log('slugOrId:', slugOrId);

    const orConditions: any[] = [{ slug: slugOrId }];

    if (isValidObjectId(slugOrId)) {
      orConditions.push({ _id: slugOrId }); // Kiểm tra xem field thực sự là id hay _id
    }

    console.log('OR conditions:', JSON.stringify(orConditions));

    const existingTag = await prisma.tag.findFirst({
      where: {
        OR: orConditions,
      },
    });

    console.log('Existing tag found:', existingTag);

    if (!existingTag) {
      console.log('Tag not found with conditions:', orConditions);
      sendNotFound(res, 'tag.notFound', null, language);
      return;
    }

    const { name, status } = req.body;
    console.log('Processing update with name:', name, 'status:', status);

    // Khởi tạo object updateData
    const updateData: any = {};

    // Chỉ thêm các trường có giá trị vào updateData
    if (name !== undefined) {
      updateData.name = name;
      // Xử lý slug khi name thay đổi
      if (name !== existingTag.name) {
        let slug = slugify(name, {
          lower: true,
          strict: true,
          trim: true,
        });

        let uniqueSlug = slug;
        let counter = 1;
        while (
          await prisma.tag.findUnique({
            where: {
              slug: uniqueSlug,
              NOT: { id: existingTag.id },
            },
          })
        ) {
          uniqueSlug = `${slug}-${counter}`;
          counter++;
        }
        updateData.slug = uniqueSlug;
      }
    }

    if (status !== undefined) {
      updateData.status = status;
    }

    console.log('Update data:', updateData);

    // Update tag chỉ với các trường đã được chỉ định
    const updatedTag = await prisma.tag.update({
      where: { id: existingTag.id },
      data: updateData,
    });

    console.log('Updated tag:', updatedTag);
    sendSuccess(res, 'tag.updated', { tag: updatedTag }, language);
  } catch (error) {
    console.error('Error updating tag:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

// Get tag by slug or ID
export const getTagDetails = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { slugOrId } = req.params;

    // Build the OR conditions for the query
    const orConditions: any[] = [{ slug: slugOrId }];

    if (isValidObjectId(slugOrId)) {
      orConditions.push({ id: slugOrId });
    }

    const tag = await prisma.tag.findFirst({
      where: {
        OR: orConditions,
      },
      include: {
        postTags: {
          include: {
            post: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
      },
    });
    console.log(tag);

    if (!tag) {
      sendNotFound(res, 'tag.notFound', null, language);
      return;
    }

    // Transform the response to flatten posts
    const tagWithPosts = {
      ...tag,
      posts: tag.postTags.map((pt) => pt.post),
    };

    sendSuccess(res, 'tag.retrieved', { tag: tagWithPosts }, language);
  } catch (error) {
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

// Get paginated list of tags
export const getTags = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { page = 1, limit = 10, status, search } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Prepare where conditions
    const whereConditions: any = {};

    // Filter by status
    if (status) {
      whereConditions.status = status as string;
    }

    // Search conditions
    if (search) {
      whereConditions.name = { contains: search as string, mode: 'insensitive' };
    }

    // Fetch tags with post count
    const [tags, total] = await Promise.all([
      prisma.tag.findMany({
        where: whereConditions,
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limitNum,
        include: {
          _count: {
            select: { postTags: true },
          },
        },
      }),
      prisma.tag.count({ where: whereConditions }),
    ]);

    // Transform tags to include post count
    const tagsWithPostCount = tags.map((tag) => ({
      ...tag,
      postCount: tag._count.postTags,
    }));

    sendSuccess(
      res,
      'tag.listRetrieved',
      {
        tags: tagsWithPostCount,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalTags: total,
        },
      },
      language
    );
  } catch (error) {
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};
