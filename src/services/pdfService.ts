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
  console.log('Tào lao: ', {
    bookingId: bookingId,
    seatNumber: seatNumber,
  });
  const ticket = await prisma.ticket.findFirst({
    where: {
      bookingId: bookingId,
      seat: {
        seatNumber: seatNumber,
      },
    },
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
      bookingTrip: {
        include: {
          trip: {
            include: {
              route: true,
            },
          },
        },
      },
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

  const departureDate = new Date(ticket.bookingTrip.trip.departureTime);
  const language = 'vi';

  let formattedDepartureTime: string;
  if (language === 'vi') {
    // Vietnamese format: dd/mm/yyyy HH:mm
    const day = departureDate.getDate().toString().padStart(2, '0');
    const month = (departureDate.getMonth() + 1).toString().padStart(2, '0');
    const year = departureDate.getFullYear();
    const hours = departureDate.getHours().toString().padStart(2, '0');
    const minutes = departureDate.getMinutes().toString().padStart(2, '0');
    formattedDepartureTime = `${day}/${month}/${year} ${hours}:${minutes}`;
  } else {
    // English format: MM/dd/yyyy HH:mm
    formattedDepartureTime = departureDate.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  // Get logo path if available
  const logoPath = config?.textLogo ? getPublicR2Url(config.textLogo) : null;
  const pickupName = ticket.booking.pickup
    ? ticket.booking.pickup?.address +
      ', ' +
      ticket.booking.pickup?.ward.name +
      ', ' +
      ticket.booking.pickup?.ward.district.name +
      ', ' +
      ticket.booking.pickup?.ward.district.province.name
    : null;
  const dropoffName = ticket.booking.dropoff
    ? ticket.booking.dropoff?.address +
      ', ' +
      ticket.booking.dropoff?.ward.name +
      ', ' +
      ticket.booking.dropoff?.ward.district.name +
      ', ' +
      ticket.booking.dropoff?.ward.district.province.name
    : null;

  const htmlContent = template({
    companyName: config?.name || process.env.COMPANY_NAME || 'Bus Company',
    logoPath: logoPath,
    ticketNumber: ticket.ticketNumber,
    passengerName: passengerName,
    routeName: routeName,
    departureTime: departureTime,
    seatNumbers: ticket.seat.seatNumber || 'N/A',
    pickupName: pickupName || 'N/A',
    dropoffName: dropoffName || 'N/A',
    qrCodePath: ticket.qrCodeImage ? getPublicR2Url(ticket.qrCodeImage) : null,
  });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  await page.setContent(htmlContent);
  await page.setViewport({ width: 227, height: 800, deviceScaleFactor: 2 });

  const pdfBuffer = await page.pdf({
    width: '80mm',
    height: '205mm',
    printBackground: true,
    margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
    preferCSSPageSize: false,
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
