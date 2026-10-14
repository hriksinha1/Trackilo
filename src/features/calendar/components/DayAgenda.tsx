import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, LogOut, BedDouble, ArrowUpRight, CreditCard } from 'lucide-react';
import { Booking, Payment } from '../../../lib/repository/types';
import { calculateBookingFinancials } from '../../../lib/utils/financials';
import { fmtINR, fmtDate } from '../../../lib/utils/formatters';

interface DayAgendaProps {
  currentDate: Date;
  stays: Booking[];
  paymentsByBookingId: Map<string, Payment[]>;
  onSelectBooking: (booking: Booking) => void;
  onRecordPayment: (booking: Booking, dueAmount: number) => void;
  onCheckIn: (booking: Booking) => void;
  onCheckOut: (booking: Booking) => void;
}

export default function DayAgenda({
  currentDate,
  stays,
  paymentsByBookingId,
  onSelectBooking,
  onRecordPayment,
  onCheckIn,
  onCheckOut
}: DayAgendaProps) {
  const navigate = useNavigate();
  const dateStr = currentDate.toISOString().split('T')[0];

  const arrivals = stays.filter((b) => b.check_in === dateStr);
  const departures = stays.filter((b) => b.check_out === dateStr);
  const inHouse = stays.filter((b) => b.check_in < dateStr && b.check_out > dateStr);

  return (
    <div className="space-y-6">
      {/* Front-desk summary banner */}
      <div className="p-4 rounded-2xl border border-[#D8D2C5] bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#1A2B28] tracking-tight">
            Daily Operations Schedule
          </h3>
          <p className="text-xs text-[#5C6E6B] mt-0.5">
            {arrivals.length} {arrivals.length === 1 ? 'arrival' : 'arrivals'} ·{' '}
            {departures.length} {departures.length === 1 ? 'departure' : 'departures'} ·{' '}
            {inHouse.length} in-house
          </p>
        </div>

        <span className="text-xs font-mono font-medium px-3 py-1 rounded-lg bg-[#FAF9F6] border border-[#EAE5DC] text-[#5C6E6B] self-start sm:self-auto">
          {stays.length} total active stays
        </span>
      </div>

      {/* 1. ARRIVALS */}
      <section className="space-y-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1A2B28] flex items-center gap-1.5">
          <LogIn size={14} className="text-[#0D5C56]" />
          <span>Arrivals Scheduled ({arrivals.length})</span>
        </h4>

        {arrivals.length === 0 ? (
          <div className="p-4 rounded-xl border border-[#D8D2C5] bg-white text-xs text-[#5C6E6B] text-center">
            No arrivals for this date.
          </div>
        ) : (
          <div className="divide-y divide-[#EAE5DC] rounded-xl border border-[#D8D2C5] bg-white overflow-hidden shadow-2xs">
            {arrivals.map((b) => {
              const bPayments = paymentsByBookingId.get(b.id) || [];
              const fin = calculateBookingFinancials(b, bPayments);
              const isCheckedIn = b.booking_status === 'Checked In';

              return (
                <div
                  key={b.id}
                  onClick={() => onSelectBooking(b)}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF9F6] cursor-pointer transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#1A2B28]">
                        {b.customer?.name || 'Guest'}
                      </span>
                      <span className="text-xs font-mono text-[#5C6E6B] bg-stone-100 px-1.5 py-0.5 rounded">
                        {b.booking_no}
                      </span>
                    </div>
                    <div className="text-xs text-[#5C6E6B]">
                      {b.property?.name} · {b.room_type} · {b.nights} nights
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-[#1A2B28]">
                        {fmtINR(b.grand_total)}
                      </div>
                      <div className="text-[11px]">
                        {fin.amountDue === 0 ? (
                          <span className="text-[#276749]">Paid</span>
                        ) : (
                          <span className="text-[#C45532]">Due: {fmtINR(fin.amountDue)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isCheckedIn && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCheckIn(b);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-[#0D5C56] text-white text-xs font-medium hover:bg-[#094440]"
                        >
                          Check in
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/bookings/${b.id}`);
                        }}
                        className="p-1.5 rounded-lg border border-[#D8D2C5] text-[#5C6E6B] hover:text-[#1A2B28]"
                      >
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. CURRENTLY IN-HOUSE */}
      <section className="space-y-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1A2B28] flex items-center gap-1.5">
          <BedDouble size={14} className="text-[#0D5C56]" />
          <span>Currently In-House ({inHouse.length})</span>
        </h4>

        {inHouse.length === 0 ? (
          <div className="p-4 rounded-xl border border-[#D8D2C5] bg-white text-xs text-[#5C6E6B] text-center">
            No continuing resident stays.
          </div>
        ) : (
          <div className="divide-y divide-[#EAE5DC] rounded-xl border border-[#D8D2C5] bg-white overflow-hidden shadow-2xs">
            {inHouse.map((b) => {
              const bPayments = paymentsByBookingId.get(b.id) || [];
              const fin = calculateBookingFinancials(b, bPayments);

              return (
                <div
                  key={b.id}
                  onClick={() => onSelectBooking(b)}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF9F6] cursor-pointer transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#1A2B28]">
                        {b.customer?.name || 'Guest'}
                      </span>
                      <span className="text-xs font-mono text-[#5C6E6B] bg-stone-100 px-1.5 py-0.5 rounded">
                        {b.booking_no}
                      </span>
                    </div>
                    <div className="text-xs text-[#5C6E6B]">
                      {b.property?.name} · {b.room_type} · Departs {fmtDate(b.check_out)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-[#1A2B28]">
                        {fmtINR(b.grand_total)}
                      </div>
                      <div className="text-[11px]">
                        {fin.amountDue === 0 ? (
                          <span className="text-[#276749]">Paid</span>
                        ) : (
                          <span className="text-[#C45532]">Due: {fmtINR(fin.amountDue)}</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/bookings/${b.id}`);
                      }}
                      className="p-1.5 rounded-lg border border-[#D8D2C5] text-[#5C6E6B] hover:text-[#1A2B28]"
                    >
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. DEPARTURES */}
      <section className="space-y-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1A2B28] flex items-center gap-1.5">
          <LogOut size={14} className="text-[#C45532]" />
          <span>Departures Scheduled ({departures.length})</span>
        </h4>

        {departures.length === 0 ? (
          <div className="p-4 rounded-xl border border-[#D8D2C5] bg-white text-xs text-[#5C6E6B] text-center">
            No departures for this date.
          </div>
        ) : (
          <div className="divide-y divide-[#EAE5DC] rounded-xl border border-[#D8D2C5] bg-white overflow-hidden shadow-2xs">
            {departures.map((b) => {
              const bPayments = paymentsByBookingId.get(b.id) || [];
              const fin = calculateBookingFinancials(b, bPayments);
              const isCheckedOut = b.booking_status === 'Checked Out';

              return (
                <div
                  key={b.id}
                  onClick={() => onSelectBooking(b)}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF9F6] cursor-pointer transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#1A2B28]">
                        {b.customer?.name || 'Guest'}
                      </span>
                      <span className="text-xs font-mono text-[#5C6E6B] bg-stone-100 px-1.5 py-0.5 rounded">
                        {b.booking_no}
                      </span>
                    </div>
                    <div className="text-xs text-[#5C6E6B]">
                      {b.property?.name} · {b.room_type} · 11:00 AM standard checkout
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-[#1A2B28]">
                        {fin.amountDue > 0 ? (
                          <span className="text-[#C45532] font-bold">{fmtINR(fin.amountDue)} due</span>
                        ) : (
                          <span className="text-[#276749]">Paid in full</span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#5C6E6B]">
                        Total: {fmtINR(b.grand_total)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {fin.amountDue > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRecordPayment(b, fin.amountDue);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-[#C45532] text-white text-xs font-medium hover:bg-[#A84323] flex items-center gap-1"
                        >
                          <CreditCard size={12} />
                          <span>Record</span>
                        </button>
                      )}

                      {!isCheckedOut && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCheckOut(b);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-[#D8D2C5] text-[#1A2B28] text-xs font-medium hover:bg-stone-50"
                        >
                          Check out
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/bookings/${b.id}`);
                        }}
                        className="p-1.5 rounded-lg border border-[#D8D2C5] text-[#5C6E6B] hover:text-[#1A2B28]"
                      >
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
