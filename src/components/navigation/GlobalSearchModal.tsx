import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CalendarDays, Users, Building, CreditCard, ArrowRight, X } from 'lucide-react';
import { repository } from '../../lib/repository';
import { Booking, Customer, Property, Payment } from '../../lib/repository/types';
import { fmtINR, fmtDate } from '../../lib/utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [guests, setGuests] = useState<Customer[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([
        repository.getBookings(),
        repository.getCustomers(),
        repository.getProperties(),
        repository.getAllPayments()
      ]).then(([bList, gList, pList, payList]) => {
        setBookings(bList);
        setGuests(gList);
        setProperties(pList);
        setPayments(payList);
        setLoading(false);
      });
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const filteredBookings = q
    ? bookings.filter(
        (b) =>
          b.booking_no.toLowerCase().includes(q) ||
          b.customer?.name.toLowerCase().includes(q) ||
          b.property?.name.toLowerCase().includes(q)
      ).slice(0, 5)
    : [];

  const filteredGuests = q
    ? guests.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.phone.toLowerCase().includes(q) ||
          (g.email && g.email.toLowerCase().includes(q))
      ).slice(0, 4)
    : [];

  const filteredPayments = q
    ? payments.filter(
        (p) =>
          p.payment_no.toLowerCase().includes(q) ||
          (p.ref_id && p.ref_id.toLowerCase().includes(q)) ||
          p.booking?.customer?.name?.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const filteredProperties = q
    ? properties.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q)
      ).slice(0, 3)
    : [];

  const hasResults =
    filteredBookings.length > 0 ||
    filteredGuests.length > 0 ||
    filteredPayments.length > 0 ||
    filteredProperties.length > 0;

  const handleSelect = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#D8D2C5] overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#EAE5DC] gap-3 bg-[#FAF9F6]">
          <Search size={20} className="text-[#0D5C56] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bookings, guests, receipts, properties... (e.g. BK-1011, Rahul, Valley View)"
            className="flex-1 bg-transparent border-none outline-none text-base text-[#1A2B28] placeholder:text-[#5C6E6B]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-stone-400 hover:text-stone-600 p-1"
            >
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs text-[#5C6E6B] bg-white border border-[#D8D2C5] rounded-md shadow-2xs font-mono">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-[#5C6E6B]">
              Searching workspace records...
            </div>
          ) : !query ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-[#1A2B28]">Quick Workspace Search</p>
              <p className="text-xs text-[#5C6E6B] mt-1 max-w-md mx-auto">
                Type a guest name, booking code (e.g., BK-1011), receipt ID, or property name to jump immediately to the details.
              </p>
            </div>
          ) : !hasResults ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-[#1A2B28]">No matches found for "{query}"</p>
              <p className="text-xs text-[#5C6E6B] mt-1">
                Check the spelling or try searching by guest phone number or property name.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Bookings */}
              {filteredBookings.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#0D5C56] flex items-center gap-1.5">
                    <CalendarDays size={13} /> Bookings
                  </div>
                  <div className="mt-1 space-y-1">
                    {filteredBookings.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => handleSelect(`/bookings/${b.id}`)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#FAF9F6] transition-colors text-left group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-[#1A2B28]">
                              {b.booking_no}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8F3F1] text-[#0D5C56] font-medium">
                              {b.booking_status}
                            </span>
                            <span className="text-xs text-[#5C6E6B]">
                              {b.customer?.name || 'Guest'}
                            </span>
                          </div>
                          <div className="text-xs text-[#5C6E6B] mt-0.5">
                            {b.property?.name} • {fmtDate(b.check_in)} – {fmtDate(b.check_out)} • {fmtINR(b.grand_total)}
                          </div>
                        </div>
                        <ArrowRight size={15} className="text-[#5C6E6B] group-hover:text-[#0D5C56] group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Guests */}
              {filteredGuests.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#0D5C56] flex items-center gap-1.5">
                    <Users size={13} /> Guests
                  </div>
                  <div className="mt-1 space-y-1">
                    {filteredGuests.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => handleSelect(`/guests/${g.id}`)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#FAF9F6] transition-colors text-left group"
                      >
                        <div>
                          <div className="font-semibold text-sm text-[#1A2B28]">{g.name}</div>
                          <div className="text-xs text-[#5C6E6B] mt-0.5">
                            {g.phone} {g.email ? `• ${g.email}` : ''}
                          </div>
                        </div>
                        <ArrowRight size={15} className="text-[#5C6E6B] group-hover:text-[#0D5C56] group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Payments */}
              {filteredPayments.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#0D5C56] flex items-center gap-1.5">
                    <CreditCard size={13} /> Payments & Receipts
                  </div>
                  <div className="mt-1 space-y-1">
                    {filteredPayments.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelect('/payments')}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#FAF9F6] transition-colors text-left group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-[#1A2B28]">
                              {p.payment_no}
                            </span>
                            <span className="text-xs font-medium text-[#276749]">
                              {fmtINR(p.amount)}
                            </span>
                            <span className="text-xs text-stone-400">({p.method})</span>
                          </div>
                          <div className="text-xs text-[#5C6E6B] mt-0.5">
                            {p.booking?.customer?.name || 'Guest'} • {fmtDate(p.date)} {p.ref_id ? `• Ref: ${p.ref_id}` : ''}
                          </div>
                        </div>
                        <ArrowRight size={15} className="text-[#5C6E6B] group-hover:text-[#0D5C56] group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Properties */}
              {filteredProperties.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#0D5C56] flex items-center gap-1.5">
                    <Building size={13} /> Properties
                  </div>
                  <div className="mt-1 space-y-1">
                    {filteredProperties.map((prop) => (
                      <button
                        key={prop.id}
                        onClick={() => handleSelect('/properties')}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#FAF9F6] transition-colors text-left group"
                      >
                        <div>
                          <div className="font-semibold text-sm text-[#1A2B28]">{prop.name}</div>
                          <div className="text-xs text-[#5C6E6B] mt-0.5">
                            {prop.property_type} • {prop.city}, {prop.state}
                          </div>
                        </div>
                        <ArrowRight size={15} className="text-[#5C6E6B] group-hover:text-[#0D5C56] group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#FAF9F6] border-t border-[#EAE5DC] flex items-center justify-between text-xs text-[#5C6E6B]">
          <span>Tip: Press ⌘K anywhere to search</span>
          <span>Click any item to view</span>
        </div>
      </div>
    </div>
  );
}
