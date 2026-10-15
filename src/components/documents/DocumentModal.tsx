import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Share2,
  FileText,
  Mail,
  MessageCircle,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Eye
} from 'lucide-react';
import { Booking, Payment, BusinessSettings } from '../../lib/repository/types';
import { fmtINR, fmtDate } from '../../lib/utils/formatters';
import { generatePaymentReceiptPDF, generateBookingInvoicePDF } from '../../lib/services/pdfGenerator';
import { useToast } from '../../context/ToastContext';
import {
  sharePdfNative,
  sharePdfViaWhatsApp,
  sharePdfViaEmail,
  openPdfPreview
} from '../../lib/services/pdfShare';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'receipt' | 'invoice';
  booking: Booking;
  payment?: Payment;
  previouslyPaid?: number;
  balanceDue?: number;
  settings?: BusinessSettings | null;
}

export default function DocumentModal({
  isOpen,
  onClose,
  type,
  booking,
  payment,
  previouslyPaid = 0,
  balanceDue = 0,
  settings
}: DocumentModalProps) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'share'>('preview');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const guestName = booking.customer?.name || 'Valued Guest';
  const guestPhone = booking.customer?.phone || '';
  const guestEmail = booking.customer?.email || '';
  const propertyName = booking.property?.name || settings?.name || 'Bookzee Stays';

  const docTitle =
    type === 'receipt'
      ? previouslyPaid === 0 && balanceDue > 0
        ? 'Advance Payment Receipt'
        : balanceDue <= 0
        ? 'Final Settlement Receipt'
        : 'Payment Receipt'
      : 'Stay Folio Invoice';

  const docNumber =
    type === 'receipt'
      ? payment?.payment_no || 'REC'
      : `${settings?.invoicePrefix || 'INV-'}${booking.booking_no.replace(/^BK-/, '')}`;

  const currentAmount = type === 'receipt' ? payment?.amount || 0 : booking.grand_total;

  async function generateCurrentDoc() {
    if (type === 'receipt' && payment) {
      return await generatePaymentReceiptPDF(
        booking,
        payment,
        booking.property,
        booking.customer,
        settings,
        previouslyPaid,
        balanceDue
      );
    } else {
      return await generateBookingInvoicePDF(
        booking,
        [],
        booking.property,
        booking.customer,
        settings,
        booking.grand_total - balanceDue,
        balanceDue
      );
    }
  }

  async function handleDownloadPDF() {
    setDownloading(true);
    try {
      const doc = await generateCurrentDoc();
      doc.save(`${docNumber}.pdf`);
      toast.success('PDF Downloaded', `${docNumber}.pdf saved to your device.`);
    } catch (err) {
      console.error(err);
      toast.error('PDF Generation Failed', 'Could not create PDF file.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleWhatsAppShare() {
    setDownloading(true);
    try {
      const doc = await generateCurrentDoc();
      const res = await sharePdfViaWhatsApp({
        doc,
        fileName: `${docNumber}.pdf`,
        title: docTitle,
        guestName,
        guestPhone,
        propertyName,
        bookingNo: booking.booking_no,
        amount: currentAmount,
        balanceDue
      });
      toast.success('PDF Bill Ready', res.message);
    } catch (err) {
      console.error(err);
      toast.error('WhatsApp Prep Failed', 'Could not prepare PDF for WhatsApp.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleEmailShare() {
    setDownloading(true);
    try {
      const doc = await generateCurrentDoc();
      const res = await sharePdfViaEmail({
        doc,
        fileName: `${docNumber}.pdf`,
        title: docTitle,
        guestName,
        guestEmail,
        propertyName,
        bookingNo: booking.booking_no,
        amount: currentAmount,
        balanceDue
      });
      toast.success('Email Draft Opened', res.message);
    } catch (err) {
      console.error(err);
      toast.error('Email Prep Failed', 'Could not prepare PDF for email.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleNativeShare() {
    setDownloading(true);
    try {
      const doc = await generateCurrentDoc();
      const res = await sharePdfNative({
        doc,
        fileName: `${docNumber}.pdf`,
        title: docTitle,
        guestName,
        guestPhone,
        guestEmail,
        propertyName,
        bookingNo: booking.booking_no,
        amount: currentAmount,
        balanceDue
      });
      if (res.success) {
        toast.success(res.method === 'native' ? 'Shared via System' : 'PDF Saved', res.message);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Share Failed', err.message || 'Could not share PDF document.');
    } finally {
      setDownloading(false);
    }
  }

  async function handlePreviewTab() {
    setDownloading(true);
    try {
      const doc = await generateCurrentDoc();
      openPdfPreview(doc);
    } catch (err) {
      console.error(err);
      toast.error('Preview Failed', 'Could not open PDF in browser.');
    } finally {
      setDownloading(false);
    }
  }

  function handleCopySummary() {
    const summary = `${docTitle} (${docNumber})\n` +
      `Guest: ${guestName}\n` +
      `Property: ${propertyName}\n` +
      `Booking: ${booking.booking_no}\n` +
      `Dates: ${fmtDate(booking.check_in)} - ${fmtDate(booking.check_out)}\n` +
      `Amount: ${fmtINR(currentAmount)}\n` +
      `Balance Due: ${fmtINR(balanceDue)}`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.success('Details Copied', 'Document summary copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-modal-title"
      className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-[#D8D2C5] w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#EAE5DC] flex items-center justify-between bg-[#FAF9F6] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F3F1] text-[#0D5C56] flex items-center justify-center shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#0D5C56]">
                  {type === 'receipt' ? 'Receipt View' : 'Invoice View'}
                </span>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                  {docNumber}
                </span>
              </div>
              <h2 id="doc-modal-title" className="text-base sm:text-lg font-bold text-[#1A2B28] leading-tight">
                {docTitle}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-stone-400 hover:text-[#1A2B28] hover:bg-stone-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#EAE5DC] bg-white px-5 sm:px-6 pt-2 shrink-0">
          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'preview'
                ? 'border-[#0D5C56] text-[#0D5C56]'
                : 'border-transparent text-[#5C6E6B] hover:text-[#1A2B28]'
            }`}
          >
            Document Details
          </button>
          <button
            onClick={() => setActiveTab('share')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'share'
                ? 'border-[#0D5C56] text-[#0D5C56]'
                : 'border-transparent text-[#5C6E6B] hover:text-[#1A2B28]'
            }`}
          >
            <Share2 size={13} />
            <span>Send & Share Options</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {activeTab === 'preview' ? (
            <div className="space-y-4">
              {/* Document Visual Card */}
              <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#D8D2C5] space-y-3">
                <div className="flex items-start justify-between border-b border-[#EAE5DC] pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#5C6E6B] tracking-wider">Property</span>
                    <h3 className="text-sm font-bold text-[#1A2B28]">{propertyName}</h3>
                    <p className="text-[11px] text-[#5C6E6B]">{booking.property?.city}, {booking.property?.state}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-[#5C6E6B] tracking-wider">Document Ref</span>
                    <div className="font-mono text-xs font-bold text-[#0D5C56]">{docNumber}</div>
                    <div className="text-[11px] text-[#5C6E6B]">{fmtDate(payment?.date || booking.created_at)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 py-1">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#5C6E6B] tracking-wider">Guest Details</span>
                    <div className="font-semibold text-[#1A2B28] text-xs mt-0.5">{guestName}</div>
                    <div className="text-[#5C6E6B] text-[11px]">{guestPhone || 'No phone recorded'}</div>
                    {guestEmail && <div className="text-[#5C6E6B] text-[11px] truncate">{guestEmail}</div>}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#5C6E6B] tracking-wider">Stay Itinerary</span>
                    <div className="font-semibold text-[#1A2B28] text-xs mt-0.5">{booking.booking_no}</div>
                    <div className="text-[#5C6E6B] text-[11px]">{fmtDate(booking.check_in)} – {fmtDate(booking.check_out)}</div>
                    <div className="text-[#5C6E6B] text-[11px]">{booking.nights} night(s) • {booking.room_type}</div>
                  </div>
                </div>

                {/* Amount breakdown */}
                <div className="rounded-lg bg-white border border-[#EAE5DC] p-3 space-y-1.5 text-xs">
                  {type === 'receipt' ? (
                    <>
                      <div className="flex justify-between text-[#5C6E6B]">
                        <span>Reservation Tariff Total:</span>
                        <span className="font-medium text-[#1A2B28]">{fmtINR(booking.grand_total)}</span>
                      </div>
                      <div className="flex justify-between text-[#5C6E6B]">
                        <span>Previously Settled:</span>
                        <span className="font-medium text-[#1A2B28]">{fmtINR(previouslyPaid)}</span>
                      </div>
                      <div className="flex justify-between text-[#276749] font-bold text-sm pt-1 border-t border-[#EAE5DC]">
                        <span>Current Payment ({payment?.method || 'Direct'}):</span>
                        <span>{fmtINR(payment?.amount || 0)}</span>
                      </div>
                      <div className="flex justify-between text-[#5C6E6B] pt-1">
                        <span>Remaining Balance Due:</span>
                        <span className={`font-semibold ${balanceDue > 0 ? 'text-[#C45532]' : 'text-[#276749]'}`}>
                          {balanceDue > 0 ? fmtINR(balanceDue) : 'Paid in Full (Rs. 0)'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-[#5C6E6B]">
                        <span>Base Accommodation Tariff:</span>
                        <span className="font-medium text-[#1A2B28]">{fmtINR(booking.base_amount)}</span>
                      </div>
                      {(booking.discount ?? 0) > 0 && (
                        <div className="flex justify-between text-[#276749]">
                          <span>Special Discount:</span>
                          <span className="font-medium">-{fmtINR(booking.discount)}</span>
                        </div>
                      )}
                      {booking.tax_enabled && (
                        <div className="flex justify-between text-[#5C6E6B]">
                          <span>Tax ({booking.tax_rate}%):</span>
                          <span className="font-medium text-[#1A2B28]">{fmtINR(booking.tax_amount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-sm text-[#0D5C56] pt-1 border-t border-[#EAE5DC]">
                        <span>Grand Total:</span>
                        <span>{fmtINR(booking.grand_total)}</span>
                      </div>
                      <div className="flex justify-between text-[#5C6E6B] pt-1">
                        <span>Outstanding Balance Due:</span>
                        <span className={`font-semibold ${balanceDue > 0 ? 'text-[#C45532]' : 'text-[#276749]'}`}>
                          {balanceDue > 0 ? fmtINR(balanceDue) : 'Paid in Full (Rs. 0)'}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="text-[11px] text-[#5C6E6B] flex items-center gap-1.5 pt-1">
                  <ShieldCheck size={14} className="text-[#0D5C56]" />
                  <span>Electronically recorded in Bookzee Hospitality Workspace.</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-[#E8F3F1] border border-[#BDDFC9] text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#0D5C56]" />
                  <span className="text-[#1A2B28] font-medium">
                    Verified stay folio prepared in official <strong className="text-[#0D5C56]">.PDF format</strong>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handlePreviewTab}
                  disabled={downloading}
                  className="text-xs text-[#0D5C56] font-semibold underline hover:text-[#094440] flex items-center gap-1 cursor-pointer"
                >
                  <Eye size={12} />
                  <span>Preview PDF</span>
                </button>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Native Device File Share */}
                <button
                  onClick={handleNativeShare}
                  disabled={downloading}
                  className="p-3.5 rounded-xl border border-[#0D5C56] bg-[#FAFDFB] hover:bg-[#E8F3F1] text-left transition-all flex items-start gap-3 group shadow-2xs cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#0D5C56] text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Share2 size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1A2B28] text-xs">Share PDF File</h4>
                    <p className="text-[11px] text-[#5C6E6B] mt-0.5">
                      Send actual .pdf to WhatsApp, Gmail, AirDrop, Messages
                    </p>
                  </div>
                </button>

                {/* WhatsApp PDF */}
                <button
                  onClick={handleWhatsAppShare}
                  disabled={downloading}
                  className="p-3.5 rounded-xl border border-[#D8D2C5] bg-white hover:border-[#25D366] hover:bg-[#F2FAF5] text-left transition-all flex items-start gap-3 group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#25D366]/10 text-[#25D366] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1A2B28] text-xs">WhatsApp (PDF Bill)</h4>
                    <p className="text-[11px] text-[#5C6E6B] mt-0.5">
                      {guestPhone ? `Downloads PDF & opens chat with ${guestPhone}` : 'Downloads PDF & opens WhatsApp'}
                    </p>
                  </div>
                </button>

                {/* Email PDF */}
                <button
                  onClick={handleEmailShare}
                  disabled={downloading}
                  className="p-3.5 rounded-xl border border-[#D8D2C5] bg-white hover:border-[#0D5C56] hover:bg-[#E8F3F1] text-left transition-all flex items-start gap-3 group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#0D5C56]/10 text-[#0D5C56] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Mail size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1A2B28] text-xs">Email Draft (PDF Bill)</h4>
                    <p className="text-[11px] text-[#5C6E6B] mt-0.5">
                      {guestEmail ? `Downloads PDF & prepares draft to ${guestEmail}` : 'Downloads PDF & opens email draft'}
                    </p>
                  </div>
                </button>

                {/* Direct PDF Download */}
                <button
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                  className="p-3.5 rounded-xl border border-[#D8D2C5] bg-white hover:border-stone-400 hover:bg-[#FAF9F6] text-left transition-all flex items-start gap-3 group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Download size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1A2B28] text-xs">Download PDF Document</h4>
                    <p className="text-[11px] text-[#5C6E6B] mt-0.5">
                      Save {docNumber}.pdf directly to your device
                    </p>
                  </div>
                </button>
              </div>

              {/* PDF Document Notice */}
              <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#EAE5DC] text-[#1A2B28] space-y-1">
                <span className="font-semibold text-xs text-[#0D5C56] flex items-center gap-1.5">
                  <FileText size={14} className="text-[#0D5C56] shrink-0" />
                  PDF Format Guarantee
                </span>
                <p className="text-[11px] text-[#5C6E6B] leading-relaxed">
                  All channels share this stay document as an official PDF format file ({docNumber}.pdf), including property details, GSTIN, guest records, and financial breakdown.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-[#EAE5DC] bg-[#FAF9F6] flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={handleCopySummary}
            className="btn btn-outline text-xs hidden sm:inline-flex items-center gap-1.5"
          >
            {copied ? <Check size={14} className="text-[#276749]" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>

          <div className="flex items-center gap-2.5 ml-auto w-full sm:w-auto">
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="btn btn-primary text-xs flex-1 sm:flex-initial flex items-center justify-center gap-1.5 font-semibold py-2.5"
            >
              <Download size={15} />
              <span>{downloading ? 'Preparing PDF...' : 'Download PDF Document'}</span>
            </button>
            <button
              onClick={onClose}
              className="btn btn-outline text-xs px-4 py-2.5"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
