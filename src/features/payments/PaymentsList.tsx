import React, { useEffect, useState, useMemo } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import { repository } from '../../lib/repository';
import { fmtDate, fmtINR } from '../../lib/utils/formatters';
import { calculateBookingFinancials } from '../../lib/utils/financials';
import { AppContextType } from '../../components/layout/AppShell';
import {
  Search,
  Filter,
  CreditCard,
  Download,
  Share2,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  FileText,
  Calendar,
  Building2,
  RefreshCw,
  Plus
} from 'lucide-react';
import { Payment, Booking, Customer, Property, SystemSettings } from '../../lib/repository/types';
import DocumentModal from '../../components/documents/DocumentModal';
import { generatePaymentReceiptPDF } from '../../lib/services/pdfGenerator';
import { useToast } from '../../context/ToastContext';

type TabType = 'all' | 'recorded' | 'refunded';

export default function PaymentsList() {
  const { propertyFilter } = useOutletContext<AppContextType>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [methodFilter, setMethodFilter] = useState('all');

  // Document Modal state
  const [documentModal, setDocumentModal] = useState<{
    open: boolean;
    type: 'receipt';
    booking: Booking;
    payment: Payment;
    previouslyPaid: number;
    balanceDue: number;
  } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [pRes, allPRes, bRes, cRes, propRes, sData] = await Promise.all([
        repository.getAllPayments(propertyFilter || undefined),
        repository.getAllPayments(),
        repository.getBookings(),
        repository.getCustomers(),
        repository.getProperties(),
        repository.getSettings()
      ]);
      setSettings(sData);
      setAllPayments(allPRes);

      const custMap = cRes.reduce((acc: any, c: any) => ({ ...acc, [c.id]: c }), {});
      const propMap = propRes.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {});

      const enhancedBookings = bRes.map((b: any) => ({
        ...b,
        customer: custMap[b.customer_id],
        property: propMap[b.property_id]
      }));
      setBookings(enhancedBookings);

      const bookingMap = enhancedBookings.reduce((acc: any, b: any) => {
        acc[b.id] = b;
        return acc;
      }, {});

      const mappedPayments = pRes
        .map((p: any) => ({
          ...p,
          booking: bookingMap[p.booking_id]
        }))
        .sort(
          (a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

      setPayments(mappedPayments);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load payments ledger');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [propertyFilter]);

  // Tab & search filtering
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // 1. Search
      const q = search.toLowerCase().trim();
      const matches =
        !q ||
        p.payment_no?.toLowerCase().includes(q) ||
        p.booking?.booking_no?.toLowerCase().includes(q) ||
        p.booking?.customer?.name?.toLowerCase().includes(q) ||
        p.ref_id?.toLowerCase().includes(q) ||
        p.method?.toLowerCase().includes(q) ||
        p.purpose?.toLowerCase().includes(q);

      if (!matches) return false;

      // 2. Tab
      if (activeTab === 'recorded') {
        if (p.status !== 'Recorded' && p.status !== 'Completed') return false;
      } else if (activeTab === 'refunded') {
        if (p.status !== 'Refunded') return false;
      }

      // 3. Method
      if (methodFilter !== 'all' && p.method !== methodFilter) return false;

      return true;
    });
  }, [payments, search, activeTab, methodFilter]);

  // Compute accurate metrics (separating gross collected, refunds, and net)
  const metrics = useMemo(() => {
    let grossCollected = 0;
    let completedCount = 0;
    let refundedAmount = 0;
    let refundedCount = 0;

    payments.forEach((p) => {
      if (p.status === 'Recorded' || p.status === 'Completed') {
        grossCollected += Number(p.amount) || 0;
        completedCount++;
      } else if (p.status === 'Refunded') {
        refundedAmount += Number(p.amount) || 0;
        refundedCount++;
      }
    });

    const netCollected = Math.max(0, grossCollected - refundedAmount);

    return { grossCollected, completedCount, refundedAmount, refundedCount, netCollected };
  }, [payments]);

  // Helper to calculate previouslyPaid and balanceDue accurately for any payment
  function getPaymentCalculation(p: Payment) {
    const bookingPayments = allPayments
      .filter((item) => item.booking_id === p.booking_id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const pIndex = bookingPayments.findIndex((item) => item.id === p.id);
    let prevPaid = 0;

    for (let i = 0; i < pIndex; i++) {
      const item = bookingPayments[i];
      if (item.status === 'Recorded' || item.status === 'Completed') {
        prevPaid += Number(item.amount) || 0;
      } else if (item.status === 'Refunded') {
        prevPaid -= Number(item.amount) || 0;
      }
    }

    const currentEffect = p.status === 'Refunded' ? -Number(p.amount) : Number(p.amount);
    const totalAfter = prevPaid + currentEffect;
    const bookingTotal = Number(p.booking?.grand_total || 0);
    const balanceDueAfter = Math.max(0, bookingTotal - totalAfter);

    return { prevPaid: Math.max(0, prevPaid), balanceDue: balanceDueAfter };
  }

  // Open Document Modal for payment receipt
  function handleOpenReceipt(e: React.MouseEvent, p: Payment) {
    e.stopPropagation();
    if (!p.booking) return;
    const { prevPaid, balanceDue } = getPaymentCalculation(p);

    setDocumentModal({
      open: true,
      type: 'receipt',
      booking: p.booking,
      payment: p,
      previouslyPaid: prevPaid,
      balanceDue
    });
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 max-w-7xl mx-auto">
        <div className="h-10 w-64 bg-stone-200 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-24 bg-white rounded-2xl border border-[#D8D2C5]" />
          ))}
        </div>
        <div className="h-96 bg-white rounded-2xl border border-[#D8D2C5]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A2B28] tracking-tight">
            Payments & Collections Ledger
          </h1>
          <p className="text-sm text-[#5C6E6B] mt-0.5">
            Audit trail of advance deposits, settlement receipts, and verified transactions.
          </p>
        </div>
      </div>

      {/* 4 Financial Ledger Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 sm:p-5 bg-white border-[#D8D2C5]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6B]">
            Net Collected
          </span>
          <div className="text-xl sm:text-2xl font-bold text-[#276749] mt-1 tracking-tight">
            {fmtINR(metrics.netCollected)}
          </div>
          <div className="text-[11px] text-[#5C6E6B] mt-0.5">
            Gross minus refunds
          </div>
        </div>

        <div className="card p-4 sm:p-5 bg-white border-[#D8D2C5]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6B]">
            Gross Recorded
          </span>
          <div className="text-xl sm:text-2xl font-bold text-[#1A2B28] mt-1 tracking-tight">
            {fmtINR(metrics.grossCollected)}
          </div>
          <div className="text-[11px] text-[#5C6E6B] mt-0.5">
            {metrics.completedCount} transactions
          </div>
        </div>

        <div className="card p-4 sm:p-5 bg-white border-[#D8D2C5]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6B]">
            Refunds Deducted
          </span>
          <div className="text-xl sm:text-2xl font-bold text-[#C45532] mt-1 tracking-tight">
            {fmtINR(metrics.refundedAmount)}
          </div>
          <div className="text-[11px] text-[#5C6E6B] mt-0.5">
            {metrics.refundedCount} refund adjustments
          </div>
        </div>

        <div className="card p-4 sm:p-5 bg-white border-[#D8D2C5]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6B]">
            Ledger Entries
          </span>
          <div className="text-xl sm:text-2xl font-bold text-[#0D5C56] mt-1 tracking-tight">
            {payments.length}
          </div>
          <div className="text-[11px] text-[#5C6E6B] mt-0.5">
            {propertyFilter ? 'In selected property' : 'Across portfolio'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 bg-white border-[#D8D2C5] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex p-1 rounded-xl bg-[#FAF9F6] border border-[#EAE5DC] text-xs font-semibold self-start md:self-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-1.5 px-3 rounded-lg transition-all ${
              activeTab === 'all'
                ? 'bg-white shadow-2xs text-[#0D5C56]'
                : 'text-[#5C6E6B] hover:text-[#1A2B28]'
            }`}
          >
            All ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab('recorded')}
            className={`py-1.5 px-3 rounded-lg transition-all ${
              activeTab === 'recorded'
                ? 'bg-white shadow-2xs text-[#0D5C56]'
                : 'text-[#5C6E6B] hover:text-[#1A2B28]'
            }`}
          >
            Collections ({metrics.completedCount})
          </button>
          <button
            onClick={() => setActiveTab('refunded')}
            className={`py-1.5 px-3 rounded-lg transition-all ${
              activeTab === 'refunded'
                ? 'bg-white shadow-2xs text-[#0D5C56]'
                : 'text-[#5C6E6B] hover:text-[#1A2B28]'
            }`}
          >
            Refunds ({metrics.refundedCount})
          </button>
        </div>

        {/* Search & Method Selector */}
        <div className="flex items-center gap-2.5 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search receipt #, booking, guest..."
              className="input pl-8 py-1.5 text-xs"
            />
          </div>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="select text-xs py-1.5 w-36"
          >
            <option value="all">All Methods</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Online Gateway">Online Gateway</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="card overflow-hidden bg-white border-[#D8D2C5]">
        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#5C6E6B] space-y-2">
            <CreditCard size={32} className="mx-auto text-stone-300" />
            <p className="font-semibold text-[#1A2B28]">No payment records found</p>
            <p>Try clearing your search query or switching tabs.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F6] border-b border-[#EAE5DC] text-[11px] font-bold uppercase tracking-wider text-[#5C6E6B]">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Guest & Stay</th>
                  <th className="py-3 px-4">Property</th>
                  <th className="py-3 px-4">Method & UTR</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE5DC]">
                {filteredPayments.map((p) => {
                  const isRefund = p.status === 'Refunded';

                  return (
                    <tr
                      key={p.id}
                      onClick={() => p.booking && navigate(`/bookings/${p.booking.id}`)}
                      className="hover:bg-[#FAF9F6] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#0D5C56]">
                        {p.payment_no}
                      </td>
                      <td className="py-3 px-4 text-[#5C6E6B] whitespace-nowrap">
                        {fmtDate(p.date)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#1A2B28]">
                          {p.booking?.customer?.name || 'Guest'}
                        </div>
                        <div className="text-[11px] text-[#5C6E6B] font-mono">
                          {p.booking?.booking_no || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#5C6E6B] max-w-[150px] truncate">
                        {p.booking?.property?.name || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#1A2B28]">{p.method}</div>
                        <div className="text-[11px] text-[#5C6E6B] truncate max-w-[140px]">
                          {p.ref_id ? `UTR: ${p.ref_id}` : p.purpose || 'Payment'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-bold text-sm ${
                            isRefund ? 'text-rose-600' : 'text-[#276749]'
                          }`}
                        >
                          {isRefund ? `-${fmtINR(p.amount)}` : fmtINR(p.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`badge text-[10px] ${
                            isRefund
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-[#EBF6EF] text-[#276749] border border-[#BDDFC9]'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => handleOpenReceipt(e, p)}
                          className="btn btn-outline text-xs px-2.5 py-1 inline-flex items-center gap-1.5 hover:border-[#0D5C56]"
                          title="Preview, download, or share receipt"
                        >
                          <Share2 size={13} className="text-[#0D5C56]" />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reusable Document Modal for selected receipt */}
      {documentModal && (
        <DocumentModal
          isOpen={documentModal.open}
          onClose={() => setDocumentModal(null)}
          type="receipt"
          booking={documentModal.booking}
          payment={documentModal.payment}
          previouslyPaid={documentModal.previouslyPaid}
          balanceDue={documentModal.balanceDue}
          settings={settings}
        />
      )}
    </div>
  );
}
