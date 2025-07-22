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
      from: process.env.EMAIL_FROM || 'tranngocgiao147@gmail.com',
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

export const sendEmailWithAttachments = async (
  to: string,
  subject: string,
  htmlContent: string,
  attachments: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>
) => {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY is not defined');
  }

  sgMail.setApiKey(SENDGRID_API_KEY);

  try {
    const msg = {
      to,
      from: process.env.EMAIL_FROM || 'tranngocgiao147@gmail.com',
      subject,
      html: htmlContent,
      attachments: attachments.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content.toString('base64'),
        type: attachment.contentType,
        disposition: 'attachment',
      })),
    };

    await sgMail.send(msg);
    console.log('Booking confirmation email with tickets sent successfully to:', to);
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    throw error;
  }
};
