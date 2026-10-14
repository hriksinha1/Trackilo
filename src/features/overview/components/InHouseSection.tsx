import React, { useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { Booking, Payment } from '../../../lib/repository/types';
import InHouseRow from './InHouseRow';

interface InHouseSectionProps {
  inHouse: Booking[];
  paymentsByBookingId: Map<string, Payment[]>;
}

export default function InHouseSection({
  inHouse,
  paymentsByBookingId
}: InHouseSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const displayed = expanded ? inHouse : inHouse.slice(0, 5);

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#1A2B28]">
          Currently in-house
        </h2>
        <span className="text-xs font-medium text-[#5C6E6B]">
          {inHouse.length} {inHouse.length === 1 ? 'guest' : 'guests'}
        </span>
      </div>

      <div className="rounded-xl border border-[#D8D2C5] bg-white overflow-hidden shadow-2xs">
        {inHouse.length === 0 ? (
          <div className="py-6 px-4 text-center text-xs text-[#5C6E6B]">
            No guests are currently in-house.
          </div>
        ) : (
          <>
            <div className="divide-y divide-[#EAE5DC]">
              {displayed.map((b) => (
                <InHouseRow
                  key={b.id}
                  booking={b}
                  payments={paymentsByBookingId.get(b.id) || []}
                />
              ))}
            </div>

            {inHouse.length > 5 && (
              <div className="p-2.5 bg-[#FAF9F6] border-t border-[#EAE5DC] text-center">
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs font-medium text-[#0D5C56] hover:underline inline-flex items-center gap-1"
                >
                  {expanded ? (
                    <>
                      <span>Show fewer</span>
                      <ChevronUp size={13} />
                    </>
                  ) : (
                    <span>View all {inHouse.length} in-house →</span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
