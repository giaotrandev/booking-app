import sgMail from '@sendgrid/mail';

export const sendEmail = async <T>(to: string, subject: string, template: (params: T) => string, params: T) => {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY is not defined');
  }

  sgMail.setApiKey(SENDGRID_API_KEY);

  try {
    const msg = {
      to,
      from: 'no-reply@bookingapp.com',
      subject,
      html: template(params),
    };

    await sgMail.send(msg);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};
