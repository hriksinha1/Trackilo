import React, { useEffect, useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { repository } from '../../lib/repository';
import { fmtINR, fmtDate } from '../../lib/utils/formatters';
import { calculateBookingFinancials } from '../../lib/utils/financials';
import { parseLocalDate, formatLocalDate, getTodayDateStr } from '../../lib/utils/dates';
import { AppContextType } from '../../components/layout/AppShell';
import {
  TrendingUp,
  CreditCard,
  Building2,
  Calendar,
  Download,
  AlertCircle,
  PieChart as PieIcon,
  BarChart3,
  CheckCircle2,
  Filter
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Booking, Payment, Property } from '../../lib/repository/types';
import { useToast } from '../../context/ToastContext';

type DateRangeOption = 'all' | 'this_month' | 'last_30' | 'last_90';

export default function ReportsList() {
  const { propertyFilter } = useOutletContext<AppContextType>();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangeOption>('all');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [bList, pList, propList] = await Promise.all([
          repository.getBookings(propertyFilter || undefined),
          repository.getAllPayments(propertyFilter || undefined),
          repository.getProperties()
        ]);
        setBookings(bList);
        setPayments(pList);
        setProperties(propList);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load reports');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [propertyFilter, toast]);

  // Date range filtering
  const filteredData = useMemo(() => {
    const today = parseLocalDate(getTodayDateStr());

    let startDate: Date | null = null;
    if (dateRange === 'this_month') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (dateRange === 'last_30') {
      startDate = new Date(today.getTime() - 30 * 86400000);
    } else if (dateRange === 'last_90') {
      startDate = new Date(today.getTime() - 90 * 86400000);
    }

    if (!startDate) {
      return { bookings, payments };
    }

    const startStr = formatLocalDate(startDate);

    const fBookings = bookings.filter((b) => b.check_in >= startStr);
    const fPayments = payments.filter((p) => p.date >= startStr);

    return { bookings: fBookings, payments: fPayments };
  }, [bookings, payments, dateRange]);

  // Aggregate high-level operational financials
  const totals = useMemo(() => {
    let grossBookedValue = 0;
    let totalCollected = 0;
    let totalRefunded = 0;
    let totalDue = 0;
    let totalNights = 0;

    const paymentsByBooking = new Map<string, Payment[]>();
    payments.forEach((p) => {
      const list = paymentsByBooking.get(p.booking_id) || [];
      list.push(p);
      paymentsByBooking.set(p.booking_id, list);
    });

    filteredData.bookings.forEach((b) => {
      if (b.booking_status !== 'Cancelled') {
        const bPayments = paymentsByBooking.get(b.id) || [];
        const fin = calculateBookingFinancials(b, bPayments);
        grossBookedValue += fin.bookingTotal;
        totalDue += fin.amountDue;
        totalNights += b.nights || 1;
      }
    });

    filteredData.payments.forEach((p) => {
      if (p.status === 'Recorded' || p.status === 'Completed') {
        totalCollected += Number(p.amount) || 0;
      } else if (p.status === 'Refunded') {
        totalRefunded += Number(p.amount) || 0;
      }
    });

    const netCollected = Math.max(0, totalCollected - totalRefunded);

    return {
      grossBookedValue,
      totalCollected,
      totalRefunded,
      netCollected,
      totalDue,
      totalNights,
      bookingsCount: filteredData.bookings.filter((b) => b.booking_status !== 'Cancelled').length
    };
  }, [filteredData, payments]);

  // Monthly trend chart without month-end overflow bugs
  const monthlyTrend = useMemo(() => {
    const today = parseLocalDate(getTodayDateStr());
    const curYear = today.getFullYear();
    const curMonth = today.getMonth();

    const months: Array<{ monthKey: string; monthLabel: string; revenue: number; collected: number }> = [];

    // Last 6 calendar months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(curYear, curMonth - i, 1);
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const yStr = d.getFullYear();
      const monthKey = `${yStr}-${mStr}`;
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
      months.push({ monthKey, monthLabel, revenue: 0, collected: 0 });
    }

    // Tally bookings by check-in month (Booked Tariff)
    bookings.forEach((b) => {
      if (b.booking_status !== 'Cancelled' && b.check_in) {
        const key = b.check_in.substring(0, 7);
        const match = months.find((m) => m.monthKey === key);
        if (match) {
          match.revenue += Number(b.grand_total) || 0;
        }
      }
    });

    // Tally payments by payment date (Cash in)
    payments.forEach((p) => {
      if (p.date) {
        const key = p.date.substring(0, 7);
        const match = months.find((m) => m.monthKey === key);
        if (match) {
          if (p.status === 'Recorded' || p.status === 'Completed') {
            match.collected += Number(p.amount) || 0;
          } else if (p.status === 'Refunded') {
            match.collected -= Number(p.amount) || 0;
          }
        }
      }
    });

    return months.map((m) => ({
      month: m.monthLabel,
      revenue: Math.max(0, m.revenue),
      collected: Math.max(0, m.collected)
    }));
  }, [bookings, payments]);

  // Payment methods breakdown
  const methodBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.payments.forEach((p) => {
      if (p.status === 'Recorded' || p.status === 'Completed') {
        const m = p.method || 'Other';
        counts[m] = (counts[m] || 0) + Number(p.amount);
      }
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Property breakdown
  const propertyBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    const propMap = properties.reduce((acc: any, p) => ({ ...acc, [p.id]: p.name }), {});

    filteredData.bookings.forEach((b) => {
      if (b.booking_status !== 'Cancelled') {
        const pName = propMap[b.property_id] || 'Unknown';
        counts[pName] = (counts[pName] || 0) + Number(b.grand_total);
      }
    });

    return Object.entries(counts).map(([name, revenue]) => ({ name, revenue }));
  }, [filteredData, properties]);

  // Export CSV with UTF-8 BOM, escaped quotes, and derived financial status
  function handleExportCSV() {
    const propMap = properties.reduce((acc: any, p) => ({ ...acc, [p.id]: p.name }), {});

    const paymentsByBooking = new Map<string, Payment[]>();
    payments.forEach((p) => {
      const list = paymentsByBooking.get(p.booking_id) || [];
      list.push(p);
      paymentsByBooking.set(p.booking_id, list);
    });

    const headers = [
      'Booking Ref',
      'Guest Name',
      'Phone',
      'Property',
      'Room Type',
      'Check In',
      'Check Out',
      'Nights',
      'Base Tariff',
      'Discount',
      'GST / Tax',
      'Grand Total',
      'Net Settled',
      'Outstanding Due',
      'Payment Status',
      'Stay Status'
    ]
      .map((h) => `"${h}"`)
      .join(',');

    const rows = filteredData.bookings.map((b) => {
      const pName = propMap[b.property_id] || '';
      const bPayments = paymentsByBooking.get(b.id) || [];
      const fin = calculateBookingFinancials(b, bPayments);

      const escape = (val: any) =>
        `"${String(val ?? '').replace(/"/g, '""')}"`;

      return [
        escape(b.booking_no),
        escape(b.customer?.name || 'Guest'),
        escape(b.customer?.phone || ''),
        escape(pName),
        escape(b.room_type),
        escape(b.check_in),
        escape(b.check_out),
        b.nights || 1,
        b.base_amount || 0,
        b.discount || 0,
        b.tax_amount || 0,
        fin.bookingTotal,
        fin.netPaid,
        fin.amountDue,
        escape(fin.paymentStatus),
        escape(b.booking_status)
      ].join(',');
    });

    // \uFEFF ensures UTF-8 BOM for Microsoft Excel / Sheets
    const csvContent = '\uFEFF' + headers + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bookzee_Operations_Ledger_${getTodayDateStr()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Report Exported', 'Complete operational ledger downloaded with UTF-8 encoding.');
  }

  const PALETTE = ['#0D5C56', '#C45532', '#276749', '#D97706', '#164E63', '#7C3AED'];

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 max-w-7xl mx-auto">
        <div className="h-10 w-64 bg-stone-200 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 bg-white rounded-2xl border border-[#D8D2C5]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A2B28] tracking-tight">
            Financial & Operational Reports
          </h1>
          <p className="text-sm text-[#5C6E6B] mt-0.5">
            Booked tariff value, actual cash collections, and settlement metrics across properties.
          </p>
        </div>

        {/* Date Filter & Export */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center p-1 rounded-xl bg-white border border-[#D8D2C5] text-xs font-semibold">
            <button
              onClick={() => setDateRange('all')}
              className={`py-1.5 px-3 rounded-lg transition-all ${
                dateRange === 'all'
                  ? 'bg-[#E8F3F1] text-[#0D5C56]'
                  : 'text-[#5C6E6B] hover:text-[#1A2B28]'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateRange('this_month')}
              className={`py-1.5 px-3 rounded-lg transition-all ${
                dateRange === 'this_month'
                  ? 'bg-[#E8F3F1] text-[#0D5C56]'
                  : 'text-[#5C6E6B] hover:text-[#1A2B28]'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateRange('last_30')}
              className={`py-1.5 px-3 rounded-lg transition-all ${
                dateRange === 'last_30'
                  ? 'bg-[#E8F3F1] text-[#0D5C56]'
                  : 'text-[#5C6E6B] hover:text-[#1A2B28]'
              }`}
            >
              Last 30 Days
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="btn btn-primary text-xs flex items-center gap-2 shadow-xs py-2"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Top 4 Performance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 bg-white border-[#D8D2C5]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6B]">
            Booked Tariff Value
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-[#1A2B28] mt-1 tracking-tight">
            {fmtINR(totals.grossBookedValue)}
          </div>
          <div className="text-xs text-[#5C6E6B] mt-1">
            Confirmed guest stays ({totals.bookingsCount} bookings)
          </div>
        </div>

        <div className="card p-5 bg-white border-[#D8D2C5]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6B]">
            Net Cash Collected
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-[#276749] mt-1 tracking-tight">
            {fmtINR(totals.netCollected)}
          </div>
          <div className="text-xs text-[#5C6E6B] mt-1">
            {totals.grossBookedValue > 0
              ? `${Math.round((totals.netCollected / totals.grossBookedValue) * 100)}% of booked tariff collected`
              : 'Zero active bookings'}
          </div>
        </div>

        <div className="card p-5 bg-white border-[#D8D2C5]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6B]">
            Outstanding Balance
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-[#C45532] mt-1 tracking-tight">
            {fmtINR(totals.totalDue)}
          </div>
          <div className="text-xs text-[#5C6E6B] mt-1">Pending front-desk collection</div>
        </div>

        <div className="card p-5 bg-white border-[#D8D2C5]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6B]">
            Room Nights Sold
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-[#0D5C56] mt-1 tracking-tight">
            {totals.totalNights}
          </div>
          <div className="text-xs text-[#5C6E6B] mt-1">
            Across {propertyFilter ? 'this property' : `${properties.length} properties`}
          </div>
        </div>
      </div>

      {/* Main Charts: 2 Cols Left (Trend) + 1 Col Right (Methods) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Financial Trend */}
        <div className="lg:col-span-2 card p-6 bg-white border-[#D8D2C5] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-[#1A2B28]">Monthly Cashflow & Tariff Trend</h3>
              <p className="text-xs text-[#5C6E6B]">
                Comparison between Booked Tariff (stay dates) and Cash Collected (payment dates)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-[#0D5C56] font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0D5C56]" />
                Booked Tariff
              </span>
              <span className="flex items-center gap-1.5 text-[#C45532] font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C45532]" />
                Cash Collected
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevRep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D5C56" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0D5C56" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorColRep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C45532" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#C45532" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE5DC" vertical={false} />
                <XAxis dataKey="month" stroke="#5C6E6B" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#5C6E6B"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [fmtINR(Number(value) || 0), name]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    borderColor: '#D8D2C5'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Booked Tariff"
                  stroke="#0D5C56"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevRep)"
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  name="Cash Collected"
                  stroke="#C45532"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorColRep)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Payment Methods Breakdown */}
        <div className="card p-6 bg-white border-[#D8D2C5] space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#1A2B28]">Payment Channels</h3>
            <p className="text-xs text-[#5C6E6B] mt-0.5">Distribution of collected funds</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={methodBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {methodBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [fmtINR(Number(value) || 0), 'Amount']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    borderColor: '#D8D2C5'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[#EAE5DC] text-xs">
            {methodBreakdown.map((m, idx) => (
              <div key={m.name} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#5C6E6B]">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                  />
                  {m.name}
                </span>
                <span className="font-semibold text-[#1A2B28]">{fmtINR(m.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Property Breakdown Chart */}
      <div className="card p-6 bg-white border-[#D8D2C5] space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#1A2B28]">Tariff Revenue by Property</h3>
          <p className="text-xs text-[#5C6E6B] mt-0.5">
            Contribution of each homestay / boutique hotel across the portfolio
          </p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={propertyBreakdown} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAE5DC" vertical={false} />
              <XAxis dataKey="name" stroke="#5C6E6B" fontSize={12} tickLine={false} />
              <YAxis
                stroke="#5C6E6B"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: any) => [fmtINR(Number(value) || 0), 'Booked Tariff']}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  borderColor: '#D8D2C5'
                }}
              />
              <Bar dataKey="revenue" fill="#0D5C56" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
