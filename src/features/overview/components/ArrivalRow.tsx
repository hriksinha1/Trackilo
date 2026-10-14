import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Booking, Payment } from '../../../lib/repository/types';
import { calculateBookingFinancials } from '../../../lib/utils/financials';
import { fmtINR } from '../../../lib/utils/formatters';

interface ArrivalRowProps {
  key?: React.Key;
  booking: Booking;
  payments: Payment[];
  onCheckIn: (booking: Booking, e: React.MouseEvent) => void;
}

export default function ArrivalRow({
  booking,
  payments,
  onCheckIn
}: ArrivalRowProps) {
  const navigate = useNavigate();
  const fin = calculateBookingFinancials(booking, payments);
  const isCheckedIn = booking.booking_status === 'Checked In';

  return (
    <div className="py-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF9F6] transition-colors">
      {/* Primary guest & stay metadata */}
      <div className="space-y-1 min-w-0">
        <div className="flex items-baseline gap-2.5">
          <span className="font-semibold text-[15px] text-[#1A2B28] truncate">
            {booking.customer?.name || 'Guest'}
          </span>
          {isCheckedIn && (
            <span className="text-xs font-medium text-[#276749] inline-flex items-center gap-1">
              <CheckCircle2 size={13} /> Checked in
            </span>
          )}
        </div>

        <div className="text-[13px] text-[#5C6E6B]">
          {booking.property?.name} · {booking.room_type}
        </div>

        <div className="text-xs text-[#7E8F8C]">
          Expected today · {booking.nights} {booking.nights === 1 ? 'night' : 'nights'}
        </div>
      </div>

      {/* Financial info & Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0 pt-1 sm:pt-0">
        <div className="text-left sm:text-right">
          <div className="text-xs font-semibold text-[#1A2B28]">
            {fmtINR(booking.grand_total)}
          </div>
          <div className="text-[11px] font-medium">
            {fin.amountDue === 0 ? (
              <span className="text-[#276749]">Paid in full</span>
            ) : fin.paid > 0 ? (
              <span className="text-[#B7791F]">Partially paid</span>
            ) : (
              <span className="text-[#C45532]">Unpaid</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!isCheckedIn ? (
            <button
              type="button"
              onClick={(e) => onCheckIn(booking, e)}
              className="px-3.5 py-1.5 rounded-lg bg-[#0D5C56] text-white text-xs font-medium hover:bg-[#094440] transition-colors shadow-2xs"
            >
              Check in
            </button>
          ) : (
            <span className="text-xs font-medium text-[#276749] px-2 py-1">
              In-house
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
