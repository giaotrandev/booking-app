// src/middlewares/mongooseErrorHandler.ts
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { sendBadRequest, sendServerError } from '#utils/apiResponse';

interface ValidationErrorItem {
  field: string;
  message: string;
}

export const mongooseErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Lấy ngôn ngữ từ request
  const language = (req.query.lang as string) || (req.headers['accept-language'] as string) || 'en';

  // Kiểm tra nếu là Mongoose Validation Error
  if (err instanceof mongoose.Error.ValidationError) {
    const validationErrors: ValidationErrorItem[] = Object.keys(err.errors).map((field) => ({
      field,
      message: err.errors[field].message,
    }));

    return sendBadRequest(res, 'errors.validationFailed', validationErrors, language);
  }

  // Kiểm tra lỗi trùng lặp (unique)
  if (err.code === 11000) {
    // Trích xuất tên trường bị trùng
    const duplicateField = Object.keys(err.keyPattern)[0];

    return sendBadRequest(res, 'errors.duplicateField', null, language, { field: duplicateField });
  }

  // Kiểm tra lỗi chuyển đổi kiểu (Cast Error)
  if (err instanceof mongoose.Error.CastError) {
    return sendBadRequest(
      res,
      'errors.invalidFieldType',
      {
        field: err.path,
        expectedType: err.kind,
      },
      language
    );
  }

  // Các lỗi kết nối hoặc không xác định
  console.error('Unhandled error:', err);
  return sendServerError(res, 'common.serverError', { message: err.message }, language);
};
