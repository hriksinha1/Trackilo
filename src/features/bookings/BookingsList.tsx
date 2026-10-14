import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { repository } from '../../lib/repository';
import { Booking, Payment } from '../../lib/repository/types';
import { AppContextType } from '../../components/layout/AppShell';
import { fmtDate, fmtINR } from '../../lib/utils/formatters';
import { calculateBookingFinancials } from '../../lib/utils/financials';
import { getTodayDateStr } from '../../lib/utils/dates';
import {
  Search,
  Plus,
  ArrowRight,
  Filter,
  CalendarDays
} from 'lucide-react';

type TabType = 'all' | 'arriving' | 'staying' | 'departing' | 'past';

export default function BookingsList() {
  const { propertyFilter } = useOutletContext<AppContextType>();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  async function loadData() {
    setLoading(true);
    try {
      const [bookingsData, paymentsData] = await Promise.all([
        repository.getBookings(propertyFilter || undefined),
        repository.getAllPayments()
      ]);
      setBookings(bookingsData);
      setPayments(paymentsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [propertyFilter]);

  const todayStr = useMemo(() => getTodayDateStr(), []);

  // Map payments by booking ID
  const paymentsByBooking = useMemo(() => {
    const map = new Map<string, Payment[]>();
    for (const p of payments) {
      const list = map.get(p.booking_id) || [];
      list.push(p);
      map.set(p.booking_id, list);
    }
    return map;
  }, [payments]);

  // Operational counts for tabs
  const counts = useMemo(() => {
    return {
      all: bookings.length,
      arriving: bookings.filter((b) => b.check_in === todayStr && b.booking_status !== 'Cancelled').length,
      staying: bookings.filter(
        (b) =>
          b.booking_status === 'Checked In' ||
          (b.check_in <= todayStr && b.check_out > todayStr && b.booking_status !== 'Cancelled')
      ).length,
      departing: bookings.filter(
        (b) => b.check_out === todayStr && b.booking_status !== 'Cancelled'
      ).length,
      past: bookings.filter(
        (b) => b.check_out < todayStr || b.booking_status === 'Checked Out' || b.booking_status === 'Completed'
      ).length
    };
  }, [bookings, todayStr]);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();

    return bookings.filter((b) => {
      // 1. Tab filter
      if (activeTab === 'arriving') {
        if (b.check_in !== todayStr || b.booking_status === 'Cancelled') return false;
      } else if (activeTab === 'staying') {
        const isStaying =
          b.booking_status === 'Checked In' ||
          (b.check_in <= todayStr && b.check_out > todayStr && b.booking_status !== 'Cancelled');
        if (!isStaying) return false;
      } else if (activeTab === 'departing') {
        if (b.check_out !== todayStr || b.booking_status === 'Cancelled') return false;
      } else if (activeTab === 'past') {
        const isPast =
          b.check_out < todayStr || b.booking_status === 'Checked Out' || b.booking_status === 'Completed';
        if (!isPast) return false;
      }

      // 2. Search query (guest, booking ID, property)
      if (q) {
        const guestName = b.customer?.name?.toLowerCase() || '';
        const bookingNo = b.booking_no?.toLowerCase() || '';
        const propName = b.property?.name?.toLowerCase() || '';
        const roomType = b.room_type?.toLowerCase() || '';
        if (
          !guestName.includes(q) &&
          !bookingNo.includes(q) &&
          !propName.includes(q) &&
          !roomType.includes(q)
        ) {
          return false;
        }
      }

      // 3. Payment filter
      if (paymentFilter !== 'all') {
        const bPayments = paymentsByBooking.get(b.id) || [];
        const fin = calculateBookingFinancials(b, bPayments);
        if (fin.paymentStatus !== paymentFilter) return false;
      }

      return true;
    });
  }, [bookings, search, activeTab, paymentFilter, todayStr, paymentsByBooking]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 max-w-7xl mx-auto">
        <div className="h-8 w-44 bg-stone-200 rounded-lg" />
        <div className="h-10 bg-white rounded-xl border border-[#D8D2C5]" />
        <div className="h-96 bg-white rounded-xl border border-[#D8D2C5]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A2B28] tracking-tight">
            Bookings
          </h1>
          <p className="text-sm text-[#5C6E6B] mt-1">
            Manage reservations, arrivals, departures, and payments.
          </p>
        </div>

        <Link
          to="/bookings/new"
          className="px-3.5 py-2 rounded-lg bg-[#0D5C56] text-white text-xs font-medium hover:bg-[#094440] transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto shadow-2xs"
        >
          <Plus size={15} />
          <span>New booking</span>
        </Link>
      </div>

      {/* Booking-Centric Operational Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-medium border-b border-[#EAE5DC]">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-[#E8F3F1] text-[#0D5C56] font-semibold'
              : 'text-[#5C6E6B] hover:text-[#1A2B28] hover:bg-[#FAF9F6]'
          }`}
        >
          All stays ({counts.all})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('arriving')}
          className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'arriving'
              ? 'bg-[#E8F3F1] text-[#0D5C56] font-semibold'
              : 'text-[#5C6E6B] hover:text-[#1A2B28] hover:bg-[#FAF9F6]'
          }`}
        >
          Arriving today ({counts.arriving})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('staying')}
          className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'staying'
              ? 'bg-[#E8F3F1] text-[#0D5C56] font-semibold'
              : 'text-[#5C6E6B] hover:text-[#1A2B28] hover:bg-[#FAF9F6]'
          }`}
        >
          In-house ({counts.staying})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('departing')}
          className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'departing'
              ? 'bg-[#E8F3F1] text-[#0D5C56] font-semibold'
              : 'text-[#5C6E6B] hover:text-[#1A2B28] hover:bg-[#FAF9F6]'
          }`}
        >
          Departing today ({counts.departing})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('past')}
          className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'past'
              ? 'bg-[#E8F3F1] text-[#0D5C56] font-semibold'
              : 'text-[#5C6E6B] hover:text-[#1A2B28] hover:bg-[#FAF9F6]'
          }`}
        >
          Past stays ({counts.past})
        </button>
      </div>

      {/* Search & Secondary Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#D8D2C5]">
        <div className="relative w-full sm:max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7E8F8C] pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guest, booking ID, property..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-[#FAF9F6] border border-[#EAE5DC] rounded-lg outline-none focus:border-[#0D5C56] text-[#1A2B28] placeholder:text-[#7E8F8C]"
          />
        </div>

        {/* Payment filter */}
        <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-end">
          <span className="text-xs text-[#5C6E6B] flex items-center gap-1">
            <Filter size={13} /> Payment:
          </span>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="text-xs bg-[#FAF9F6] border border-[#EAE5DC] rounded-lg px-3 py-1.5 font-medium text-[#1A2B28] outline-none cursor-pointer focus:border-[#0D5C56]"
          >
            <option value="all">All payments</option>
            <option value="Paid">Paid in full</option>
            <option value="Partially Paid">Partially paid</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      {/* Bookings View: Desktop Table + Mobile Cards */}
      <div className="rounded-xl border border-[#D8D2C5] bg-white overflow-hidden shadow-2xs">
        {filteredBookings.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#FAF9F6] border border-[#EAE5DC] text-[#7E8F8C] mx-auto flex items-center justify-center">
              <CalendarDays size={20} />
            </div>
            <p className="text-sm font-medium text-[#1A2B28]">No bookings match your filters.</p>
            <p className="text-xs text-[#5C6E6B]">
              Try adjusting your search or tab filters to view other stays.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#EAE5DC] bg-[#FAF9F6] text-xs font-semibold text-[#5C6E6B] uppercase tracking-wider">
                    <th className="py-3 px-5">Guest</th>
                    <th className="py-3 px-4">Stay / Property</th>
                    <th className="py-3 px-4">Dates</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-right">Due</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE5DC]">
                  {filteredBookings.map((b) => {
                    const bPayments = paymentsByBooking.get(b.id) || [];
                    const fin = calculateBookingFinancials(b, bPayments);

                    return (
                      <tr
                        key={b.id}
                        onClick={() => navigate(`/bookings/${b.id}`)}
                        className="hover:bg-[#FAF9F6] cursor-pointer transition-colors group select-none"
                      >
                        {/* Guest */}
                        <td className="py-3.5 px-5">
                          <div
                            onClick={(e) => {
                              if (b.customer_id) {
                                e.stopPropagation();
                                navigate(`/guests/${b.customer_id}`);
                              }
                            }}
                            className="font-semibold text-sm text-[#1A2B28] hover:text-[#0D5C56] hover:underline transition-colors"
                            title="Open guest profile"
                          >
                            {b.customer?.name || 'Guest'}
                          </div>
                          <div className="text-xs text-[#7E8F8C] font-mono">{b.booking_no}</div>
                        </td>

                        {/* Stay / Property */}
                        <td className="py-3.5 px-4 text-xs">
                          <div className="font-medium text-[#1A2B28] truncate max-w-[170px]">
                            {b.property?.name}
                          </div>
                          <div className="text-[#5C6E6B] truncate max-w-[170px]">{b.room_type}</div>
                        </td>

                        {/* Dates */}
                        <td className="py-3.5 px-4 text-xs">
                          <div className="text-[#1A2B28] font-medium">
                            {fmtDate(b.check_in)} – {fmtDate(b.check_out)}
                          </div>
                          <div className="text-[#7E8F8C]">
                            {b.nights} {b.nights === 1 ? 'night' : 'nights'}
                          </div>
                        </td>

                        {/* Total */}
                        <td className="py-3.5 px-4 text-right font-semibold text-xs text-[#1A2B28]">
                          {fmtINR(fin.bookingTotal)}
                        </td>

                        {/* Paid */}
                        <td className="py-3.5 px-4 text-right font-medium text-xs text-[#276749]">
                          {fmtINR(fin.netPaid)}
                        </td>

                        {/* Due */}
                        <td className="py-3.5 px-4 text-right text-xs">
                          {fin.amountDue > 0 ? (
                            <span className="font-semibold text-[#C45532]">
                              {fmtINR(fin.amountDue)}
                            </span>
                          ) : (
                            <span className="text-[#276749] font-medium">₹0</span>
                          )}
                        </td>

                        {/* Status (Stay & Payment) */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center gap-1">
                            <span
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                b.booking_status === 'Checked In'
                                  ? 'bg-[#EBF6EF] text-[#276749] border border-[#BDDFC9]'
                                  : b.booking_status === 'Checked Out'
                                  ? 'bg-stone-100 text-[#5C6E6B]'
                                  : 'bg-[#E8F3F1] text-[#0D5C56]'
                              }`}
                            >
                              {b.booking_status}
                            </span>
                            <span
                              className={`text-[10px] font-medium ${
                                fin.paymentStatus === 'Paid'
                                  ? 'text-[#276749]'
                                  : fin.paymentStatus === 'Partially Paid'
                                  ? 'text-[#B7791F]'
                                  : 'text-[#C45532]'
                              }`}
                            >
                              {fin.paymentStatus === 'Paid' ? 'Paid' : fin.paymentStatus === 'Partially Paid' ? 'Partial' : 'Unpaid'}
                            </span>
                          </div>
                        </td>

                        {/* Action: Details -> */}
                        <td className="py-3.5 px-5 text-right">
                          <span className="text-xs font-medium text-[#0D5C56] group-hover:underline inline-flex items-center gap-1">
                            <span>Details</span>
                            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-[#EAE5DC]">
              {filteredBookings.map((b) => {
                const bPayments = paymentsByBooking.get(b.id) || [];
                const fin = calculateBookingFinancials(b, bPayments);

                return (
                  <div
                    key={b.id}
                    onClick={() => navigate(`/bookings/${b.id}`)}
                    className="p-4 space-y-2.5 hover:bg-[#FAF9F6] transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm text-[#1A2B28]">
                          {b.customer?.name || 'Guest'}
                        </div>
                        <div className="text-xs text-[#7E8F8C] font-mono">{b.booking_no}</div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            b.booking_status === 'Checked In'
                              ? 'bg-[#EBF6EF] text-[#276749]'
                              : b.booking_status === 'Checked Out'
                              ? 'bg-stone-100 text-[#5C6E6B]'
                              : 'bg-[#E8F3F1] text-[#0D5C56]'
                          }`}
                        >
                          {b.booking_status}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-[#5C6E6B]">
                      {b.property?.name} · {b.room_type}
                    </div>

                    <div className="text-xs text-[#1A2B28]">
                      {fmtDate(b.check_in)} – {fmtDate(b.check_out)} ({b.nights} {b.nights === 1 ? 'night' : 'nights'})
                    </div>

                    <div className="pt-2 border-t border-[#EAE5DC] flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[#7E8F8C]">Total:</span>{' '}
                        <span className="font-semibold text-[#1A2B28]">{fmtINR(fin.bookingTotal)}</span>
                        {fin.amountDue > 0 && (
                          <span className="text-[#C45532] font-semibold ml-2">
                            ({fmtINR(fin.amountDue)} due)
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-medium text-[#0D5C56] inline-flex items-center gap-1">
                        Details <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
