import { jsPDF } from 'jspdf';
import { fmtINR } from '../utils/formatters';

export interface SharePdfOptions {
  doc: jsPDF;
  fileName: string; // e.g. "REC-1011.pdf" or "INV-1011.pdf"
  title: string; // e.g. "Payment Receipt" or "Stay Bill / Invoice"
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  propertyName?: string;
  bookingNo?: string;
  amount?: number;
  balanceDue?: number;
}

/**
 * Checks whether the current browser environment can natively share PDF files.
 */
export function canSharePdfFile(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) {
    return false;
  }
  try {
    const dummyFile = new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [dummyFile] });
  } catch {
    return false;
  }
}

/**
 * Shares the generated PDF document directly as a file via Web Share API
 * (allowing users to pick WhatsApp, Gmail, AirDrop, Messages, Telegram, Drive, etc.).
 * If native file sharing is not supported by the environment, it safely falls back
 * to saving the PDF to device downloads.
 */
export async function sharePdfNative(options: SharePdfOptions): Promise<{
  success: boolean;
  method: 'native' | 'download';
  message: string;
}> {
  const blob = options.doc.output('blob');
  const file = new File([blob], options.fileName, { type: 'application/pdf' });

  if (canSharePdfFile()) {
    try {
      await navigator.share({
        files: [file],
        title: `${options.title} - ${options.fileName}`,
        text: `Official PDF ${options.title} for ${options.guestName || 'Guest'} (${options.bookingNo || ''}) from ${options.propertyName || 'Bookzee Stays'}.`
      });
      return {
        success: true,
        method: 'native',
        message: `${options.fileName} shared via device media.`
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          success: false,
          method: 'native',
          message: 'Share dialogue dismissed.'
        };
      }
      // If native sharing failed unexpectedly, fall through to download
    }
  }

  // Fallback: save PDF directly to local filesystem
  options.doc.save(options.fileName);
  return {
    success: true,
    method: 'download',
    message: `PDF document ${options.fileName} saved to your device.`
  };
}

/**
 * Shares the PDF bill via WhatsApp.
 * Ensures the PDF is generated and saved as a real .pdf file, and opens
 * WhatsApp with pre-filled context referencing the attached PDF document.
 */
export async function sharePdfViaWhatsApp(options: SharePdfOptions): Promise<{
  success: boolean;
  message: string;
}> {
  // 1. Download the real PDF file to device so user has the actual document ready
  options.doc.save(options.fileName);

  // 2. Prepare phone and WhatsApp chat
  const phone = (options.guestPhone || '').replace(/[^0-9]/g, '');
  const greeting = `Namaste ${options.guestName || 'Guest'}!`;
  const text = `${greeting} Please find your official ${options.title} in PDF format (${options.fileName}) for your stay at ${options.propertyName || 'our property'}.\n\n` +
    `• Document: ${options.title} (${options.fileName})\n` +
    `• Booking Ref: ${options.bookingNo || '—'}\n` +
    (options.amount !== undefined ? `• Amount Recorded: ${fmtINR(options.amount)}\n` : '') +
    (options.balanceDue !== undefined ? `• Outstanding Due: ${fmtINR(options.balanceDue)}\n` : '') +
    `\n📄 The PDF file "${options.fileName}" is ready. You can attach it directly to this chat.`;

  const waUrl = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;

  window.open(waUrl, '_blank', 'noopener,noreferrer');

  return {
    success: true,
    message: `PDF bill ${options.fileName} downloaded. WhatsApp chat opened with prefilled text to attach your PDF.`
  };
}

/**
 * Shares the PDF bill via Email.
 * Automatically saves the PDF file and opens the user's default email client
 * with subject and message body instructing attachment of the PDF document.
 */
export async function sharePdfViaEmail(options: SharePdfOptions): Promise<{
  success: boolean;
  message: string;
}> {
  // 1. Save the actual PDF file
  options.doc.save(options.fileName);

  // 2. Prepare email
  const email = options.guestEmail || '';
  const subject = `Official PDF ${options.title}: ${options.fileName} - ${options.bookingNo || ''} (${options.propertyName || 'Stay'})`;
  const body = `Dear ${options.guestName || 'Valued Guest'},\n\n` +
    `Please find attached the official PDF ${options.title} (${options.fileName}) for your reservation with ${options.propertyName || 'our property'}.\n\n` +
    `• Document: ${options.title} (${options.fileName})\n` +
    `• Booking Reference: ${options.bookingNo || '—'}\n` +
    (options.amount !== undefined ? `• Amount Recorded: ${fmtINR(options.amount)}\n` : '') +
    (options.balanceDue !== undefined ? `• Remaining Balance: ${fmtINR(options.balanceDue)}\n` : '') +
    `\nThe official PDF file (${options.fileName}) has been downloaded to your device so you can attach it to this email.\n\n` +
    `Warm regards,\n${options.propertyName || 'Hospitality Front Desk'}`;

  window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return {
    success: true,
    message: `PDF bill ${options.fileName} saved. Email draft opened with instructions to attach your PDF.`
  };
}

/**
 * Opens the generated PDF directly in a new browser tab for preview / print.
 */
export function openPdfPreview(doc: jsPDF): void {
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
}
