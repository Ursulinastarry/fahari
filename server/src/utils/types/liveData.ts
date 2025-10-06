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
    duration:number;
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

export interface LiveData {
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
    service: { name: string; category: string | null} | null;
  }[];
  bookings?: any[];
  users?: User[];
  revenue?: {
    total?: number;
    this_month?: number;
    pending?: number;
  };
}
