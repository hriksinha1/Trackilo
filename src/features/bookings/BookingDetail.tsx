import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { repository } from '../../lib/repository';
import { Booking, Payment, Property, Customer, SystemSettings } from '../../lib/repository/types';
import { fmtDate, fmtINR } from '../../lib/utils/formatters';
import { calculateBookingFinancials } from '../../lib/utils/financials';
import AddPaymentModal from './AddPaymentModal';
import DocumentModal from '../../components/documents/DocumentModal';
import {
  generatePaymentReceiptPDF,
  generateBookingInvoicePDF
} from '../../lib/services/pdfGenerator';
import {
  ArrowLeft,
  Calendar,
  Building2,
  User,
  CreditCard,
  Download,
  Share2,
  FileText,
  CheckCircle2,
  LogIn,
  LogOut,
  AlertCircle,
  Plus,
  ShieldCheck,
  Mail,
  Phone,
  Clock,
  Ban,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showPayModal, setShowPayModal] = useState(false);
  const [documentModal, setDocumentModal] = useState<{
    open: boolean;
    type: 'receipt' | 'invoice';
    payment?: Payment;
    previouslyPaid?: number;
    balanceDue?: number;
  }>({
    open: false,
    type: 'invoice'
  });

  // Check-out warning modal
  const [showCheckoutWarning, setShowCheckoutWarning] = useState(false);

  // Cancel stay modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Guest requested cancellation');
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    try {
      const [bData, pData, sData, cData, propData] = await Promise.all([
        repository.getBooking(id as string),
        repository.getPayments(id as string),
        repository.getSettings(),
        repository.getCustomers(),
        repository.getProperties()
      ]);

      if (bData) {
        bData.customer = cData.find((c) => c.id === bData.customer_id);
        bData.property = propData.find((p) => p.id === bData.property_id);
      }
      setBooking(bData);
      setPayments(pData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      setSettings(sData);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load reservation details');
    } finally {
      if (showSkeleton) setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    load(true);
  }, [load]);

  // Financial calculations
  const financials = booking ? calculateBookingFinancials(booking, payments) : null;

  // Status updates
  async function handleUpdateStayStatus(newStatus: 'Confirmed' | 'Checked In' | 'Checked Out') {
    if (!booking) return;

    // Check-out safety check
    if (newStatus === 'Checked Out' && financials && financials.amountDue > 0) {
      setShowCheckoutWarning(true);
      return;
    }

    try {
      await repository.updateBooking(booking.id, { booking_status: newStatus });
      setBooking({ ...booking, booking_status: newStatus });
      toast.success('Stay Status Updated', `Booking is now marked as ${newStatus}.`);
    } catch {
      toast.error('Could not update status');
    }
  }

  async function confirmCheckOutWithBalance() {
    if (!booking) return;
    try {
      await repository.updateBooking(booking.id, { booking_status: 'Checked Out' });
      setBooking({ ...booking, booking_status: 'Checked Out' });
      setShowCheckoutWarning(false);
      toast.warning('Checked Out with Balance Due', `Guest checked out. Outstanding: ${fmtINR(financials?.amountDue || 0)}`);
    } catch {
      toast.error('Could not update status');
    }
  }

  // Cancel Booking
  async function handleConfirmCancel() {
    if (!booking) return;
    setCancelling(true);
    try {
      await repository.updateBooking(booking.id, {
        booking_status: 'Cancelled',
        cancellation_reason: cancelReason,
        cancelled_at: new Date().toISOString()
      });
      setBooking({
        ...booking,
        booking_status: 'Cancelled',
        cancellation_reason: cancelReason
      });
      setShowCancelModal(false);
      toast.success('Booking Cancelled', 'Reservation has been cancelled. Ledger history preserved.');
    } catch {
      toast.error('Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  }

  // Quick download invoice
  async function handleDownloadInvoiceDirect() {
    if (!booking || !settings || !financials) return;
    try {
      const doc = await generateBookingInvoicePDF(
        booking,
        payments,
        booking.property,
        booking.customer,
        settings,
        financials.netPaid,
        financials.amountDue
      );
      const invNo = `${settings.invoicePrefix || 'INV-'}${booking.booking_no.replace(/^BK-/, '')}`;
      doc.save(`${invNo}.pdf`);
      toast.success('Invoice Downloaded', `${invNo}.pdf saved.`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate Stay Invoice');
    }
  }

  // Open Document Modal for individual payment
  function handleOpenReceiptModal(p: Payment, index: number) {
    if (!booking) return;
    let prevPaid = 0;
    for (let i = 0; i < index; i++) {
      if (payments[i].status === 'Completed' || payments[i].status === 'Recorded') {
        prevPaid += payments[i].amount;
      } else if (payments[i].status === 'Refunded') {
        prevPaid -= payments[i].amount;
      }
    }
    const balanceAfter = Math.max(
      0,
      booking.grand_total - (prevPaid + (p.status === 'Refunded' ? -p.amount : p.amount))
    );

    setDocumentModal({
      open: true,
      type: 'receipt',
      payment: p,
      previouslyPaid: prevPaid,
      balanceDue: balanceAfter
    });
  }

  if (loading || !booking || !financials) {
    return (
      <div className="animate-pulse space-y-6 max-w-5xl mx-auto">
        <div className="h-10 w-64 bg-stone-200 rounded-xl"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-white rounded-2xl border border-[#D8D2C5]"></div>
          <div className="h-96 bg-white rounded-2xl border border-[#D8D2C5]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/bookings"
            className="p-2 rounded-xl border border-[#D8D2C5] bg-white text-[#5C6E6B] hover:text-[#1A2B28] hover:bg-[#FAF9F6] transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0D5C56]">
                Stay Confirmation
              </span>
              <span className="text-xs font-mono font-bold bg-[#E8F3F1] text-[#0D5C56] px-2.5 py-0.5 rounded-full border border-[#BDDFC9]">
                {booking.booking_no}
              </span>
              <span
                className={`badge text-xs ${
                  booking.booking_status === 'Checked In'
                    ? 'bg-[#EBF6EF] text-[#276749] border border-[#BDDFC9]'
                    : booking.booking_status === 'Confirmed'
                    ? 'bg-[#E8F3F1] text-[#0D5C56] border border-[#BDDFC9]'
                    : booking.booking_status === 'Cancelled'
                    ? 'bg-[#FDF0F0] text-[#B84A4A] border border-[#F7C6C6]'
                    : 'bg-stone-100 text-stone-600 border border-stone-200'
                }`}
              >
                {booking.booking_status}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A2B28] mt-1 tracking-tight">
              {booking.customer?.name}
            </h1>
          </div>
        </div>

        {/* Primary Contextual Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {booking.booking_status !== 'Cancelled' && (
            <>
              {financials.amountDue > 0 ? (
                <button
                  onClick={() => setShowPayModal(true)}
                  className="btn btn-primary text-xs sm:text-sm flex items-center gap-2 font-semibold shadow-xs"
                >
                  <CreditCard size={16} />
                  <span>Record Payment ({fmtINR(financials.amountDue)} due)</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EBF6EF] text-[#276749] border border-[#BDDFC9] text-xs font-semibold">
                  <CheckCircle2 size={16} />
                  <span>Paid in Full</span>
                </div>
              )}

              {/* Status Progression */}
              {booking.booking_status === 'Confirmed' && (
                <button
                  onClick={() => handleUpdateStayStatus('Checked In')}
                  className="btn btn-outline text-xs sm:text-sm flex items-center gap-2 bg-white"
                >
                  <LogIn size={15} className="text-[#0D5C56]" />
                  <span>Mark Checked In</span>
                </button>
              )}

              {booking.booking_status === 'Checked In' && (
                <button
                  onClick={() => handleUpdateStayStatus('Checked Out')}
                  className="btn btn-outline text-xs sm:text-sm flex items-center gap-2 bg-white text-[#C45532] border-[#F5DCAD] hover:bg-[#FAF0EB]"
                >
                  <LogOut size={15} />
                  <span>Complete Check-out</span>
                </button>
              )}
            </>
          )}

          {/* Stay Folio Invoice */}
          <button
            onClick={() =>
              setDocumentModal({
                open: true,
                type: 'invoice',
                previouslyPaid: financials.netPaid,
                balanceDue: financials.amountDue
              })
            }
            className="btn btn-outline text-xs sm:text-sm flex items-center gap-2 bg-white"
          >
            <FileText size={15} className="text-[#0D5C56]" />
            <span>Stay Folio Invoice</span>
          </button>
        </div>
      </div>

      {/* Cancellation Notice if Cancelled */}
      {booking.booking_status === 'Cancelled' && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <Ban size={15} />
            <span>Reservation Cancelled</span>
          </div>
          <p>
            Reason: {booking.cancellation_reason || 'Guest requested cancellation'}. All historical transaction records remain preserved in the ledger.
          </p>
        </div>
      )}

      {/* Main Grid: 2 Cols Left + 1 Col Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Stay & Financial Source of Truth */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Stay Details Card */}
          <div className="card p-6 bg-white border-[#D8D2C5] space-y-5">
            <div className="flex items-center justify-between border-b border-[#EAE5DC] pb-4">
              <div>
                <span className="text-xs font-semibold text-[#5C6E6B]">Property & Accommodation</span>
                <h3 className="text-lg font-bold text-[#1A2B28] mt-0.5">
                  {booking.property?.name}
                </h3>
                <p className="text-xs text-[#5C6E6B]">{booking.property?.location} • {booking.property?.city}, {booking.property?.state}</p>
              </div>

              <div className="text-right">
                <span className="text-xs text-[#5C6E6B]">Room Type</span>
                <div className="font-semibold text-sm text-[#1A2B28]">{booking.room_type}</div>
                <div className="text-xs text-[#5C6E6B]">{booking.rooms} Room(s) • {booking.guests} Guest(s)</div>
              </div>
            </div>

            {/* Check-in / Check-out Timeline */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[#FAF9F6] border border-[#EAE5DC] text-xs">
              <div>
                <span className="text-[#5C6E6B] font-medium flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#0D5C56]" /> Check-in Date
                </span>
                <div className="font-bold text-[#1A2B28] text-sm mt-1">{fmtDate(booking.check_in)}</div>
                <span className="text-[#5C6E6B] text-[11px]">{booking.property?.check_in_time || '14:00'} onwards</span>
              </div>

              <div>
                <span className="text-[#5C6E6B] font-medium flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#0D5C56]" /> Check-out Date
                </span>
                <div className="font-bold text-[#1A2B28] text-sm mt-1">{fmtDate(booking.check_out)}</div>
                <span className="text-[#5C6E6B] text-[11px]">Before {booking.property?.check_out_time || '11:00'}</span>
              </div>

              <div>
                <span className="text-[#5C6E6B] font-medium">Duration</span>
                <div className="font-bold text-[#1A2B28] text-sm mt-1">
                  {booking.nights} Night{booking.nights > 1 ? 's' : ''}
                </div>
                <span className="text-[#5C6E6B] text-[11px]">{booking.rooms} room(s) allocated</span>
              </div>
            </div>

            {/* Tariff Breakdown */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5C6E6B]">Tariff Breakdown</span>
              <div className="p-4 rounded-xl border border-[#EAE5DC] space-y-2 text-xs">
                <div className="flex justify-between text-[#1A2B28]">
                  <span>Base Accommodation Charges:</span>
                  <span className="font-medium">{fmtINR(booking.base_amount)}</span>
                </div>
                {(booking.discount ?? 0) > 0 && (
                  <div className="flex justify-between text-[#276749]">
                    <span>Special Discount:</span>
                    <span className="font-medium">-{fmtINR(booking.discount)}</span>
                  </div>
                )}
                {booking.tax_enabled && (
                  <div className="flex justify-between text-[#5C6E6B]">
                    <span>Taxes & GST ({booking.tax_rate}%):</span>
                    <span className="font-medium text-[#1A2B28]">{fmtINR(booking.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-[#0D5C56] pt-2 border-t border-[#EAE5DC]">
                  <span>Grand Total Tariff:</span>
                  <span>{fmtINR(booking.grand_total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History & Ledger Card */}
          <div className="card p-6 bg-white border-[#D8D2C5] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAE5DC] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#1A2B28]">Settlement History</h3>
                <p className="text-xs text-[#5C6E6B]">Official payment transactions recorded for this stay</p>
              </div>

              {booking.booking_status !== 'Cancelled' && financials.amountDue > 0 && (
                <button
                  onClick={() => setShowPayModal(true)}
                  className="btn btn-outline text-xs flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Record Payment</span>
                </button>
              )}
            </div>

            {payments.length === 0 ? (
              <div className="p-8 text-center bg-[#FAF9F6] rounded-xl border border-[#EAE5DC] space-y-2">
                <CreditCard size={28} className="mx-auto text-stone-400" />
                <p className="text-xs font-medium text-[#1A2B28]">No payments recorded yet</p>
                <p className="text-xs text-[#5C6E6B]">Record an advance or full settlement using the button above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((p, index) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl border border-[#EAE5DC] bg-[#FAF9F6] hover:border-[#D8D2C5] transition-colors flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#0D5C56]">{p.payment_no}</span>
                        <span className="badge bg-white border border-[#D8D2C5] text-[#1A2B28] text-[11px]">
                          {p.method}
                        </span>
                        {p.status === 'Refunded' && (
                          <span className="badge bg-rose-50 text-rose-700 border border-rose-200 text-[11px]">
                            Refund
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#5C6E6B]">
                        {fmtDate(p.date)} • {p.purpose || 'Stay payment'}
                        {p.ref_id ? ` • Ref: ${p.ref_id}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span
                          className={`font-bold text-sm ${
                            p.status === 'Refunded' ? 'text-rose-600' : 'text-[#276749]'
                          }`}
                        >
                          {p.status === 'Refunded' ? `-${fmtINR(p.amount)}` : fmtINR(p.amount)}
                        </span>
                        <div className="text-[10px] text-[#5C6E6B]">{p.status}</div>
                      </div>

                      <button
                        onClick={() => handleOpenReceiptModal(p, index)}
                        className="btn btn-outline text-xs px-2.5 py-1.5 flex items-center gap-1.5"
                        title="View & share receipt"
                      >
                        <Share2 size={13} className="text-[#0D5C56]" />
                        <span>Receipt</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Guest Info & Financial Snapshot */}
        <div className="space-y-6">
          {/* Financial Snapshot Card */}
          <div className="card p-5 bg-white border-[#D8D2C5] space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5C6E6B]">Financial Status</span>

            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#EAE5DC] space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#5C6E6B]">Tariff Grand Total:</span>
                <span className="font-bold text-[#1A2B28]">{fmtINR(financials.bookingTotal)}</span>
              </div>
              <div className="flex justify-between text-[#276749]">
                <span>Net Payments Settled:</span>
                <span className="font-bold">{fmtINR(financials.netPaid)}</span>
              </div>
              {financials.refunded > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Refunds Deducted:</span>
                  <span className="font-medium">-{fmtINR(financials.refunded)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[#EAE5DC]">
                <span className="font-semibold text-[#1A2B28]">Outstanding Due:</span>
                <span
                  className={`font-bold text-sm ${
                    financials.amountDue > 0 ? 'text-[#C45532]' : 'text-[#276749]'
                  }`}
                >
                  {financials.amountDue > 0 ? fmtINR(financials.amountDue) : 'Rs. 0 (Fully Paid)'}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-[#5C6E6B]">
                <span>Settlement Progress</span>
                <span className="font-semibold">{financials.percentagePaid}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    financials.percentagePaid >= 100 ? 'bg-[#276749]' : 'bg-[#0D5C56]'
                  }`}
                  style={{ width: `${financials.percentagePaid}%` }}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 space-y-2">
              <button
                onClick={handleDownloadInvoiceDirect}
                className="w-full btn btn-outline text-xs flex items-center justify-center gap-2 py-2"
              >
                <Download size={14} />
                <span>Download Invoice PDF</span>
              </button>

              {booking.booking_status !== 'Cancelled' && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="w-full btn btn-ghost text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 py-1.5"
                >
                  Cancel Reservation
                </button>
              )}
            </div>
          </div>

          {/* Guest Identity Card */}
          <div className="card p-5 bg-white border-[#D8D2C5] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAE5DC] pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5C6E6B]">Guest Details</span>
              {booking.customer_id && (
                <Link
                  to={`/guests/${booking.customer_id}`}
                  className="text-xs font-semibold text-[#0D5C56] hover:underline"
                >
                  View Profile
                </Link>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <h4 className="font-bold text-sm text-[#1A2B28]">{booking.customer?.name}</h4>
                <p className="text-[11px] text-[#5C6E6B]">{booking.customer?.city || 'City not specified'}</p>
              </div>

              {booking.customer?.phone && (
                <div className="flex items-center gap-2 text-[#1A2B28]">
                  <Phone size={14} className="text-[#0D5C56] shrink-0" />
                  <span>{booking.customer.phone}</span>
                </div>
              )}

              {booking.customer?.email && (
                <div className="flex items-center gap-2 text-[#1A2B28]">
                  <Mail size={14} className="text-[#0D5C56] shrink-0" />
                  <span className="truncate">{booking.customer.email}</span>
                </div>
              )}

              {booking.customer?.id_number && (
                <div className="pt-2 border-t border-[#EAE5DC] text-[11px] text-[#5C6E6B]">
                  ID Document: <span className="font-medium text-[#1A2B28]">{booking.customer.id_type || 'ID'}: {booking.customer.id_number}</span>
                </div>
              )}

              {booking.customer?.notes && (
                <div className="p-3 rounded-lg bg-[#FAF9F6] border border-[#EAE5DC] text-[11px] text-[#5C6E6B]">
                  <span className="font-semibold text-[#1A2B28] block mb-0.5">Guest Notes:</span>
                  {booking.customer.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Payment Modal */}
      {showPayModal && (
        <AddPaymentModal
          booking={booking}
          balanceDue={financials.amountDue}
          onClose={() => {
            setShowPayModal(false);
            load(false);
          }}
          onSuccess={() => {
            load(false);
          }}
        />
      )}

      {/* Unified Document Modal (for Receipts and Stay Folio) */}
      <DocumentModal
        isOpen={documentModal.open}
        onClose={() => setDocumentModal({ ...documentModal, open: false })}
        type={documentModal.type}
        booking={booking}
        payment={documentModal.payment}
        previouslyPaid={documentModal.previouslyPaid}
        balanceDue={documentModal.balanceDue}
        settings={settings}
      />

      {/* Check-Out Warning Modal */}
      {showCheckoutWarning && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-[#D8D2C5] w-full max-w-md p-6 space-y-4 animate-modal-in">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h3 className="font-bold text-lg text-[#1A2B28]">Outstanding Balance Warning</h3>
              <p className="text-xs text-[#5C6E6B] mt-1 leading-relaxed">
                Guest {booking.customer?.name} has an outstanding balance of{' '}
                <strong className="text-[#C45532]">{fmtINR(financials.amountDue)}</strong>.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#EAE5DC] text-xs space-y-1">
              <div className="font-semibold text-[#1A2B28]">Recommended Operational Action:</div>
              <p className="text-[#5C6E6B]">
                Collect the balance before checking out, or explicitly confirm check-out if credit is permitted.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowCheckoutWarning(false)}
                className="btn btn-outline text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCheckoutWarning(false);
                  setShowPayModal(true);
                }}
                className="btn btn-primary text-xs"
              >
                Record Payment
              </button>
              <button
                onClick={confirmCheckOutWithBalance}
                className="btn btn-ghost text-xs text-[#C45532] hover:bg-[#FAF0EB]"
              >
                Proceed Check-out Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Stay Modal */}
      {showCancelModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-[#D8D2C5] w-full max-w-md p-6 space-y-4 animate-modal-in">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center">
              <Ban size={24} />
            </div>

            <div>
              <h3 className="font-bold text-lg text-[#1A2B28]">Cancel Stay Reservation</h3>
              <p className="text-xs text-[#5C6E6B] mt-1">
                Are you sure you want to cancel booking {booking.booking_no} for {booking.customer?.name}?
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-semibold text-[#1A2B28]">Cancellation Reason</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="select text-xs"
              >
                <option value="Guest requested cancellation">Guest requested cancellation</option>
                <option value="No-show on arrival date">No-show on arrival date</option>
                <option value="Payment / deposit failure">Payment / deposit failure</option>
                <option value="Property operational maintenance">Property operational maintenance</option>
                <option value="Duplicate booking entry">Duplicate booking entry</option>
              </select>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#EAE5DC] text-[11px] text-[#5C6E6B]">
              Cancellation policy: {settings?.cancellationPolicy || 'Complimentary cancellation up to 48 hours prior to arrival.'}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="btn btn-outline text-xs"
              >
                Keep Stay Active
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="btn btn-accent text-xs bg-rose-600 hover:bg-rose-700"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
