export interface Property {
  id: string;
  name: string;
  property_type: string;
  location: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin?: string;
  check_in_time: string;
  check_out_time: string;
  description?: string;
  active: boolean;
  total_rooms?: number;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  id_type?: string;
  id_number?: string;
  city?: string;
  address?: string;
  notes?: string;
  created_at: string;
}

export interface Booking {
  id: string;
  booking_no: string;
  customer_id: string;
  property_id: string;
  check_in: string;
  check_out: string;
  nights: number;
  rooms: number;
  guests: number;
  room_type: string;
  base_amount: number;
  discount?: number;
  tax_enabled: boolean;
  tax_rate: number;
  tax_amount: number;
  grand_total: number;
  booking_status: string; // 'Confirmed' | 'Checked In' | 'Checked Out' | 'Cancelled'
  payment_status: string; // 'Unpaid' | 'Partially Paid' | 'Paid'
  cancellation_reason?: string;
  cancelled_at?: string;
  created_at: string;
  customer?: Customer;
  property?: Property;
}

export interface Payment {
  id: string;
  payment_no: string;
  booking_id: string;
  date: string;
  amount: number;
  method: string; // 'UPI' | 'Card' | 'Cash' | 'Bank Transfer' | 'Online Gateway' | 'Cheque' | 'Other'
  ref_id?: string;
  purpose?: string;
  status: string; // 'Recorded' | 'Completed' | 'Refunded'
  created_at: string;
  booking?: any;
}

export interface Notification {
  id: string;
  booking_id: string;
  customer_id: string;
  channel: string; // 'Email' | 'WhatsApp'
  type: string; // 'Booking Confirmation' | 'Payment Receipt'
  recipient: string;
  status: string; // 'Prepared' | 'Sent' | 'Failed'
  created_at: string;
}

export interface BusinessSettings {
  name: string;
  legalName: string;
  gstin: string;
  address?: string;
  phone?: string;
  email?: string;
  invoicePrefix?: string;
  receiptPrefix?: string;
  defaultTaxRate?: number;
  termsConditions?: string;
  checkInTime?: string;
  checkOutTime?: string;
  cancellationPolicy?: string;
}

export type SystemSettings = BusinessSettings;

export interface IRepository {
  getProperties(): Promise<Property[]>;
  getProperty(id: string): Promise<Property | null>;
  createProperty(data: Omit<Property, 'id' | 'created_at'>): Promise<Property>;
  updateProperty(id: string, data: Partial<Property>): Promise<Property>;

  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | null>;
  createCustomer(data: Omit<Customer, 'id' | 'created_at'>): Promise<Customer>;
  updateCustomer(id: string, data: Partial<Customer>): Promise<Customer>;

  getBookings(propertyId?: string): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | null>;
  createBooking(data: Omit<Booking, 'id' | 'created_at'>): Promise<Booking>;
  updateBooking(id: string, data: Partial<Booking>): Promise<Booking>;

  getPayments(bookingId?: string): Promise<Payment[]>;
  getAllPayments(propertyId?: string): Promise<Payment[]>;
  createPayment(data: Omit<Payment, 'id' | 'created_at'>): Promise<Payment>;

  getNotifications(bookingId?: string): Promise<Notification[]>;
  createNotification(data: Omit<Notification, 'id' | 'created_at'>): Promise<Notification>;

  getSettings(): Promise<BusinessSettings>;
  updateSettings(data: Partial<BusinessSettings>): Promise<BusinessSettings>;

  resetDemoData(): Promise<void>;
}
