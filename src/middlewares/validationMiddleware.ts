import { Request, Response, NextFunction } from 'express';
import { sendBadRequest } from '#utils/apiResponse';
import { translate } from '#services/translationService';
import { ZodError, ZodIssue, ZodSchema, z } from 'zod';

/**
 * Interface cho thông tin lỗi
 */
export interface ValidationError {
  [key: string]: string;
}

/**
 * Middleware validate dữ liệu sử dụng Zod schema
 * @param schema - Zod schema để validate
 * @returns Middleware function
 */
export const validateSchema = <T>(schema: ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

    try {
      // Validate dữ liệu đầu vào
      const validatedData = schema.parse(req.body);

      // Gán dữ liệu đã validate vào req cho các middleware sau sử dụng
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatZodErrors(error.issues, language);

        return sendBadRequest(res, 'validation.invalidData', { fields: errors }, language);
      }

      // Trường hợp lỗi không phải từ Zod
      next(error);
    }
  };
};

/**
 * Định dạng lỗi từ Zod thành đối tượng dễ sử dụng
 * @param issues - Danh sách lỗi từ ZodError
 * @param language - Ngôn ngữ hiển thị lỗi
 * @returns Đối tượng lỗi với key là tên trường, value là message lỗi
 */
const formatZodErrors = (issues: ZodIssue[], language: string): ValidationError => {
  const errors: ValidationError = {};

  issues.forEach((issue) => {
    // Lấy tên trường từ path
    const field = issue.path.join('.');

    // Map mã lỗi của Zod sang key trong file translation
    let translationKey: string;

    switch (issue.code) {
      case 'invalid_type':
        if (issue.received === 'undefined' || issue.received === 'null') {
          translationKey = 'validation.required';
        } else {
          translationKey = 'validation.invalidType';
        }
        break;
      case 'too_small':
        if (issue.type === 'string') {
          translationKey = 'validation.tooShort';
        } else {
          translationKey = 'validation.tooSmall';
        }
        break;
      case 'too_big':
        if (issue.type === 'string') {
          translationKey = 'validation.tooLong';
        } else {
          translationKey = 'validation.tooLarge';
        }
        break;
      case 'invalid_string':
        if (issue.validation === 'email') {
          translationKey = 'validation.invalidEmail';
        } else if (issue.validation === 'regex') {
          translationKey = 'validation.invalidFormat';
        } else {
          translationKey = 'validation.invalidString';
        }
        break;
      case 'invalid_enum_value':
        translationKey = 'validation.invalidOption';
        break;
      default:
        translationKey = 'validation.invalid';
    }

    // Thêm thông tin bổ sung cho message
    const params: Record<string, any> = {};

    if (issue.code === 'too_small') {
      params.limit = (issue as z.ZodTooSmallIssue).minimum;
    } else if (issue.code === 'too_big') {
      params.limit = (issue as z.ZodTooBigIssue).maximum;
    }

    if (issue.code === 'invalid_enum_value') {
      params.options = issue.options ? issue.options.join(', ') : '';
    }

    // Dịch thông báo lỗi
    errors[field] = translate(translationKey, language, params);
  });

  return errors;
};

/**
 * Các schema Zod thường dùng
 */
export const CommonValidations = {
  // Thông tin cá nhân
  name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  password: z
    .string()
    .min(8)
    .max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
      message: 'validation.passwordRequirements',
    }),
  phoneNumber: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/)
    .max(15)
    .optional()
    .nullable(),

  // Giá trị số
  positiveNumber: z.number().positive(),
  age: z.number().int().min(13).max(120),

  // Giá trị Boolean
  boolean: z.boolean(),

  // Ngày tháng
  date: z.date(),

  // MongoDB ID
  mongoId: z.string().regex(/^[0-9a-fA-F]{24}$/),

  // UUID
  uuid: z.string().uuid(),

  // Giá trị Enum tùy chỉnh
  createEnum: <T extends [string, ...string[]]>(values: T) => z.enum(values),

  // Trạng thái người dùng
  userStatus: z.enum(['ACTIVE', 'PENDING', 'BLOCKED', 'DELETED']),

  // Giới tính
  gender: z.enum(['MALE', 'FEMALE']),

  // Vai trò người dùng
  userRole: z.enum(['ADMIN', 'USER', 'MODERATOR']),
};
