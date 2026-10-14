import { useState, useEffect, useMemo, useCallback } from 'react';
import { repository } from '../../../lib/repository';
import { Booking, Payment, Property } from '../../../lib/repository/types';
import { getTodayDateStr } from '../../../lib/utils/dates';
import { selectTodayMetrics } from '../selectors/overviewSelectors';
import { TodayMetrics } from '../types';

export function useOverviewData(propertyFilter?: string) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bList, pList, propList] = await Promise.all([
        repository.getBookings(propertyFilter || undefined),
        repository.getAllPayments(propertyFilter || undefined),
        repository.getProperties()
      ]);
      setBookings(bList);
      setPayments(pList);
      setProperties(propList);
    } catch (err: any) {
      console.error('Failed to load overview data', err);
      setError("Couldn't load today's operations.");
    } finally {
      setLoading(false);
    }
  }, [propertyFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const todayStr = useMemo(() => getTodayDateStr(), []);

  // Pre-indexed map of payments by booking ID: O(1) lookups
  const paymentsByBookingId = useMemo(() => {
    const map = new Map<string, Payment[]>();
    for (const p of payments) {
      const existing = map.get(p.booking_id);
      if (existing) {
        existing.push(p);
      } else {
        map.set(p.booking_id, [p]);
      }
    }
    return map;
  }, [payments]);

  // Derived today's operations & financials
  const todayMetrics = useMemo<TodayMetrics>(
    () => selectTodayMetrics(bookings, payments, properties, todayStr),
    [bookings, payments, properties, todayStr]
  );

  return {
    loading,
    error,
    refresh: loadData,
    paymentsByBookingId,
    todayMetrics,
    properties
  };
}
