// types/liveData.ts
import { DateTime } from "luxon";
import { User } from "../types/userTypes";

export interface SalonData {
  id: string;
  name: string;
  city: string;
  location: string;
  averageRating: number;
  owner: {
    firstName: string;
    lastName: string;
  };
  salonServices: {
    id: string;
    price: number;
    duration: number;
    service: {
      id: string;
      name: string;
      category: string | null;
    } | null;
  }[] | null;
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
  }[];
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface OwnerBooking {
  id: string;
  bookingNumber: string;
  totalAmount: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  salonId: string;
  salonName: string;
  salonServiceId: string;
  serviceId: string;
  serviceName: string;
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  slotStartTime: Date | string;
  slotEndTime: Date | string;
}

export interface OwnerService {
  id: string;
  price: number;
  duration: number;
  service: {
    id: string;
    name: string;
    active: boolean;
  };
}

export interface SalonSlot {
  id: string;
  salonId: string;
  startTime: Date | string;
  endTime: Date | string;
  isAvailable: boolean;
  serviceId: string | null;
}

export interface LiveData {
  // Client data
  salons?: SalonData[];
  salonServices?: SalonData['salonServices'];
  slots?: {
    id: string;
    salonId: string;
    date: Date | string;
    startTime: Date | string;
    endTime: Date | string;
    isAvailable: boolean;
    salon: { name: string };
    service: { name: string; category: string | null } | null;
  }[];
  bookings?: any[];
  
  // Salon Owner data
  ownerBookings?: OwnerBooking[];
  ownerServices?: OwnerService[];
  ownerSlots?: SalonSlot[];
  ownerSalons?: SalonData[];
  
  // Admin data
  users?: User[];
  allBookings?: OwnerBooking[];
}