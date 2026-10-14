import React, { useState } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import {
  AlertCircle,
  RefreshCw,
  TrendingUp,
  CreditCard,
  Building2,
  Calendar,
  ArrowRight,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Users
} from 'lucide-react';
import { AppContextType } from '../../components/layout/AppShell';
import { useOverviewData } from './hooks/useOverviewData';
import OverviewHeader from './components/OverviewHeader';
import TodaySection from './components/TodaySection';
import InHouseSection from './components/InHouseSection';
import AddPaymentModal from '../bookings/AddPaymentModal';
import { Booking } from '../../lib/repository/types';
import { repository } from '../../lib/repository';
import { fmtINR } from '../../lib/utils/formatters';
import { useToast } from '../../context/ToastContext';

export default function OverviewPage() {
  const { propertyFilter, setPropertyFilter } = useOutletContext<AppContextType>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    loading,
    error,
    refresh,
    paymentsByBookingId,
    todayMetrics,
    properties
  } = useOverviewData(propertyFilter);

  // Payment recording modal state
  const [paymentModalData, setPaymentModalData] = useState<{
    booking: Booking;
    balanceDue: number;
  } | null>(null);

  // Quick check-in handler
  const handleCheckIn = async (booking: Booking, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await repository.updateBooking(booking.id, { booking_status: 'Checked In' });
      toast.success('Guest Checked In', `${booking.customer?.name || 'Guest'} checked in.`);
      refresh();
    } catch {
      toast.error('Check-in Failed', 'Could not update booking status.');
    }
  };

  // Quick check-out handler
  const handleCheckOut = async (booking: Booking, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await repository.updateBooking(booking.id, { booking_status: 'Checked Out' });
      toast.success('Guest Checked Out', `${booking.customer?.name || 'Guest'} checked out.`);
      refresh();
    } catch {
      toast.error('Check-out Failed', 'Could not update booking status.');
    }
  };

  // Record payment triggers
  const handleRecordPayment = (booking: Booking, dueAmount: number) => {
    setPaymentModalData({
      booking,
      balanceDue: dueAmount
    });
  };

  const selectedProperty = properties.find((p) => p.id === propertyFilter);

  if (loading) {
    return (
      <div className="space-y-7 max-w-7xl xl:max-w-[1320px] mx-auto pb-12 animate-pulse">
        <div className="flex justify-between items-baseline pb-2 border-b border-[#EAE5DC]">
          <div className="space-y-2">
            <div className="h-8 w-36 bg-stone-200 rounded-lg" />
            <div className="h-4 w-64 bg-stone-200/70 rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-[#D8D2C5]" />
          ))}
        </div>
        <div className="h-64 rounded-xl border border-[#D8D2C5] bg-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-20 p-6 rounded-xl border border-[#D8D2C5] bg-white text-center space-y-3 shadow-2xs">
        <AlertCircle size={28} className="mx-auto text-[#C45532]" />
        <p className="text-sm font-semibold text-[#1A2B28]">Couldn't load today's operations.</p>
        <button
          type="button"
          onClick={refresh}
          className="px-4 py-2 rounded-lg bg-[#0D5C56] text-white text-xs font-medium hover:bg-[#094440] transition-colors inline-flex items-center gap-1.5 shadow-2xs"
        >
          <RefreshCw size={14} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-7 max-w-7xl xl:max-w-[1320px] mx-auto pb-12">
      {/* 1. HEADER */}
      <OverviewHeader onNewBooking={() => navigate('/bookings/new')} />

      {/* Scope Indicator Banner */}
      <div className="p-3.5 sm:p-4 rounded-xl border border-[#D8D2C5] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#E8F3F1] text-[#0D5C56] flex items-center justify-center shrink-0">
            {propertyFilter ? <Building2 size={16} /> : <Layers size={16} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#1A2B28]">
                {propertyFilter ? selectedProperty?.name : 'Portfolio-Wide Overview'}
              </span>
              <span className="badge bg-[#E8F3F1] text-[#0D5C56] text-[10px] font-bold">
                {propertyFilter ? 'Single Property' : `All ${properties.length} Properties`}
              </span>
            </div>
            <p className="text-[11px] text-[#5C6E6B] mt-0.5">
              {propertyFilter
                ? `Showing stays, arrivals, and financial dues for ${selectedProperty?.location}, ${selectedProperty?.city}.`
                : 'Consolidated view of operations, arrivals, departures, and revenue across all boutique stays.'}
            </p>
          </div>
        </div>

        {propertyFilter && (
          <button
            onClick={() => setPropertyFilter('')}
            className="btn btn-outline text-xs self-start sm:self-auto py-1.5 px-3"
          >
            Switch to Portfolio View
          </button>
        )}
      </div>

      {/* 2. OPERATIONAL & FINANCIAL KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Cash Collected Today */}
        <div className="card p-4 sm:p-5 bg-white border-[#D8D2C5]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6B]">
              Collected Today
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#EBF6EF] text-[#276749] flex items-center justify-center">
              <CreditCard size={14} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#276749] mt-2 tracking-tight">
            {fmtINR(todayMetrics.collectedToday)}
          </div>
          <div className="text-[11px] text-[#5C6E6B] mt-1">
            Cash & verified settlements today
          </div>
        </div>

        {/* Card 2: Total Outstanding Due */}
        <div className="card p-4 sm:p-5 bg-white border-[#D8D2C5]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6B]">
              Outstanding Due
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF0EB] text-[#C45532] flex items-center justify-center">
              <AlertTriangle size={14} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#C45532] mt-2 tracking-tight">
            {fmtINR(todayMetrics.totalOutstandingDue)}
          </div>
          <div className="text-[11px] text-[#5C6E6B] mt-1">
            Across active stay reservations
          </div>
        </div>

        {/* Card 3: Net Cash vs Booked Value */}
        <div className="card p-4 sm:p-5 bg-white border-[#D8D2C5]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6B]">
              Net Collected
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#E8F3F1] text-[#0D5C56] flex items-center justify-center">
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#1A2B28] mt-2 tracking-tight">
            {fmtINR(todayMetrics.netCollected)}
          </div>
          <div className="text-[11px] text-[#5C6E6B] mt-1">
            of {fmtINR(todayMetrics.totalBookedValue)} total booked tariff
          </div>
        </div>

        {/* Card 4: Today's Movements */}
        <div className="card p-4 sm:p-5 bg-white border-[#D8D2C5]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6B]">
              Daily Timeline
            </span>
            <div className="w-7 h-7 rounded-lg bg-stone-100 text-[#1A2B28] flex items-center justify-center">
              <Clock size={14} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#1A2B28] mt-2 tracking-tight">
            {todayMetrics.arrivalsCount} / {todayMetrics.departuresCount}
          </div>
          <div className="text-[11px] text-[#5C6E6B] mt-1">
            {todayMetrics.inHouseCount} guests currently in-house
          </div>
        </div>
      </div>

      {/* 3. PORTFOLIO COMPARISON (Shown in Portfolio View) */}
      {!propertyFilter && todayMetrics.propertyComparisons.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#1A2B28]">
              Portfolio Property Comparison
            </h2>
            <Link
              to="/properties"
              className="text-xs font-semibold text-[#0D5C56] hover:underline flex items-center gap-1"
            >
              <span>Manage Properties</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {todayMetrics.propertyComparisons.map((item) => (
              <div
                key={item.property.id}
                onClick={() => setPropertyFilter(item.property.id)}
                className="p-4 rounded-xl border border-[#D8D2C5] bg-white hover:border-[#0D5C56] transition-all cursor-pointer group shadow-2xs"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-[#5C6E6B] tracking-wider">
                      {item.property.property_type}
                    </span>
                    <h3 className="font-bold text-sm text-[#1A2B28] group-hover:text-[#0D5C56] transition-colors truncate">
                      {item.property.name}
                    </h3>
                    <p className="text-[11px] text-[#5C6E6B] truncate">
                      {item.property.city}, {item.property.state}
                    </p>
                  </div>
                  <ArrowUpRight size={15} className="text-stone-400 group-hover:text-[#0D5C56] transition-colors shrink-0" />
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 px-2.5 rounded-lg bg-[#FAF9F6] border border-[#EAE5DC] text-center text-xs mt-3">
                  <div>
                    <div className="text-[10px] text-[#5C6E6B]">In-House</div>
                    <div className="font-bold text-[#1A2B28]">{item.activeStaysCount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#5C6E6B]">Collected</div>
                    <div className="font-bold text-[#276749]">₹{(item.collectedAmount / 1000).toFixed(0)}k</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#5C6E6B]">Balance Due</div>
                    <div className={`font-bold ${item.outstandingDue > 0 ? 'text-[#C45532]' : 'text-[#276749]'}`}>
                      ₹{(item.outstandingDue / 1000).toFixed(0)}k
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. TODAY (Primary Operational Workspace: Arrivals & Departures) */}
      <TodaySection
        metrics={todayMetrics}
        paymentsByBookingId={paymentsByBookingId}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
        onRecordPayment={handleRecordPayment}
      />

      {/* 5. CURRENTLY IN-HOUSE (Reference Stays) */}
      <InHouseSection
        inHouse={todayMetrics.inHouse}
        paymentsByBookingId={paymentsByBookingId}
      />

      {/* Add Payment Modal (kept persistent on success!) */}
      {paymentModalData && (
        <AddPaymentModal
          booking={paymentModalData.booking}
          balanceDue={paymentModalData.balanceDue}
          onClose={() => {
            setPaymentModalData(null);
            refresh();
          }}
          onSuccess={() => {
            // Background refresh without destroying the modal!
            refresh();
          }}
        />
      )}
    </div>
  );
}
