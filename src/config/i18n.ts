import i18next from 'i18next';
import i18nextMiddleware from 'i18next-http-middleware';
import path from 'path';
import fs from 'fs';

// Hàm đọc file locale
const loadLocales = () => {
  const locales: Record<string, Record<string, any>> = {};
  const localeDir = path.join(__dirname, '../locales');

  // Đọc tất cả thư mục ngôn ngữ
  const languages = fs.readdirSync(localeDir);

  languages.forEach((lang) => {
    const langPath = path.join(localeDir, lang);
    if (fs.statSync(langPath).isDirectory()) {
      // Đọc file translation.json trong mỗi thư mục ngôn ngữ
      const translationPath = path.join(langPath, 'translation.json');
      if (fs.existsSync(translationPath)) {
        const content = fs.readFileSync(translationPath, 'utf8');
        locales[lang] = {
          translation: JSON.parse(content),
        };
      }
    }
  });

  return locales;
};

// Cấu hình i18next
i18next.init({
  lng: 'en', // Ngôn ngữ mặc định
  fallbackLng: 'en', // Ngôn ngữ dự phòng nếu key không tồn tại
  supportedLngs: ['en', 'vi'], // Các ngôn ngữ được hỗ trợ
  resources: loadLocales(),
  interpolation: {
    escapeValue: false, // Không cần escape vì backend không phải HTML
  },
  detection: {
    order: ['header', 'querystring', 'cookie'],
    lookupHeader: 'accept-language',
    lookupQuerystring: 'lang',
    lookupCookie: 'i18next',
    caches: ['cookie'],
  },
});

// Export middleware và instance i18next
export const i18nMiddleware = i18nextMiddleware.handle(i18next);
export default i18next;
