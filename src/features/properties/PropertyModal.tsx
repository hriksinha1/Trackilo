import React, { useState } from 'react';
import { repository } from '../../lib/repository';
import { Property } from '../../lib/repository/types';
import { X, Building2, MapPin, Phone, Mail, ShieldCheck, AlertCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface PropertyModalProps {
  property?: Property | null;
  onClose: () => void;
  onComplete: () => void;
}

export default function PropertyModal({
  property,
  onClose,
  onComplete
}: PropertyModalProps) {
  const { toast } = useToast();
  const isEditing = Boolean(property?.id);

  const [formData, setFormData] = useState<Omit<Property, 'id' | 'created_at'>>({
    name: property?.name || '',
    property_type: property?.property_type || 'Boutique Hotel',
    location: property?.location || '',
    address: property?.address || '',
    city: property?.city || '',
    state: property?.state || '',
    pincode: property?.pincode || '',
    phone: property?.phone || '',
    email: property?.email || '',
    gstin: property?.gstin || '',
    check_in_time: property?.check_in_time || '14:00',
    check_out_time: property?.check_out_time || '11:00',
    description: property?.description || '',
    total_rooms: property?.total_rooms || 12,
    active: property?.active ?? true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Validate form
  function validate(): string | null {
    if (!formData.name.trim()) return 'Property name is required.';
    if (!formData.city.trim()) return 'City is required.';
    if (!formData.state.trim()) return 'State is required.';
    if (formData.phone && !/^[+0-9\s-]{8,16}$/.test(formData.phone.trim())) {
      return 'Enter a valid contact phone number.';
    }
    if (formData.pincode && !/^\d{6}$/.test(formData.pincode.trim())) {
      return 'Pincode should be a 6-digit postal code.';
    }
    if (formData.gstin && formData.gstin.trim().length !== 15) {
      return 'Indian GSTIN must be exactly 15 alphanumeric characters.';
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (property?.id) {
        await repository.updateProperty(property.id, formData);
        toast.success('Property Updated', `${formData.name} updated successfully.`);
      } else {
        await repository.createProperty(formData);
        toast.success('Property Added', `${formData.name} added to your hospitality portfolio.`);
      }
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to save property');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="property-modal-title"
      className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-[#D8D2C5] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#EAE5DC] flex items-center justify-between bg-[#FAF9F6] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E8F3F1] text-[#0D5C56] flex items-center justify-center shrink-0">
              <Building2 size={18} />
            </div>
            <div>
              <h2 id="property-modal-title" className="text-base font-bold text-[#1A2B28]">
                {isEditing ? 'Edit Property Profile' : 'Add New Property to Portfolio'}
              </h2>
              <p className="text-xs text-[#5C6E6B]">
                Configure operational property details, room inventory, and check-in policies
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-stone-400 hover:text-[#1A2B28] hover:bg-stone-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#1A2B28] mb-1.5">
                Property / Homestay Name <span className="text-rose-500">*</span>
              </label>
              <input
                required
                className="input text-sm"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Palm Grove Heritage Villa"
                autoFocus
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1A2B28] mb-1.5">
                Hospitality Category <span className="text-rose-500">*</span>
              </label>
              <select
                className="select text-xs"
                value={formData.property_type}
                onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
              >
                <option value="Boutique Hotel">Boutique Hotel</option>
                <option value="Resort & Spa">Resort & Spa</option>
                <option value="Homestay">Homestay</option>
                <option value="Heritage Haveli">Heritage Haveli</option>
                <option value="Business Hotel">Business Hotel</option>
                <option value="Villa">Luxury Villa</option>
                <option value="Apartment">Serviced Apartment</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#1A2B28] mb-1.5">
                Room Inventory (Total Units)
              </label>
              <input
                type="number"
                min={1}
                max={500}
                className="input text-xs"
                value={formData.total_rooms || 10}
                onChange={(e) => setFormData({ ...formData, total_rooms: Math.max(1, Number(e.target.value)) })}
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1A2B28] mb-1.5">
                Locality / Area
              </label>
              <input
                className="input text-xs"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Near Cliff Beach / Old City"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1A2B28] mb-1.5">
                City <span className="text-rose-500">*</span>
              </label>
              <input
                required
                className="input text-xs"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Udaipur"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1A2B28] mb-1.5">
                State <span className="text-rose-500">*</span>
              </label>
              <input
                required
                className="input text-xs"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="e.g. Rajasthan"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1A2B28] mb-1.5">
                Pincode (6 digits)
              </label>
              <input
                className="input text-xs"
                maxLength={6}
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                placeholder="313001"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#1A2B28] mb-1.5">
                Full Physical Address
              </label>
              <input
                className="input text-xs"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street name, landmark, road"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1A2B28] mb-1.5">
                Front-Desk Contact Phone
              </label>
              <input
                className="input text-xs"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1A2B28] mb-1.5">
                Reservations Email
              </label>
              <input
                type="email"
                className="input text-xs"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="stay@property.in"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1A2B28] mb-1.5">
                GSTIN / Tax ID (Optional)
              </label>
              <input
                className="input text-xs uppercase font-mono"
                maxLength={15}
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                placeholder="29ABCDE1234F1Z5"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-[#1A2B28] mb-1.5">
                  Check-in Time
                </label>
                <input
                  type="time"
                  className="input text-xs"
                  value={formData.check_in_time}
                  onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1A2B28] mb-1.5">
                  Check-out Time
                </label>
                <input
                  type="time"
                  className="input text-xs"
                  value={formData.check_out_time}
                  onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#1A2B28] mb-1.5">
                Description / Atmosphere Notes
              </label>
              <textarea
                rows={2}
                className="input text-xs"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description for guests and vouchers"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#EAE5DC]">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary text-xs px-5 font-semibold"
            >
              {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
