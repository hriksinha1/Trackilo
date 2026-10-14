import { Booking, Property } from '../../lib/repository/types';

export interface PropertyComparison {
  property: Property;
  activeStaysCount: number;
  arrivalsTodayCount: number;
  departuresTodayCount: number;
  bookedValue: number;
  collectedAmount: number;
  outstandingDue: number;
}

export interface TodayMetrics {
  arrivalsCount: number;
  departuresCount: number;
  inHouseCount: number;
  arrivals: Booking[];
  departures: Booking[];
  inHouse: Booking[];
  collectedToday: number;
  totalOutstandingDue: number;
  totalBookedValue: number;
  netCollected: number;
  propertyComparisons: PropertyComparison[];
}
