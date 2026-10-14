import { IRepository, Property, Customer, Booking, Payment, Notification, BusinessSettings } from './types';
import { generateId } from '../utils/formatters';
import { getTodayDateStr, parseLocalDate, formatLocalDate } from '../utils/dates';
import { calculateBookingFinancials } from '../utils/financials';

const STORAGE_KEY = 'bookzee_workspace_db_v3';

interface DemoDB {
  properties: Property[];
  customers: Customer[];
  bookings: Booking[];
  payments: Payment[];
  notifications: Notification[];
  settings: BusinessSettings;
  version: number;
}

// Helper to format date offset from today in IST
function getDateOffset(days: number): string {
  const today = parseLocalDate(getTodayDateStr());
  today.setDate(today.getDate() + days);
  return formatLocalDate(today);
}

function getInitialData(): DemoDB {
  const nowIso = new Date().toISOString();

  const properties: Property[] = [
    {
      id: 'p1',
      name: 'The Heritage Courtyard',
      property_type: 'Boutique Hotel',
      location: 'City Center',
      address: '12 Temple Road',
      city: 'Mysuru',
      state: 'Karnataka',
      pincode: '570001',
      phone: '+91 821 245 6789',
      email: 'stay@heritagecourtyard.in',
      gstin: '29ABCDE1234F1Z5',
      check_in_time: '14:00',
      check_out_time: '11:00',
      description: 'Restored 19th-century royal courtyard with 16 bespoke heritage suites.',
      total_rooms: 16,
      active: true,
      created_at: nowIso
    },
    {
      id: 'p2',
      name: 'Valley View Resort & Spa',
      property_type: 'Resort & Spa',
      location: 'Hill Station',
      address: 'Mist Point, Tea Gardens',
      city: 'Munnar',
      state: 'Kerala',
      pincode: '685612',
      phone: '+91 4865 231 100',
      email: 'reservations@valleyviewmunnar.com',
      gstin: '32ABCDE1234F1Z5',
      check_in_time: '13:00',
      check_out_time: '11:00',
      description: 'Panoramic tea plantation sanctuary featuring luxury cloud-facing chalets.',
      total_rooms: 24,
      active: true,
      created_at: nowIso
    },
    {
      id: 'p3',
      name: 'Coral Beach Homestay',
      property_type: 'Homestay',
      location: 'North Goa',
      address: 'Beach Lane, Near Flea Market',
      city: 'Anjuna',
      state: 'Goa',
      pincode: '403509',
      phone: '+91 832 227 3450',
      email: 'host@coralbeachgoa.in',
      check_in_time: '14:00',
      check_out_time: '11:00',
      description: 'Charming Portuguese heritage villa 150m from the Arabian Sea.',
      total_rooms: 8,
      active: true,
      created_at: nowIso
    },
    {
      id: 'p4',
      name: 'Pinecrest Cabin',
      property_type: 'Homestay',
      location: 'Old Manali',
      address: 'Upper Orchard Road',
      city: 'Manali',
      state: 'Himachal Pradesh',
      pincode: '175131',
      phone: '+91 1902 254 321',
      email: 'contact@pinecrestmanali.com',
      check_in_time: '12:00',
      check_out_time: '11:00',
      description: 'Handcrafted cedarwood cabin framed by apple orchards and snow-capped peaks.',
      total_rooms: 6,
      active: true,
      created_at: nowIso
    },
    {
      id: 'p5',
      name: 'Oasis Business Hotel',
      property_type: 'Business Hotel',
      location: 'Outer Ring Road',
      address: '44 Tech Park Avenue',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560103',
      phone: '+91 80 4123 9999',
      email: 'desk@oasisbusinesshotel.com',
      gstin: '29AAACH8888K1Z3',
      check_in_time: '14:00',
      check_out_time: '12:00',
      description: 'High-speed business hotel with executive club rooms and meeting facilities.',
      total_rooms: 32,
      active: true,
      created_at: nowIso
    }
  ];

  const customers: Customer[] = [
    {
      id: 'c1',
      name: 'Vikramaditya Singhania',
      phone: '+91 98200 12345',
      email: 'vikram.singhania@email.com',
      id_type: 'Aadhaar',
      id_number: '•••• •••• 9812',
      city: 'Mumbai',
      address: 'Altamount Road, Cumballa Hill',
      notes: 'Prefers quiet garden-facing rooms. Early check-in requested.',
      created_at: nowIso
    },
    {
      id: 'c2',
      name: 'Ananya Deshmukh',
      phone: '+91 98450 67890',
      email: 'ananya.deshmukh@email.com',
      id_type: 'Passport',
      id_number: 'Z9821430',
      city: 'Bengaluru',
      address: 'Indiranagar 100ft Road',
      notes: 'Celebrating anniversary. Requested flower bouquet.',
      created_at: nowIso
    },
    {
      id: 'c3',
      name: 'Rajesh & Meenakshi Patel',
      phone: '+91 99099 34567',
      email: 'rajesh.patel@gujaratcorp.com',
      id_type: 'Driving License',
      id_number: 'GJ-01-2018-9921',
      city: 'Ahmedabad',
      notes: 'Pure vegetarian breakfast only.',
      created_at: nowIso
    },
    {
      id: 'c4',
      name: 'Rohan Banerjee',
      phone: '+91 98310 45678',
      email: 'rohan.banerjee@email.com',
      id_type: 'Aadhaar',
      id_number: '•••• •••• 4120',
      city: 'Kolkata',
      notes: 'Corporate stay. Needs tax invoice with company details.',
      created_at: nowIso
    },
    {
      id: 'c5',
      name: 'Tara Sundaram',
      phone: '+91 94440 23456',
      email: 'tara.sundaram@email.com',
      id_type: 'Aadhaar',
      id_number: '•••• •••• 8831',
      city: 'Chennai',
      notes: 'Late arrival expected around 19:30.',
      created_at: nowIso
    },
    {
      id: 'c6',
      name: 'Aditya & Neha Kapoor',
      phone: '+91 98110 56789',
      email: 'aditya.kapoor@email.com',
      id_type: 'Passport',
      id_number: 'T1109482',
      city: 'New Delhi',
      notes: 'Honeymoon stay. Welcome drink on arrival.',
      created_at: nowIso
    },
    {
      id: 'c7',
      name: 'Suresh Kumar',
      phone: '+91 97400 32109',
      email: 'suresh.k@email.com',
      id_type: 'Aadhaar',
      id_number: '•••• •••• 6543',
      city: 'Hyderabad',
      created_at: nowIso
    },
    {
      id: 'c8',
      name: 'Priyanka Nambiar',
      phone: '+91 98470 87654',
      email: 'priyanka.n@email.com',
      id_type: 'Passport',
      id_number: 'K8920194',
      city: 'Kochi',
      notes: 'Allergic to down feathers; provide synthetic pillows.',
      created_at: nowIso
    },
    {
      id: 'c9',
      name: 'Amitabh Sen',
      phone: '+91 98300 76543',
      email: 'amitabh.sen@email.com',
      id_type: 'Aadhaar',
      id_number: '•••• •••• 3341',
      city: 'Kolkata',
      created_at: nowIso
    },
    {
      id: 'c10',
      name: 'Deepak & Sneha Joshi',
      phone: '+91 98220 54321',
      email: 'deepak.joshi@email.com',
      id_type: 'Aadhaar',
      id_number: '•••• •••• 1209',
      city: 'Pune',
      created_at: nowIso
    }
  ];

  // Bookings with realistic stay timelines and financial consistency
  const bookings: Booking[] = [
    // Today's Arrival 1 (The Heritage Courtyard) - Partial Advance Paid
    {
      id: 'b-arr-1',
      booking_no: 'BK-1011',
      customer_id: 'c1',
      property_id: 'p1',
      check_in: getDateOffset(0),
      check_out: getDateOffset(2),
      nights: 2,
      rooms: 1,
      guests: 2,
      room_type: 'Heritage Deluxe Suite',
      base_amount: 14000,
      discount: 0,
      tax_enabled: true,
      tax_rate: 12,
      tax_amount: 1680,
      grand_total: 15680,
      booking_status: 'Confirmed',
      payment_status: 'Partially Paid',
      created_at: getDateOffset(-5)
    },
    // Today's Arrival 2 (The Heritage Courtyard) - Fully Paid
    {
      id: 'b-arr-2',
      booking_no: 'BK-1012',
      customer_id: 'c2',
      property_id: 'p1',
      check_in: getDateOffset(0),
      check_out: getDateOffset(3),
      nights: 3,
      rooms: 1,
      guests: 2,
      room_type: 'Maharaja Royal Suite',
      base_amount: 24000,
      discount: 0,
      tax_enabled: true,
      tax_rate: 18,
      tax_amount: 4320,
      grand_total: 28320,
      booking_status: 'Confirmed',
      payment_status: 'Paid',
      created_at: getDateOffset(-8)
    },
    // Today's Arrival 3 (Coral Beach) - Unpaid
    {
      id: 'b-arr-3',
      booking_no: 'BK-1013',
      customer_id: 'c5',
      property_id: 'p3',
      check_in: getDateOffset(0),
      check_out: getDateOffset(2),
      nights: 2,
      rooms: 1,
      guests: 2,
      room_type: 'Sea Breeze Suite',
      base_amount: 9000,
      discount: 0,
      tax_enabled: false,
      tax_rate: 0,
      tax_amount: 0,
      grand_total: 9000,
      booking_status: 'Confirmed',
      payment_status: 'Unpaid',
      created_at: getDateOffset(-3)
    },

    // Today's Departure 1 (Valley View) - Fully Paid
    {
      id: 'b-dep-1',
      booking_no: 'BK-1008',
      customer_id: 'c8',
      property_id: 'p2',
      check_in: getDateOffset(-3),
      check_out: getDateOffset(0),
      nights: 3,
      rooms: 2,
      guests: 4,
      room_type: 'Plantation Suite',
      base_amount: 36000,
      discount: 0,
      tax_enabled: true,
      tax_rate: 18,
      tax_amount: 6480,
      grand_total: 42480,
      booking_status: 'Checked In',
      payment_status: 'Paid',
      created_at: getDateOffset(-10)
    },
    // Today's Departure 2 (Pinecrest Cabin) - Balance Due!
    {
      id: 'b-dep-2',
      booking_no: 'BK-1009',
      customer_id: 'c7',
      property_id: 'p4',
      check_in: getDateOffset(-2),
      check_out: getDateOffset(0),
      nights: 2,
      rooms: 1,
      guests: 2,
      room_type: 'Cedar Chalet',
      base_amount: 14000,
      discount: 0,
      tax_enabled: true,
      tax_rate: 12,
      tax_amount: 1680,
      grand_total: 15680,
      booking_status: 'Checked In',
      payment_status: 'Partially Paid',
      created_at: getDateOffset(-7)
    },

    // In-House Stays
    {
      id: 'b-stay-1',
      booking_no: 'BK-1010',
      customer_id: 'c10',
      property_id: 'p1',
      check_in: getDateOffset(-1),
      check_out: getDateOffset(2),
      nights: 3,
      rooms: 1,
      guests: 2,
      room_type: 'Courtyard Deluxe',
      base_amount: 21000,
      discount: 1000,
      tax_enabled: true,
      tax_rate: 12,
      tax_amount: 2400,
      grand_total: 22400,
      booking_status: 'Checked In',
      payment_status: 'Paid',
      created_at: getDateOffset(-4)
    },
    {
      id: 'b-stay-2',
      booking_no: 'BK-1014',
      customer_id: 'c3',
      property_id: 'p2',
      check_in: getDateOffset(-2),
      check_out: getDateOffset(1),
      nights: 3,
      rooms: 1,
      guests: 2,
      room_type: 'Valley Villa',
      base_amount: 33000,
      discount: 0,
      tax_enabled: true,
      tax_rate: 18,
      tax_amount: 5940,
      grand_total: 38940,
      booking_status: 'Checked In',
      payment_status: 'Partially Paid',
      created_at: getDateOffset(-6)
    },
    {
      id: 'b-stay-3',
      booking_no: 'BK-1015',
      customer_id: 'c4',
      property_id: 'p5',
      check_in: getDateOffset(-1),
      check_out: getDateOffset(1),
      nights: 2,
      rooms: 1,
      guests: 1,
      room_type: 'Executive Business Room',
      base_amount: 11000,
      discount: 0,
      tax_enabled: true,
      tax_rate: 12,
      tax_amount: 1320,
      grand_total: 12320,
      booking_status: 'Checked In',
      payment_status: 'Paid',
      created_at: getDateOffset(-2)
    },

    // Upcoming Bookings
    {
      id: 'b-up-1',
      booking_no: 'BK-1016',
      customer_id: 'c6',
      property_id: 'p2',
      check_in: getDateOffset(2),
      check_out: getDateOffset(5),
      nights: 3,
      rooms: 1,
      guests: 2,
      room_type: 'Honeymoon Pool Villa',
      base_amount: 45000,
      discount: 2500,
      tax_enabled: true,
      tax_rate: 18,
      tax_amount: 7650,
      grand_total: 50150,
      booking_status: 'Confirmed',
      payment_status: 'Partially Paid',
      created_at: getDateOffset(-1)
    },
    {
      id: 'b-up-2',
      booking_no: 'BK-1017',
      customer_id: 'c9',
      property_id: 'p3',
      check_in: getDateOffset(3),
      check_out: getDateOffset(6),
      nights: 3,
      rooms: 1,
      guests: 2,
      room_type: 'Garden Cottage',
      base_amount: 12000,
      discount: 0,
      tax_enabled: false,
      tax_rate: 0,
      tax_amount: 0,
      grand_total: 12000,
      booking_status: 'Confirmed',
      payment_status: 'Unpaid',
      created_at: getDateOffset(0)
    },

    // Historical Bookings
    {
      id: 'b-hist-1',
      booking_no: 'BK-1005',
      customer_id: 'c1',
      property_id: 'p1',
      check_in: getDateOffset(-15),
      check_out: getDateOffset(-12),
      nights: 3,
      rooms: 1,
      guests: 2,
      room_type: 'Courtyard Suite',
      base_amount: 21000,
      discount: 0,
      tax_enabled: true,
      tax_rate: 12,
      tax_amount: 2520,
      grand_total: 23520,
      booking_status: 'Checked Out',
      payment_status: 'Paid',
      created_at: getDateOffset(-22)
    },
    {
      id: 'b-hist-2',
      booking_no: 'BK-1004',
      customer_id: 'c2',
      property_id: 'p2',
      check_in: getDateOffset(-20),
      check_out: getDateOffset(-17),
      nights: 3,
      rooms: 1,
      guests: 2,
      room_type: 'Tea Estate Cottage',
      base_amount: 30000,
      discount: 0,
      tax_enabled: true,
      tax_rate: 18,
      tax_amount: 5400,
      grand_total: 35400,
      booking_status: 'Checked Out',
      // Paid 35,400 then refunded 5,000 -> net 30,400 of 35,400 -> Partially Paid!
      payment_status: 'Partially Paid',
      created_at: getDateOffset(-28)
    },
    {
      id: 'b-hist-3',
      booking_no: 'BK-1003',
      customer_id: 'c5',
      property_id: 'p3',
      check_in: getDateOffset(-35),
      check_out: getDateOffset(-33),
      nights: 2,
      rooms: 1,
      guests: 2,
      room_type: 'Heritage Room',
      base_amount: 11800,
      discount: 0,
      tax_enabled: false,
      tax_rate: 0,
      tax_amount: 0,
      grand_total: 11800,
      booking_status: 'Checked Out',
      payment_status: 'Paid',
      created_at: getDateOffset(-40)
    },
    {
      id: 'b-hist-4',
      booking_no: 'BK-1002',
      customer_id: 'c7',
      property_id: 'p4',
      check_in: getDateOffset(-50),
      check_out: getDateOffset(-47),
      nights: 3,
      rooms: 1,
      guests: 2,
      room_type: 'Pine Cabin Deluxe',
      base_amount: 13500,
      discount: 0,
      tax_enabled: false,
      tax_rate: 0,
      tax_amount: 0,
      grand_total: 13500,
      booking_status: 'Checked Out',
      payment_status: 'Paid',
      created_at: getDateOffset(-55)
    },
    {
      id: 'b-hist-5',
      booking_no: 'BK-1001',
      customer_id: 'c8',
      property_id: 'p2',
      check_in: getDateOffset(-70),
      check_out: getDateOffset(-67),
      nights: 3,
      rooms: 2,
      guests: 4,
      room_type: 'Plantation Suite',
      base_amount: 36000,
      discount: 0,
      tax_enabled: true,
      tax_rate: 18,
      tax_amount: 6480,
      grand_total: 42480,
      booking_status: 'Checked Out',
      payment_status: 'Paid',
      created_at: getDateOffset(-75)
    }
  ];

  const payments: Payment[] = [
    // Today's Arrival 1 - Advance paid
    {
      id: 'pay-101',
      payment_no: 'PAY-9011',
      booking_id: 'b-arr-1',
      date: getDateOffset(-5),
      amount: 6000,
      method: 'UPI',
      ref_id: 'UPI-78219034',
      purpose: 'Advance deposit',
      status: 'Recorded',
      created_at: getDateOffset(-5)
    },
    // Today's Arrival 2 - Paid in Full via 2 transactions
    {
      id: 'pay-102',
      payment_no: 'PAY-9012',
      booking_id: 'b-arr-2',
      date: getDateOffset(-8),
      amount: 10000,
      method: 'Card',
      ref_id: 'CARD-4891',
      purpose: 'Advance deposit',
      status: 'Recorded',
      created_at: getDateOffset(-8)
    },
    {
      id: 'pay-103',
      payment_no: 'PAY-9013',
      booking_id: 'b-arr-2',
      date: getDateOffset(-1),
      amount: 18320,
      method: 'Bank Transfer',
      ref_id: 'IMPS-9812401',
      purpose: 'Balance settlement',
      status: 'Recorded',
      created_at: getDateOffset(-1)
    },
    // Departure 1 - Paid in full
    {
      id: 'pay-104',
      payment_no: 'PAY-9008',
      booking_id: 'b-dep-1',
      date: getDateOffset(-10),
      amount: 20000,
      method: 'UPI',
      ref_id: 'UPI-33918204',
      purpose: 'Advance deposit',
      status: 'Recorded',
      created_at: getDateOffset(-10)
    },
    {
      id: 'pay-105',
      payment_no: 'PAY-9009',
      booking_id: 'b-dep-1',
      date: getDateOffset(-3),
      amount: 22480,
      method: 'Card',
      ref_id: 'CARD-8831',
      purpose: 'Check-in settlement',
      status: 'Recorded',
      created_at: getDateOffset(-3)
    },
    // Departure 2 - Partial advance only (balance due today!)
    {
      id: 'pay-106',
      payment_no: 'PAY-9010',
      booking_id: 'b-dep-2',
      date: getDateOffset(-7),
      amount: 5000,
      method: 'Cash',
      ref_id: 'CASH-REC-09',
      purpose: 'Advance deposit',
      status: 'Recorded',
      created_at: getDateOffset(-7)
    },
    // In-House 1 - Paid in Full
    {
      id: 'pay-107',
      payment_no: 'PAY-9014',
      booking_id: 'b-stay-1',
      date: getDateOffset(-4),
      amount: 22400,
      method: 'UPI',
      ref_id: 'UPI-99201940',
      purpose: 'Full stay tariff',
      status: 'Recorded',
      created_at: getDateOffset(-4)
    },
    // In-House 2 - Partial Advance
    {
      id: 'pay-108',
      payment_no: 'PAY-9015',
      booking_id: 'b-stay-2',
      date: getDateOffset(-6),
      amount: 15000,
      method: 'Card',
      ref_id: 'CARD-1192',
      purpose: 'Advance deposit',
      status: 'Recorded',
      created_at: getDateOffset(-6)
    },
    // In-House 3 - Paid in Full
    {
      id: 'pay-109',
      payment_no: 'PAY-9016',
      booking_id: 'b-stay-3',
      date: getDateOffset(-2),
      amount: 12320,
      method: 'UPI',
      ref_id: 'UPI-55201984',
      purpose: 'Corporate advance',
      status: 'Recorded',
      created_at: getDateOffset(-2)
    },
    // Upcoming 1 - Partial
    {
      id: 'pay-110',
      payment_no: 'PAY-9017',
      booking_id: 'b-up-1',
      date: getDateOffset(-1),
      amount: 25000,
      method: 'Bank Transfer',
      ref_id: 'NEFT-8839102',
      purpose: 'Honeymoon booking deposit',
      status: 'Recorded',
      created_at: getDateOffset(-1)
    },
    // Historical 1 - Paid
    {
      id: 'pay-111',
      payment_no: 'PAY-9005',
      booking_id: 'b-hist-1',
      date: getDateOffset(-22),
      amount: 23520,
      method: 'Card',
      ref_id: 'CARD-7731',
      purpose: 'Full payment',
      status: 'Recorded',
      created_at: getDateOffset(-22)
    },
    // Historical 2 - Paid then Refunded
    {
      id: 'pay-112a',
      payment_no: 'PAY-9004',
      booking_id: 'b-hist-2',
      date: getDateOffset(-28),
      amount: 35400,
      method: 'UPI',
      ref_id: 'UPI-44910293',
      purpose: 'Full payment',
      status: 'Recorded',
      created_at: getDateOffset(-28)
    },
    {
      id: 'pay-112b',
      payment_no: 'REF-9004',
      booking_id: 'b-hist-2',
      date: getDateOffset(-15),
      amount: 5000,
      method: 'UPI',
      ref_id: 'REF-UPI-001',
      purpose: 'Early checkout adjustment',
      status: 'Refunded',
      created_at: getDateOffset(-15)
    },
    {
      id: 'pay-113',
      payment_no: 'PAY-9003',
      booking_id: 'b-hist-3',
      date: getDateOffset(-35),
      amount: 11800,
      method: 'Card',
      ref_id: 'TXN-HIST-03',
      purpose: 'Full payment',
      status: 'Recorded',
      created_at: getDateOffset(-35)
    },
    {
      id: 'pay-114',
      payment_no: 'PAY-9002',
      booking_id: 'b-hist-4',
      date: getDateOffset(-50),
      amount: 13500,
      method: 'Cash',
      ref_id: 'CASH-REC-01',
      purpose: 'Full payment',
      status: 'Recorded',
      created_at: getDateOffset(-50)
    },
    {
      id: 'pay-115',
      payment_no: 'PAY-9001',
      booking_id: 'b-hist-5',
      date: getDateOffset(-70),
      amount: 42480,
      method: 'UPI',
      ref_id: 'UPI-HIST-05',
      purpose: 'Full payment',
      status: 'Recorded',
      created_at: getDateOffset(-70)
    }
  ];

  return {
    settings: {
      name: 'Bookzee Hospitality Portfolio',
      legalName: 'Bookzee Stays & Resorts Pvt. Ltd.',
      gstin: '29ABCDE1234F1Z5',
      address: 'Heritage Towers, 14 MG Road, Bengaluru, Karnataka 560001',
      phone: '+91 80 2345 6789',
      email: 'operations@bookzee.local',
      invoicePrefix: 'INV-',
      receiptPrefix: 'PAY-',
      defaultTaxRate: 12,
      termsConditions: 'Government-issued photo identification is required at check-in. Non-smoking suites. Check-in after 14:00; check-out by 11:00.',
      checkInTime: '14:00',
      checkOutTime: '11:00',
      cancellationPolicy: 'Complimentary cancellation up to 48 hours prior to arrival. Cancellations inside 48 hours incur a 1-night tariff retention.'
    },
    properties,
    customers,
    bookings,
    payments,
    notifications: [],
    version: 3
  };
}

class DemoRepositoryImpl implements IRepository {
  private db: DemoDB;

  constructor() {
    this.db = this.load();
  }

  private load(): DemoDB {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.version === 3 && Array.isArray(parsed.properties) && Array.isArray(parsed.bookings)) {
          return parsed;
        }
      }
    } catch {
      // Fall through to initial data
    }
    const initial = getInitialData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
  }

  // --- Properties ---
  async getProperties(): Promise<Property[]> {
    return [...this.db.properties];
  }

  async getProperty(id: string): Promise<Property | null> {
    return this.db.properties.find((p) => p.id === id) || null;
  }

  async createProperty(data: Omit<Property, 'id' | 'created_at'>): Promise<Property> {
    const prop: Property = {
      ...data,
      id: generateId('prop-'),
      created_at: new Date().toISOString()
    };
    this.db.properties.push(prop);
    this.save();
    return prop;
  }

  async updateProperty(id: string, data: Partial<Property>): Promise<Property> {
    const index = this.db.properties.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Property not found');
    this.db.properties[index] = { ...this.db.properties[index], ...data };
    this.save();
    return this.db.properties[index];
  }

  // --- Customers / Guests ---
  async getCustomers(): Promise<Customer[]> {
    return [...this.db.customers];
  }

  async getCustomer(id: string): Promise<Customer | null> {
    return this.db.customers.find((c) => c.id === id) || null;
  }

  async createCustomer(data: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> {
    const cust: Customer = {
      ...data,
      id: generateId('guest-'),
      created_at: new Date().toISOString()
    };
    this.db.customers.push(cust);
    this.save();
    return cust;
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    const index = this.db.customers.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    this.db.customers[index] = { ...this.db.customers[index], ...data };
    this.save();
    return this.db.customers[index];
  }

  // --- Bookings ---
  async getBookings(propertyId?: string): Promise<Booking[]> {
    let list = this.db.bookings;
    if (propertyId) {
      list = list.filter((b) => b.property_id === propertyId);
    }
    return list.map((b) => ({
      ...b,
      discount: b.discount ?? 0,
      customer: this.db.customers.find((c) => c.id === b.customer_id),
      property: this.db.properties.find((p) => p.id === b.property_id)
    }));
  }

  async getBooking(id: string): Promise<Booking | null> {
    const b = this.db.bookings.find((item) => item.id === id);
    if (!b) return null;
    return {
      ...b,
      discount: b.discount ?? 0,
      customer: this.db.customers.find((c) => c.id === b.customer_id),
      property: this.db.properties.find((p) => p.id === b.property_id)
    };
  }

  async createBooking(data: Omit<Booking, 'id' | 'created_at'>): Promise<Booking> {
    const highestNum = this.db.bookings.reduce((max, b) => {
      const match = b.booking_no?.match(/BK-(\d+)/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 1017);

    const bookingNo = data.booking_no || `BK-${highestNum + 1}`;

    const booking: Booking = {
      ...data,
      booking_no: bookingNo,
      discount: data.discount ?? 0,
      id: generateId('b-'),
      created_at: new Date().toISOString()
    };
    this.db.bookings.push(booking);
    this.save();

    return {
      ...booking,
      customer: this.db.customers.find((c) => c.id === booking.customer_id),
      property: this.db.properties.find((p) => p.id === booking.property_id)
    };
  }

  async updateBooking(id: string, data: Partial<Booking>): Promise<Booking> {
    const index = this.db.bookings.findIndex((b) => b.id === id);
    if (index === -1) throw new Error('Booking not found');
    this.db.bookings[index] = { ...this.db.bookings[index], ...data };
    this.save();

    return {
      ...this.db.bookings[index],
      customer: this.db.customers.find((c) => c.id === this.db.bookings[index].customer_id),
      property: this.db.properties.find((p) => p.id === this.db.bookings[index].property_id)
    };
  }

  // --- Payments ---
  async getPayments(bookingId?: string): Promise<Payment[]> {
    if (bookingId) {
      return this.db.payments.filter((p) => p.booking_id === bookingId);
    }
    return [...this.db.payments];
  }

  async getAllPayments(propertyId?: string): Promise<Payment[]> {
    let payments = [...this.db.payments];
    if (propertyId) {
      const propertyBookingIds = new Set(
        this.db.bookings.filter((b) => b.property_id === propertyId).map((b) => b.id)
      );
      payments = payments.filter((p) => propertyBookingIds.has(p.booking_id));
    }
    return payments.map((p) => {
      const booking = this.db.bookings.find((b) => b.id === p.booking_id);
      return {
        ...p,
        booking: booking
          ? {
              ...booking,
              customer: this.db.customers.find((c) => c.id === booking.customer_id),
              property: this.db.properties.find((prop) => prop.id === booking.property_id)
            }
          : undefined
      };
    });
  }

  async createPayment(data: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> {
    const numAmt = Number(data.amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const booking = this.db.bookings.find((b) => b.id === data.booking_id);
    if (!booking) {
      throw new Error('Booking not found for payment.');
    }

    // Auto-generate sequential payment number if not given
    let payNo = data.payment_no;
    if (!payNo) {
      const highestNum = this.db.payments.reduce((max, p) => {
        const match = p.payment_no?.match(/PAY-(\d+)/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 9017);
      payNo = `PAY-${highestNum + 1}`;
    }

    const payment: Payment = {
      ...data,
      payment_no: payNo,
      amount: numAmt,
      id: generateId('pay-'),
      created_at: new Date().toISOString()
    };
    this.db.payments.push(payment);

    // Sync booking payment status automatically using the single source of truth
    const allBookingPayments = this.db.payments.filter((p) => p.booking_id === booking.id);
    const financials = calculateBookingFinancials(booking, allBookingPayments);
    booking.payment_status = financials.paymentStatus;

    this.save();
    return payment;
  }

  // --- Notifications ---
  async getNotifications(bookingId?: string): Promise<Notification[]> {
    if (bookingId) {
      return this.db.notifications.filter((n) => n.booking_id === bookingId);
    }
    return [...this.db.notifications];
  }

  async createNotification(data: Omit<Notification, 'id' | 'created_at'>): Promise<Notification> {
    const notif: Notification = {
      ...data,
      id: generateId('notif-'),
      created_at: new Date().toISOString()
    };
    this.db.notifications.push(notif);
    this.save();
    return notif;
  }

  // --- Settings ---
  async getSettings(): Promise<BusinessSettings> {
    return { ...this.db.settings };
  }

  async updateSettings(data: Partial<BusinessSettings>): Promise<BusinessSettings> {
    this.db.settings = { ...this.db.settings, ...data };
    this.save();
    return { ...this.db.settings };
  }

  // --- Reset Demo Data ---
  async resetDemoData(): Promise<void> {
    this.db = getInitialData();
    this.save();
  }
}

export const repository = new DemoRepositoryImpl();
