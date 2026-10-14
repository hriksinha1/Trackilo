import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowUpRight, CreditCard, LogIn, LogOut, CheckCircle2 } from 'lucide-react';
import { Booking, Payment } from '../../../lib/repository/types';
import { calculateBookingFinancials } from '../../../lib/utils/financials';
import { fmtINR, fmtDate } from '../../../lib/utils/formatters';

interface BookingPreviewModalProps {
  booking: Booking | null;
  payments: Payment[];
  onClose: () => void;
  onRecordPayment: (booking: Booking, balanceDue: number) => void;
  onCheckIn?: (booking: Booking) => void;
  onCheckOut?: (booking: Booking) => void;
}

export default function BookingPreviewModal({
  booking,
  payments,
  onClose,
  onRecordPayment,
  onCheckIn,
  onCheckOut
}: BookingPreviewModalProps) {
  const navigate = useNavigate();

  if (!booking) return null;

  const fin = calculateBookingFinancials(booking, payments);
  const isCheckedIn = booking.booking_status === 'Checked In';
  const isCheckedOut = booking.booking_status === 'Checked Out';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#D8D2C5] p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0D5C56]">
                Stay Preview
              </span>
              <span className="text-xs px-2 py-0.5 rounded font-mono bg-stone-100 text-[#5C6E6B]">
                {booking.booking_no}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-[#1A2B28] mt-1">
              {booking.customer?.name || 'Guest'}
            </h3>
            <p className="text-xs text-[#5C6E6B]">
              {booking.property?.name} · {booking.room_type}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stay & Payment Detail Card */}
        <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#EAE5DC] space-y-2.5 text-xs">
          <div className="flex justify-between">
            <span className="text-[#5C6E6B]">Stay dates:</span>
            <span className="font-medium text-[#1A2B28]">
              {fmtDate(booking.check_in)} – {fmtDate(booking.check_out)} ({booking.nights} {booking.nights === 1 ? 'night' : 'nights'})
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#5C6E6B]">Booking status:</span>
            <span className="px-2 py-0.5 rounded-full font-medium bg-stone-100 text-[#1A2B28] border border-stone-200">
              {booking.booking_status}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#5C6E6B]">Payment state:</span>
            <span
              className={`px-2 py-0.5 rounded-full font-medium ${
                fin.paymentStatus === 'Paid'
                  ? 'bg-[#EBF6EF] text-[#276749]'
                  : fin.paymentStatus === 'Partially Paid'
                  ? 'bg-[#FDF5E8] text-[#B7791F]'
                  : 'bg-[#FAF0EB] text-[#C45532]'
              }`}
            >
              {fin.paymentStatus}
            </span>
          </div>

          <div className="pt-2 border-t border-[#EAE5DC] space-y-1">
            <div className="flex justify-between">
              <span className="text-[#5C6E6B]">Total:</span>
              <span className="font-semibold text-[#1A2B28]">{fmtINR(fin.bookingTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5C6E6B]">Paid:</span>
              <span className="font-medium text-[#276749]">{fmtINR(fin.netPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5C6E6B]">Due:</span>
              <span
                className={`font-semibold ${
                  fin.amountDue > 0 ? 'text-[#C45532]' : 'text-[#276749]'
                }`}
              >
                {fmtINR(fin.amountDue)}
              </span>
            </div>
          </div>
        </div>

        {/* Operational Actions */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            {!isCheckedIn && !isCheckedOut && onCheckIn && (
              <button
                type="button"
                onClick={() => onCheckIn(booking)}
                className="px-3 py-1.5 rounded-lg bg-[#0D5C56] text-white text-xs font-medium hover:bg-[#094440] transition-colors flex items-center gap-1"
              >
                <LogIn size={13} />
                <span>Check in</span>
              </button>
            )}

            {isCheckedIn && !isCheckedOut && onCheckOut && (
              <button
                type="button"
                onClick={() => onCheckOut(booking)}
                className="px-3 py-1.5 rounded-lg border border-[#D8D2C5] text-[#1A2B28] text-xs font-medium hover:bg-stone-50 transition-colors flex items-center gap-1"
              >
                <LogOut size={13} />
                <span>Check out</span>
              </button>
            )}

            {fin.amountDue > 0 && (
              <button
                type="button"
                onClick={() => onRecordPayment(booking, fin.amountDue)}
                className="px-3 py-1.5 rounded-lg bg-[#C45532] text-white text-xs font-medium hover:bg-[#A84323] transition-colors flex items-center gap-1"
              >
                <CreditCard size={13} />
                <span>Record payment</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(`/bookings/${booking.id}`);
            }}
            className="px-3 py-1.5 rounded-lg border border-[#D8D2C5] text-xs font-medium text-[#1A2B28] hover:bg-stone-50 transition-colors flex items-center gap-1"
          >
            <span>Open booking</span>
            <ArrowUpRight size={13} className="text-[#5C6E6B]" />
          </button>
        </div>
      </div>
    </div>
  );
}
