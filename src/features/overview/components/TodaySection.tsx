import React from 'react';
import { Booking, Payment } from '../../../lib/repository/types';
import { TodayMetrics } from '../types';
import ArrivalsList from './ArrivalsList';
import DeparturesList from './DeparturesList';

interface TodaySectionProps {
  metrics: TodayMetrics;
  paymentsByBookingId: Map<string, Payment[]>;
  onCheckIn: (booking: Booking, e: React.MouseEvent) => void;
  onCheckOut: (booking: Booking, e: React.MouseEvent) => void;
  onRecordPayment: (booking: Booking, dueAmount: number) => void;
}

export default function TodaySection({
  metrics,
  paymentsByBookingId,
  onCheckIn,
  onCheckOut,
  onRecordPayment
}: TodaySectionProps) {
  return (
    <section className="space-y-2.5">
      {/* Unified Today Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#1A2B28]">
            Today
          </h2>
          <span className="text-xs font-medium text-[#5C6E6B]">
            {metrics.arrivalsCount} {metrics.arrivalsCount === 1 ? 'arrival' : 'arrivals'} ·{' '}
            {metrics.departuresCount} {metrics.departuresCount === 1 ? 'departure' : 'departures'} ·{' '}
            {metrics.inHouseCount} in-house
          </span>
        </div>
      </div>

      {/* Unified workspace container: single boundary with 2 columns */}
      <div className="rounded-xl border border-[#D8D2C5] bg-white overflow-hidden shadow-2xs">
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x divide-y lg:divide-y-0 divide-[#EAE5DC]">
          {/* Column 1: Arrivals */}
          <div className="p-3.5 sm:p-4">
            <ArrivalsList
              arrivals={metrics.arrivals}
              paymentsByBookingId={paymentsByBookingId}
              onCheckIn={onCheckIn}
            />
          </div>

          {/* Column 2: Departures */}
          <div className="p-3.5 sm:p-4">
            <DeparturesList
              departures={metrics.departures}
              paymentsByBookingId={paymentsByBookingId}
              onCheckOut={onCheckOut}
              onRecordPayment={onRecordPayment}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
