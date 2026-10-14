import React from 'react';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { CalendarViewMode, CalendarStayFilter } from '../types';

interface CalendarToolbarProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  stayFilter: CalendarStayFilter;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onStayFilterChange: (filter: CalendarStayFilter) => void;
}

export default function CalendarToolbar({
  currentDate,
  viewMode,
  stayFilter,
  onPrev,
  onNext,
  onToday,
  onViewModeChange,
  onStayFilterChange
}: CalendarToolbarProps) {
  const formattedTitle = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    ...(viewMode === 'day' ? { day: 'numeric', weekday: 'short' } : {})
  });

  const filterOptions: Array<{ id: CalendarStayFilter; label: string }> = [
    { id: 'all', label: 'All stays' },
    { id: 'arrivals', label: 'Arrivals' },
    { id: 'departures', label: 'Departures' },
    { id: 'in_house', label: 'In-house' },
    { id: 'payment_due', label: 'Payment due' }
  ];

  return (
    <div className="rounded-2xl border border-[#D8D2C5] bg-white p-3.5 sm:p-4 shadow-2xs space-y-3">
      {/* Top Row: Navigation + Date Title + View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Navigation & Title */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-[#D8D2C5] bg-[#FAF9F6] p-0.5">
            <button
              type="button"
              onClick={onPrev}
              className="p-1.5 rounded-lg text-[#1A2B28] hover:bg-white transition-colors"
              title="Previous"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={onToday}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg text-[#1A2B28] hover:bg-white transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={onNext}
              className="p-1.5 rounded-lg text-[#1A2B28] hover:bg-white transition-colors"
              title="Next"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <h2 className="text-base sm:text-lg font-semibold text-[#1A2B28] ml-2 tracking-tight">
            {formattedTitle}
          </h2>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center p-0.5 rounded-xl border border-[#D8D2C5] bg-[#FAF9F6] text-xs font-medium self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onViewModeChange('month')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              viewMode === 'month'
                ? 'bg-white text-[#0D5C56] font-semibold shadow-2xs'
                : 'text-[#5C6E6B] hover:text-[#1A2B28]'
            }`}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('week')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              viewMode === 'week'
                ? 'bg-white text-[#0D5C56] font-semibold shadow-2xs'
                : 'text-[#5C6E6B] hover:text-[#1A2B28]'
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('day')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              viewMode === 'day'
                ? 'bg-white text-[#0D5C56] font-semibold shadow-2xs'
                : 'text-[#5C6E6B] hover:text-[#1A2B28]'
            }`}
          >
            Day
          </button>
        </div>
      </div>

      {/* Integrated Filter Bar */}
      <div className="pt-2.5 border-t border-[#EAE5DC] flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-[#5C6E6B] text-[11px] font-medium mr-1 flex items-center gap-1 shrink-0">
          <Filter size={12} /> Filter:
        </span>
        {filterOptions.map((opt) => {
          const isActive = stayFilter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onStayFilterChange(opt.id)}
              className={`px-2.5 py-1 rounded-lg transition-all shrink-0 font-medium ${
                isActive
                  ? 'bg-[#0D5C56] text-white shadow-2xs'
                  : 'bg-[#FAF9F6] text-[#5C6E6B] hover:text-[#1A2B28] hover:bg-[#F2EFEA] border border-[#EAE5DC]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
