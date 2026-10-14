import React from 'react';
import { ArrowDownLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Booking, Payment } from '../../../lib/repository/types';
import { calculateBookingFinancials } from '../../../lib/utils/financials';
import { fmtINR } from '../../../lib/utils/formatters';

interface BookingChipProps {
  key?: React.Key;
  booking: Booking;
  dateStr: string;
  payments: Payment[];
  isSelected?: boolean;
  onClick: (booking: Booking, e: React.MouseEvent) => void;
}

export default function BookingChip({
  booking,
  dateStr,
  payments,
  isSelected,
  onClick
}: BookingChipProps) {
  const isArrival = booking.check_in === dateStr;
  const isDeparture = booking.check_out === dateStr;
  const isCheckedOut = booking.booking_status === 'Checked Out';

  const fin = calculateBookingFinancials(booking, payments);
  const hasDue = fin.amountDue > 0;

  return (
    <button
      type="button"
      onClick={(e) => onClick(booking, e)}
      className={`w-full text-left px-2 py-1 rounded-md text-[11px] leading-tight transition-all truncate border flex items-center justify-between gap-1 group select-none ${
        isSelected
          ? 'bg-[#0D5C56] text-white border-[#0D5C56] shadow-xs'
          : isCheckedOut
          ? 'bg-[#F2EFEA] text-[#7E8F8C] border-[#EAE5DC]'
          : 'bg-[#F0ECE4] text-[#1A2B28] border-[#D8D2C5] hover:border-[#0D5C56] hover:bg-[#EAE5DC]'
      }`}
      title={`${booking.customer?.name || 'Guest'} (${booking.booking_no}) · ${booking.room_type || ''} · ${hasDue ? `₹${fin.amountDue.toLocaleString('en-IN')} due` : 'Settled'}`}
    >
      <div className="flex items-center gap-1 min-w-0 truncate">
        {/* Entry / Exit affordances */}
        {isArrival && (
          <span
            title="Check-in today"
            className={`shrink-0 ${isSelected ? 'text-white' : 'text-[#0D5C56]'}`}
          >
            <ArrowDownLeft size={10} strokeWidth={2.5} />
          </span>
        )}
        {isDeparture && (
          <span
            title="Check-out today"
            className={`shrink-0 ${isSelected ? 'text-white' : 'text-[#C45532]'}`}
          >
            <ArrowUpRight size={10} strokeWidth={2.5} />
          </span>
        )}

        <span className={`truncate font-medium ${isCheckedOut ? 'line-through opacity-75' : ''}`}>
          {booking.customer?.name || 'Guest'}
        </span>
      </div>

      {/* Payment due terracotta indicator or settled marker */}
      {hasDue && !isCheckedOut && (
        <span
          className={`shrink-0 w-1.5 h-1.5 rounded-full ${
            isSelected ? 'bg-amber-300' : 'bg-[#C45532]'
          }`}
          title={`Payment due: ${fmtINR(fin.amountDue)}`}
        />
      )}
    </button>
  );
}
