import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Booking, Payment } from '../../../lib/repository/types';
import { fmtDate } from '../../../lib/utils/formatters';

interface InHouseRowProps {
  key?: React.Key;
  booking: Booking;
  payments?: Payment[];
}

export default function InHouseRow({ booking }: InHouseRowProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/bookings/${booking.id}`)}
      className="py-3 px-4 sm:px-5 flex items-center justify-between gap-4 hover:bg-[#FAF9F6] transition-colors cursor-pointer group select-none"
    >
      <div className="space-y-0.5 min-w-0">
        <div className="font-semibold text-sm text-[#1A2B28] group-hover:text-[#0D5C56] transition-colors truncate">
          {booking.customer?.name || 'Guest'}
        </div>
        <div className="text-xs text-[#5C6E6B] truncate">
          {booking.property?.name} · {booking.room_type}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-[#7E8F8C]">
          Checkout {fmtDate(booking.check_out)}
        </span>
        <ArrowRight
          size={14}
          className="text-[#7E8F8C] group-hover:text-[#0D5C56] group-hover:translate-x-0.5 transition-all"
        />
      </div>
    </div>
  );
}
