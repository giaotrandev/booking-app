import ms from 'ms';

export interface VerificationEmailParams {
  username: string;
  verificationLink: string;
}
const EMAIL_VERIFICATION_EXPIRATION = process.env.EMAIL_VERIFICATION_EXPIRATION || '10m';
const expirationTime = ms(EMAIL_VERIFICATION_EXPIRATION as ms.StringValue);
const expirationMinutes = Math.floor(expirationTime / 60000);

const emailTemplates: Record<
  string,
  { subject: string; template: (params: VerificationEmailParams & { language?: string }) => string }
> = {
  vi: {
    subject: 'Xác thực tài khoản của bạn',
    template: ({ username, verificationLink }) => {
      return `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333; text-align: center;">Xác thực tài khoản của bạn</h2>
          <p>Xin chào ${username},</p>
          <p>Cảm ơn bạn đã đăng ký tài khoản. Vui lòng nhấp vào nút bên dưới để xác thực email của bạn:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Xác thực Email</a>
          </div>
          <p>Hoặc bạn có thể sao chép và dán liên kết sau vào trình duyệt của mình:</p>
          <p>${verificationLink}</p>
          <p><strong>Lưu ý:</strong> Liên kết này sẽ hết hạn sau ${expirationMinutes} phút.</p>
          <p>Nếu bạn không yêu cầu xác thực này, vui lòng bỏ qua email này.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #777; font-size: 12px; text-align: center;">Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
      `;
    },
  },
  en: {
    subject: 'Verify Your Account',
    template: ({ username, verificationLink }) => {
      return `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333; text-align: center;">Verify Your Account</h2>
          <p>Hello ${username},</p>
          <p>Thank you for registering. Please click the button below to verify your email:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
          </div>
          <p>Or you can copy and paste the following link into your browser:</p>
          <p>${verificationLink}</p>
          <p><strong>Note:</strong> This link will expire in ${expirationMinutes} minutes.</p>
          <p>If you did not request this verification, please ignore this email.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #777; font-size: 12px; text-align: center;">This is an automated email, please do not reply.</p>
        </div>
      `;
    },
  },
};

export const verificationEmailTemplate = (params: VerificationEmailParams & { language?: string }): string => {
  const language = (params as any).language || process.env.DEFAULT_LANGUAGE || 'en';
  const template = emailTemplates[language];

  return template.template(params);
};
