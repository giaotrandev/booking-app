import sgMail from '@sendgrid/mail';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
sgMail.setApiKey(SENDGRID_API_KEY ?? '');

export const sendEmail = async (to: string, subject: string, text: string) => {
  try {
    const msg = {
      to,
      from: 'tranngocgiao147@gmail.com', // Email đã xác thực trên SendGrid
      subject,
      text,
    };
    await sgMail.send(msg);
    console.log('do')
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};
