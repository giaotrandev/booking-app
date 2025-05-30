import { Request, Response } from 'express';
import {
  generateTicketsForBooking,
  regenerateTicketQRCode,
  getUnCheckedInTickets,
  checkInTicket,
  checkInBulkTickets,
} from '#services/ticketService';
import { generateTicketPDF } from '#services/pdfService';
import { sendCreated, sendSuccess, sendBadRequest, sendNotFound, sendServerError } from '#utils/apiResponse';

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

export async function getUnCheckedInTicketsCtrl(req: Request, res: Response) {
  try {
    const { bookingTripId } = req.params;
    const tickets = await getUnCheckedInTickets(bookingTripId);
    if (!tickets.length) {
      return sendNotFound(res, 'ticket.noUnCheckedIn', null, req.language);
    }
    return sendSuccess(res, 'ticket.fetchedUnCheckedIn', tickets, req.language);
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
      return sendNotFound(res, 'ticket.noUnCheckedIn', null, req.language);
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

export async function getTicketPDF(req: Request, res: Response) {
  try {
    const { ticketId } = req.params;
    const pdfBuffer = await generateTicketPDF(ticketId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=ticket-${ticketId}.pdf`,
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
