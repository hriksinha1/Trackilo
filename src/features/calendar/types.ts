import { Booking, Payment, Property } from '../../lib/repository/types';

export type CalendarViewMode = 'month' | 'week' | 'day';

export type CalendarStayFilter = 'all' | 'arrivals' | 'departures' | 'in_house' | 'payment_due';

export interface CalendarDayCell {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

export interface DaySummaryData {
  dateStr: string;
  totalStays: number;
  arrivals: Booking[];
  departures: Booking[];
  inHouse: Booking[];
}
