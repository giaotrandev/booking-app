import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import * as handlebars from 'handlebars';
import { prisma } from '#config/db';
import { getPublicR2Url } from './r2Service';
import { getSystemConfig } from './systemConfigService';

export async function generatePublicTicketPDF(
  bookingId: string,
  seatNumber: string
): Promise<{
  pdfBuffer: Buffer;
  passengerName: string;
  routeName: string;
  departureTime: string;
}> {
  // Find the ticket by bookingId and seatNumber
  const ticket = await prisma.ticket.findFirst({
    where: {
      bookingId: bookingId,
      seat: {
        seatNumber: seatNumber,
      },
    },
    include: {
      booking: { include: { user: true } },
      bookingTrip: { include: { trip: { include: { route: true } } } },
      seat: true,
    },
  });

  if (!ticket) {
    throw new Error('Ticket not found');
  }

  const config = await getSystemConfig();

  const templatePath = path.join(process.cwd(), 'src/templates', 'ticket.hbs');
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  const template = handlebars.compile(templateContent);

  const routeName = ticket.bookingTrip.trip.route.name;
  const departureTime = new Date(ticket.bookingTrip.trip.departureTime).toLocaleString();
  const passengerName = ticket.passengerName;

  const htmlContent = template({
    companyName: config?.name || process.env.COMPANY_NAME || 'N/A',
    ticketNumber: ticket.ticketNumber,
    passengerName: passengerName,
    routeName: routeName,
    departureTime: departureTime,
    seatNumbers: ticket.seat.seatNumber || 'N/A',
    qrCodePath: ticket.qrCodeImage ? getPublicR2Url(ticket.qrCodeImage) : null,
  });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'], // For server compatibility
  });
  const page = await browser.newPage();

  // Set content and viewport for 80mm width (227px at 72dpi)
  await page.setContent(htmlContent);
  await page.setViewport({ width: 227, height: 800, deviceScaleFactor: 1 });

  // Generate PDF with receipt-like dimensions
  const pdfBuffer = await page.pdf({
    width: '80mm',
    printBackground: true,
    margin: { top: '5mm', bottom: '5mm', left: '0mm', right: '0mm' },
    preferCSSPageSize: true,
  });

  await browser.close();

  return {
    pdfBuffer: Buffer.from(pdfBuffer),
    passengerName,
    routeName,
    departureTime,
  };
}

export async function generateTicketPDF(ticketId: string): Promise<Buffer> {
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

  const config = await getSystemConfig();

  const templatePath = path.join(process.cwd(), 'src/templates', 'ticket.hbs');
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  const template = handlebars.compile(templateContent);

  const htmlContent = template({
    companyName: config?.name || process.env.COMPANY_NAME || 'N/A',
    ticketNumber: ticket.ticketNumber,
    passengerName: ticket.passengerName,
    routeName: ticket.bookingTrip.trip.route.name,
    departureTime: new Date(ticket.bookingTrip.trip.departureTime).toLocaleString(),
    seatNumbers: ticket.seat.seatNumber || 'N/A',
    qrCodePath: ticket.qrCodeImage ? getPublicR2Url(ticket.qrCodeImage) : null,
  });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'], // For server compatibility
  });
  const page = await browser.newPage();

  // Set content and viewport for 80mm width (227px at 72dpi)
  await page.setContent(htmlContent);
  await page.setViewport({ width: 227, height: 800, deviceScaleFactor: 1 });

  // Generate PDF with receipt-like dimensions
  const pdfBuffer = await page.pdf({
    width: '80mm',
    printBackground: true,
    margin: { top: '5mm', bottom: '5mm', left: '0mm', right: '0mm' },
    preferCSSPageSize: true,
  });

  await browser.close();

  // Update print count and last printed timestamp
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      printCount: { increment: 1 },
      lastPrintedAt: new Date(),
    },
  });

  return Buffer.from(pdfBuffer);
}
