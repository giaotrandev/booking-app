import { Request, Response, NextFunction } from 'express';
import { PrismaClientValidationError, PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { sendBadRequest, sendNotFound, sendServerError } from '#utils/apiResponse';
import { translate } from '#services/translationService';
import { ValidationError } from './validationMiddleware';

/**
 * Middleware xử lý lỗi từ Prisma
 * @param err - Lỗi bắt được
 * @param req - Express Request object
 * @param res - Express Response object
 * @param next - NextFunction
 */
export const prismaErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';
  console.error('Prisma Error:', err);

  // Nếu đã xử lý response rồi thì bỏ qua
  if (res.headersSent) {
    return next(err);
  }

  // Prisma Validation Error
  if (err instanceof PrismaClientValidationError) {
    const errors = parsePrismaValidationError(err, language);
    return sendBadRequest(res, 'validation.invalidData', { fields: errors }, language);
  }

  // Prisma Known Request Error
  if (err instanceof PrismaClientKnownRequestError) {
    return handlePrismaKnownError(err, req, res, language);
  }

  // Lỗi khác
  return sendServerError(res, 'common.serverError', null, language);
};

/**
 * Phân tích lỗi validation từ Prisma
 * @param error - Lỗi từ Prisma
 * @param language - Ngôn ngữ
 * @returns Object lỗi
 */
function parsePrismaValidationError(error: PrismaClientValidationError, language: string): ValidationError {
  const errors: ValidationError = {};

  // Phân tích message lỗi
  const errorMessage = error.message;

  // Regex cho các mẫu lỗi thường gặp
  const unknownFieldMatch = errorMessage.match(/Unknown field\s+`([^`]+)`/);
  const invalidSelectionMatch = errorMessage.match(/Invalid field `([^`]+)` for select/);
  const argumentTypeMatch = errorMessage.match(/Argument `([^`]+)`.+expected\s+`([^`]+)`/s);
  const missingFieldMatch = errorMessage.match(/Argument `([^`]+)` is missing/);

  if (unknownFieldMatch && unknownFieldMatch[1]) {
    // Lỗi trường không tồn tại
    errors[unknownFieldMatch[1]] = translate('validation.unknownField', language);
  } else if (invalidSelectionMatch && invalidSelectionMatch[1]) {
    // Lỗi trường không hợp lệ trong select
    errors[invalidSelectionMatch[1]] = translate('validation.invalidSelection', language);
  } else if (argumentTypeMatch && argumentTypeMatch[1]) {
    // Lỗi kiểu dữ liệu
    const field = argumentTypeMatch[1];
    const expectedType = argumentTypeMatch[2];
    errors[field] = translate('validation.invalidType', language, { type: expectedType });
  } else if (missingFieldMatch && missingFieldMatch[1]) {
    // Lỗi thiếu trường bắt buộc
    errors[missingFieldMatch[1]] = translate('validation.required', language);
  } else {
    // Trường hợp không xác định
    errors['_general'] = translate('validation.invalidData', language);
  }

  return errors;
}

/**
 * Xử lý các lỗi đã biết từ Prisma
 * @param error - Lỗi từ Prisma
 * @param req - Express Request
 * @param res - Express Response
 * @param language - Ngôn ngữ
 */
function handlePrismaKnownError(
  error: PrismaClientKnownRequestError,
  req: Request,
  res: Response,
  language: string
): void {
  const errors: ValidationError = {};

  switch (error.code) {
    // Lỗi unique constraint
    case 'P2002': {
      const fields = (error.meta?.target as string[]) || [];
      fields.forEach((field) => {
        errors[field] = translate('validation.duplicate', language);
      });

      sendBadRequest(res, 'validation.invalidData', { fields: errors }, language);
      break;
    }

    // Lỗi relation không tìm thấy
    case 'P2003': {
      const field = (error.meta?.field_name as string)?.split('_').slice(0, -1).join('_') || 'id';
      errors[field] = translate('validation.invalidReference', language);

      sendBadRequest(res, 'validation.invalidData', { fields: errors }, language);
      break;
    }

    // Lỗi ràng buộc
    case 'P2004': {
      errors['_general'] = translate('validation.constraintFailed', language);

      sendBadRequest(res, 'validation.invalidData', { fields: errors }, language);
      break;
    }

    // Lỗi record không tồn tại
    case 'P2001':
    case 'P2015':
    case 'P2018':
    case 'P2025': {
      sendNotFound(res, 'common.notFound', null, language);
      break;
    }

    // Lỗi thiếu trường bắt buộc
    case 'P2011': {
      const fieldMatch = error.message.match(/`([^`]+)`/);
      const field = fieldMatch ? fieldMatch[1] : '_general';

      errors[field] = translate('validation.required', language);

      sendBadRequest(res, 'validation.invalidData', { fields: errors }, language);
      break;
    }

    // Lỗi khác
    default: {
      sendServerError(res, 'common.serverError', null, language);
    }
  }
}
