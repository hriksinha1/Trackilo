import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowUpRight, LogIn, LogOut, BedDouble, Calendar } from 'lucide-react';
import { Booking, Payment } from '../../../lib/repository/types';
import { calculateBookingFinancials } from '../../../lib/utils/financials';
import { fmtINR, fmtDate } from '../../../lib/utils/formatters';

interface SelectedDayDrawerProps {
  dateStr: string | null;
  stays: Booking[];
  paymentsByBookingId: Map<string, Payment[]>;
  onClose: () => void;
  onSelectBooking: (booking: Booking) => void;
}

export default function SelectedDayDrawer({
  dateStr,
  stays,
  paymentsByBookingId,
  onClose,
  onSelectBooking
}: SelectedDayDrawerProps) {
  const navigate = useNavigate();

  if (!dateStr) return null;

  const dateObj = new Date(dateStr + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const arrivals = stays.filter((b) => b.check_in === dateStr);
  const departures = stays.filter((b) => b.check_out === dateStr);
  const inHouse = stays.filter((b) => b.check_in < dateStr && b.check_out > dateStr);

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-stone-900/30 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl border-l border-[#D8D2C5] flex flex-col animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#EAE5DC] flex items-center justify-between bg-[#FAF9F6]">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#0D5C56]">
              <Calendar size={13} />
              <span>Day Schedule</span>
            </div>
            <h3 className="text-xl font-bold text-[#1A2B28] mt-0.5">{formattedDate}</h3>
            <p className="text-xs text-[#5C6E6B] mt-0.5">
              {stays.length} {stays.length === 1 ? 'stay' : 'stays'} · {arrivals.length} arrivals ·{' '}
              {departures.length} departures · {inHouse.length} in-house
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stays List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {stays.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#5C6E6B]">
              No stays scheduled for this day.
            </div>
          ) : (
            stays.map((b) => {
              const bPayments = paymentsByBookingId.get(b.id) || [];
              const fin = calculateBookingFinancials(b, bPayments);
              const isArrival = b.check_in === dateStr;
              const isDeparture = b.check_out === dateStr;

              return (
                <div
                  key={b.id}
                  onClick={() => onSelectBooking(b)}
                  className="p-3.5 rounded-xl border border-[#D8D2C5] bg-white hover:border-[#0D5C56] hover:bg-[#FAF9F6] transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-[#1A2B28] group-hover:text-[#0D5C56]">
                          {b.customer?.name || 'Guest'}
                        </span>
                        <span className="text-[11px] font-mono text-[#5C6E6B] bg-stone-100 px-1.5 py-0.5 rounded">
                          {b.booking_no}
                        </span>
                      </div>
                      <div className="text-xs text-[#5C6E6B] mt-0.5">
                        {b.property?.name} · {b.room_type}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isArrival && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#E8F3F1] text-[#0D5C56] font-medium flex items-center gap-0.5">
                          <LogIn size={11} /> Arrival
                        </span>
                      )}
                      {isDeparture && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FAF0EB] text-[#C45532] font-medium flex items-center gap-0.5">
                          <LogOut size={11} /> Departure
                        </span>
                      )}
                      {!isArrival && !isDeparture && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium">
                          In-house
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#EAE5DC]">
                    <span className="text-[#5C6E6B]">
                      {fmtDate(b.check_in)} – {fmtDate(b.check_out)}
                    </span>

                    <div className="text-right">
                      {fin.amountDue > 0 ? (
                        <span className="text-[#C45532] font-semibold">
                          Due: {fmtINR(fin.amountDue)}
                        </span>
                      ) : (
                        <span className="text-[#276749] font-medium">Paid</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#EAE5DC] bg-[#FAF9F6] flex justify-between items-center text-xs">
          <span className="text-[#5C6E6B]">Click any stay to view preview</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-[#D8D2C5] bg-white text-[#1A2B28] font-medium hover:bg-stone-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
