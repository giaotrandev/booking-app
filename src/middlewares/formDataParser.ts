// formDataParser.ts
import { Request, Response, NextFunction } from 'express';

export const parseRequestData = (req: Request, res: Response, next: NextFunction) => {
  // Trường hợp đặc biệt: Nếu là multipart/form-data (đã được multer xử lý trước đó)
  // console.log("PArser: ", req.is('multipart/form-data') || req.headers['content-type']?.includes('multipart/form-data'));
  if (req.is('multipart/form-data') || req.headers['content-type']?.includes('multipart/form-data')) {
    // Parse các trường phức tạp từ form-data
    Object.keys(req.body).forEach((key) => {
      console.log('Body', req.body);
      const value = req.body[key];
      if (typeof value === 'string') {
        // Xử lý JSON strings
        if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
          try {
            req.body[key] = JSON.parse(value);
          } catch (err) {
            // Nếu parse lỗi, giữ nguyên giá trị
            console.log(`Failed to parse ${key} as JSON: ${value}`);
          }
        }
        // Xử lý boolean
        else if (value.toLowerCase() === 'true') {
          req.body[key] = true;
        } else if (value.toLowerCase() === 'false') {
          req.body[key] = false;
        }
        // Xử lý null
        else if (value.toLowerCase() === 'null') {
          req.body[key] = null;
        }
        // Xử lý undefined
        else if (value === 'undefined' || value === '') {
          // Trường rỗng trong form thường là '' thay vì undefined
          // Quyết định xem bạn muốn giữ '' hay chuyển thành null
          if (key === 'categoryId' || key === 'featuredImage') {
            req.body[key] = null; // Cho các trường liên kết
          }
        }
        // Xử lý số
        else if (!isNaN(Number(value)) && value !== '') {
          req.body[key] = Number(value);
        }
      }
    });
  }
  // console.log("PArser: ", req.body);
  next();
};
