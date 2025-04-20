interface VerificationEmailParams {
  username: string;
  verificationLink: string;
}

export const verificationEmailTemplate = (params: VerificationEmailParams): string => {
  const { username, verificationLink } = params;
  const expirationTime = parseInt(process.env.EMAIL_VERIFICATION_EXPIRATION || '600000');
  const expirationMinutes = Math.floor(expirationTime / 60000);

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
};
