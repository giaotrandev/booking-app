import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';

export function generateUniqueTicketNumber(): string {
  const prefix = 'TK';
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}${timestamp}${randomStr}`;
}

export function generateUniqueQRCode(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function createTempDirectory(): string {
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
}

export async function generateQRCodeImage(data: string, options = { width: 300, margin: 4 }): Promise<string> {
  const tempDir = createTempDirectory();
  const qrFileName = `qr-${crypto.randomBytes(16).toString('hex')}.png`;
  const qrFilePath = path.join(tempDir, qrFileName);

  await QRCode.toFile(qrFilePath, data, options);
  return qrFilePath;
}
