import React from 'react';
import { Booking, Payment } from '../../../lib/repository/types';
import { calculateBookingFinancials } from '../../../lib/utils/financials';
import { fmtINR } from '../../../lib/utils/formatters';

interface WeekCalendarProps {
  weekDays: Array<{
    dateStr: string;
    dayName: string;
    dayNumber: number;
    isToday: boolean;
  }>;
  paymentsByBookingId: Map<string, Payment[]>;
  getBookingsForDate: (dateStr: string) => Booking[];
  onSelectBooking: (booking: Booking) => void;
  onSelectDate: (dateStr: string) => void;
}

export default function WeekCalendar({
  weekDays,
  paymentsByBookingId,
  getBookingsForDate,
  onSelectBooking,
  onSelectDate
}: WeekCalendarProps) {
  return (
    <div className="rounded-2xl border border-[#D8D2C5] bg-white overflow-hidden shadow-2xs">
      <div className="grid grid-cols-7 divide-x divide-[#EAE5DC]">
        {weekDays.map((w) => {
          const stays = getBookingsForDate(w.dateStr);

          return (
            <div
              key={w.dateStr}
              className={`p-2 sm:p-3 min-h-[380px] flex flex-col ${
                w.isToday ? 'bg-[#E8F3F1]/20' : 'bg-white'
              }`}
            >
              {/* Day Header */}
              <div
                onClick={() => onSelectDate(w.dateStr)}
                className="border-b border-[#EAE5DC] pb-2 mb-3 text-center cursor-pointer hover:bg-stone-50 rounded-lg p-1 transition-colors"
              >
                <div className="text-xs text-[#5C6E6B] font-medium">{w.dayName}</div>
                <div
                  className={`text-base font-bold mt-0.5 inline-flex w-7 h-7 rounded-full items-center justify-center ${
                    w.isToday ? 'bg-[#0D5C56] text-white' : 'text-[#1A2B28]'
                  }`}
                >
                  {w.dayNumber}
                </div>
                <div className="text-[10px] text-[#5C6E6B] mt-0.5">
                  {stays.length} {stays.length === 1 ? 'stay' : 'stays'}
                </div>
              </div>

              {/* Day Stays */}
              <div className="space-y-2 flex-1">
                {stays.map((b) => {
                  const bPayments = paymentsByBookingId.get(b.id) || [];
                  const fin = calculateBookingFinancials(b, bPayments);
                  const isArrival = b.check_in === w.dateStr;
                  const isDeparture = b.check_out === w.dateStr;

                  return (
                    <div
                      key={b.id}
                      onClick={() => onSelectBooking(b)}
                      className="p-2 rounded-xl border border-[#D8D2C5] bg-[#FAF9F6] hover:border-[#0D5C56] hover:bg-white shadow-2xs cursor-pointer transition-all space-y-1 group select-none"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[#1A2B28] group-hover:text-[#0D5C56] truncate">
                          {b.customer?.name || 'Guest'}
                        </span>
                        {fin.amountDue > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C45532] shrink-0" />
                        )}
                      </div>

                      <div className="text-[10px] text-[#5C6E6B] truncate">
                        {b.property?.name} · {b.room_type}
                      </div>

                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#EAE5DC]">
                        <span className="text-[#5C6E6B]">
                          {isArrival ? 'In' : isDeparture ? 'Out' : 'Stay'}
                        </span>
                        <span className="font-medium text-[#1A2B28]">
                          {fmtINR(b.grand_total)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {stays.length === 0 && (
                  <div className="text-center py-12 text-xs text-stone-300">No stays</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
