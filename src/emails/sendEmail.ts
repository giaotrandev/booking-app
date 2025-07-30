import * as brevo from '@getbrevo/brevo';

export const sendEmail = async <T>(to: string, subject: string, template: (params: T) => string, params: T) => {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;

  if (!BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not defined');
  }

  // Initialize Brevo client
  const apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);

  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.sender = {
      email: process.env.EMAIL_FROM || 'tranngocgiao25022001@gmail.com',
      name: process.env.EMAIL_FROM_NAME || 'Your App Name',
    };
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = template(params);

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

    // Debug response structure
    console.log('Full response:', JSON.stringify(result, null, 2));
    console.log('Response body:', result.body);
    console.log('Message ID:', result.body?.messageId);

    console.log('Email sent successfully to:', to);
    return result;
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
  const BREVO_API_KEY = process.env.BREVO_API_KEY;

  if (!BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not defined');
  }

  // Initialize Brevo client
  const apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);

  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.sender = {
      email: process.env.EMAIL_FROM || 'tranngocgiao25022001@gmail.com',
      name: process.env.EMAIL_FROM_NAME || 'Your App Name',
    };
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;

    // Convert attachments to Brevo format
    sendSmtpEmail.attachment = attachments.map((attachment) => ({
      name: attachment.filename,
      content: attachment.content.toString('base64'),
    }));

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

    // Debug response structure
    console.log('Full response:', JSON.stringify(result, null, 2));
    console.log('Response body:', result.body);
    console.log('Message ID:', result.body?.messageId);

    console.log('Booking confirmation email with tickets sent successfully to:', to);
    return result;
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    throw error;
  }
};
