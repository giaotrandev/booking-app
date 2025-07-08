import { prisma } from '#config/db';
import { uploadFileToR2, StorageFolders, getSignedUrlForFile } from '#services/r2Service';
import { optimizeImage } from '#services/imageService';
import { generateUniqueTicketNumber, generateQRCodeImage } from '#utils/ticketHandler';
import * as path from 'path';
import * as fs from 'fs';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { sendEmail } from '#emails/sendEmail';
import * as handlebars from 'handlebars';

// Generate and upload QR code
export async function generateAndUploadQRCode(data: string): Promise<string> {
  try {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const qrFileName = `qr-${crypto.randomBytes(16).toString('hex')}.png`;
    const qrFilePath = path.join(tempDir, qrFileName);

    await QRCode.toFile(qrFilePath, data, {
      width: 150, // Smaller for receipt-like ticket
      margin: 2,
    });

    const optimizedQRPath = await optimizeImage(qrFilePath, {
      width: 150,
      format: 'png',
      quality: 90,
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

// Generate tickets for a booking
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
        const qrCodeData = JSON.stringify({
          bookingId: booking.id,
          bookingTripId: bookingTrip.id,
          seatId: seat.id,
          ticketNumber: ticketNumber,
          routeName: bookingTrip.trip.route.name,
          departureTime: bookingTrip.trip.departureTime,
        });

        const qrCodeFileKey = await generateAndUploadQRCode(qrCodeData);

        return {
          bookingId: booking.id,
          bookingTripId: bookingTrip.id,
          seatId: seat.id,
          ticketNumber: ticketNumber,
          qrCode: qrCodeData,
          qrCodeImage: qrCodeFileKey,
          passengerName: booking.user
            ? `${booking.user.firstName} ${booking.user.lastName}`
            : booking.guestName || 'N/A',
          passengerPhone: booking.guestPhone || null,
        };
      })
    )
  );

  const result = await prisma.ticket.createMany({
    data: ticketsToCreate,
  });

  // Send email for each ticket
  const tickets = await prisma.ticket.findMany({
    where: { bookingId },
    include: {
      booking: { include: { user: true, pickup: true, dropoff: true } },
      bookingTrip: { include: { trip: { include: { route: true } } } },
      seat: true,
    },
  });
  for (const ticket of tickets) {
    const templatePath = './src/templates/ticket.hbs';
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const template = handlebars.compile(templateContent);

    const emailParams = {
      companyName: 'Your Bus Company',
      ticketNumber: ticket.ticketNumber,
      passengerName: ticket.passengerName,
      routeName: ticket.bookingTrip.trip.route.name,
      departureTime: new Date(ticket.bookingTrip.trip.departureTime).toLocaleString(),
      seatNumbers: ticket.seat.seatNumber || 'N/A',
      pickupName: ticket.booking.pickup?.name || 'N/A',
      dropoffName: ticket.booking.dropoff?.name || 'N/A',
      qrCodePath: ticket.qrCodeImage ? await getSignedUrlForFile(ticket.qrCodeImage) : null,
    };

    const guestEmail = ticket.booking.guestEmail || (ticket.booking.user ? ticket.booking.user.email : null);

    if (guestEmail) await sendEmail(guestEmail, 'Your Bus Ticket', () => template(emailParams), emailParams);
  }

  return result;
}

// Regenerate QR code and ticket for an existing ticket
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
  const qrCodeData = JSON.stringify({
    bookingId: ticket.bookingId,
    bookingTripId: ticket.bookingTripId,
    seatId: ticket.seatId,
    ticketNumber: ticketNumber,
    routeName: ticket.bookingTrip.trip.route.name,
    departureTime: ticket.bookingTrip.trip.departureTime,
  });

  const qrCodeFileKey = await generateAndUploadQRCode(qrCodeData);

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      ticketNumber,
      qrCode: qrCodeData,
      qrCodeImage: qrCodeFileKey,
      updatedAt: new Date(),
    },
    include: {
      booking: { include: { user: true } },
      bookingTrip: { include: { trip: { include: { route: true } } } },
      seat: true,
    },
  });

  // Send updated ticket via email
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
  const guestEmail =
    updatedTicket.booking.guestEmail || (updatedTicket.booking.user ? updatedTicket.booking.user.email : null);

  if (guestEmail) await sendEmail(guestEmail, 'Your Updated Bus Ticket', () => template(emailParams), emailParams);

  return updatedTicket;
}

// Get unchecked-in tickets
export async function getUnCheckedInTickets(bookingTripId: string) {
  return await prisma.ticket.findMany({
    where: {
      bookingTripId,
      isCheckedIn: false,
    },
    include: {
      seat: true,
    },
  });
}

// Check-in a single ticket
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

// Bulk check-in tickets
export async function checkInBulkTickets(bookingTripId: string, userId: string) {
  const updatedTickets = await prisma.ticket.updateMany({
    where: {
      bookingTripId,
      isCheckedIn: false,
    },
    data: {
      status: 'CHECKED_IN',
      isCheckedIn: true,
      checkedInAt: new Date(),
      checkedInBy: userId,
    },
  });

  await updateTripStatusIfAllCheckedIn(bookingTripId);

  return updatedTickets;
}

// Update trip status if all tickets are checked in
async function updateTripStatusIfAllCheckedIn(bookingTripId: string) {
  const bookingTrip = await prisma.bookingTrip.findUnique({
    where: { id: bookingTripId },
    include: {
      tickets: true,
      trip: true,
    },
  });

  const allTicketsCheckedIn = bookingTrip?.tickets.every((ticket) => ticket.isCheckedIn);

  if (allTicketsCheckedIn) {
    await prisma.trip.update({
      where: { id: bookingTrip?.trip.id },
      data: {
        status: 'IN_PROGRESS',
      },
    });
  }
}
