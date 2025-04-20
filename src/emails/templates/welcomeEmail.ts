interface WelcomeEmailParams {
  username: string;
  activationLink: string;
}

export const welcomeEmailTemplate = ({ username, activationLink }: WelcomeEmailParams): string => `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Welcome, ${username}!</h2>
      <p>Thank you for joining us. Please activate your account by clicking the link below:</p>
      <a href="${activationLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Activate Now</a>
      <p>Best regards,<br>Your Team</p>
    </div>
  `;
