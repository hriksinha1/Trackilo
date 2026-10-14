import { CalendarDayCell } from '../types';
import { getTodayDateStr, formatLocalDate } from '../../../lib/utils/dates';

export function getMonthDays(currentDate: Date): CalendarDayCell[] {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: CalendarDayCell[] = [];
  const todayStr = getTodayDateStr();

  // Previous month padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevDate = new Date(year, month - 1, dayNum);
    const dateStr = formatLocalDate(prevDate);
    const dayOfWeek = prevDate.getDay();
    days.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const curDate = new Date(year, month, i);
    const dateStr = formatLocalDate(curDate);
    const dayOfWeek = curDate.getDay();
    days.push({
      dateStr,
      dayNumber: i,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6
    });
  }

  // Next month padding to complete 35 or 42 grid cells
  const totalNeeded = days.length <= 35 ? 35 : 42;
  const remaining = totalNeeded - days.length;
  for (let i = 1; i <= remaining; i++) {
    const nextDate = new Date(year, month + 1, i);
    const dateStr = formatLocalDate(nextDate);
    const dayOfWeek = nextDate.getDay();
    days.push({
      dateStr,
      dayNumber: i,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6
    });
  }

  return days;
}

export function getWeekDays(currentDate: Date): Array<{
  dateStr: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
}> {
  const startOfWeek = new Date(currentDate);
  const day = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - day);

  const todayStr = getTodayDateStr();
  const days = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    const dateStr = formatLocalDate(d);
    days.push({
      dateStr,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: d.getDate(),
      isToday: dateStr === todayStr
    });
  }

  return days;
}
