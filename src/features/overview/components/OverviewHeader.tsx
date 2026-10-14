import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';

interface OverviewHeaderProps {
  onNewBooking?: () => void;
}

export default function OverviewHeader({ onNewBooking }: OverviewHeaderProps) {
  const navigate = useNavigate();

  // Dynamic calm date formatting: "Thursday, September 10"
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  return (
    <header className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-2 border-b border-[#EAE5DC]">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-bold text-[#1A2B28] tracking-tight">
          Overview
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-semibold text-[#1A2B28]">{formattedDate}</span>
          <span className="text-stone-300">·</span>
          <span className="text-xs text-[#5C6E6B]">Today's stays and front-desk activity.</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 self-start sm:self-auto">
        <Link
          to="/calendar"
          className="px-3.5 py-1.5 rounded-lg border border-[#D8D2C5] text-xs font-medium text-[#1A2B28] bg-white hover:bg-[#FAF9F6] transition-colors inline-flex items-center gap-1.5 shadow-2xs"
        >
          <CalendarIcon size={14} className="text-[#0D5C56]" />
          <span>Calendar</span>
        </Link>

        <button
          type="button"
          onClick={onNewBooking || (() => navigate('/bookings/new'))}
          className="px-3.5 py-1.5 rounded-lg bg-[#0D5C56] text-white text-xs font-medium hover:bg-[#094440] transition-colors inline-flex items-center gap-1.5 shadow-2xs"
        >
          <Plus size={14} />
          <span>New booking</span>
        </button>
      </div>
    </header>
  );
}
