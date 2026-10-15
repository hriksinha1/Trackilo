import React, { useState, useEffect } from 'react';
import { repository } from '../../lib/repository';
import { fmtINR, fmtDate } from '../../lib/utils/formatters';
import { getTodayDateStr } from '../../lib/utils/dates';
import { generatePaymentReceiptPDF, generateBookingInvoicePDF } from '../../lib/services/pdfGenerator';
import {
  X,
  CheckCircle2,
  Download,
  CreditCard,
  Building2,
  Calendar,
  AlertCircle,
  FileText,
  Share2,
  MessageCircle,
  Mail,
  Copy,
  Check,
  ArrowRight,
  Eye,
  Smartphone
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { Payment, Booking, BusinessSettings } from '../../lib/repository/types';
import {
  sharePdfNative,
  sharePdfViaWhatsApp,
  sharePdfViaEmail,
  openPdfPreview,
  canSharePdfFile
} from '../../lib/services/pdfShare';

interface AddPaymentModalProps {
  booking: Booking;
  balanceDue: number;
  onClose: () => void;
  onSuccess?: (payment: Payment, newBalance: number) => void;
}

export default function AddPaymentModal({
  booking,
  balanceDue,
  onClose,
  onSuccess
}: AddPaymentModalProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState<number | ''>(balanceDue);
  const [method, setMethod] = useState('UPI');
  const [refId, setRefId] = useState('');
  const [purpose, setPurpose] = useState('Advance deposit');
  const [date, setDate] = useState(() => getTodayDateStr());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<{
    payment: Payment;
    amount: number;
    newBalance: number;
    previouslyPaid: number;
  } | null>(null);

  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [previouslyPaid, setPreviouslyPaid] = useState<number>(0);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<'receipt' | 'invoice'>('receipt');

  useEffect(() => {
    repository.getSettings().then(setSettings);
    repository.getPayments(booking.id).then((payments) => {
      const total = payments.reduce((sum, p) => {
        if (p.status === 'Completed' || p.status === 'Recorded') return sum + Number(p.amount);
        if (p.status === 'Refunded') return sum - Number(p.amount);
        return sum;
      }, 0);
      setPreviouslyPaid(total);

      // Smart default purpose
      if (total === 0) {
        setPurpose('Advance deposit');
      } else if (balanceDue > 0) {
        setPurpose('Partial payment');
      } else {
        setPurpose('Settlement at check-out');
      }
    });
  }, [booking.id, balanceDue]);

  // Adjust purpose dynamically if paying full balance
  function handleSelectFullBalance() {
    setAmount(balanceDue);
    if (previouslyPaid > 0) {
      setPurpose('Settlement at check-out');
    }
  }

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError('');
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a payment amount greater than ₹0.');
      return;
    }

    if (numAmount > balanceDue) {
      setError(`Payment cannot exceed the outstanding balance of ${fmtINR(balanceDue)}.`);
      return;
    }

    setLoading(true);

    try {
      const payment = await repository.createPayment({
        payment_no: '', // auto-generated sequentially by repository
        booking_id: booking.id,
        date,
        amount: numAmount,
        method,
        purpose,
        ref_id: refId.trim() || undefined,
        status: 'Recorded'
      });

      const newBalance = Math.max(0, balanceDue - numAmount);

      setSuccessData({
        payment,
        amount: numAmount,
        newBalance,
        previouslyPaid
      });

      toast.success(
        'Payment Recorded',
        newBalance <= 0
          ? `${fmtINR(numAmount)} recorded. Stay is paid in full!`
          : `${fmtINR(numAmount)} recorded. ${fmtINR(newBalance)} remaining due.`
      );

      // Notify parent to refresh in background WITHOUT unmounting this modal
      if (onSuccess) {
        onSuccess(payment, newBalance);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  }

  async function getTargetPdf(docType: 'receipt' | 'invoice') {
    if (!successData || !settings) return null;
    if (docType === 'receipt') {
      const doc = await generatePaymentReceiptPDF(
        booking,
        successData.payment,
        booking.property,
        booking.customer,
        settings,
        successData.previouslyPaid,
        successData.newBalance
      );
      const fileName = `${successData.payment.payment_no}.pdf`;
      const title = successData.newBalance <= 0 ? 'Final Settlement Receipt' : 'Payment Receipt';
      return {
        doc,
        fileName,
        title,
        amount: successData.amount,
        balanceDue: successData.newBalance
      };
    } else {
      const doc = await generateBookingInvoicePDF(
        booking,
        [],
        booking.property,
        booking.customer,
        settings,
        booking.grand_total - successData.newBalance,
        successData.newBalance
      );
      const invNo = `${settings.invoicePrefix || 'INV-'}${booking.booking_no.replace(/^BK-/, '')}`;
      const fileName = `${invNo}.pdf`;
      const title = 'Stay Folio Bill / Invoice';
      return {
        doc,
        fileName,
        title,
        amount: booking.grand_total,
        balanceDue: successData.newBalance
      };
    }
  }

  async function handleSharePdfNative(docType: 'receipt' | 'invoice') {
    setDownloading(true);
    try {
      const target = await getTargetPdf(docType);
      if (!target) return;
      const res = await sharePdfNative({
        doc: target.doc,
        fileName: target.fileName,
        title: target.title,
        guestName: booking.customer?.name,
        guestPhone: booking.customer?.phone,
        guestEmail: booking.customer?.email,
        propertyName: booking.property?.name,
        bookingNo: booking.booking_no,
        amount: target.amount,
        balanceDue: target.balanceDue
      });
      if (res.success) {
        toast.success(res.method === 'native' ? 'Shared Successfully' : 'PDF Saved', res.message);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Share Failed', err.message || 'Could not share PDF bill.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleSharePdfWhatsApp(docType: 'receipt' | 'invoice') {
    setDownloading(true);
    try {
      const target = await getTargetPdf(docType);
      if (!target) return;
      const res = await sharePdfViaWhatsApp({
        doc: target.doc,
        fileName: target.fileName,
        title: target.title,
        guestName: booking.customer?.name,
        guestPhone: booking.customer?.phone,
        propertyName: booking.property?.name,
        bookingNo: booking.booking_no,
        amount: target.amount,
        balanceDue: target.balanceDue
      });
      toast.success('PDF Bill Ready', res.message);
    } catch (err: any) {
      console.error(err);
      toast.error('WhatsApp Prep Failed', 'Could not prepare PDF for WhatsApp.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleSharePdfEmail(docType: 'receipt' | 'invoice') {
    setDownloading(true);
    try {
      const target = await getTargetPdf(docType);
      if (!target) return;
      const res = await sharePdfViaEmail({
        doc: target.doc,
        fileName: target.fileName,
        title: target.title,
        guestName: booking.customer?.name,
        guestEmail: booking.customer?.email,
        propertyName: booking.property?.name,
        bookingNo: booking.booking_no,
        amount: target.amount,
        balanceDue: target.balanceDue
      });
      toast.success('Email Draft Opened', res.message);
    } catch (err: any) {
      console.error(err);
      toast.error('Email Prep Failed', 'Could not prepare PDF for email.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadPdf(docType: 'receipt' | 'invoice') {
    setDownloading(true);
    try {
      const target = await getTargetPdf(docType);
      if (!target) return;
      target.doc.save(target.fileName);
      toast.success('PDF Saved', `${target.fileName} downloaded to your device.`);
    } catch (err) {
      console.error(err);
      toast.error('Download Failed', 'Could not generate PDF file.');
    } finally {
      setDownloading(false);
    }
  }

  async function handlePreviewPdf(docType: 'receipt' | 'invoice') {
    setDownloading(true);
    try {
      const target = await getTargetPdf(docType);
      if (!target) return;
      openPdfPreview(target.doc);
    } catch (err) {
      console.error(err);
      toast.error('Preview Failed', 'Could not open PDF in browser.');
    } finally {
      setDownloading(false);
    }
  }

  // --- PERSISTENT POST-PAYMENT SUCCESS VIEW ---
  if (successData) {
    const isPaidInFull = successData.newBalance <= 0;

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-success-title"
        className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in"
      >
        <div
          className="bg-white rounded-2xl shadow-2xl border border-[#D8D2C5] w-full max-w-lg overflow-hidden animate-modal-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top banner */}
          <div className="p-6 text-center space-y-3 bg-[#FAF9F6] border-b border-[#EAE5DC]">
            <div className="w-14 h-14 rounded-full bg-[#EBF6EF] text-[#276749] flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0D5C56]">
                Transaction Recorded
              </span>
              <h2 id="payment-success-title" className="text-xl sm:text-2xl font-bold text-[#1A2B28] mt-0.5">
                {isPaidInFull ? 'Paid in Full' : 'Payment Recorded'}
              </h2>
              <p className="text-xs text-[#5C6E6B] mt-1 max-w-sm mx-auto">
                {isPaidInFull
                  ? 'All tariffs are fully settled. You can download the receipt or final stay invoice below.'
                  : `${fmtINR(successData.newBalance)} remaining due on booking ${booking.booking_no}.`}
              </p>
            </div>
          </div>

          {/* Transaction Summary Card */}
          <div className="p-5 sm:p-6 space-y-4">
            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#D8D2C5] space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#5C6E6B]">Receipt Number:</span>
                <span className="font-mono font-bold text-[#0D5C56] text-sm">
                  {successData.payment.payment_no}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#5C6E6B]">Amount Received:</span>
                <span className="font-bold text-base text-[#276749]">
                  {fmtINR(successData.amount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#5C6E6B]">Payment Method:</span>
                <span className="font-medium text-[#1A2B28]">
                  {successData.payment.method}
                  {successData.payment.ref_id ? ` • ${successData.payment.ref_id}` : ''}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#5C6E6B]">Guest / Property:</span>
                <span className="font-medium text-[#1A2B28] truncate max-w-[220px]">
                  {booking.customer?.name} • {booking.property?.name}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#EAE5DC]">
                <span className="text-[#5C6E6B] font-semibold">Remaining Due:</span>
                <span
                  className={`font-bold text-sm ${
                    isPaidInFull ? 'text-[#276749]' : 'text-[#C45532]'
                  }`}
                >
                  {isPaidInFull ? '₹0 (Settled)' : fmtINR(successData.newBalance)}
                </span>
              </div>
            </div>

            {/* PDF Format Bill Sharing Suite */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6B]">
                  Share Bill in PDF Format
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E8F3F1] text-[#0D5C56] border border-[#BDDFC9]">
                  PDF Format (Not Text)
                </span>
              </div>

              {/* Document Selector Toggle */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F3F0EA] rounded-xl border border-[#D8D2C5]">
                <button
                  type="button"
                  onClick={() => setSelectedDoc('receipt')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    selectedDoc === 'receipt'
                      ? 'bg-white text-[#0D5C56] shadow-2xs'
                      : 'text-[#5C6E6B] hover:text-[#1A2B28]'
                  }`}
                >
                  <FileText size={13} />
                  <span>Receipt PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDoc('invoice')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    selectedDoc === 'invoice'
                      ? 'bg-white text-[#0D5C56] shadow-2xs'
                      : 'text-[#5C6E6B] hover:text-[#1A2B28]'
                  }`}
                >
                  <Building2 size={13} />
                  <span>Stay Folio Bill</span>
                </button>
              </div>

              {/* Primary PDF Share Action */}
              <button
                type="button"
                onClick={() => handleSharePdfNative(selectedDoc)}
                disabled={downloading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0D5C56] hover:bg-[#094440] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-2xs transition-colors"
                title="Share the PDF document file using your device's media picker (WhatsApp, Gmail, AirDrop, Messages)"
              >
                <Share2 size={15} />
                <span>Share PDF File (WhatsApp, Mail, AirDrop)</span>
              </button>

              {/* Direct Media Channels in PDF Format */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSharePdfWhatsApp(selectedDoc)}
                  disabled={downloading}
                  className="py-2.5 px-3 rounded-xl border border-[#D8D2C5] bg-white hover:border-[#25D366] hover:bg-[#F2FAF5] text-xs font-semibold text-[#1A2B28] flex items-center justify-center gap-2 transition-all group"
                  title="Save PDF and open WhatsApp to share the bill"
                >
                  <MessageCircle size={15} className="text-[#25D366] group-hover:scale-110 transition-transform" />
                  <span>WhatsApp PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSharePdfEmail(selectedDoc)}
                  disabled={downloading}
                  className="py-2.5 px-3 rounded-xl border border-[#D8D2C5] bg-white hover:border-[#0D5C56] hover:bg-[#E8F3F1] text-xs font-semibold text-[#1A2B28] flex items-center justify-center gap-2 transition-all group"
                  title="Save PDF and prepare email draft"
                >
                  <Mail size={15} className="text-[#0D5C56] group-hover:scale-110 transition-transform" />
                  <span>Email PDF</span>
                </button>
              </div>

              {/* Direct Download & Preview in New Tab */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(selectedDoc)}
                  disabled={downloading}
                  className="py-2 px-3 rounded-xl border border-[#D8D2C5] bg-[#FAF9F6] hover:bg-white text-xs font-medium text-[#5C6E6B] hover:text-[#1A2B28] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download size={13} />
                  <span>Download .PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePreviewPdf(selectedDoc)}
                  disabled={downloading}
                  className="py-2 px-3 rounded-xl border border-[#D8D2C5] bg-[#FAF9F6] hover:bg-white text-xs font-medium text-[#5C6E6B] hover:text-[#1A2B28] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Eye size={13} />
                  <span>Preview PDF</span>
                </button>
              </div>

              <div className="text-[11px] text-[#5C6E6B] text-center pt-0.5">
                The {selectedDoc === 'receipt' ? 'payment receipt' : 'stay invoice bill'} is shared as an official <span className="font-semibold text-[#0D5C56]">.pdf file</span>.
              </div>
            </div>

            {/* Done Button */}
            <div className="pt-2 border-t border-[#EAE5DC]">
              <button
                type="button"
                onClick={onClose}
                className="w-full btn btn-primary py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <span>Return to Stay / Workspace</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- STANDARD ENTRY FORM VIEW ---
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-payment-title"
      className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-[#D8D2C5] w-full max-w-lg overflow-hidden animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#EAE5DC] flex items-center justify-between bg-[#FAF9F6]">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#0D5C56]">
              Payment Collection
            </div>
            <h3 id="record-payment-title" className="text-base font-bold text-[#1A2B28]">
              Record Payment
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-stone-400 hover:text-[#1A2B28] hover:bg-stone-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Balance Summary Banner */}
        <div className="p-4 bg-[#E8F3F1] border-b border-[#BDDFC9] flex items-center justify-between">
          <div>
            <div className="text-xs text-[#0D5C56] font-semibold">{booking.customer?.name}</div>
            <div className="text-[11px] text-[#5C6E6B]">{booking.booking_no} • {booking.property?.name}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-[#5C6E6B]">Outstanding Balance</div>
            <div className="text-lg font-bold text-[#1A2B28]">{fmtINR(balanceDue)}</div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#1A2B28]">
                Payment Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleSelectFullBalance}
                className="text-xs font-semibold text-[#0D5C56] hover:underline cursor-pointer"
              >
                Pay Full Balance ({fmtINR(balanceDue)})
              </button>
            </div>
            <input
              type="number"
              required
              min={1}
              max={balanceDue}
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="input text-base font-bold text-[#1A2B28]"
              placeholder="Enter amount"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1A2B28] mb-1.5">
                Payment Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="select text-xs"
              >
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="Card">Credit / Debit Card</option>
                <option value="Cash">Cash at Front Desk</option>
                <option value="Bank Transfer">Bank Transfer (NEFT / IMPS)</option>
                <option value="Online Gateway">Online Gateway</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A2B28] mb-1.5">
                Payment Purpose
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="select text-xs"
              >
                <option value="Advance deposit">Advance deposit</option>
                <option value="Partial payment">Partial payment</option>
                <option value="Check-in payment">Check-in payment</option>
                <option value="Settlement at check-out">Settlement at check-out</option>
                <option value="In-stay room charge">In-stay room charge</option>
                <option value="Food & Beverage">Food & Beverage</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1A2B28] mb-1.5">
                Transaction Ref / UTR (Optional)
              </label>
              <input
                type="text"
                value={refId}
                onChange={(e) => setRefId(e.target.value)}
                placeholder="e.g. UPI Ref #482910"
                className="input text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A2B28] mb-1.5">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#EAE5DC]">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary text-xs px-5 flex items-center gap-1.5 font-semibold"
            >
              {loading ? (
                <span>Recording...</span>
              ) : (
                <>
                  <CreditCard size={14} />
                  <span>Record Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
