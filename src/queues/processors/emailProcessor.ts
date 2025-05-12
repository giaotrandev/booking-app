import { QueueType, getQueue } from '#queues/index';

// Change this to your actual email sending library
// Shown with SendGrid as an example
import sgMail from '@sendgrid/mail';

// Set API key from env variable
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  from?: string;
  text?: string;
}

/**
 * Set up the processor for emails
 */
export function setupEmailProcessor(): void {
  const queue = getQueue(QueueType.EMAIL);

  // Set concurrency from environment variable
  const concurrency = parseInt(process.env.EMAIL_CONCURRENCY || '5', 10);

  // Process jobs with the specified concurrency
  queue.process(concurrency, async (job) => {
    const { to, subject, html, from, text } = job.data as EmailJobData;

    console.log(`Processing email to: ${to}, subject: ${subject}`);

    const defaultFrom = process.env.DEFAULT_EMAIL_FROM || 'noreply@yourdomain.com';

    try {
      // Send the email
      await sgMail.send({
        to,
        from: from || defaultFrom,
        subject,
        html,
        text: text || '', // Plain text version
      });

      console.log(`Email sent to ${to}`);
      return { success: true, to };
    } catch (error) {
      console.error('Error sending email:', error);
      throw error; // Rethrow to trigger Bull's retry mechanism
    }
  });

  console.log(`Email processor initialized with concurrency ${concurrency}`);
}
