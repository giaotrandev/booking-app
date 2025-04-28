import { Request, Response, NextFunction } from 'express';
import i18next from 'i18next';

export const languageMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  global.currentLanguage = language;

  i18next.changeLanguage(language);

  next();
};

declare global {
  var currentLanguage: string;
}
