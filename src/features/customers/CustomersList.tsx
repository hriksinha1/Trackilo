import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { repository } from '../../lib/repository';
import { Customer, Booking, Payment, Property } from '../../lib/repository/types';
import { fmtDate, fmtINR } from '../../lib/utils/formatters';
import { calculateBookingFinancials } from '../../lib/utils/financials';
import {
  Search,
  Users,
  Mail,
  Phone,
  Plus,
  ArrowRight,
  X
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function CustomersList() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);

  // New Guest Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCity, setNewCity] = useState('');
  const [savingGuest, setSavingGuest] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [cList, bList, pList, payList] = await Promise.all([
        repository.getCustomers(),
        repository.getBookings(),
        repository.getProperties(),
        repository.getAllPayments()
      ]);
      setCustomers(cList);
      setBookings(bList);
      setProperties(pList);
      setPayments(payList);
    } catch (err) {
      console.error('Failed to load guest data', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute guest relationship metrics: last stay, total stays, total spent, status
  const guestMetrics = useMemo(() => {
    const propMap = new Map<string, Property>(properties.map((p) => [p.id, p]));
    const paymentsByBooking = new Map<string, Payment[]>();
    for (const p of payments) {
      const list = paymentsByBooking.get(p.booking_id) || [];
      list.push(p);
      paymentsByBooking.set(p.booking_id, list);
    }

    const metricsMap = new Map<
      string,
      {
        totalStays: number;
        totalSpent: number;
        lastStay: { propertyName: string; date: string } | null;
        currentStatus: 'In-House' | 'Upcoming' | 'Past guest';
      }
    >();

    for (const c of customers) {
      const cBookings = bookings
        .filter((b) => b.customer_id === c.id && b.booking_status !== 'Cancelled')
        .sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime());

      let totalSpent = 0;
      let currentStatus: 'In-House' | 'Upcoming' | 'Past guest' = 'Past guest';

      for (const b of cBookings) {
        const bPays = paymentsByBooking.get(b.id) || [];
        const fin = calculateBookingFinancials(b, bPays);
        totalSpent += fin.netPaid;

        if (b.booking_status === 'Checked In' || (b.check_in <= todayStr && b.check_out > todayStr)) {
          currentStatus = 'In-House';
        } else if (b.check_in > todayStr && currentStatus !== 'In-House') {
          currentStatus = 'Upcoming';
        }
      }

      let lastStay = null;
      if (cBookings.length > 0) {
        const latest = cBookings[0];
        const prop = propMap.get(latest.property_id);
        lastStay = {
          propertyName: prop?.name || 'Property',
          date: fmtDate(latest.check_in)
        };
      }

      metricsMap.set(c.id, {
        totalStays: cBookings.length,
        totalSpent,
        lastStay,
        currentStatus
      });
    }

    return metricsMap;
  }, [customers, bookings, properties, payments, todayStr]);

  const filteredGuests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q))
    );
  }, [customers, search]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  async function handleCreateGuest(e: React.FormEvent) {
    e.preventDefault();
    setSavingGuest(true);
    try {
      const created = await repository.createCustomer({
        name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim() || undefined,
        city: newCity.trim() || undefined
      });
      toast.success('Guest Added', `${created.name} was added to your directory.`);
      setShowAddGuestModal(false);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewCity('');
      load();
    } catch {
      toast.error('Failed to create guest record');
    } finally {
      setSavingGuest(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-8 w-44 bg-stone-200 rounded-lg" />
        <div className="h-12 bg-white rounded-xl border border-[#D8D2C5]" />
        <div className="h-96 bg-white rounded-xl border border-[#D8D2C5]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A2B28] tracking-tight">
              Guests
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF9F6] border border-[#D8D2C5] text-[#5C6E6B]">
              {customers.length} {customers.length === 1 ? 'guest' : 'guests'}
            </span>
          </div>
          <p className="text-sm text-[#5C6E6B] mt-1">
            Manage guest profiles, contact details, and stay history.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddGuestModal(true)}
          className="px-3.5 py-2 rounded-lg bg-[#0D5C56] text-white text-xs font-medium hover:bg-[#094440] transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto shadow-2xs"
        >
          <Plus size={15} />
          <span>Add guest</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7E8F8C] pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search guests by name, phone, email, or city..."
          className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-[#D8D2C5] rounded-xl outline-none focus:border-[#0D5C56] text-[#1A2B28] placeholder:text-[#7E8F8C] shadow-2xs transition-colors"
        />
      </div>

      {/* Guests Directory */}
      <div className="rounded-xl border border-[#D8D2C5] bg-white overflow-hidden shadow-2xs">
        {filteredGuests.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#FAF9F6] border border-[#EAE5DC] text-[#7E8F8C] mx-auto flex items-center justify-center">
              <Users size={20} />
            </div>
            <p className="text-sm font-medium text-[#1A2B28]">No guests found.</p>
            {search && (
              <p className="text-xs text-[#5C6E6B]">
                Clear your search query to see all {customers.length} guests.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#EAE5DC] bg-[#FAF9F6] text-xs font-semibold text-[#5C6E6B] uppercase tracking-wider">
                    <th className="py-3 px-5">Guest</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Last Stay</th>
                    <th className="py-3 px-4 text-center">Stays</th>
                    <th className="py-3 px-4 text-right">Total Spent</th>
                    <th className="py-3 px-4 text-center">Current Status</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE5DC]">
                  {filteredGuests.map((guest) => {
                    const metrics = guestMetrics.get(guest.id) || {
                      totalStays: 0,
                      totalSpent: 0,
                      lastStay: null,
                      currentStatus: 'Past guest'
                    };

                    return (
                      <tr
                        key={guest.id}
                        onClick={() => navigate(`/guests/${guest.id}`)}
                        className="hover:bg-[#FAF9F6] cursor-pointer transition-colors group select-none"
                      >
                        {/* Guest Name & Avatar */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#E8F3F1] text-[#0D5C56] font-semibold text-xs flex items-center justify-center shrink-0 border border-[#BDDFC9]/40">
                              {getInitials(guest.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm text-[#1A2B28] group-hover:text-[#0D5C56] transition-colors truncate">
                                {guest.name}
                              </div>
                              {guest.city && (
                                <div className="text-xs text-[#7E8F8C] truncate">
                                  {guest.city}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4 text-xs">
                          <div className="text-[#1A2B28] font-medium">{guest.phone}</div>
                          {guest.email && (
                            <div className="text-[#5C6E6B] truncate max-w-[170px]">
                              {guest.email}
                            </div>
                          )}
                        </td>

                        {/* Last Stay */}
                        <td className="py-3.5 px-4 text-xs">
                          {metrics.lastStay ? (
                            <div>
                              <div className="text-[#1A2B28] font-medium truncate max-w-[160px]">
                                {metrics.lastStay.propertyName}
                              </div>
                              <div className="text-[11px] text-[#7E8F8C]">
                                {metrics.lastStay.date}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[#7E8F8C] italic">No stays yet</span>
                          )}
                        </td>

                        {/* Stays Count */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="text-xs font-semibold text-[#1A2B28]">
                            {metrics.totalStays} {metrics.totalStays === 1 ? 'stay' : 'stays'}
                          </span>
                        </td>

                        {/* Total Spent */}
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-xs font-semibold text-[#276749]">
                            {fmtINR(metrics.totalSpent)}
                          </span>
                        </td>

                        {/* Current Status */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                              metrics.currentStatus === 'In-House'
                                ? 'bg-[#EBF6EF] text-[#276749] border border-[#BDDFC9]'
                                : metrics.currentStatus === 'Upcoming'
                                ? 'bg-[#E8F3F1] text-[#0D5C56] border border-[#BDDFC9]'
                                : 'bg-stone-100 text-[#5C6E6B]'
                            }`}
                          >
                            {metrics.currentStatus}
                          </span>
                        </td>

                        {/* Action: Profile -> */}
                        <td className="py-3.5 px-5 text-right">
                          <span className="text-xs font-medium text-[#0D5C56] group-hover:underline inline-flex items-center gap-1">
                            <span>Profile</span>
                            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-[#EAE5DC]">
              {filteredGuests.map((guest) => {
                const metrics = guestMetrics.get(guest.id) || {
                  totalStays: 0,
                  totalSpent: 0,
                  lastStay: null,
                  currentStatus: 'Past guest'
                };

                return (
                  <div
                    key={guest.id}
                    onClick={() => navigate(`/guests/${guest.id}`)}
                    className="p-4 space-y-3 hover:bg-[#FAF9F6] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#E8F3F1] text-[#0D5C56] font-semibold text-xs flex items-center justify-center shrink-0 border border-[#BDDFC9]/40">
                          {getInitials(guest.name)}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-[#1A2B28]">{guest.name}</div>
                          <div className="text-xs text-[#5C6E6B]">{guest.phone}</div>
                        </div>
                      </div>

                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          metrics.currentStatus === 'In-House'
                            ? 'bg-[#EBF6EF] text-[#276749]'
                            : metrics.currentStatus === 'Upcoming'
                            ? 'bg-[#E8F3F1] text-[#0D5C56]'
                            : 'bg-stone-100 text-[#5C6E6B]'
                        }`}
                      >
                        {metrics.currentStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EAE5DC] text-xs">
                      <div>
                        <span className="text-[#7E8F8C]">Stays:</span>{' '}
                        <span className="font-semibold text-[#1A2B28]">{metrics.totalStays}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#7E8F8C]">Spent:</span>{' '}
                        <span className="font-semibold text-[#276749]">{fmtINR(metrics.totalSpent)}</span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-xs text-[#0D5C56] font-medium">
                      <span>{metrics.lastStay ? `Last: ${metrics.lastStay.propertyName}` : 'No stays yet'}</span>
                      <span className="inline-flex items-center gap-1">
                        Profile <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add Guest Modal */}
      {showAddGuestModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-[#D8D2C5] w-full max-w-md overflow-hidden shadow-xl animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-[#EAE5DC] flex items-center justify-between bg-[#FAF9F6]">
              <h3 className="text-sm font-bold text-[#1A2B28]">Add New Guest</h3>
              <button
                type="button"
                onClick={() => setShowAddGuestModal(false)}
                className="p-1 rounded-lg text-[#7E8F8C] hover:text-[#1A2B28]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateGuest} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#5C6E6B] uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Anand Menon"
                  className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#EAE5DC] rounded-lg outline-none focus:border-[#0D5C56]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5C6E6B] uppercase mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#EAE5DC] rounded-lg outline-none focus:border-[#0D5C56]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5C6E6B] uppercase mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="guest@example.com"
                  className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#EAE5DC] rounded-lg outline-none focus:border-[#0D5C56]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5C6E6B] uppercase mb-1">
                  City / Location
                </label>
                <input
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="e.g. Bangalore"
                  className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#EAE5DC] rounded-lg outline-none focus:border-[#0D5C56]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddGuestModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#D8D2C5] text-xs font-medium text-[#5C6E6B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGuest}
                  className="px-4 py-1.5 rounded-lg bg-[#0D5C56] text-white text-xs font-medium hover:bg-[#094440] disabled:opacity-50"
                >
                  {savingGuest ? 'Creating...' : 'Create guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
