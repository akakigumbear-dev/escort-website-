import { apiFetch, buildFilterParams, type EscortFilters } from "./api";

export interface EscortListItem {
  id: string;
  username: string;
  city: string;
  ethnicity: string;
  gender: string;
  viewCount: number;
  isVerified: boolean;
  isVip: boolean;
  averageRating: number;
  reviewsCount: number;
  profilePicture: {
    id: string;
    picturePath: string;
  } | null;
}

export interface EscortPicture {
  id: string;
  picturePath: string;
  isProfilePicture: boolean;
  createdAt: string;
}

export interface EscortPrices {
  price30min: number;
  price1hour: number;
  priceWholeNight: number;
}

export interface EscortDetail {
  id: string;
  phoneNumber?: string;
  username: string;
  city: string;
  address: string;
  services: string[];
  height: number;
  weight: number;
  age?: number;
  ethnicity: string;
  gender: string;
  languages: string[];
  viewCount: number;
  isVerified: boolean;
  isVip: boolean;
  vipUntil: string | null;
  createdAt: string;
  updatedAt: string;
  profilePicture: { id: string; picturePath: string } | null;
  pictures: EscortPicture[];
  reviews: unknown[];
  reviewsCount: number;
  averageRating: number;
  prices: {
    inCall: EscortPrices | null;
    outCall: EscortPrices | null;
  };
}

export interface PaginatedResponse {
  items: EscortListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export async function fetchAllEscorts(filters?: EscortFilters): Promise<PaginatedResponse> {
  const qs = filters ? buildFilterParams(filters) : "";
  return apiFetch(`/escort/all${qs ? `?${qs}` : ""}`);
}

export async function fetchVipEscorts(): Promise<EscortListItem[]> {
  const data = await apiFetch("/escort/vips");
  return data?.items ?? data ?? [];
}

export async function fetchTopViewedEscorts(): Promise<EscortListItem[]> {
  const data = await apiFetch("/escort/top-viewed");
  return data?.items ?? data ?? [];
}

export async function fetchEscortById(id: string): Promise<EscortDetail> {
  return apiFetch(`/escort/${id}`);
}
