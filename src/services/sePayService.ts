import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '#config/db';

// SePay API configuration
const SEPAY_API_URL = process.env.SEPAY_API_URL || 'https://api.sepay.vn/v1';
const SEPAY_API_KEY = process.env.SEPAY_API_KEY || '';
const SEPAY_API_SECRET = process.env.SEPAY_API_SECRET || '';
const SEPAY_MERCHANT_ID = process.env.SEPAY_MERCHANT_ID || '';
const SEPAY_WEBHOOK_SECRET = process.env.SEPAY_WEBHOOK_SECRET || '';

/**
 * Register a payment transaction with SePay for webhook monitoring
 */
export const registerPaymentTransaction = async (
  bookingId: string,
  referenceId: string,
  amount: number,
  expireAt: Date
): Promise<string | null> => {
  try {
    // Check if API key and secret are configured
    if (!SEPAY_API_KEY || !SEPAY_API_SECRET || !SEPAY_MERCHANT_ID) {
      console.warn('SePay API is not properly configured, using mock registration');
      return `mock_sepay_${referenceId}_${Date.now()}`;
    }

    // Prepare request payload
    const payload = {
      merchantId: SEPAY_MERCHANT_ID,
      merchantOrderId: referenceId,
      amount: Math.round(amount),
      description: `Booking payment for ${referenceId}`,
      currency: 'VND',
      expireAt: expireAt.toISOString(),
      callbackUrl: `${process.env.API_BASE_URL || 'http://localhost:5000'}/api/bookings/webhook/payment`,
      metadata: {
        bookingId,
      },
    };

    // Generate signature
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const stringToSign = `${timestamp}|${JSON.stringify(payload)}`;
    const signature = crypto.createHmac('sha256', SEPAY_API_SECRET).update(stringToSign).digest('hex');

    // Make API request
    const response = await axios.post(`${SEPAY_API_URL}/payment/register`, payload, {
      headers: {
        'x-api-key': SEPAY_API_KEY,
        'x-api-time': timestamp,
        'x-api-signature': signature,
        'Content-Type': 'application/json',
      },
    });

    if (response.status !== 200 || !response.data.success) {
      throw new Error('Failed to register payment with SePay');
    }

    // Return transaction ID
    return response.data.data.transactionId;
  } catch (error) {
    console.error('Error registering payment with SePay:', error);
    return null;
  }
};

/**
 * Verify the signature of incoming SePay webhook
 */
export const verifyWebhookSignature = (payload: any, signature: string, timestamp: string): boolean => {
  try {
    if (!SEPAY_WEBHOOK_SECRET) {
      console.warn('SePay webhook secret is not configured, skipping verification');
      return true; // Skip verification in development
    }

    const stringToSign = `${timestamp}|${JSON.stringify(payload)}`;
    const expectedSignature = crypto.createHmac('sha256', SEPAY_WEBHOOK_SECRET).update(stringToSign).digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
};

/**
 * Process incoming SePay webhook payload
 */
export const processWebhookPayload = async (payload: any): Promise<boolean> => {
  try {
    const { transactionId, merchantOrderId, amount, status, metadata } = payload;

    // Find booking by reference ID or from metadata
    const bookingId = metadata?.bookingId;
    const booking = await prisma.booking.findFirst({
      where: {
        OR: [{ id: bookingId }, { paymentWebhookReference: merchantOrderId }],
      },
      include: {
        bookingTrips: {
          include: {
            seats: true,
          },
        },
      },
    });

    if (!booking) {
      console.error(`Booking not found for transaction: ${transactionId}`);
      return false;
    }

    // Process based on payment status
    if (status === 'COMPLETED' || status === 'SUCCESS') {
      // Verify amount matches (with small tolerance for fees)
      const amountDiff = Math.abs(booking.finalPrice - amount);
      const isAmountValid = amountDiff <= 1000; // Allow 1000 VND difference

      if (!isAmountValid) {
        console.warn(`Payment amount mismatch: expected ${booking.finalPrice}, got ${amount}`);
        // Still proceed but log the discrepancy
      }

      // Update booking in transaction
      await prisma.$transaction(async (tx) => {
        // Update booking status
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            paymentStatus: 'COMPLETED',
            status: 'CONFIRMED',
          },
        });

        // Update seat status to booked
        for (const bookingTrip of booking.bookingTrips) {
          for (const seat of bookingTrip.seats) {
            await tx.seat.update({
              where: { id: seat.id },
              data: {
                status: 'BOOKED',
              },
            });
          }
        }

        // Create history record
        await tx.bookingHistory.create({
          data: {
            bookingId: booking.id,
            changedFields: {
              paymentStatus: { from: booking.paymentStatus, to: 'COMPLETED' },
              status: { from: booking.status, to: 'CONFIRMED' },
            },
            changedBy: booking.userId || booking.guestName || 'N/A',
            changeReason: `Payment completed via SePay. Transaction ID: ${transactionId}`,
          },
        });
      });

      console.log(`Payment completed for booking ${booking.id}`);
      return true;
    } else if (status === 'FAILED' || status === 'REJECTED') {
      // Handle payment failure
      await prisma.bookingHistory.create({
        data: {
          bookingId: booking.id,
          changedFields: {
            paymentStatus: { from: booking.paymentStatus, to: 'FAILED' },
          },
          changedBy: booking.userId || booking.guestName || 'N/A',
          changeReason: `Payment failed via SePay. Transaction ID: ${transactionId}`,
        },
      });

      console.log(`Payment failed for booking ${booking.id}`);
      return true;
    }

    return true;
  } catch (error) {
    console.error('Error processing webhook payload:', error);
    return false;
  }
};

/**
 * Check transaction status with SePay API
 */
export const checkTransactionStatus = async (transactionId: string): Promise<any> => {
  try {
    // Check if API key and secret are configured
    if (!SEPAY_API_KEY || !SEPAY_API_SECRET) {
      console.warn('SePay API is not properly configured, returning mock status');
      return { status: 'PENDING' };
    }

    // Generate signature
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const stringToSign = `${timestamp}|${transactionId}`;
    const signature = crypto.createHmac('sha256', SEPAY_API_SECRET).update(stringToSign).digest('hex');

    // Make API request
    const response = await axios.get(`${SEPAY_API_URL}/payment/status/${transactionId}`, {
      headers: {
        'x-api-key': SEPAY_API_KEY,
        'x-api-time': timestamp,
        'x-api-signature': signature,
      },
    });

    if (response.status !== 200 || !response.data.success) {
      throw new Error('Failed to get transaction status from SePay');
    }

    return response.data.data;
  } catch (error) {
    console.error('Error checking transaction status with SePay:', error);
    return { status: 'UNKNOWN' };
  }
};
