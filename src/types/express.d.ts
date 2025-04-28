import 'express';
import { TokenPayload } from '#src/types/auth';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      language?: string;
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
