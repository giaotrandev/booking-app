import { Response } from 'express';
import { translate } from '#services/translationService';

/**
 * Interface cho response API chuẩn
 */
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

/**
 * Gửi response API chuẩn hóa với hỗ trợ đa ngôn ngữ
 * @param res - Express Response object
 * @param statusCode - HTTP status code
 * @param success - Trạng thái thành công
 * @param messageKey - Key của message trong file translation
 * @param data - Dữ liệu tùy chọn để kèm theo trong response
 * @param language - Mã ngôn ngữ (en, vi)
 * @param options - Tham số tùy chọn để nội suy vào message
 */
export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  success: boolean,
  messageKey: string,
  data: T | null = null,
  language: string = 'en',
  options?: Record<string, any>
): void => {
  const lang = ['en', 'vi'].includes(language) ? language : process.env.DEFAULT_LANGUAGE || 'en';

  const translatedMessage = translate(messageKey, lang, options);

  res.status(statusCode).json({
    success,
    message: translatedMessage,
    data,
  } as ApiResponse<T>);
};

/**
 * Gửi response thành công (HTTP 200 OK)
 * @param res - Express Response object
 * @param messageKey - Key của message thành công
 * @param data - Dữ liệu tùy chọn
 * @param language - Mã ngôn ngữ (en, vi)
 * @param options - Tham số tùy chọn
 */
export const sendSuccess = <T>(
  res: Response,
  messageKey: string = 'common.success',
  data: T | null = null,
  language: string = 'en',
  options?: Record<string, any>
): void => {
  sendResponse(res, 200, true, messageKey, data, language, options);
};

/**
 * Gửi response đã tạo thành công (HTTP 201 Created)
 * @param res - Express Response object
 * @param messageKey - Key của message thành công
 * @param data - Dữ liệu tùy chọn
 * @param language - Mã ngôn ngữ (en, vi)
 * @param options - Tham số tùy chọn
 */
export const sendCreated = <T>(
  res: Response,
  messageKey: string = 'common.created',
  data: T | null = null,
  language: string = 'en',
  options?: Record<string, any>
): void => {
  sendResponse(res, 201, true, messageKey, data, language, options);
};

/**
 * Gửi response lỗi bad request (HTTP 400 Bad Request)
 * @param res - Express Response object
 * @param messageKey - Key của message lỗi
 * @param data - Dữ liệu tùy chọn
 * @param language - Mã ngôn ngữ (en, vi)
 * @param options - Tham số tùy chọn
 */
export const sendBadRequest = <T>(
  res: Response,
  messageKey: string = 'common.badRequest',
  data: T | null = null,
  language: string = 'en',
  options?: Record<string, any>
): void => {
  sendResponse(res, 400, false, messageKey, data, language, options);
};

/**
 * Gửi response lỗi unauthorized (HTTP 401 Unauthorized)
 * @param res - Express Response object
 * @param messageKey - Key của message lỗi
 * @param data - Dữ liệu tùy chọn
 * @param language - Mã ngôn ngữ (en, vi)
 * @param options - Tham số tùy chọn
 */
export const sendUnauthorized = <T>(
  res: Response,
  messageKey: string = 'common.unauthorized',
  data: T | null = null,
  language: string = 'en',
  options?: Record<string, any>
): void => {
  sendResponse(res, 401, false, messageKey, data, language, options);
};

/**
 * Gửi response lỗi forbidden (HTTP 403 Forbidden)
 * @param res - Express Response object
 * @param messageKey - Key của message lỗi
 * @param data - Dữ liệu tùy chọn
 * @param language - Mã ngôn ngữ (en, vi)
 * @param options - Tham số tùy chọn
 */
export const sendForbidden = <T>(
  res: Response,
  messageKey: string = 'common.forbidden',
  data: T | null = null,
  language: string = 'en',
  options?: Record<string, any>
): void => {
  sendResponse(res, 403, false, messageKey, data, language, options);
};

/**
 * Gửi response lỗi not found (HTTP 404 Not Found)
 * @param res - Express Response object
 * @param messageKey - Key của message lỗi
 * @param data - Dữ liệu tùy chọn
 * @param language - Mã ngôn ngữ (en, vi)
 * @param options - Tham số tùy chọn
 */
export const sendNotFound = <T>(
  res: Response,
  messageKey: string = 'common.notFound',
  data: T | null = null,
  language: string = 'en',
  options?: Record<string, any>
): void => {
  sendResponse(res, 404, false, messageKey, data, language, options);
};

/**
 * Gửi response khi quá nhiều yêu cầu (HTTP 429 Too Many Requests)
 * @param res - Express Response object
 * @param messageKey - Key của message lỗi
 * @param data - Dữ liệu tùy chọn
 * @param language - Mã ngôn ngữ (en, vi)
 * @param options - Tham số tùy chọn
 */
export const sendTooManyRequests = <T>(
  res: Response,
  messageKey: string = 'common.tooManyRequests',
  data: T | null = null,
  language: string = 'en',
  options?: Record<string, any>
): void => {
  sendResponse(res, 429, false, messageKey, data, language, options);
};

/**
 * Gửi response lỗi server (HTTP 500 Internal Server Error)
 * @param res - Express Response object
 * @param messageKey - Key của message lỗi
 * @param data - Dữ liệu tùy chọn
 * @param language - Mã ngôn ngữ (en, vi)
 * @param options - Tham số tùy chọn
 */
export const sendServerError = <T>(
  res: Response,
  messageKey: string = 'common.serverError',
  data: T | null = null,
  language: string = 'en',
  options?: Record<string, any>
): void => {
  sendResponse(res, 500, false, messageKey, data, language, options);
};
