import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import { prisma } from '#config/db';
import { getPublicR2Url } from './r2Service';
import { getSystemConfig } from './systemConfigService';
import * as htmlPdf from 'html-pdf-node';

export async function generatePublicTicketPDF(
  bookingId: string,
  seatNumbers?: string[]
): Promise<{
  pdfBuffer: Buffer;
  ticketInfo: {
    routeName: string;
    departureTime: string;
    passengerNames: string[];
  };
}> {
  // Build where condition for tickets
  const whereCondition: any = {
    bookingId: bookingId,
  };

  // If seatNumbers provided, filter by those seats
  if (seatNumbers && seatNumbers.length > 0) {
    whereCondition.seat = {
      seatNumber: {
        in: seatNumbers,
      },
    };
  }

  console.log('TesT 2: ', whereCondition);

  const tickets = await prisma.ticket.findMany({
    where: whereCondition,
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
    orderBy: {
      seat: {
        seatNumber: 'asc',
      },
    },
  });

  if (!tickets || tickets.length === 0) {
    throw new Error('No tickets found for the specified criteria');
  }

  const config = await getSystemConfig();
  const templatePath = path.join(process.cwd(), 'src/templates', 'ticket.hbs'); // Sử dụng template hiện tại
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  const template = handlebars.compile(templateContent);

  // Get common info from first ticket
  const firstTicket = tickets[0];
  const routeName = firstTicket.bookingTrip.trip.route.name;
  const departureDate = new Date(firstTicket.bookingTrip.trip.departureTime);
  const departureTime = departureDate.toLocaleString();
  const language = 'vi';

  let formattedDepartureTime: string;
  if (language === 'vi') {
    const day = departureDate.getDate().toString().padStart(2, '0');
    const month = (departureDate.getMonth() + 1).toString().padStart(2, '0');
    const year = departureDate.getFullYear();
    const hours = departureDate.getHours().toString().padStart(2, '0');
    const minutes = departureDate.getMinutes().toString().padStart(2, '0');
    formattedDepartureTime = `${day}/${month}/${year} ${hours}:${minutes}`;
  } else {
    formattedDepartureTime = departureDate.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  // Prepare common data
  const logoPath = config?.textLogo ? getPublicR2Url(config.textLogo) : null;
  const pickupAddress = firstTicket.booking.pickup
    ? firstTicket.booking.pickup?.address +
      ', ' +
      firstTicket.booking.pickup?.ward.name +
      ', ' +
      firstTicket.booking.pickup?.ward.district.name +
      ', ' +
      firstTicket.booking.pickup?.ward.district.province.name
    : null;
  const dropoffAddress = firstTicket.booking.dropoff
    ? firstTicket.booking.dropoff?.address +
      ', ' +
      firstTicket.booking.dropoff?.ward.name +
      ', ' +
      firstTicket.booking.dropoff?.ward.district.name +
      ', ' +
      firstTicket.booking.dropoff?.ward.district.province.name
    : null;

  // Generate HTML for all tickets combined
  let combinedHtml = '';

  tickets.forEach((ticket, index) => {
    const ticketHtml = template({
      companyName: config?.name || process.env.COMPANY_NAME || 'Bus Company',
      logoPath: logoPath,
      ticketNumber: ticket.ticketNumber,
      passengerName: ticket.passengerName,
      routeName: routeName,
      departureTime: formattedDepartureTime,
      seatNumbers: ticket.seat.seatNumber || 'N/A',
      pickupName: firstTicket.booking.pickup?.name || 'N/A',
      pickupAddress: pickupAddress || 'N/A',
      dropoffName: firstTicket.booking.dropoff?.name || 'N/A',
      dropoffAddress: dropoffAddress || 'N/A',
      qrCodePath: ticket.qrCodeImage ? getPublicR2Url(ticket.qrCodeImage) : null,
    });

    combinedHtml += ticketHtml;

    // Add page break between tickets (except for the last one)
    if (index < tickets.length - 1) {
      combinedHtml += '<div style="page-break-after: always;"></div>';
    }
  });

  // Inject CSS to force print colors and add ticket separation styles
  const finalHtmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { 
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        body { 
          -webkit-print-color-adjust: exact !important; 
          margin: 0;
          padding: 0;
        }
        
        /* Add margin between tickets when not using page breaks */
        body > div:not(:last-child) {
          margin-bottom: 20mm;
          padding-bottom: 10mm;
          border-bottom: 2mm dashed #ccc;
        }
        
        /* Ensure each ticket takes appropriate space */
        .ticket {
          margin-bottom: 0 !important;
        }
        
        @media print {
          .ticket {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      ${combinedHtml}
    </body>
    </html>
  `;

  // Calculate height based on number of tickets
  // Each ticket is approximately 230mm, add some spacing
  const singleTicketHeight = 230;
  const spacingBetweenTickets = 20;
  const totalHeight =
    tickets.length === 1
      ? singleTicketHeight
      : singleTicketHeight * tickets.length + spacingBetweenTickets * (tickets.length - 1);

  // Cap the height to prevent issues with very large PDFs
  // const finalHeight = Math.min(totalHeight, 2000);
  const finalHeight = 230;

  const options = {
    width: '80mm',
    height: `${finalHeight}mm`,
    printBackground: true,
    preferCSSPageSize: false,
    margin: {
      top: '0mm',
      right: '0mm',
      bottom: '0mm',
      left: '0mm',
    },
    displayHeaderFooter: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  };

  const file = { content: finalHtmlContent };
  const pdfBuffer = await htmlPdf.generatePdf(file, options);

  if (typeof pdfBuffer === 'undefined') {
    throw new Error('Failed to generate PDF');
  }

  return {
    pdfBuffer: Buffer.from(pdfBuffer),
    ticketInfo: {
      routeName,
      departureTime,
      passengerNames: tickets.map((t) => t.passengerName),
    },
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

  // Inject CSS to force print colors
  const finalHtmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { 
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        body { -webkit-print-color-adjust: exact !important; }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `;

  // Options for html-pdf-node (receipt size)
  const options = {
    width: '80mm',
    height: '230mm',
    printBackground: true,
    preferCSSPageSize: false,
    margin: {
      top: '5mm',
      bottom: '5mm',
      left: '0mm',
      right: '0mm',
    },
    displayHeaderFooter: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  };

  const file = { content: finalHtmlContent };
  const pdfBuffer = await htmlPdf.generatePdf(file, options);

  // Update print count and last printed timestamp
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      printCount: { increment: 1 },
      lastPrintedAt: new Date(),
    },
  });

  if (typeof pdfBuffer === 'undefined') {
    throw new Error('Failed to generate PDF');
  }

  return Buffer.from(pdfBuffer);
}
