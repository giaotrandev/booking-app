import { Request, Response } from 'express';
import {
  generateTicketsForBooking,
  regenerateTicketQRCode,
  getUncheckedInTickets,
  checkInTicket,
  checkInBulkTickets,
  validateQRCode,
} from '#services/ticketService';
import { generatePublicTicketPDF, generateTicketPDF } from '#services/pdfService';
import { sendCreated, sendSuccess, sendBadRequest, sendNotFound, sendServerError } from '#utils/apiResponse';
import { getPublicR2Url } from '#src/services/r2Service';
import { deepRemoveTimestamps } from '#src/helpers/dataHelper';

export async function generateTickets(req: Request, res: Response) {
  try {
    const { bookingId } = req.params;
    const result = await generateTicketsForBooking(bookingId);
    return sendCreated(res, 'ticket.generated', { count: result.count }, req.language, { count: result.count });
  } catch (error) {
    return sendServerError(
      res,
      'ticket.generateError',
      error instanceof Error ? { message: error.message } : null,
      req.language
    );
  }
}

/**
 * Validate QR code - New endpoint cho scan QR
 */
export async function validateQRCodeCtrl(req: Request, res: Response) {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return sendBadRequest(res, 'ticket.qrDataRequired', null, req.language);
    }

    const validation = await validateQRCode(qrData);

    if (!validation.isValid) {
      return sendBadRequest(res, 'ticket.invalidQR', { error: validation.error }, req.language);
    }

    return sendSuccess(res, 'ticket.qrValid', validation.ticket, req.language);
  } catch (error) {
    return sendServerError(
      res,
      'ticket.qrValidationError',
      error instanceof Error ? { message: error.message } : null,
      req.language
    );
  }
}

/**
 * Check-in với QR validation - Enhanced security
 */
export async function secureCheckInTicket(req: Request, res: Response) {
  try {
    const { qrData } = req.body;
    const userId = (req.user as { userId: string }).userId;

    if (!qrData) {
      return sendBadRequest(res, 'ticket.qrDataRequired', null, req.language);
    }

    // Validate QR first
    const validation = await validateQRCode(qrData);

    if (!validation.isValid) {
      return sendBadRequest(res, 'ticket.invalidQR', { error: validation.error }, req.language);
    }

    // Check-in the validated ticket
    const ticket = await checkInTicket(validation.ticket!.id, userId);

    return sendSuccess(res, 'ticket.checkedIn', ticket, req.language);
  } catch (error) {
    return sendServerError(
      res,
      'ticket.checkInError',
      error instanceof Error ? { message: error.message } : null,
      req.language
    );
  }
}

export async function getUncheckedInTicketsCtrl(req: Request, res: Response) {
  try {
    const { bookingId } = req.params;
    const tickets = await getUncheckedInTickets(bookingId);
    if (!tickets.length) {
      return sendNotFound(res, 'ticket.noUncheckedIn', null, req.language);
    }

    function maskEmail(email: string): string {
      if (!email) return '';
      const [local, domain] = email.split('@');
      if (!local || !domain) return '';
      const firstChar = local[0];
      const lastTwo = local.length > 2 ? local.slice(-2) : local;
      const maskedLocal = `${firstChar}${'*'.repeat(Math.max(0, local.length - 3))}${lastTwo}`;
      // Show first char of domain and mask the rest, keep TLD if possible
      const domainParts = domain.split('.');
      if (domainParts.length < 2) {
        // fallback if domain is weird
        return `${maskedLocal}@${domain[0] || ''}***`;
      }
      const tld = domainParts.pop();
      const domainName = domainParts.join('.');
      const domainFirstChar = domainName[0] || '';
      return `${maskedLocal}@${domainFirstChar}***.${tld}`;
    }

    function maskPhone(phone: string): string {
      if (!phone) return '';
      const len = phone.length;
      if (len <= 4) return `${phone[0] || ''}${'*'.repeat(Math.max(0, len - 2))}${phone[len - 1] || ''}`;
      const firstTwo = phone.slice(0, 2);
      const lastTwo = phone.slice(-3);
      const maskedMiddle = '*'.repeat(len - 5);
      return `${firstTwo}${maskedMiddle}${lastTwo}`;
    }

    const formattedTickets = tickets.map((ticket) => {
      const { seatNumber, seatType, ...rest } = { ...ticket.seat };
      return {
        bookingId: ticket.bookingId,
        passengerName: ticket.passengerName,
        passengerEmail: maskEmail(ticket.passengerEmail ?? ''),
        passengerPhone: maskPhone(ticket.passengerPhone ?? ''),
        qrCodeImage: ticket.qrCodeImage ? getPublicR2Url(ticket.qrCodeImage) : null,
        status: ticket.status,
        metadata: ticket.metadata,
        seat: {
          seatNumber,
          seatType,
        },
      };
    });

    return sendSuccess(res, 'ticket.fetchedUncheckedIn', deepRemoveTimestamps(formattedTickets), req.language);
  } catch (error) {
    return sendServerError(
      res,
      'ticket.fetchError',
      error instanceof Error ? { message: error.message } : null,
      req.language
    );
  }
}

export async function checkInTicketCtrl(req: Request, res: Response) {
  try {
    const { ticketId } = req.params;
    const userId = (req.user as { userId: string }).userId;
    const ticket = await checkInTicket(ticketId, userId);
    if (!ticket) {
      return sendNotFound(res, 'ticket.notFound', null, req.language);
    }
    return sendSuccess(res, 'ticket.checkedIn', ticket, req.language);
  } catch (error) {
    return sendServerError(
      res,
      'ticket.checkInError',
      error instanceof Error ? { message: error.message } : null,
      req.language
    );
  }
}

export async function checkInBulkTicketsCtrl(req: Request, res: Response) {
  try {
    const { bookingTripId } = req.params;
    const userId = (req.user as { userId: string }).userId;
    const result = await checkInBulkTickets(bookingTripId, userId);
    if (result.count === 0) {
      return sendNotFound(res, 'ticket.noUncheckedIn', null, req.language);
    }
    return sendSuccess(res, 'ticket.bulkCheckedIn', { count: result.count }, req.language, { count: result.count });
  } catch (error) {
    return sendServerError(
      res,
      'ticket.bulkCheckInError',
      error instanceof Error ? { message: error.message } : null,
      req.language
    );
  }
}

export async function getPublicTicketPDF(req: Request, res: Response) {
  try {
    const { bookingId, seatNumber } = req.query;

    // Ensure bookingId and seatNumber are strings
    if (typeof bookingId !== 'string' || typeof seatNumber !== 'string') {
      return sendServerError(res, 'ticket.pdfError', { message: 'Invalid bookingId or seatNumber' }, req.language);
    }

    const { pdfBuffer, passengerName, routeName, departureTime } = await generatePublicTicketPDF(bookingId, seatNumber);

    // Clean filename components
    const safePassengerName = passengerName.replace(/[^a-zA-Z0-9]/g, '_');
    const safeRouteName = routeName.replace(/[^a-zA-Z0-9]/g, '_');
    const safeDepartureTime = departureTime.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `ticket-${seatNumber}-${safePassengerName}-${safeRouteName}-${safeDepartureTime}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=${fileName}`,
    });
    res.send(pdfBuffer);
  } catch (error) {
    return sendServerError(
      res,
      'ticket.pdfError',
      error instanceof Error ? { message: error.message } : null,
      req.language
    );
  }
}

export async function regenerateTicket(req: Request, res: Response) {
  try {
    const { ticketId } = req.params;
    const ticket = await regenerateTicketQRCode(ticketId);
    if (!ticket) {
      return sendNotFound(res, 'ticket.notFound', null, req.language);
    }
    return sendSuccess(res, 'ticket.regenerated', ticket, req.language);
  } catch (error) {
    return sendServerError(
      res,
      'ticket.regenerateError',
      error instanceof Error ? { message: error.message } : null,
      req.language
    );
  }
}
