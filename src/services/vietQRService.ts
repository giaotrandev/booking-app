import axios from 'axios';
import crypto from 'crypto';

// VietQR API configuration
const VIETQR_API_URL = process.env.VIETQR_API_URL || 'https://api.vietqr.io/v2';
const VIETQR_API_KEY = process.env.VIETQR_API_KEY || '';
const VIETQR_API_SECRET = process.env.VIETQR_API_SECRET || '';
const VIETQR_BANK_ID = process.env.VIETQR_BANK_ID || '970436'; // Default to TCB
const VIETQR_ACCOUNT_NUMBER = process.env.VIETQR_ACCOUNT_NUMBER || '';
const VIETQR_ACCOUNT_NAME = process.env.VIETQR_ACCOUNT_NAME || '';

interface VietQRParams {
  accountNo: string;
  accountName: string;
  acqId: string;
  amount: number;
  addInfo: string;
  format?: 'text' | 'image' | 'url';
  template?: string;
}

/**
 * Generate VietQR payment QR code
 */
export const generateVietQR = async (
  amount: number,
  reference: string,
  customerName: string,
  format: 'text' | 'image' | 'url' = 'text'
): Promise<string> => {
  try {
    // Check if API key and secret are configured
    if (!VIETQR_API_KEY || !VIETQR_API_SECRET || !VIETQR_ACCOUNT_NUMBER) {
      console.warn('VietQR API is not properly configured, using mock QR code');
      return generateMockQRCode(amount, reference);
    }

    // Prepare request payload
    const payload: VietQRParams = {
      accountNo: VIETQR_ACCOUNT_NUMBER,
      accountName: VIETQR_ACCOUNT_NAME,
      acqId: VIETQR_BANK_ID,
      amount: Math.round(amount),
      addInfo: `Thanh toan dat ve ${reference} ${customerName}`,
      format: format,
    };

    // Generate signature
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const stringToSign = `${timestamp}|${JSON.stringify(payload)}`;
    const signature = crypto.createHmac('sha256', VIETQR_API_SECRET).update(stringToSign).digest('hex');

    // Make API request
    const response = await axios.post(`${VIETQR_API_URL}/generate`, payload, {
      headers: {
        'x-api-key': VIETQR_API_KEY,
        'x-api-time': timestamp,
        'x-api-signature': signature,
        'Content-Type': 'application/json',
      },
    });

    if (response.status !== 200 || !response.data.data) {
      throw new Error('Failed to generate VietQR code');
    }

    // Return QR code data
    return response.data.data.qrDataURL || response.data.data.qrCode || response.data.data.qrDataURL;
  } catch (error) {
    console.error('Error generating VietQR code:', error);
    return generateMockQRCode(amount, reference);
  }
};

/**
 * Generate a mock QR code text for testing
 */
function generateMockQRCode(amount: number, reference: string): string {
  return `mockqr_${VIETQR_BANK_ID}_${VIETQR_ACCOUNT_NUMBER}_${amount}_${reference}_${Date.now()}`;
}

/**
 * Validate VietQR payment configuration
 */
export const validateVietQRConfig = (): boolean => {
  if (!VIETQR_API_KEY || !VIETQR_API_SECRET || !VIETQR_ACCOUNT_NUMBER) {
    console.warn('VietQR configuration is missing required parameters');
    return false;
  }
  return true;
};
