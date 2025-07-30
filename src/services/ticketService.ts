import { prisma } from '#config/db';
import { uploadFileToR2, StorageFolders, getSignedUrlForFile, getPublicR2Url } from '#services/r2Service';
import { optimizeImage } from '#services/imageService';
import { generateUniqueTicketNumber, generateQRCodeImage } from '#utils/ticketHandler';
import * as path from 'path';
import * as fs from 'fs';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { sendEmail, sendEmailWithAttachments } from '#emails/sendEmail';
import * as handlebars from 'handlebars';
import { getSystemConfig } from './systemConfigService';
import { generatePublicTicketPDF } from './pdfService';
import { Booking, Ticket } from '@prisma/client';

// Security configuration
const TICKET_SECRET = process.env.TICKET_SECRET_KEY || 'your-secret-key-here';
const SIGNATURE_ALGORITHM = 'sha256';

/**
 * Generate digital signature for ticket data
 */
function generateTicketSignature(ticketData: any): string {
  const dataString = JSON.stringify(ticketData);
  return crypto.createHmac(SIGNATURE_ALGORITHM, TICKET_SECRET).update(dataString).digest('hex');
}

/**
 * Verify ticket signature
 */
export function verifyTicketSignature(ticketData: any, signature: string): boolean {
  const expectedSignature = generateTicketSignature(ticketData);
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
}

/**
 * Create secure QR code data with signature
 */
function createSecureQRData(ticketData: any) {
  const signature = generateTicketSignature(ticketData);
  const secureData = {
    ...ticketData,
    signature,
    timestamp: Date.now(),
    version: '1.0',
  };

  return JSON.stringify(secureData);
}

/**
 * Generate and upload QR code với security
 */
export async function generateAndUploadQRCode(ticketData: any): Promise<string> {
  try {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const qrFileName = `qr-${crypto.randomBytes(16).toString('hex')}.png`;
    const qrFilePath = path.join(tempDir, qrFileName);

    const secureQRData = createSecureQRData(ticketData);

    await QRCode.toFile(qrFilePath, secureQRData, {
      width: 400,
      margin: 1,
      errorCorrectionLevel: 'Q',
      scale: 8,
    });

    const optimizedQRPath = await optimizeImage(qrFilePath, {
      width: 400,
      format: 'png',
      quality: 95,
    });

    const qrFileKey = await uploadFileToR2(optimizedQRPath, StorageFolders.TEMP, path.basename(optimizedQRPath));

    // Clean up temporary files
    fs.unlinkSync(qrFilePath);
    fs.unlinkSync(optimizedQRPath);

    return qrFileKey;
  } catch (error) {
    console.error('Error generating and uploading QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

// Generate tickets for a booking với enhanced security
export async function generateTicketsForBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: true,
      bookingTrips: {
        include: {
          seats: true,
          trip: {
            include: {
              route: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  const ticketsToCreate = await Promise.all(
    booking.bookingTrips.flatMap((bookingTrip) =>
      bookingTrip.seats.map(async (seat) => {
        const ticketNumber = generateUniqueTicketNumber();
        const ticketSecretHash = crypto.randomBytes(32).toString('hex');

        const ticketData = {
          bookingId: booking.id,
          bookingTripId: bookingTrip.id,
          seatId: seat.id,
          ticketNumber: ticketNumber,
          routeName: bookingTrip.trip.route.name,
          departureTime: bookingTrip.trip.departureTime,
          secretHash: ticketSecretHash,
        };

        const qrCodeFileKey = await generateAndUploadQRCode(ticketData);

        return {
          bookingId: booking.id,
          bookingTripId: bookingTrip.id,
          seatId: seat.id,
          ticketNumber: ticketNumber,
          qrCode: JSON.stringify(ticketData),
          qrCodeImage: qrCodeFileKey,
          passengerName: booking.user
            ? `${booking.user.firstName} ${booking.user.lastName}`
            : booking.passengerName || 'N/A',
          passengerPhone: booking.passengerPhone || booking.user?.phoneNumber || null,
          passengerEmail: booking.passengerEmail || booking.user?.email || null,
        };
      })
    )
  );

  const result = await prisma.ticket.createMany({
    data: ticketsToCreate,
  });

  console.log(`Generated ${ticketsToCreate.length} tickets for booking ${bookingId}`);
  return result;
}

export async function generateTicketsInTransaction(tx: any, bookingId: string) {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: true,
      bookingTrips: {
        include: {
          seats: true,
          trip: {
            include: {
              route: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  const ticketsToCreate = await Promise.all(
    booking.bookingTrips.flatMap((bookingTrip: any) =>
      bookingTrip.seats.map(async (seat: any) => {
        const ticketNumber = generateUniqueTicketNumber();
        const ticketSecretHash = crypto.randomBytes(32).toString('hex');

        const ticketData = {
          bookingId: booking.id,
          bookingTripId: bookingTrip.id,
          seatId: seat.id,
          ticketNumber: ticketNumber,
          routeName: bookingTrip.trip.route.name,
          departureTime: bookingTrip.trip.departureTime,
          secretHash: ticketSecretHash,
        };

        const qrCodeFileKey = await generateAndUploadQRCode(ticketData);

        return {
          bookingId: booking.id,
          bookingTripId: bookingTrip.id,
          seatId: seat.id,
          ticketNumber: ticketNumber,
          qrCode: JSON.stringify(ticketData),
          qrCodeImage: qrCodeFileKey,
          passengerName: booking.user
            ? `${booking.user.firstName} ${booking.user.lastName}`
            : booking.passengerName || 'N/A',
          passengerPhone: booking.passengerPhone || booking.user?.phoneNumber || null,
          passengerEmail: booking.passengerEmail || booking.user?.email || null,
        };
      })
    )
  );

  return await tx.ticket.createMany({
    data: ticketsToCreate,
  });
}

async function sendBookingConfirmationEmail(booking: any, tickets: any[]) {
  const config = await getSystemConfig();

  const pdfAttachments = await Promise.all(
    tickets.map(async (ticket) => {
      const { pdfBuffer } = await generatePublicTicketPDF(booking.id, ticket.seat.seatNumber);

      // Create safe filename
      const safePassengerName = ticket.passengerName.replace(/[^a-zA-Z0-9]/g, '_');
      const safeRouteName = ticket.bookingTrip.trip.route.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `ticket-${ticket.seat.seatNumber}-${safePassengerName}-${safeRouteName}.pdf`;

      return {
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      };
    })
  );

  // Load booking confirmation email template
  const templatePath = path.join(process.cwd(), 'src/templates', 'booking-confirmation.hbs');
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  const template = handlebars.compile(templateContent);

  // Use correct pricing fields from your Booking model
  const totalAmount = booking.totalPrice || 0;
  const discountAmount = booking.discountAmount || 0;
  const finalAmount = booking.finalPrice || 0;
  const bookingFee = totalAmount - finalAmount + discountAmount; // Calculate booking fee if needed
  const taxes = 0; // Add if you have tax calculations

  // Format addresses
  const pickupFullAddress = booking.pickup
    ? `${booking.pickup.address}, ${booking.pickup.ward.name}, ${booking.pickup.ward.district.name}, ${booking.pickup.ward.district.province.name}`
    : 'N/A';

  const dropoffFullAddress = booking.dropoff
    ? `${booking.dropoff.address}, ${booking.dropoff.ward.name}, ${booking.dropoff.ward.district.name}, ${booking.dropoff.ward.district.province.name}`
    : 'N/A';

  // Format departure time
  const departureDate = new Date(tickets[0].bookingTrip.trip.departureTime);
  const formattedDepartureTime = departureDate.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // Get passenger email - check multiple sources
  const passengerEmail =
    booking.passengerEmail || (booking.user ? booking.user.email : null) || tickets[0]?.passengerEmail;

  if (!passengerEmail) {
    console.log('No email found for booking:', booking.id);
    return; // Skip sending email if no email available
  }

  const emailParams = {
    companyName: config?.name || process.env.COMPANY_NAME || 'Bus Company',
    companyLogo: config?.textLogo ? getPublicR2Url(config.textLogo) : null,
    bookingId: booking.id,
    bookingDate: new Date(booking.createdAt).toLocaleDateString('vi-VN'),
    passengerName:
      booking.passengerName ||
      (booking.user ? `${booking.user.firstName} ${booking.user.lastName}` : null) ||
      tickets[0]?.passengerName ||
      'N/A',
    passengerPhone:
      booking.passengerPhone || (booking.user ? booking.user.phoneNumber : null) || tickets[0]?.passengerPhone || 'N/A',
    passengerEmail: passengerEmail,

    // Trip information
    routeName: tickets[0].bookingTrip.trip.route.name,
    departureTime: formattedDepartureTime,
    pickupStation: booking.pickup?.name || 'N/A',
    pickupAddress: pickupFullAddress,
    dropoffStation: booking.dropoff?.name || 'N/A',
    dropoffAddress: dropoffFullAddress,

    // Tickets information
    tickets: tickets.map((ticket) => ({
      ticketNumber: ticket.ticketNumber,
      seatNumber: ticket.seat.seatNumber,
      passengerName: ticket.passengerName,
    })),
    totalTickets: tickets.length,

    // Pricing - using your actual model fields
    ticketPrice: Math.round(totalAmount / tickets.length), // Price per ticket
    totalAmount: totalAmount,
    discountAmount: discountAmount,
    bookingFee: bookingFee,
    taxes: taxes,
    finalAmount: finalAmount,

    // Support information
    supportPhone: process.env.SUPPORT_PHONE || '1900-xxxx',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@company.com',
    websiteUrl: process.env.WEBSITE_URL || 'https://company.com',
  };

  const htmlContent = template(emailParams);
  const subject = `Xác nhận đặt vé - Booking #${booking.id}`;

  // Send email with PDF attachments
  await sendEmailWithAttachments(passengerEmail, subject, htmlContent, pdfAttachments);
}

/**
 * Validate QR code khi scan
 */
export async function validateQRCode(qrData: string): Promise<{
  isValid: boolean;
  ticket?: any;
  error?: string;
}> {
  try {
    const parsedData = JSON.parse(qrData);

    // Check if QR data has required fields
    if (!parsedData.signature || !parsedData.ticketNumber || !parsedData.secretHash) {
      return { isValid: false, error: 'Invalid QR code format' };
    }

    // Extract signature and ticket data
    const { signature, ...ticketData } = parsedData;

    // Verify signature
    if (!verifyTicketSignature(ticketData, signature)) {
      return { isValid: false, error: 'Invalid QR code signature' };
    }

    // Check timestamp (optional: prevent old QR codes)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (parsedData.timestamp && Date.now() - parsedData.timestamp > maxAge) {
      return { isValid: false, error: 'QR code expired' };
    }

    // Verify with database using stored qrCode data
    const ticket = await prisma.ticket.findFirst({
      where: {
        ticketNumber: parsedData.ticketNumber,
        qrCode: {
          contains: parsedData.secretHash, // Verify secretHash exists in stored qrCode
        },
      },
      include: {
        booking: { include: { user: true } },
        bookingTrip: { include: { trip: { include: { route: true } } } },
        seat: true,
      },
    });

    if (!ticket) {
      return { isValid: false, error: 'Ticket not found or invalid' };
    }

    // Additional verification: parse stored qrCode and compare secretHash
    try {
      const storedQRData = JSON.parse(ticket.qrCode);
      if (storedQRData.secretHash !== parsedData.secretHash) {
        return { isValid: false, error: 'Invalid ticket authentication' };
      }
    } catch {
      return { isValid: false, error: 'Corrupted ticket data' };
    }

    // Additional validations
    if (ticket.isCheckedIn) {
      return { isValid: false, error: 'Ticket already checked in' };
    }

    if (ticket.status === 'CANCELLED') {
      return { isValid: false, error: 'Ticket cancelled' };
    }

    return { isValid: true, ticket };
  } catch (error) {
    return { isValid: false, error: 'Invalid QR code format' };
  }
}

// Regenerate QR code với enhanced security
export async function regenerateTicketQRCode(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      booking: { include: { user: true } },
      bookingTrip: { include: { trip: { include: { route: true } } } },
      seat: true,
    },
  });

  if (!ticket) {
    throw new Error('Ticket not found');
  }

  const ticketNumber = generateUniqueTicketNumber();
  const newSecretHash = crypto.randomBytes(32).toString('hex');

  const ticketData = {
    bookingId: ticket.bookingId,
    bookingTripId: ticket.bookingTripId,
    seatId: ticket.seatId,
    ticketNumber: ticketNumber,
    routeName: ticket.bookingTrip.trip.route.name,
    departureTime: ticket.bookingTrip.trip.departureTime,
    secretHash: newSecretHash,
  };

  const qrCodeFileKey = await generateAndUploadQRCode(ticketData);

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      ticketNumber,
      qrCode: JSON.stringify(ticketData),
      qrCodeImage: qrCodeFileKey,
      updatedAt: new Date(),
    },
    include: {
      booking: { include: { user: true } },
      bookingTrip: { include: { trip: { include: { route: true } } } },
      seat: true,
    },
  });

  // Send updated ticket via email (same as before)
  const templatePath = path.join(process.cwd(), 'templates', 'ticket.hbs');
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  const template = handlebars.compile(templateContent);

  const emailParams = {
    companyName: 'Your Bus Company',
    ticketNumber: updatedTicket.ticketNumber,
    passengerName: updatedTicket.passengerName,
    routeName: updatedTicket.bookingTrip.trip.route.name,
    departureTime: new Date(updatedTicket.bookingTrip.trip.departureTime).toLocaleString(),
    seatNumbers: updatedTicket.seat.seatNumber || 'N/A',
    qrCodePath: updatedTicket.qrCodeImage,
  };

  const passengerEmail =
    updatedTicket.booking.passengerEmail || (updatedTicket.booking.user ? updatedTicket.booking.user.email : null);

  if (passengerEmail)
    await sendEmail(passengerEmail, 'Your Updated Bus Ticket', () => template(emailParams), emailParams);

  return updatedTicket;
}

// Existing functions remain the same...
export async function getUncheckedInTickets(bookingId: string) {
  return await prisma.ticket.findMany({
    where: {
      bookingId: bookingId,
      isCheckedIn: false,
    },
    include: {
      booking: true,
      seat: true,
    },
  });
}

export async function checkInTicket(ticketId: string, userId: string) {
  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: 'CHECKED_IN',
      isCheckedIn: true,
      checkedInAt: new Date(),
      checkedInBy: userId,
    },
    include: { seat: true },
  });

  await updateTripStatusIfAllCheckedIn(ticket.bookingTripId);

  return ticket;
}

export async function checkInBulkTickets(bookingId: string, userId: string) {
  const updatedTickets = await prisma.ticket.updateMany({
    where: {
      bookingId,
      isCheckedIn: false,
    },
    data: {
      status: 'CHECKED_IN',
      isCheckedIn: true,
      checkedInAt: new Date(),
      checkedInBy: userId,
    },
  });

  await updateTripStatusIfAllCheckedIn(bookingId);

  return updatedTickets;
}

async function updateTripStatusIfAllCheckedIn(bookingId: string) {
  const bookingTrips = await prisma.bookingTrip.findMany({
    where: { bookingId: bookingId },
    include: {
      tickets: true,
      trip: true,
    },
  });

  for (const bookingTrip of bookingTrips) {
    const allTicketsCheckedIn =
      bookingTrip.tickets.length > 0 && bookingTrip.tickets.every((ticket) => ticket.isCheckedIn);

    if (allTicketsCheckedIn && bookingTrip.trip?.id) {
      await prisma.trip.update({
        where: { id: bookingTrip.trip.id },
        data: {
          status: 'IN_PROGRESS',
        },
      });
    }
  }
}
