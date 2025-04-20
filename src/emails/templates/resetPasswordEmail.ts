interface ResetPasswordEmailParams {
  username: string;
  resetLink: string;
}

export const resetPasswordEmailTemplate = ({ username, resetLink }: ResetPasswordEmailParams): string => `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Password Reset Request</h2>
      <p>Hi ${username},</p>
      <p>We received a request to reset your password. Click the link below to proceed:</p>
      <a href="${resetLink}" style="background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>If you didn’t request this, please ignore this email.</p>
      <p>Best regards,<br>Your Team</p>
    </div>
  `;
