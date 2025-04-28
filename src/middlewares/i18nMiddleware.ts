// NOTE: ĐANG KHÔNG WORK, CÓ THỂ BỎ QUA VIỆC XEM LOGIC FILE DƯỚI ĐÂY

import { Request, Response, NextFunction } from 'express';
import { i18nMiddleware } from '#src/config/i18n';

// Đảm bảo thuộc tính language được gán đúng cách
export const setupI18n = () => i18nMiddleware;

export const languageDetector = (req: Request, res: Response, next: NextFunction) => {
  // Ưu tiên lấy ngôn ngữ từ header hoặc query parameter
  const langQuery = req.query.lang as string;
  const langHeader = req.headers['accept-language'];

  // Thiết lập ngôn ngữ
  if (langQuery && ['en', 'vi'].includes(langQuery)) {
    // Đảm bảo gán trực tiếp vào đối tượng req
    req.language = langQuery;
    // Lưu vào res.locals để truy cập ở mọi nơi
    res.locals.language = langQuery;
  } else if (langHeader && langHeader.startsWith('vi')) {
    req.language = 'vi';
    res.locals.language = 'vi';
  } else {
    req.language = 'en'; // Mặc định tiếng Anh
    res.locals.language = 'en';
  }

  next();
};
