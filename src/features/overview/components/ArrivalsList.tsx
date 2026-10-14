import React from 'react';
import { LogIn } from 'lucide-react';
import { Booking, Payment } from '../../../lib/repository/types';
import ArrivalRow from './ArrivalRow';

interface ArrivalsListProps {
  arrivals: Booking[];
  paymentsByBookingId: Map<string, Payment[]>;
  onCheckIn: (booking: Booking, e: React.MouseEvent) => void;
}

export default function ArrivalsList({
  arrivals,
  paymentsByBookingId,
  onCheckIn
}: ArrivalsListProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-2 border-b border-[#EAE5DC]">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1A2B28]">
          Arrivals ({arrivals.length})
        </h3>
        <span className="text-[11px] text-[#5C6E6B]">Expected today</span>
      </div>

      {arrivals.length === 0 ? (
        <div className="py-8 px-4 text-center text-xs text-[#5C6E6B]">
          No arrivals today.
        </div>
      ) : (
        <div className="divide-y divide-[#EAE5DC]">
          {arrivals.map((b) => (
            <ArrivalRow
              key={b.id}
              booking={b}
              payments={paymentsByBookingId.get(b.id) || []}
              onCheckIn={onCheckIn}
            />
          ))}
        </div>
      )}
    </div>
  );
}
