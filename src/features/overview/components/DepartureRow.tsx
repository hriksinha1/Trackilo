import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, CreditCard } from 'lucide-react';
import { Booking, Payment } from '../../../lib/repository/types';
import { calculateBookingFinancials } from '../../../lib/utils/financials';
import { fmtINR } from '../../../lib/utils/formatters';

interface DepartureRowProps {
  key?: React.Key;
  booking: Booking;
  payments: Payment[];
  onCheckOut: (booking: Booking, e: React.MouseEvent) => void;
  onRecordPayment: (booking: Booking, dueAmount: number) => void;
}

export default function DepartureRow({
  booking,
  payments,
  onCheckOut,
  onRecordPayment
}: DepartureRowProps) {
  const navigate = useNavigate();
  const fin = calculateBookingFinancials(booking, payments);
  const isCheckedOut = booking.booking_status === 'Checked Out';
  const hasDue = fin.amountDue > 0;

  return (
    <div className="py-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF9F6] transition-colors">
      {/* Primary guest & stay metadata */}
      <div className="space-y-1 min-w-0">
        <div className="flex items-baseline gap-2.5">
          <span className="font-semibold text-[15px] text-[#1A2B28] truncate">
            {booking.customer?.name || 'Guest'}
          </span>
          {isCheckedOut && (
            <span className="text-xs font-medium text-[#5C6E6B]">
              Checked out
            </span>
          )}
        </div>

        <div className="text-[13px] text-[#5C6E6B]">
          {booking.property?.name} · {booking.room_type}
        </div>

        <div className="text-xs text-[#7E8F8C]">
          Checkout · 11:00 AM
        </div>
      </div>

      {/* Financial info & Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0 pt-1 sm:pt-0">
        <div className="text-left sm:text-right">
          <div className="text-xs font-semibold text-[#1A2B28]">
            {fmtINR(booking.grand_total)}{hasDue ? ' total' : ''}
          </div>
          <div className="text-[11px] font-medium">
            {hasDue ? (
              <span className="text-[#C45532] font-semibold">{fmtINR(fin.amountDue)} due</span>
            ) : (
              <span className="text-[#276749]">Paid in full</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!isCheckedOut ? (
            <>
              {hasDue ? (
                <>
                  {/* When money is due: Record payment is primary, Check out is secondary */}
                  <button
                    type="button"
                    onClick={() => onRecordPayment(booking, fin.amountDue)}
                    className="px-3 py-1.5 rounded-lg bg-[#C45532] text-white text-xs font-medium hover:bg-[#A84323] transition-colors inline-flex items-center gap-1 shadow-2xs"
                  >
                    <CreditCard size={12} />
                    <span>Record payment</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => onCheckOut(booking, e)}
                    className="px-3 py-1.5 rounded-lg border border-[#D8D2C5] text-xs font-medium text-[#1A2B28] hover:bg-stone-100 transition-colors"
                  >
                    Check out
                  </button>
                </>
              ) : (
                /* When paid in full: Check out is primary */
                <button
                  type="button"
                  onClick={(e) => onCheckOut(booking, e)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#0D5C56] text-white text-xs font-medium hover:bg-[#094440] transition-colors shadow-2xs"
                >
                  Check out
                </button>
              )}
            </>
          ) : (
            <span className="text-xs font-medium text-[#5C6E6B] px-2 py-1">
              Completed
            </span>
          )}

          <button
            type="button"
            onClick={() => navigate(`/bookings/${booking.id}`)}
            className="p-1.5 rounded-lg text-[#5C6E6B] hover:text-[#1A2B28] hover:bg-stone-100 transition-colors"
            title="Open booking"
          >
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
