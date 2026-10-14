import React from 'react';
import { CalendarDayCell } from '../types';
import { Booking, Payment } from '../../../lib/repository/types';
import BookingChip from './BookingChip';

interface MonthCalendarProps {
  days: CalendarDayCell[];
  selectedDateStr: string | null;
  selectedBookingId: string | null;
  paymentsByBookingId: Map<string, Payment[]>;
  getBookingsForDate: (dateStr: string) => Booking[];
  onSelectDate: (dateStr: string) => void;
  onSelectBooking: (booking: Booking, e: React.MouseEvent) => void;
}

export default function MonthCalendar({
  days,
  selectedDateStr,
  selectedBookingId,
  paymentsByBookingId,
  getBookingsForDate,
  onSelectDate,
  onSelectBooking
}: MonthCalendarProps) {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="rounded-2xl border border-[#D8D2C5] bg-white overflow-hidden shadow-2xs">
      {/* Weekday Header Row */}
      <div className="grid grid-cols-7 border-b border-[#EAE5DC] bg-[#FAF9F6] text-center text-xs font-semibold text-[#5C6E6B] py-2.5">
        {weekdays.map((w, idx) => (
          <div key={w} className={idx === 0 || idx === 6 ? 'text-[#8E9E9B]' : ''}>
            {w}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-[#EAE5DC]">
        {days.map((day) => {
          const stays = getBookingsForDate(day.dateStr);
          const isSelected = selectedDateStr === day.dateStr;
          const maxVisible = 2;
          const overflowCount = stays.length - maxVisible;

          return (
            <div
              key={day.dateStr}
              onClick={() => onSelectDate(day.dateStr)}
              className={`min-h-[106px] sm:min-h-[114px] p-1.5 sm:p-2 flex flex-col justify-between transition-colors cursor-pointer select-none ${
                day.isCurrentMonth ? 'bg-white' : 'bg-[#FAF9F6]/60'
              } ${day.isToday ? 'bg-[#E8F3F1]/20' : ''} ${
                isSelected ? 'ring-2 ring-[#0D5C56] ring-inset' : 'hover:bg-[#FAF9F6]'
              }`}
            >
              {/* Top Cell Header: Date Number + Stay Count */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center ${
                    day.isToday
                      ? 'bg-[#0D5C56] text-white font-bold'
                      : day.isCurrentMonth
                      ? 'text-[#1A2B28]'
                      : 'text-[#8E9E9B]'
                  }`}
                >
                  {day.dayNumber}
                </span>

                {stays.length > 0 && (
                  <span className="text-[10px] font-medium text-[#5C6E6B]">
                    {stays.length} {stays.length === 1 ? 'stay' : 'stays'}
                  </span>
                )}
              </div>

              {/* Middle: Stay Chips */}
              <div className="mt-1 space-y-1 overflow-hidden flex-1">
                {stays.slice(0, maxVisible).map((b) => {
                  const bPayments = paymentsByBookingId.get(b.id) || [];
                  return (
                    <BookingChip
                      key={b.id}
                      booking={b}
                      dateStr={day.dateStr}
                      payments={bPayments}
                      isSelected={selectedBookingId === b.id}
                      onClick={onSelectBooking}
                    />
                  );
                })}

                {overflowCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDate(day.dateStr);
                    }}
                    className="w-full text-left text-[10px] font-medium text-[#0D5C56] hover:underline px-1 py-0.5 rounded hover:bg-[#E8F3F1] block truncate"
                  >
                    +{overflowCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
