import React, { useState, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { AppContextType } from '../../components/layout/AppShell';
import { useCalendarData } from './hooks/useCalendarData';
import { getMonthDays, getWeekDays } from './utils/calendarCalculations';
import { CalendarViewMode, CalendarStayFilter } from './types';
import CalendarToolbar from './components/CalendarToolbar';
import MonthCalendar from './components/MonthCalendar';
import WeekCalendar from './components/WeekCalendar';
import DayAgenda from './components/DayAgenda';
import BookingPreviewModal from './components/BookingPreviewModal';
import SelectedDayDrawer from './components/SelectedDayDrawer';
import AddPaymentModal from '../bookings/AddPaymentModal';
import { Booking } from '../../lib/repository/types';
import { repository } from '../../lib/repository';
import { useToast } from '../../context/ToastContext';

export default function CalendarPage() {
  const { propertyFilter } = useOutletContext<AppContextType>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [stayFilter, setStayFilter] = useState<CalendarStayFilter>('all');

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  const [paymentModalData, setPaymentModalData] = useState<{
    booking: Booking;
    balanceDue: number;
  } | null>(null);

  const {
    loading,
    error,
    refresh,
    paymentsByBookingId,
    getBookingsForDate
  } = useCalendarData(propertyFilter, stayFilter);

  // Month grid cells
  const monthDays = useMemo(() => getMonthDays(currentDate), [currentDate]);

  // Week days
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  // Navigation handlers
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === 'month') {
        next.setMonth(next.getMonth() - 1);
      } else if (viewMode === 'week') {
        next.setDate(next.getDate() - 7);
      } else {
        next.setDate(next.getDate() - 1);
      }
      return next;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === 'month') {
        next.setMonth(next.getMonth() + 1);
      } else if (viewMode === 'week') {
        next.setDate(next.getDate() + 7);
      } else {
        next.setDate(next.getDate() + 1);
      }
      return next;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Status updates
  const handleCheckIn = async (booking: Booking) => {
    try {
      await repository.updateBooking(booking.id, { booking_status: 'Checked In' });
      toast.success('Check-in Complete', `${booking.customer?.name || 'Guest'} marked as checked in.`);
      refresh();
      setSelectedBooking(null);
    } catch {
      toast.error('Error', 'Could not complete check-in.');
    }
  };

  const handleCheckOut = async (booking: Booking) => {
    try {
      await repository.updateBooking(booking.id, { booking_status: 'Checked Out' });
      toast.success('Check-out Complete', `${booking.customer?.name || 'Guest'} marked as checked out.`);
      refresh();
      setSelectedBooking(null);
    } catch {
      toast.error('Error', 'Could not complete check-out.');
    }
  };

  // Stays for selected day drawer
  const selectedDayStays = useMemo(() => {
    if (!selectedDateStr) return [];
    return getBookingsForDate(selectedDateStr);
  }, [selectedDateStr, getBookingsForDate]);

  const selectedBookingPayments = useMemo(() => {
    if (!selectedBooking) return [];
    return paymentsByBookingId.get(selectedBooking.id) || [];
  }, [selectedBooking, paymentsByBookingId]);

  if (loading && !monthDays.length) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-10 w-48 bg-stone-200 rounded-xl" />
        <div className="h-16 bg-white rounded-2xl border border-[#D8D2C5]" />
        <div className="h-[480px] bg-white rounded-2xl border border-[#D8D2C5]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 rounded-xl border border-[#D8D2C5] bg-white text-center space-y-3">
        <AlertCircle size={28} className="mx-auto text-[#C45532]" />
        <p className="text-sm font-semibold text-[#1A2B28]">{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="px-4 py-2 rounded-lg bg-[#0D5C56] text-white text-xs font-medium hover:bg-[#094440] inline-flex items-center gap-1.5"
        >
          <RefreshCw size={14} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Calendar Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A2B28] tracking-tight">
            Calendar
          </h1>
          <p className="text-sm text-[#5C6E6B] mt-1">
            Visual occupancy and room schedule across properties.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/bookings/new')}
          className="px-3.5 py-2 rounded-lg bg-[#0D5C56] text-white text-xs font-medium hover:bg-[#094440] transition-colors flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>New booking</span>
        </button>
      </header>

      {/* Toolbar: Navigation + View Switcher + Integrated Filter */}
      <CalendarToolbar
        currentDate={currentDate}
        viewMode={viewMode}
        stayFilter={stayFilter}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onViewModeChange={setViewMode}
        onStayFilterChange={setStayFilter}
      />

      {/* Active Calendar View */}
      {viewMode === 'month' && (
        <MonthCalendar
          days={monthDays}
          selectedDateStr={selectedDateStr}
          selectedBookingId={selectedBooking?.id || null}
          paymentsByBookingId={paymentsByBookingId}
          getBookingsForDate={getBookingsForDate}
          onSelectDate={(d) => setSelectedDateStr(d)}
          onSelectBooking={(b, e) => {
            e.stopPropagation();
            setSelectedBooking(b);
          }}
        />
      )}

      {viewMode === 'week' && (
        <WeekCalendar
          weekDays={weekDays}
          paymentsByBookingId={paymentsByBookingId}
          getBookingsForDate={getBookingsForDate}
          onSelectBooking={(b) => setSelectedBooking(b)}
          onSelectDate={(d) => {
            setSelectedDateStr(d);
          }}
        />
      )}

      {viewMode === 'day' && (
        <DayAgenda
          currentDate={currentDate}
          stays={getBookingsForDate(currentDate.toISOString().split('T')[0])}
          paymentsByBookingId={paymentsByBookingId}
          onSelectBooking={(b) => setSelectedBooking(b)}
          onRecordPayment={(b, due) => setPaymentModalData({ booking: b, balanceDue: due })}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
        />
      )}

      {/* Selected Day Drawer */}
      <SelectedDayDrawer
        dateStr={selectedDateStr}
        stays={selectedDayStays}
        paymentsByBookingId={paymentsByBookingId}
        onClose={() => setSelectedDateStr(null)}
        onSelectBooking={(b) => {
          setSelectedBooking(b);
        }}
      />

      {/* Booking Preview Modal */}
      <BookingPreviewModal
        booking={selectedBooking}
        payments={selectedBookingPayments}
        onClose={() => setSelectedBooking(null)}
        onRecordPayment={(b, due) => {
          setSelectedBooking(null);
          setPaymentModalData({ booking: b, balanceDue: due });
        }}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
      />

      {/* Add Payment Modal */}
      {paymentModalData && (
        <AddPaymentModal
          booking={paymentModalData.booking}
          balanceDue={paymentModalData.balanceDue}
          onClose={() => {
            setPaymentModalData(null);
            refresh();
          }}
          onSuccess={() => {
            refresh();
          }}
        />
      )}
    </div>
  );
}
