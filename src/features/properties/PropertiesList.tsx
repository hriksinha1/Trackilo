import React, { useEffect, useState, useMemo } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { repository } from '../../lib/repository';
import { Property, Booking, Payment } from '../../lib/repository/types';
import { AppContextType } from '../../components/layout/AppShell';
import { fmtINR } from '../../lib/utils/formatters';
import { getTodayDateStr } from '../../lib/utils/dates';
import {
  Building2,
  MapPin,
  ArrowRight,
  Edit2,
  Power,
  Plus,
  BedDouble,
  CreditCard,
  CalendarDays,
  CheckCircle,
  AlertCircle,
  Check
} from 'lucide-react';
import PropertyModal from './PropertyModal';
import { useToast } from '../../context/ToastContext';

export default function PropertiesList() {
  const { propertyFilter, setPropertyFilter, refreshProperties } = useOutletContext<AppContextType>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Property modal state (null = closed, undefined = add new, Property object = edit)
  const [modalProperty, setModalProperty] = useState<Property | null | undefined>(null);

  // Status toggle confirmation modal
  const [statusConfirmProperty, setStatusConfirmProperty] = useState<Property | null>(null);

  // Filter tab
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'inactive'>('all');

  async function load() {
    setLoading(true);
    try {
      const [pList, bList, payList] = await Promise.all([
        repository.getProperties(),
        repository.getBookings(),
        repository.getAllPayments()
      ]);
      setProperties(pList);
      setBookings(bList);
      setPayments(payList);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Compute operational stats per property
  const propertyStats = useMemo(() => {
    const stats: Record<
      string,
      { activeStays: number; totalBookings: number; bookedValue: number; netCollected: number }
    > = {};

    properties.forEach((p) => {
      stats[p.id] = { activeStays: 0, totalBookings: 0, bookedValue: 0, netCollected: 0 };
    });

    const todayStr = getTodayDateStr();

    // Map payments by booking
    const paymentsByBooking = new Map<string, Payment[]>();
    payments.forEach((pay) => {
      const list = paymentsByBooking.get(pay.booking_id) || [];
      list.push(pay);
      paymentsByBooking.set(pay.booking_id, list);
    });

    bookings.forEach((b) => {
      if (!stats[b.property_id]) return;
      if (b.booking_status !== 'Cancelled') {
        stats[b.property_id].totalBookings++;
        stats[b.property_id].bookedValue += Number(b.grand_total) || 0;

        if (
          b.booking_status === 'Checked In' ||
          (b.check_in <= todayStr && b.check_out > todayStr)
        ) {
          stats[b.property_id].activeStays++;
        }
      }
    });

    // Calculate net cash collected
    payments.forEach((pay) => {
      const b = bookings.find((bk) => bk.id === pay.booking_id);
      if (b && stats[b.property_id]) {
        if (pay.status === 'Recorded' || pay.status === 'Completed') {
          stats[b.property_id].netCollected += Number(pay.amount) || 0;
        } else if (pay.status === 'Refunded') {
          stats[b.property_id].netCollected -= Number(pay.amount) || 0;
        }
      }
    });

    return stats;
  }, [properties, bookings, payments]);

  async function handleToggleStatus(p: Property) {
    try {
      const updated = await repository.updateProperty(p.id, { active: !p.active });
      toast.success(
        'Property Status Updated',
        `${p.name} is now ${updated.active ? 'Active' : 'Inactive'}.`
      );
      setStatusConfirmProperty(null);
      await load();
      if (refreshProperties) {
        await refreshProperties();
      }
    } catch {
      toast.error('Failed to update property status');
    }
  }

  const filteredProperties = useMemo(() => {
    if (filterTab === 'active') return properties.filter((p) => p.active);
    if (filterTab === 'inactive') return properties.filter((p) => !p.active);
    return properties;
  }, [properties, filterTab]);

  const activeCount = properties.filter((p) => p.active).length;
  const inactiveCount = properties.length - activeCount;

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-10 w-64 bg-stone-200 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-56 bg-white rounded-2xl border border-[#D8D2C5]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A2B28] tracking-tight">
            Properties Portfolio
          </h1>
          <p className="text-sm text-[#5C6E6B] mt-0.5">
            Manage your boutique stays, resorts, homestays, room inventory, and policies.
          </p>
        </div>

        {/* Add Property Button */}
        <button
          onClick={() => setModalProperty(undefined)}
          className="btn btn-primary text-xs sm:text-sm flex items-center gap-2 self-start sm:self-auto font-semibold shadow-xs"
        >
          <Plus size={16} />
          <span>Add New Property</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EAE5DC] pb-2 text-xs">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filterTab === 'all'
              ? 'bg-[#E8F3F1] text-[#0D5C56] font-bold'
              : 'text-[#5C6E6B] hover:text-[#1A2B28] hover:bg-stone-100'
          }`}
        >
          All Properties ({properties.length})
        </button>
        <button
          onClick={() => setFilterTab('active')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filterTab === 'active'
              ? 'bg-[#E8F3F1] text-[#0D5C56] font-bold'
              : 'text-[#5C6E6B] hover:text-[#1A2B28] hover:bg-stone-100'
          }`}
        >
          Active ({activeCount})
        </button>
        {inactiveCount > 0 && (
          <button
            onClick={() => setFilterTab('inactive')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterTab === 'inactive'
                ? 'bg-[#E8F3F1] text-[#0D5C56] font-bold'
                : 'text-[#5C6E6B] hover:text-[#1A2B28] hover:bg-stone-100'
            }`}
          >
            Inactive Archive ({inactiveCount})
          </button>
        )}
      </div>

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        <div className="card p-12 text-center bg-white border-[#D8D2C5] space-y-3">
          <Building2 size={36} className="mx-auto text-stone-400" />
          <h3 className="text-base font-bold text-[#1A2B28]">No properties found</h3>
          <p className="text-xs text-[#5C6E6B] max-w-sm mx-auto">
            {filterTab === 'inactive'
              ? 'There are no deactivated properties in the archive.'
              : 'Add your first property to start managing stays and collecting payments.'}
          </p>
          <button
            onClick={() => setModalProperty(undefined)}
            className="btn btn-primary text-xs mx-auto"
          >
            <Plus size={14} className="mr-1.5" />
            <span>Add Property Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((p) => {
            const stats = propertyStats[p.id] || {
              activeStays: 0,
              totalBookings: 0,
              bookedValue: 0,
              netCollected: 0
            };
            const isCurrentScope = propertyFilter === p.id;

            return (
              <div
                key={p.id}
                className={`card rounded-2xl border p-5 flex flex-col justify-between transition-all bg-white relative ${
                  isCurrentScope
                    ? 'border-[#0D5C56] ring-2 ring-[#0D5C56]/20 shadow-md'
                    : 'border-[#D8D2C5] hover:border-[#8E9E9B]'
                } ${!p.active ? 'opacity-70 bg-stone-50/50' : ''}`}
              >
                <div className="space-y-4">
                  {/* Top identity */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="badge bg-[#E8F3F1] text-[#0D5C56] text-[10px] font-bold uppercase tracking-wider">
                          {p.property_type || 'Property'}
                        </span>
                        {!p.active && (
                          <span className="badge bg-stone-200 text-stone-700 text-[10px]">
                            Inactive
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg font-bold text-[#1A2B28] truncate">
                        {p.name}
                      </h2>
                      <div className="flex items-center gap-1.5 text-xs text-[#5C6E6B]">
                        <MapPin size={13} className="text-[#0D5C56] shrink-0" />
                        <span className="truncate">
                          {p.location ? `${p.location}, ` : ''}{p.city}, {p.state}
                        </span>
                      </div>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setModalProperty(p)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-[#0D5C56] hover:bg-[#E8F3F1] transition-colors"
                        title="Edit property details"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusConfirmProperty(p)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          p.active
                            ? 'text-stone-400 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-[#276749] hover:bg-[#EBF6EF]'
                        }`}
                        title={p.active ? 'Deactivate property' : 'Activate property'}
                      >
                        <Power size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Operational Summary Grid */}
                  <div className="grid grid-cols-3 gap-2 py-3 px-3 rounded-xl bg-[#FAF9F6] border border-[#EAE5DC] text-center text-xs">
                    <div>
                      <div className="text-[10px] font-bold text-[#5C6E6B] uppercase tracking-wider">
                        Active Stays
                      </div>
                      <div className="text-base font-bold text-[#1A2B28] mt-0.5">
                        {stats.activeStays}
                      </div>
                      <div className="text-[10px] text-[#5C6E6B]">
                        of {p.total_rooms || 12} rms
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-[#5C6E6B] uppercase tracking-wider">
                        Bookings
                      </div>
                      <div className="text-base font-bold text-[#1A2B28] mt-0.5">
                        {stats.totalBookings}
                      </div>
                      <div className="text-[10px] text-[#5C6E6B]">lifetime</div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-[#5C6E6B] uppercase tracking-wider">
                        Net Cash
                      </div>
                      <div className="text-base font-bold text-[#276749] mt-0.5">
                        ₹{(stats.netCollected / 1000).toFixed(0)}k
                      </div>
                      <div className="text-[10px] text-[#5C6E6B]">collected</div>
                    </div>
                  </div>

                  {/* Tariff & Policy Meta */}
                  <div className="space-y-1 text-[11px] text-[#5C6E6B] pt-1">
                    <div className="flex justify-between">
                      <span>Total Booked Tariff:</span>
                      <span className="font-semibold text-[#1A2B28]">{fmtINR(stats.bookedValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Check-in / Check-out:</span>
                      <span className="font-medium text-[#1A2B28]">{p.check_in_time} / {p.check_out_time}</span>
                    </div>
                    {p.gstin && (
                      <div className="flex justify-between font-mono text-[10px]">
                        <span>GSTIN:</span>
                        <span>{p.gstin}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scope Switcher Button */}
                <div className="pt-4 mt-2 border-t border-[#EAE5DC] flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setPropertyFilter(isCurrentScope ? '' : p.id);
                      toast.success(
                        isCurrentScope ? 'Portfolio Scope' : 'Property Filter Active',
                        isCurrentScope
                          ? 'Showing all properties across the portfolio.'
                          : `Workspace scoped to ${p.name}.`
                      );
                    }}
                    className={`btn text-xs py-2 px-3 flex-1 flex items-center justify-center gap-1.5 font-medium ${
                      isCurrentScope
                        ? 'bg-[#E8F3F1] text-[#0D5C56] border border-[#BDDFC9]'
                        : 'btn-outline'
                    }`}
                  >
                    {isCurrentScope ? (
                      <>
                        <Check size={14} className="text-[#0D5C56]" />
                        <span>Current Scope</span>
                      </>
                    ) : (
                      <span>Filter Workspace Here</span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setPropertyFilter(p.id);
                      navigate('/bookings');
                    }}
                    className="p-2 rounded-lg border border-[#D8D2C5] text-[#5C6E6B] hover:text-[#0D5C56] hover:bg-[#FAF9F6] transition-colors"
                    title="View Bookings for this property"
                  >
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalProperty !== null && (
        <PropertyModal
          property={modalProperty}
          onClose={() => setModalProperty(null)}
          onComplete={async () => {
            setModalProperty(null);
            await load();
            if (refreshProperties) {
              await refreshProperties();
            }
          }}
        />
      )}

      {/* Deactivation / Activation Confirmation Dialog */}
      {statusConfirmProperty && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-[#D8D2C5] w-full max-w-md p-6 space-y-4 animate-modal-in">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                statusConfirmProperty.active
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              <Power size={24} />
            </div>

            <div>
              <h3 className="font-bold text-lg text-[#1A2B28]">
                {statusConfirmProperty.active ? 'Deactivate Property?' : 'Reactivate Property?'}
              </h3>
              <p className="text-xs text-[#5C6E6B] mt-1 leading-relaxed">
                {statusConfirmProperty.active
                  ? `Deactivating ${statusConfirmProperty.name} will hide it from new booking entries, but all past reservations, receipts, and financial history remain fully preserved in your portfolio.`
                  : `Reactivate ${statusConfirmProperty.name} to allow front-desk operations and new reservations.`}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStatusConfirmProperty(null)}
                className="btn btn-outline text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus(statusConfirmProperty)}
                className={`btn text-xs font-semibold ${
                  statusConfirmProperty.active
                    ? 'btn-accent bg-rose-600 hover:bg-rose-700 text-white'
                    : 'btn-primary'
                }`}
              >
                {statusConfirmProperty.active ? 'Confirm Deactivation' : 'Reactivate Property'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
