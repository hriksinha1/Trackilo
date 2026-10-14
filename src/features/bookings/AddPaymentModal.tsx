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
  ArrowRight
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { Payment, Booking, BusinessSettings } from '../../lib/repository/types';

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

  async function handleDownloadReceipt() {
    if (!successData || !settings) return;
    setDownloading(true);
    try {
      const doc = await generatePaymentReceiptPDF(
        booking,
        successData.payment,
        booking.property,
        booking.customer,
        settings,
        successData.previouslyPaid,
        successData.newBalance
      );
      doc.save(`${successData.payment.payment_no}.pdf`);
      toast.success('Receipt Saved', `${successData.payment.payment_no}.pdf downloaded.`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate receipt PDF');
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadInvoice() {
    if (!successData || !settings) return;
    setDownloading(true);
    try {
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
      doc.save(`${invNo}.pdf`);
      toast.success('Invoice Saved', `${invNo}.pdf downloaded.`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate invoice PDF');
    } finally {
      setDownloading(false);
    }
  }

  function handleWhatsAppShare() {
    if (!successData) return;
    const phone = (booking.customer?.phone || '').replace(/[^0-9]/g, '');
    const docTitle = successData.newBalance <= 0 ? 'Final Settlement Receipt' : 'Payment Receipt';
    const msg = `Namaste ${booking.customer?.name || 'Guest'}! Here is your ${docTitle} (${successData.payment.payment_no}) for your stay at ${booking.property?.name || 'our property'}.\n\n` +
      `Booking: ${booking.booking_no}\n` +
      `Amount Paid: ${fmtINR(successData.amount)} (${successData.payment.method})\n` +
      `Remaining Due: ${fmtINR(successData.newBalance)}\n\n` +
      `Thank you for staying with us!`;

    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success('WhatsApp Prepared', 'Pre-filled message ready to send with your receipt.');
  }

  function handleEmailShare() {
    if (!successData) return;
    const email = booking.customer?.email || '';
    const subject = `Payment Receipt ${successData.payment.payment_no} - ${booking.property?.name || 'Stay'}`;
    const body = `Dear ${booking.customer?.name || 'Valued Guest'},\n\n` +
      `We have recorded your payment of ${fmtINR(successData.amount)} via ${successData.payment.method}.\n\n` +
      `Receipt Number: ${successData.payment.payment_no}\n` +
      `Booking Reference: ${booking.booking_no}\n` +
      `Remaining Balance: ${fmtINR(successData.newBalance)}\n\n` +
      `Thank you,\n${booking.property?.name || 'Hospitality Front Desk'}`;

    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast.success('Email Client Opened', 'Pre-populated email draft opened.');
  }

  function handleCopyDetails() {
    if (!successData) return;
    const text = `Receipt: ${successData.payment.payment_no}\n` +
      `Guest: ${booking.customer?.name}\n` +
      `Amount: ${fmtINR(successData.amount)}\n` +
      `Balance: ${fmtINR(successData.newBalance)}\n` +
      `Ref: ${booking.booking_no}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Details Copied', 'Receipt details copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
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

            {/* Document Actions Grid */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6B]">
                Immediate Document Actions
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadReceipt}
                  disabled={downloading}
                  className="p-3 rounded-xl border border-[#0D5C56] bg-[#E8F3F1] hover:bg-[#D4EAE7] text-[#0D5C56] text-left transition-colors font-medium flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <Download size={14} />
                      <span>Receipt PDF</span>
                    </div>
                    <div className="text-[10px] text-[#0D5C56]/80 mt-0.5">Instant download</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadInvoice}
                  disabled={downloading}
                  className="p-3 rounded-xl border border-[#D8D2C5] bg-white hover:bg-[#FAF9F6] text-[#1A2B28] text-left transition-colors font-medium flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <FileText size={14} className="text-[#0D5C56]" />
                      <span>Stay Invoice</span>
                    </div>
                    <div className="text-[10px] text-[#5C6E6B] mt-0.5">Complete stay folio</div>
                  </div>
                </button>
              </div>

              {/* Quick Share Options */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="flex-1 py-2 px-3 rounded-lg border border-[#D8D2C5] bg-white hover:border-[#25D366] text-xs font-medium text-[#1A2B28] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageCircle size={14} className="text-[#25D366]" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={handleEmailShare}
                  className="flex-1 py-2 px-3 rounded-lg border border-[#D8D2C5] bg-white hover:border-[#0D5C56] text-xs font-medium text-[#1A2B28] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Mail size={14} className="text-[#0D5C56]" />
                  <span>Email</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyDetails}
                  className="py-2 px-3 rounded-lg border border-[#D8D2C5] bg-white hover:bg-stone-50 text-xs font-medium text-[#1A2B28] flex items-center justify-center gap-1.5 transition-colors"
                  title="Copy receipt details for Instagram or SMS"
                >
                  {copied ? <Check size={14} className="text-[#276749]" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
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
