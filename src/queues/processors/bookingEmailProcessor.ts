// queues/processors/bookingEmailProcessor.ts
import { QueueType, getQueue } from '#queues/index';
import { prisma } from '#src/config/db';

import * as brevo from '@getbrevo/brevo';
import * as fs from 'fs';
import * as path from 'path';
import handlebars from 'handlebars';
import { generatePublicTicketPDF } from '#src/services/pdfService';
import { getSystemConfig } from '#src/services/systemConfigService';
import { getPublicR2Url } from '#src/services/r2Service';
import { processLogoForEmail } from '#src/services/imageService';

interface BookingEmailJobData {
  bookingId: string;
}

/**
 * Set up the processor for booking confirmation emails
 */
export function setupBookingEmailProcessor(): void {
  const queue = getQueue(QueueType.EMAIL_BOOKING_CONFIRMATION);

  // Set concurrency
  const concurrency = parseInt(process.env.BOOKING_EMAIL_CONCURRENCY || '2', 10);

  queue.process(concurrency, async (job) => {
    const { bookingId } = job.data as BookingEmailJobData;

    console.log(`Processing booking confirmation email for booking: ${bookingId}`);

    try {
      // Get booking with all required data
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          user: true,
          pickup: {
            select: {
              name: true,
              address: true,
              ward: {
                select: {
                  name: true,
                  district: {
                    select: {
                      name: true,
                      province: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          dropoff: {
            select: {
              name: true,
              address: true,
              ward: {
                select: {
                  name: true,
                  district: {
                    select: {
                      name: true,
                      province: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!booking) {
        throw new Error(`Booking ${bookingId} not found`);
      }

      // Get tickets
      const tickets = await prisma.ticket.findMany({
        where: { bookingId },
        include: {
          booking: {
            include: {
              user: true,
              pickup: {
                select: {
                  name: true,
                  address: true,
                  ward: {
                    select: {
                      name: true,
                      district: {
                        select: {
                          name: true,
                          province: {
                            select: {
                              name: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              dropoff: {
                select: {
                  name: true,
                  address: true,
                  ward: {
                    select: {
                      name: true,
                      district: {
                        select: {
                          name: true,
                          province: {
                            select: {
                              name: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          bookingTrip: { include: { trip: { include: { route: true } } } },
          seat: true,
        },
      });

      if (!tickets || tickets.length === 0) {
        throw new Error(`No tickets found for booking ${bookingId}`);
      }

      // Check if booking has email
      const passengerEmail = booking.passengerEmail || (booking.user ? booking.user.email : null);

      if (!passengerEmail) {
        console.log(`No email found for booking ${bookingId}, skipping email`);

        // Log to booking history
        await prisma.bookingHistory.create({
          data: {
            bookingId: booking.id,
            changedFields: { emailStatus: 'skipped_no_email' },
            changedBy: 'system',
            changeReason: 'Email sending skipped - no email address available',
          },
        });

        return { success: false, reason: 'No email address' };
      }

      // Generate PDF attachments
      const pdfAttachments = await Promise.all(
        tickets.map(async (ticket) => {
          const { pdfBuffer } = await generatePublicTicketPDF(booking.id, ticket.seat.seatNumber);

          const safePassengerName = ticket.passengerName.replace(/[^a-zA-Z0-9]/g, '_');
          const safeRouteName = ticket.bookingTrip.trip.route.name.replace(/[^a-zA-Z0-9]/g, '_');
          const filename = `ticket-${ticket.seat.seatNumber}-${safePassengerName}-${safeRouteName}.pdf`;

          return {
            name: filename, // Brevo uses 'name' instead of 'filename'
            content: pdfBuffer.toString('base64'),
          };
        })
      );

      // Generate email content
      const emailContent = await generateEmailContent(booking, tickets);

      // Send email with Brevo
      const result = await sendEmailWithBrevo(
        passengerEmail,
        `Xác nhận đặt vé - Booking #${booking.id}`,
        emailContent,
        pdfAttachments
      );

      console.log(`Booking confirmation email sent successfully to ${passengerEmail} for booking ${bookingId}`);
      console.log('Brevo Message ID:', result.body?.messageId);

      // Log success to booking history
      await prisma.bookingHistory.create({
        data: {
          bookingId: booking.id,
          changedFields: {
            emailStatus: 'sent_successfully',
            emailSentTo: passengerEmail,
            attachmentCount: pdfAttachments.length,
            messageId: result.body?.messageId || 'unknown',
          },
          changedBy: 'system',
          changeReason: `Booking confirmation email sent successfully to ${passengerEmail}`,
        },
      });

      return {
        success: true,
        emailSent: passengerEmail,
        attachmentCount: pdfAttachments.length,
        ticketCount: tickets.length,
        messageId: result.body?.messageId,
      };
    } catch (error) {
      console.error(`Error sending booking confirmation email for ${bookingId}:`, error);

      // Log error to booking history
      await prisma.bookingHistory.create({
        data: {
          bookingId: bookingId,
          changedFields: {
            emailStatus: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            attemptNumber: job.attemptsMade + 1,
          },
          changedBy: 'system',
          changeReason: `Email sending failed (attempt ${job.attemptsMade + 1}): ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      });

      throw error; // Rethrow to trigger retry mechanism
    }
  });

  // Handle failed jobs (after all retries exhausted)
  queue.on('failed', async (job, err) => {
    const { bookingId } = job.data as BookingEmailJobData;

    console.error(
      `Booking confirmation email permanently failed for ${bookingId} after ${job.opts.attempts} attempts:`,
      err
    );

    // Log final failure
    await prisma.bookingHistory.create({
      data: {
        bookingId: bookingId,
        changedFields: {
          emailStatus: 'permanently_failed',
          finalError: err.message,
          totalAttempts: job.opts.attempts,
        },
        changedBy: 'system',
        changeReason: `Email sending permanently failed after ${job.opts.attempts} attempts: ${err.message}`,
      },
    });
  });

  console.log(`Booking email processor initialized with concurrency ${concurrency}`);
}

/**
 * Send email using Brevo
 */
async function sendEmailWithBrevo(
  to: string,
  subject: string,
  htmlContent: string,
  attachments: Array<{ name: string; content: string }>
) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;

  if (!BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not defined');
  }

  // Initialize Brevo client
  const apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);

  const sendSmtpEmail = new brevo.SendSmtpEmail();

  sendSmtpEmail.to = [{ email: to }];
  sendSmtpEmail.sender = {
    email: process.env.EMAIL_FROM || 'tranngocgiao147@gmail.com',
    name: process.env.EMAIL_FROM_NAME || 'Bus Booking System',
  };
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = htmlContent;

  if (attachments && attachments.length > 0) {
    sendSmtpEmail.attachment = attachments;
  }

  return await apiInstance.sendTransacEmail(sendSmtpEmail);
}

/**
 * Generate email content using template
 */
async function generateEmailContent(booking: any, tickets: any[]): Promise<string> {
  const config = await getSystemConfig();

  // Load template
  const templatePath = path.join(process.cwd(), 'src/templates', 'booking-confirmation.hbs');
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  const template = handlebars.compile(templateContent);

  // Prepare data
  const totalAmount = booking.totalPrice || 0;
  const discountAmount = booking.discountAmount || 0;
  const finalAmount = booking.finalPrice || 0;

  const pickupFullAddress = booking.pickup
    ? `${booking.pickup.address}, ${booking.pickup.ward.name}, ${booking.pickup.ward.district.name}, ${booking.pickup.ward.district.province.name}`
    : 'N/A';

  const dropoffFullAddress = booking.dropoff
    ? `${booking.dropoff.address}, ${booking.dropoff.ward.name}, ${booking.dropoff.ward.district.name}, ${booking.dropoff.ward.district.province.name}`
    : 'N/A';

  const departureDate = new Date(tickets[0].bookingTrip.trip.departureTime);
  const formattedDepartureTime = departureDate.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  let companyLogoBase64 = null;
  if (config?.textLogo) {
    try {
      companyLogoBase64 = await processLogoForEmail(config.textLogo, getPublicR2Url);
    } catch (error) {
      console.error('Error converting logo to base64:', error);
      companyLogoBase64 = null;
    }
  }
  console.log('Ra 11: ', companyLogoBase64);

  const emailParams = {
    companyName: config?.name || process.env.COMPANY_NAME || 'Bus Company',
    companyLogo: companyLogoBase64,
    bookingId: booking.id,
    bookingDate: new Date(booking.createdAt).toLocaleDateString('vi-VN'),
    passengerName:
      booking.passengerName ||
      (booking.user ? `${booking.user.firstName} ${booking.user.lastName}` : null) ||
      tickets[0]?.passengerName ||
      'N/A',
    passengerPhone:
      booking.passengerPhone || (booking.user ? booking.user.phoneNumber : null) || tickets[0]?.passengerPhone || 'N/A',
    passengerEmail: booking.passengerEmail || (booking.user ? booking.user.email : null),

    routeName: tickets[0].bookingTrip.trip.route.name,
    departureTime: formattedDepartureTime,
    pickupStation: booking.pickup?.name || 'N/A',
    pickupAddress: pickupFullAddress,
    dropoffStation: booking.dropoff?.name || 'N/A',
    dropoffAddress: dropoffFullAddress,

    tickets: tickets.map((ticket) => ({
      ticketNumber: ticket.ticketNumber,
      seatNumber: ticket.seat.seatNumber,
      passengerName: ticket.passengerName,
    })),
    totalTickets: tickets.length,

    ticketPrice: Math.round(totalAmount / tickets.length),
    totalAmount: totalAmount,
    discountAmount: discountAmount,
    finalAmount: finalAmount,

    supportPhone: process.env.SUPPORT_PHONE || '1900-xxxx',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@company.com',
    websiteUrl: process.env.WEBSITE_URL || 'https://company.com',
  };

  return template(emailParams);
}
