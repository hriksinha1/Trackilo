import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useOutletContext } from 'react-router-dom';
import {
  CalendarDays,
  User,
  CreditCard,
  Building2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  UserPlus,
  ShieldCheck,
  Receipt,
  BedDouble,
  Info,
  Download,
  Share2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { repository } from '../../lib/repository';
import { Property, Customer, Booking, Payment, BusinessSettings } from '../../lib/repository/types';
import { AppContextType } from '../../components/layout/AppShell';
import { fmtINR, fmtDate } from '../../lib/utils/formatters';
import { getTodayDateStr, parseLocalDate, formatLocalDate, calcNights, isCheckOutAfterCheckIn } from '../../lib/utils/dates';
import { generatePaymentReceiptPDF } from '../../lib/services/pdfGenerator';
import DocumentModal from '../../components/documents/DocumentModal';
import { useToast } from '../../context/ToastContext';

export default function NewBooking() {
  const navigate = useNavigate();
  const { propertyFilter } = useOutletContext<AppContextType>();
  const { toast } = useToast();

  const [properties, setProperties] = useState<Property[]>([]);
  const [guests, setGuests] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Stay Details
  const [propertyId, setPropertyId] = useState(propertyFilter || '');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [rooms, setRooms] = useState(1);
  const [guestsCount, setGuestsCount] = useState(2);
  const [roomType, setRoomType] = useState('Deluxe Suite');

  // Step 2: Guest Details
  const [isNewGuest, setIsNewGuest] = useState(false);
  const [guestId, setGuestId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  // Step 3: Charges
  const [baseAmount, setBaseAmount] = useState<number | ''>(8500);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState(12);
  const [discount, setDiscount] = useState<number | ''>(0);

  // Step 4: Optional Payment Received Now
  const [paymentType, setPaymentType] = useState<'No payment' | 'Advance' | 'Full payment'>('Advance');
  const [paymentAmount, setPaymentAmount] = useState<number | ''>(3000);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentRef, setPaymentRef] = useState('');

  // Post-booking created success state with instant receipt access
  const [createdBooking, setCreatedBooking] = useState<{
    booking: Booking;
    payment?: Payment;
  } | null>(null);

  const [showDocModal, setShowDocModal] = useState(false);

  useEffect(() => {
    Promise.all([
      repository.getProperties(),
      repository.getCustomers(),
      repository.getSettings()
    ]).then(([pList, cList, sData]) => {
      const active = pList.filter((p) => p.active);
      setProperties(active);
      setGuests(cList);
      setSettings(sData);

      if (sData?.defaultTaxRate !== undefined) {
        setTaxRate(sData.defaultTaxRate);
      }

      if (!propertyId && active.length > 0) {
        setPropertyId(active[0].id);
      }
    });
  }, [propertyFilter]);

  // Set default dates if empty using IST safe calculation
  useEffect(() => {
    if (!checkIn) {
      const today = getTodayDateStr();
      setCheckIn(today);
      const nextDate = parseLocalDate(today);
      nextDate.setDate(nextDate.getDate() + 2);
      setCheckOut(formatLocalDate(nextDate));
    }
  }, [checkIn]);

  const nights = calcNights(checkIn, checkOut);
  const datesValid = isCheckOutAfterCheckIn(checkIn, checkOut);

  // Calculate Financials
  const numBase = Number(baseAmount) || 0;
  const numDiscount = Number(discount) || 0;
  const subtotal = Math.max(0, numBase - numDiscount);
  const taxAmount = taxEnabled ? Math.round(subtotal * (taxRate / 100)) : 0;
  const totalBookingAmount = subtotal + taxAmount;

  useEffect(() => {
    if (paymentType === 'Full payment') {
      setPaymentAmount(totalBookingAmount);
    } else if (paymentType === 'No payment') {
      setPaymentAmount('');
    } else if (paymentType === 'Advance') {
      if (paymentAmount === '' || paymentAmount === totalBookingAmount || paymentAmount === 0) {
        setPaymentAmount(Math.round(totalBookingAmount * 0.3));
      }
    }
  }, [paymentType, totalBookingAmount]);

  const numPayment = paymentType === 'No payment' ? 0 : Number(paymentAmount) || 0;
  const initialDue = Math.max(0, totalBookingAmount - numPayment);

  const selectedProperty = properties.find((p) => p.id === propertyId);

  // Validation
  const canProceedStep1 = propertyId && checkIn && checkOut && datesValid && nights > 0;
  const canProceedStep2 = isNewGuest
    ? guestName.trim().length > 0 && guestPhone.trim().length > 0
    : guestId.length > 0;
  const canProceedStep3 = numBase > 0 && numDiscount <= numBase;
  const canProceedStep4 =
    paymentType === 'No payment' || (numPayment > 0 && numPayment <= totalBookingAmount);

  async function handleCreateBooking() {
    if (loading) return;
    setLoading(true);

    try {
      if (!canProceedStep1 || !canProceedStep2 || !canProceedStep3 || !canProceedStep4) {
        throw new Error('Please review all booking fields before confirming.');
      }

      // 1. Resolve guest ID
      let finalGuestId = guestId;
      if (isNewGuest) {
        const newG = await repository.createCustomer({
          name: guestName.trim(),
          phone: guestPhone.trim(),
          email: guestEmail.trim() || undefined
        });
        finalGuestId = newG.id;
      }

      // 2. Create booking record with persisted discount
      const initialPaymentStatus =
        numPayment >= totalBookingAmount
          ? 'Paid'
          : numPayment > 0
          ? 'Partially Paid'
          : 'Unpaid';

      const booking = await repository.createBooking({
        booking_no: '', // auto-generated sequentially by repository
        customer_id: finalGuestId,
        property_id: propertyId,
        check_in: checkIn,
        check_out: checkOut,
        nights,
        rooms,
        guests: guestsCount,
        room_type: roomType,
        base_amount: numBase,
        discount: numDiscount,
        tax_enabled: taxEnabled,
        tax_rate: taxEnabled ? taxRate : 0,
        tax_amount: taxAmount,
        grand_total: totalBookingAmount,
        booking_status: 'Confirmed',
        payment_status: initialPaymentStatus
      });

      // 3. Record initial payment if provided
      let paymentRecord: Payment | undefined = undefined;
      if (numPayment > 0 && paymentType !== 'No payment') {
        paymentRecord = await repository.createPayment({
          payment_no: '', // auto-generated
          booking_id: booking.id,
          date: getTodayDateStr(),
          amount: numPayment,
          method: paymentMethod,
          ref_id: paymentRef.trim() || undefined,
          purpose: paymentType === 'Full payment' ? 'Full payment at booking' : 'Advance deposit',
          status: 'Recorded'
        });
      }

      toast.success('Reservation Confirmed', `Booking ${booking.booking_no} has been created.`);

      // If an advance was recorded, present immediate receipt screen!
      if (paymentRecord) {
        setCreatedBooking({
          booking,
          payment: paymentRecord
        });
      } else {
        navigate(`/bookings/${booking.id}`);
      }
    } catch (err: any) {
      toast.error('Could not create booking', err.message || 'Please verify form fields.');
    } finally {
      setLoading(false);
    }
  }

  // --- POST-CREATION WITH ADVANCE RECEIPT SCREEN ---
  if (createdBooking) {
    const { booking, payment } = createdBooking;

    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6 animate-fade-in">
        <div className="card p-6 sm:p-8 bg-white border-[#D8D2C5] text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#EBF6EF] text-[#276749] flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle2 size={36} />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0D5C56]">
              Booking & Advance Confirmed
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A2B28] mt-1 tracking-tight">
              {booking.booking_no} Confirmed
            </h1>
            <p className="text-sm text-[#5C6E6B] mt-1">
              Advance payment of {payment ? fmtINR(payment.amount) : '₹0'} recorded for guest {booking.customer?.name}.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#D8D2C5] text-xs space-y-2 text-left my-4">
            <div className="flex justify-between items-center">
              <span className="text-[#5C6E6B]">Receipt Number:</span>
              <span className="font-mono font-bold text-[#0D5C56] text-sm">{payment?.payment_no}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#5C6E6B]">Property:</span>
              <span className="font-semibold text-[#1A2B28]">{booking.property?.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#5C6E6B]">Dates:</span>
              <span className="font-medium text-[#1A2B28]">
                {fmtDate(booking.check_in)} – {fmtDate(booking.check_out)} ({booking.nights} night{booking.nights > 1 ? 's' : ''})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#5C6E6B]">Advance Received:</span>
              <span className="font-bold text-sm text-[#276749]">{fmtINR(payment?.amount || 0)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-[#EAE5DC]">
              <span className="text-[#5C6E6B] font-semibold">Remaining Due at Stay:</span>
              <span className="font-bold text-sm text-[#C45532]">
                {fmtINR(Math.max(0, booking.grand_total - (payment?.amount || 0)))}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => setShowDocModal(true)}
              className="btn btn-primary py-3 text-xs font-semibold flex items-center justify-center gap-2"
            >
              <FileText size={16} />
              <span>Preview & Share Advance Receipt</span>
            </button>

            <button
              onClick={() => navigate(`/bookings/${booking.id}`)}
              className="btn btn-outline py-3 text-xs font-semibold flex items-center justify-center gap-2"
            >
              <span>View Full Reservation Folio</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Document modal */}
        {payment && (
          <DocumentModal
            isOpen={showDocModal}
            onClose={() => setShowDocModal(false)}
            type="receipt"
            booking={booking}
            payment={payment}
            previouslyPaid={0}
            balanceDue={Math.max(0, booking.grand_total - payment.amount)}
            settings={settings}
          />
        )}
      </div>
    );
  }

  // --- WIZARD FLOW ---
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Link
          to="/bookings"
          className="p-2 rounded-xl border border-[#D8D2C5] bg-white text-[#5C6E6B] hover:text-[#1A2B28] hover:bg-[#FAF9F6] transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#0D5C56]">
            Step {step} of 4
          </div>
          <h1 className="text-2xl font-semibold text-[#1A2B28] tracking-tight">New Stay Booking</h1>
        </div>
      </div>

      {/* Step Progress Pills */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {[
          { num: 1, label: 'Stay Details' },
          { num: 2, label: 'Guest' },
          { num: 3, label: 'Charges' },
          { num: 4, label: 'Payment' }
        ].map((s) => (
          <button
            key={s.num}
            disabled={step < s.num}
            onClick={() => setStep(s.num as any)}
            className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all ${
              step === s.num
                ? 'bg-[#E8F3F1] border-[#0D5C56] text-[#0D5C56] font-semibold'
                : step > s.num
                ? 'bg-white border-[#D8D2C5] text-[#1A2B28]'
                : 'bg-[#FAF9F6] border-[#EAE5DC] text-[#8E9E9B] opacity-60 cursor-not-allowed'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider">Step {s.num}</div>
            <div className="text-xs sm:text-sm font-semibold truncate">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Main Grid: Form Left (2 Cols) + Summary Right (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Body */}
        <div className="lg:col-span-2">
          {/* STEP 1: Stay Details */}
          {step === 1 && (
            <div className="card p-6 bg-white border-[#D8D2C5] space-y-5 animate-fade-in">
              <h2 className="text-lg font-bold text-[#1A2B28] flex items-center gap-2">
                <Building2 size={18} className="text-[#0D5C56]" />
                <span>Property & Stay Itinerary</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1A2B28] mb-1.5">
                    Select Property / Homestay <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                    className="select text-sm"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.city}, {p.property_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1A2B28] mb-1.5">
                      Check-in Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1A2B28] mb-1.5">
                      Check-out Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                </div>

                {!datesValid && checkIn && checkOut && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>Check-out date must be strictly after the check-in date.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1A2B28] mb-1.5">
                      Room Type
                    </label>
                    <input
                      type="text"
                      value={roomType}
                      onChange={(e) => setRoomType(e.target.value)}
                      className="input text-sm"
                      placeholder="e.g. Deluxe Suite"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1A2B28] mb-1.5">
                      Number of Rooms
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={rooms}
                      onChange={(e) => setRooms(Math.max(1, Number(e.target.value)))}
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1A2B28] mb-1.5">
                      Guests Count
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={guestsCount}
                      onChange={(e) => setGuestsCount(Math.max(1, Number(e.target.value)))}
                      className="input text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#EAE5DC]">
                <button
                  type="button"
                  disabled={!canProceedStep1}
                  onClick={() => setStep(2)}
                  className="btn btn-primary text-xs font-semibold flex items-center gap-2"
                >
                  <span>Continue to Guest Details</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Guest Details */}
          {step === 2 && (
            <div className="card p-6 bg-white border-[#D8D2C5] space-y-5 animate-fade-in">
              <h2 className="text-lg font-bold text-[#1A2B28] flex items-center gap-2">
                <User size={18} className="text-[#0D5C56]" />
                <span>Guest Identification</span>
              </h2>

              {/* Guest selection toggle */}
              <div className="flex p-1 rounded-xl bg-[#FAF9F6] border border-[#EAE5DC] text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setIsNewGuest(false)}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    !isNewGuest ? 'bg-white shadow-2xs text-[#0D5C56] font-bold' : 'text-[#5C6E6B]'
                  }`}
                >
                  Existing Registered Guest
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewGuest(true)}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    isNewGuest ? 'bg-white shadow-2xs text-[#0D5C56] font-bold' : 'text-[#5C6E6B]'
                  }`}
                >
                  + Add New Guest
                </button>
              </div>

              {!isNewGuest ? (
                <div>
                  <label className="block text-xs font-semibold text-[#1A2B28] mb-1.5">
                    Select Returning Guest <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={guestId}
                    onChange={(e) => setGuestId(e.target.value)}
                    className="select text-sm"
                  >
                    <option value="">-- Choose from guest register ({guests.length}) --</option>
                    {guests.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.phone}) {g.city ? `• ${g.city}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1A2B28] mb-1.5">
                      Guest Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="input text-sm"
                      placeholder="e.g. Rameshwar Rao"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#1A2B28] mb-1.5">
                        Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        className="input text-sm"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1A2B28] mb-1.5">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className="input text-sm"
                        placeholder="guest@domain.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-[#EAE5DC]">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn btn-outline text-xs"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!canProceedStep2}
                  onClick={() => setStep(3)}
                  className="btn btn-primary text-xs font-semibold flex items-center gap-2"
                >
                  <span>Continue to Charges</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Charges & Tariff */}
          {step === 3 && (
            <div className="card p-6 bg-white border-[#D8D2C5] space-y-5 animate-fade-in">
              <h2 className="text-lg font-bold text-[#1A2B28] flex items-center gap-2">
                <Receipt size={18} className="text-[#0D5C56]" />
                <span>Accommodation Tariff & Tax Breakdown</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold text-[#1A2B28]">
                      Total Stay Base Tariff (₹) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-[#5C6E6B]">
                      {nights} night{nights > 1 ? 's' : ''} • {rooms} room{rooms > 1 ? 's' : ''}
                    </span>
                  </div>
                  <input
                    type="number"
                    required
                    min={1}
                    value={baseAmount}
                    onChange={(e) => setBaseAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="input text-base font-bold text-[#1A2B28]"
                  />
                  <p className="text-[11px] text-[#5C6E6B] mt-1">
                    Enter the total base tariff for the entire stay (not multiplied by nights).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1A2B28] mb-1.5">
                      Special Discount (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={numBase}
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="input text-sm"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-[#1A2B28]">
                        Tax Rate (%)
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-xs text-[#5C6E6B] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={taxEnabled}
                          onChange={(e) => setTaxEnabled(e.target.checked)}
                          className="rounded text-[#0D5C56]"
                        />
                        <span>Enable Tax</span>
                      </label>
                    </div>
                    <select
                      disabled={!taxEnabled}
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      className="select text-sm disabled:opacity-50"
                    >
                      <option value={5}>5% (Budget tariff)</option>
                      <option value={12}>12% (Standard hotel tariff)</option>
                      <option value={18}>18% (Luxury suite tariff)</option>
                      <option value={0}>0% (Tax exempt)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-[#EAE5DC]">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn btn-outline text-xs"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!canProceedStep3}
                  onClick={() => setStep(4)}
                  className="btn btn-primary text-xs font-semibold flex items-center gap-2"
                >
                  <span>Continue to Payment</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Initial Payment Collection */}
          {step === 4 && (
            <div className="card p-6 bg-white border-[#D8D2C5] space-y-5 animate-fade-in">
              <h2 className="text-lg font-bold text-[#1A2B28] flex items-center gap-2">
                <CreditCard size={18} className="text-[#0D5C56]" />
                <span>Payment Collection at Booking</span>
              </h2>

              {/* Payment Type Selection */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'Advance', label: 'Advance Deposit' },
                  { id: 'Full payment', label: 'Full Settlement' },
                  { id: 'No payment', label: 'Pay at Check-in' }
                ].map((pt) => (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => setPaymentType(pt.id as any)}
                    className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                      paymentType === pt.id
                        ? 'bg-[#E8F3F1] border-[#0D5C56] text-[#0D5C56]'
                        : 'bg-white border-[#D8D2C5] text-[#5C6E6B] hover:border-stone-400'
                    }`}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>

              {paymentType !== 'No payment' && (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#1A2B28] mb-1.5">
                      Amount Collected Now (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={totalBookingAmount}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="input text-base font-bold text-[#276749]"
                    />
                    <div className="flex justify-between text-[11px] text-[#5C6E6B] mt-1">
                      <span>Maximum payable: {fmtINR(totalBookingAmount)}</span>
                      <span>Remaining at check-in: {fmtINR(initialDue)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#1A2B28] mb-1.5">
                        Payment Method
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="select text-sm"
                      >
                        <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                        <option value="Card">Credit / Debit Card</option>
                        <option value="Cash">Cash at Front Desk</option>
                        <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                        <option value="Online Gateway">Online Gateway</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1A2B28] mb-1.5">
                        Transaction Ref / UTR (Optional)
                      </label>
                      <input
                        type="text"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        placeholder="e.g. UTR-89410294"
                        className="input text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-[#EAE5DC]">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="btn btn-outline text-xs"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={loading || !canProceedStep4}
                  onClick={handleCreateBooking}
                  className="btn btn-primary text-xs px-6 py-2.5 font-semibold flex items-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  <span>{loading ? 'Confirming Stay...' : 'Confirm Stay Booking'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Summary Sidebar */}
        <div>
          <div className="card p-5 bg-white border-[#D8D2C5] sticky top-6 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5C6E6B]">Stay Summary</span>

            <div className="space-y-3 text-xs">
              <div className="pb-3 border-b border-[#EAE5DC]">
                <h4 className="font-bold text-sm text-[#1A2B28]">
                  {selectedProperty?.name || 'Select a property'}
                </h4>
                <p className="text-[11px] text-[#5C6E6B]">
                  {selectedProperty ? `${selectedProperty.location}, ${selectedProperty.city}` : '—'}
                </p>
              </div>

              <div className="space-y-1.5 pb-3 border-b border-[#EAE5DC]">
                <div className="flex justify-between">
                  <span className="text-[#5C6E6B]">Check-in:</span>
                  <span className="font-medium text-[#1A2B28]">{fmtDate(checkIn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5C6E6B]">Check-out:</span>
                  <span className="font-medium text-[#1A2B28]">{fmtDate(checkOut)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5C6E6B]">Stay Duration:</span>
                  <span className="font-medium text-[#1A2B28]">
                    {nights} Night{nights > 1 ? 's' : ''} • {rooms} Room{rooms > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5C6E6B]">Guests:</span>
                  <span className="font-medium text-[#1A2B28]">{guestsCount} Guest(s)</span>
                </div>
              </div>

              {/* Tariff calculation */}
              <div className="space-y-1.5 pb-3 border-b border-[#EAE5DC]">
                <div className="flex justify-between text-[#5C6E6B]">
                  <span>Base Tariff:</span>
                  <span className="font-medium text-[#1A2B28]">{fmtINR(numBase)}</span>
                </div>
                {numDiscount > 0 && (
                  <div className="flex justify-between text-[#276749]">
                    <span>Discount:</span>
                    <span className="font-medium">-{fmtINR(numDiscount)}</span>
                  </div>
                )}
                {taxEnabled && (
                  <div className="flex justify-between text-[#5C6E6B]">
                    <span>Tax ({taxRate}%):</span>
                    <span className="font-medium text-[#1A2B28]">{fmtINR(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#0D5C56] font-bold text-sm pt-1 border-t border-[#EAE5DC]">
                  <span>Total Tariff:</span>
                  <span>{fmtINR(totalBookingAmount)}</span>
                </div>
              </div>

              {/* Settlement summary */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[#276749]">
                  <span className="font-semibold">Advance / Paid Now:</span>
                  <span className="font-bold">{fmtINR(numPayment)}</span>
                </div>
                <div className="flex justify-between text-[#5C6E6B]">
                  <span>Balance Due:</span>
                  <span className={`font-bold ${initialDue > 0 ? 'text-[#C45532]' : 'text-[#276749]'}`}>
                    {initialDue > 0 ? fmtINR(initialDue) : 'Paid in Full'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
