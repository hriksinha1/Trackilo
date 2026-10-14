import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building2,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Edit3,
  CalendarDays,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { repository } from '../../lib/repository';
import { Customer, Booking, Payment, Property } from '../../lib/repository/types';
import { fmtDate, fmtINR } from '../../lib/utils/formatters';
import { calculateBookingFinancials } from '../../lib/utils/financials';
import { getTodayDateStr } from '../../lib/utils/dates';
import { useToast } from '../../context/ToastContext';

export default function GuestProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [guest, setGuest] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit guest state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editIdType, setEditIdType] = useState('Aadhaar');
  const [editIdNumber, setEditIdNumber] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const [cData, bList, payList, pList] = await Promise.all([
          repository.getCustomer(id),
          repository.getBookings(),
          repository.getAllPayments(),
          repository.getProperties()
        ]);

        if (cData) {
          setGuest(cData);
          setEditName(cData.name);
          setEditPhone(cData.phone);
          setEditEmail(cData.email || '');
          setEditCity(cData.city || '');
          setEditIdType(cData.id_type || 'Aadhaar');
          setEditIdNumber(cData.id_number || '');
          setEditNotes(cData.notes || '');
        }

        const propMap = new Map(pList.map((p) => [p.id, p]));
        const guestBookings = bList
          .filter((b) => b.customer_id === id)
          .map((b) => ({ ...b, property: propMap.get(b.property_id) }))
          .sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime());

        setBookings(guestBookings);
        setPayments(payList);
        setProperties(pList);
      } catch (err) {
        console.error('Failed to load guest profile', err);
        toast.error('Could not load guest profile.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

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

  // Aggregate guest statistics
  const guestStats = useMemo(() => {
    let totalSpent = 0;
    let totalNights = 0;
    let currentStatus = 'Past guest';

    for (const b of bookings) {
      if (b.booking_status === 'Cancelled') continue;
      totalNights += b.nights || 1;
      const bPays = paymentsByBooking.get(b.id) || [];
      const fin = calculateBookingFinancials(b, bPays);
      totalSpent += fin.netPaid;

      if (b.booking_status === 'Checked In' || (b.check_in <= todayStr && b.check_out > todayStr)) {
        currentStatus = 'Currently In-House';
      } else if (b.check_in > todayStr && currentStatus !== 'Currently In-House') {
        currentStatus = 'Upcoming Stay';
      }
    }

    return {
      totalStays: bookings.filter((b) => b.booking_status !== 'Cancelled').length,
      totalNights,
      totalSpent,
      currentStatus
    };
  }, [bookings, paymentsByBooking, todayStr]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!guest) return;
    setSaving(true);
    try {
      const updated = await repository.updateCustomer(guest.id, {
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim() || undefined,
        city: editCity.trim() || undefined,
        id_type: editIdType,
        id_number: editIdNumber.trim() || undefined,
        notes: editNotes.trim() || undefined
      });
      setGuest(updated);
      setIsEditing(false);
      toast.success('Guest Profile Updated', `${updated.name}'s details have been saved.`);
    } catch {
      toast.error('Failed to update guest details');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-pulse">
        <div className="h-6 w-32 bg-stone-200 rounded-md" />
        <div className="h-40 bg-white rounded-xl border border-[#D8D2C5]" />
        <div className="h-64 bg-white rounded-xl border border-[#D8D2C5]" />
      </div>
    );
  }

  if (!guest) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-16 text-center">
        <h2 className="text-xl font-bold text-[#1A2B28]">Guest Not Found</h2>
        <p className="text-sm text-[#5C6E6B] mt-1">The requested guest record does not exist.</p>
        <Link
          to="/guests"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0D5C56] text-white text-xs font-medium"
        >
          <ArrowLeft size={14} />
          <span>Back to Guests</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-7 max-w-5xl mx-auto pb-12">
      {/* Back Navigation */}
      <div>
        <Link
          to="/guests"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5C6E6B] hover:text-[#0D5C56] transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Guests</span>
        </Link>
      </div>

      {/* Guest Profile Card */}
      <div className="rounded-xl border border-[#D8D2C5] bg-white p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Person Initial Avatar */}
            <div className="w-16 h-16 rounded-full bg-[#E8F3F1] text-[#0D5C56] font-bold text-xl flex items-center justify-center shrink-0 border border-[#BDDFC9]/40">
              {getInitials(guest.name)}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-[#1A2B28] tracking-tight">
                  {guest.name}
                </h1>
                <span
                  className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                    guestStats.currentStatus === 'Currently In-House'
                      ? 'bg-[#EBF6EF] text-[#276749] border border-[#BDDFC9]'
                      : guestStats.currentStatus === 'Upcoming Stay'
                      ? 'bg-[#E8F3F1] text-[#0D5C56] border border-[#BDDFC9]'
                      : 'bg-stone-100 text-[#5C6E6B]'
                  }`}
                >
                  {guestStats.currentStatus}
                </span>
              </div>

              {/* Contact info */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5C6E6B] pt-1">
                <a
                  href={`tel:${guest.phone}`}
                  className="flex items-center gap-1.5 hover:text-[#0D5C56] transition-colors"
                >
                  <Phone size={13} className="text-[#0D5C56]" />
                  <span>{guest.phone}</span>
                </a>

                {guest.email && (
                  <a
                    href={`mailto:${guest.email}`}
                    className="flex items-center gap-1.5 hover:text-[#0D5C56] transition-colors"
                  >
                    <Mail size={13} className="text-[#0D5C56]" />
                    <span>{guest.email}</span>
                  </a>
                )}

                {guest.city && (
                  <div className="flex items-center gap-1.5 text-[#5C6E6B]">
                    <MapPin size={13} className="text-[#7E8F8C]" />
                    <span>{guest.city}</span>
                  </div>
                )}

                {guest.id_number && (
                  <div className="flex items-center gap-1.5 text-[#5C6E6B] font-mono">
                    <ShieldCheck size={13} className="text-[#0D5C56]" />
                    <span>{guest.id_type || 'ID'}: {guest.id_number}</span>
                  </div>
                )}
              </div>

              {guest.notes && (
                <p className="text-xs text-[#5C6E6B] bg-[#FAF9F6] p-2.5 rounded-lg border border-[#EAE5DC] mt-3">
                  <span className="font-semibold text-[#1A2B28]">Guest notes:</span> {guest.notes}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1.5 rounded-lg border border-[#D8D2C5] text-xs font-medium text-[#1A2B28] hover:bg-[#FAF9F6] transition-colors inline-flex items-center gap-1.5"
            >
              <Edit3 size={13} className="text-[#5C6E6B]" />
              <span>{isEditing ? 'Cancel' : 'Edit profile'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/bookings/new')}
              className="px-3.5 py-1.5 rounded-lg bg-[#0D5C56] text-white text-xs font-medium hover:bg-[#094440] transition-colors inline-flex items-center gap-1.5 shadow-2xs"
            >
              <CalendarDays size={13} />
              <span>Book stay</span>
            </button>
          </div>
        </div>

        {/* Inline Edit Form */}
        {isEditing && (
          <form onSubmit={handleSaveEdit} className="mt-6 pt-5 border-t border-[#EAE5DC] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#5C6E6B] uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#EAE5DC] rounded-lg outline-none focus:border-[#0D5C56]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5C6E6B] uppercase mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#EAE5DC] rounded-lg outline-none focus:border-[#0D5C56]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5C6E6B] uppercase mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#EAE5DC] rounded-lg outline-none focus:border-[#0D5C56]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5C6E6B] uppercase mb-1">
                  City / Location
                </label>
                <input
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#EAE5DC] rounded-lg outline-none focus:border-[#0D5C56]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5C6E6B] uppercase mb-1">
                  ID Type
                </label>
                <select
                  value={editIdType}
                  onChange={(e) => setEditIdType(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#EAE5DC] rounded-lg outline-none focus:border-[#0D5C56]"
                >
                  <option value="Aadhaar">Aadhaar</option>
                  <option value="Passport">Passport</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Voter ID">Voter ID</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5C6E6B] uppercase mb-1">
                  ID Number
                </label>
                <input
                  type="text"
                  value={editIdNumber}
                  onChange={(e) => setEditIdNumber(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#EAE5DC] rounded-lg outline-none focus:border-[#0D5C56]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#5C6E6B] uppercase mb-1">
                Guest Preferences / Notes
              </label>
              <textarea
                rows={2}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#EAE5DC] rounded-lg outline-none focus:border-[#0D5C56]"
                placeholder="Dietary preferences, special requests, VIP notes..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-lg border border-[#D8D2C5] text-xs text-[#5C6E6B] hover:bg-[#FAF9F6]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-[#0D5C56] text-white text-xs font-medium hover:bg-[#094440] disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        )}

        {/* Relationship Summary Strip */}
        <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-[#EAE5DC] text-center">
          <div className="p-3 rounded-lg bg-[#FAF9F6]">
            <span className="text-xs text-[#5C6E6B]">Total stays</span>
            <div className="text-xl font-bold text-[#1A2B28] mt-0.5">
              {guestStats.totalStays}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#FAF9F6]">
            <span className="text-xs text-[#5C6E6B]">Total nights</span>
            <div className="text-xl font-bold text-[#1A2B28] mt-0.5">
              {guestStats.totalNights}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#FAF9F6]">
            <span className="text-xs text-[#5C6E6B]">Total spent</span>
            <div className="text-xl font-bold text-[#276749] mt-0.5">
              {fmtINR(guestStats.totalSpent)}
            </div>
          </div>
        </div>
      </div>

      {/* Stay History Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#1A2B28]">
            Stay history ({bookings.length})
          </h2>
          <span className="text-xs text-[#5C6E6B]">Reservations and stays for {guest.name}</span>
        </div>

        <div className="rounded-xl border border-[#D8D2C5] bg-white overflow-hidden shadow-2xs">
          {bookings.length === 0 ? (
            <div className="py-12 px-4 text-center text-xs text-[#5C6E6B]">
              No booking history recorded for this guest.
            </div>
          ) : (
            <div className="divide-y divide-[#EAE5DC]">
              {bookings.map((b) => {
                const bPays = paymentsByBooking.get(b.id) || [];
                const fin = calculateBookingFinancials(b, bPays);

                return (
                  <div
                    key={b.id}
                    onClick={() => navigate(`/bookings/${b.id}`)}
                    className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF9F6] transition-colors cursor-pointer group"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#1A2B28] group-hover:text-[#0D5C56] transition-colors">
                          {b.property?.name || 'Property'}
                        </span>
                        <span className="text-xs text-[#7E8F8C]">·</span>
                        <span className="text-xs text-[#5C6E6B] font-mono">{b.booking_no}</span>
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            b.booking_status === 'Checked In'
                              ? 'bg-[#EBF6EF] text-[#276749]'
                              : b.booking_status === 'Checked Out'
                              ? 'bg-stone-100 text-stone-600'
                              : 'bg-[#E8F3F1] text-[#0D5C56]'
                          }`}
                        >
                          {b.booking_status}
                        </span>
                      </div>

                      <div className="text-xs text-[#5C6E6B]">
                        {b.room_type} · {fmtDate(b.check_in)} – {fmtDate(b.check_out)} ({b.nights} {b.nights === 1 ? 'night' : 'nights'})
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                      <div className="text-left sm:text-right">
                        <div className="text-xs font-semibold text-[#1A2B28]">
                          {fmtINR(fin.bookingTotal)}
                        </div>
                        <div className="text-[11px]">
                          {fin.amountDue === 0 ? (
                            <span className="text-[#276749] font-medium">Paid in full</span>
                          ) : (
                            <span className="text-[#C45532] font-medium">{fmtINR(fin.amountDue)} due</span>
                          )}
                        </div>
                      </div>

                      <span className="text-xs font-medium text-[#0D5C56] group-hover:underline inline-flex items-center gap-1">
                        <span>Details</span>
                        <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
