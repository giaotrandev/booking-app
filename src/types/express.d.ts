import 'express';
import { TokenPayload } from '#src/types/auth';
import { Multer } from 'multer';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      language?: string;
      file?: Multer.File;
      files?: {
        [fieldname: string]: Multer.File[];
      };
      t?: (key: string, options?: any) => string;
    }
    interface Response {
      locals: {
        language?: string;
        [key: string]: any;
      };
    }
  }
}

export {};
