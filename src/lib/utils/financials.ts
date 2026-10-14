import { Booking, Payment } from '../repository/types';

export interface BookingFinancials {
  bookingTotal: number;
  baseAmount: number;
  discount: number;
  taxAmount: number;
  paid: number; // Net amount paid after refunds
  refunded: number;
  totalPaid: number;
  totalRefunded: number;
  netPaid: number;
  amountDue: number;
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid';
  percentagePaid: number;
  hasRefunds: boolean;
}

/**
 * Single source of truth for all booking payment & balance calculations.
 * Used consistently across Overview, Bookings, BookingDetail, Payments,
 * Reports, Invoices, and Receipts.
 */
export function calculateBookingFinancials(
  booking: {
    grand_total?: number;
    base_amount?: number;
    discount?: number;
    tax_amount?: number;
    [key: string]: any;
  },
  payments: Payment[] = []
): BookingFinancials {
  const bookingTotal = Number(booking.grand_total ?? booking.base_amount ?? 0);
  const baseAmount = Number(booking.base_amount ?? 0);
  const discount = Number(booking.discount ?? 0);
  const taxAmount = Number(booking.tax_amount ?? 0);

  let totalPaid = 0;
  let totalRefunded = 0;

  for (const p of payments) {
    const amt = Number(p.amount) || 0;
    if (p.status === 'Recorded' || p.status === 'Completed') {
      totalPaid += amt;
    } else if (p.status === 'Refunded') {
      totalRefunded += amt;
    }
  }

  const netPaid = Math.max(0, totalPaid - totalRefunded);
  const amountDue = Math.max(0, bookingTotal - netPaid);

  let paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid' = 'Unpaid';
  if (bookingTotal <= 0) {
    paymentStatus = 'Paid';
  } else if (netPaid <= 0) {
    paymentStatus = 'Unpaid';
  } else if (netPaid < bookingTotal) {
    paymentStatus = 'Partially Paid';
  } else {
    paymentStatus = 'Paid';
  }

  const percentagePaid = bookingTotal > 0 ? Math.min(100, Math.round((netPaid / bookingTotal) * 100)) : 100;

  return {
    bookingTotal,
    baseAmount,
    discount,
    taxAmount,
    paid: netPaid,
    refunded: totalRefunded,
    totalPaid,
    totalRefunded,
    netPaid,
    amountDue,
    paymentStatus,
    percentagePaid,
    hasRefunds: totalRefunded > 0
  };
}

// Backwards-compatible alias for existing code
export interface BookingPaymentSummary {
  totalAmount: number;
  totalPaid: number;
  totalRefunded: number;
  netPaid: number;
  balanceDue: number;
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid';
}

export function calculateBookingPaymentSummary(
  booking: Booking | { grand_total: number; base_amount?: number },
  payments: Payment[]
): BookingPaymentSummary {
  const financials = calculateBookingFinancials(booking, payments);
  return {
    totalAmount: financials.bookingTotal,
    totalPaid: financials.totalPaid,
    totalRefunded: financials.totalRefunded,
    netPaid: financials.netPaid,
    balanceDue: financials.amountDue,
    paymentStatus: financials.paymentStatus
  };
}
