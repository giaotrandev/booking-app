import i18next from '#src/config/i18n';

/**
 * Dịch key message sang ngôn ngữ được chỉ định
 * @param key - Key message trong file translation
 * @param lang - Mã ngôn ngữ (en, vi)
 * @param options - Các tham số để nội suy vào message
 * @returns Chuỗi đã được dịch
 */
export const translate = (key: string, lang: string = 'en', options?: Record<string, any>): string => {
  const language = ['en', 'vi'].includes(lang) ? lang : process.env.DEFAULT_LANGUAGE || 'en';

  return i18next.t(key, { lng: language, ...options });
};
