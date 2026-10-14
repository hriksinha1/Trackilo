import { Booking, Payment, Property } from '../../../lib/repository/types';
import { calculateBookingFinancials } from '../../../lib/utils/financials';
import { TodayMetrics, PropertyComparison } from '../types';

export function selectTodayMetrics(
  bookings: Booking[],
  payments: Payment[],
  properties: Property[],
  todayStr: string
): TodayMetrics {
  const arrivals = bookings.filter(
    (b) => b.check_in === todayStr && b.booking_status !== 'Cancelled'
  );

  const departures = bookings.filter(
    (b) => b.check_out === todayStr && b.booking_status !== 'Cancelled'
  );

  const inHouse = bookings.filter(
    (b) =>
      b.booking_status === 'Checked In' ||
      (b.check_in <= todayStr && b.check_out > todayStr && b.booking_status !== 'Cancelled')
  );

  // Payments map
  const paymentsByBooking = new Map<string, Payment[]>();
  for (const p of payments) {
    const list = paymentsByBooking.get(p.booking_id) || [];
    list.push(p);
    paymentsByBooking.set(p.booking_id, list);
  }

  // Cash collected today
  let collectedToday = 0;
  for (const p of payments) {
    if (p.date === todayStr && (p.status === 'Recorded' || p.status === 'Completed')) {
      collectedToday += Number(p.amount) || 0;
    }
  }

  // Active bookings financial calculation
  let totalOutstandingDue = 0;
  let totalBookedValue = 0;
  let netCollected = 0;

  for (const b of bookings) {
    if (b.booking_status !== 'Cancelled') {
      const bPayments = paymentsByBooking.get(b.id) || [];
      const fin = calculateBookingFinancials(b, bPayments);
      totalBookedValue += fin.bookingTotal;
      totalOutstandingDue += fin.amountDue;
      netCollected += fin.netPaid;
    }
  }

  // Property comparisons
  const propertyComparisons: PropertyComparison[] = properties.map((prop) => {
    const propBookings = bookings.filter((b) => b.property_id === prop.id && b.booking_status !== 'Cancelled');
    let pBooked = 0;
    let pCollected = 0;
    let pDue = 0;
    let pActiveStays = 0;
    let pArrivals = 0;
    let pDepartures = 0;

    for (const b of propBookings) {
      const bPayments = paymentsByBooking.get(b.id) || [];
      const fin = calculateBookingFinancials(b, bPayments);
      pBooked += fin.bookingTotal;
      pCollected += fin.netPaid;
      pDue += fin.amountDue;

      if (b.check_in === todayStr) pArrivals++;
      if (b.check_out === todayStr) pDepartures++;
      if (b.booking_status === 'Checked In' || (b.check_in <= todayStr && b.check_out > todayStr)) {
        pActiveStays++;
      }
    }

    return {
      property: prop,
      activeStaysCount: pActiveStays,
      arrivalsTodayCount: pArrivals,
      departuresTodayCount: pDepartures,
      bookedValue: pBooked,
      collectedAmount: pCollected,
      outstandingDue: pDue
    };
  });

  return {
    arrivalsCount: arrivals.length,
    departuresCount: departures.length,
    inHouseCount: inHouse.length,
    arrivals,
    departures,
    inHouse,
    collectedToday,
    totalOutstandingDue,
    totalBookedValue,
    netCollected,
    propertyComparisons
  };
}
