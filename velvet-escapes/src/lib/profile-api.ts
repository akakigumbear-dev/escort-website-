import { API_BASE_URL } from "./api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  return {
    "ngrok-skip-browser-warning": "true",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface EscortProfileResponse {
  id: string;
  username: string;
  city: string;
  address: string;
  phoneNumber: string;
  subscriptionPriceGel?: number | null;
  prices?: unknown[];
  pictures?: Array<{ id: string; picturePath: string; isProfilePicture: boolean; isExclusive?: boolean; mediaType?: string | null }>;
  subscriberPhotos?: Array<{ id: string; picturePath: string; mediaType?: string | null; sortOrder: number }>;
  [key: string]: unknown;
}

export async function getMyProfile(): Promise<EscortProfileResponse> {
  const res = await fetch(`${API_BASE_URL}/profile/get`, { headers: authHeaders() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to load profile");
  }
  return res.json();
}

export async function updateProfile(body: Record<string, unknown>): Promise<EscortProfileResponse> {
  const res = await fetch(`${API_BASE_URL}/profile/edit`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to update profile");
  }
  return res.json();
}

export async function uploadProfilePictures(files: File[]): Promise<{ items: Array<{ id: string; picturePath: string; isProfilePicture: boolean; mediaType?: string | null }> }> {
  const form = new FormData();
  files.forEach((f) => form.append("pictures", f));
  const res = await fetch(`${API_BASE_URL}/profile/pictures/upload`, {
    method: "POST",
    headers: authHeaders() as Record<string, string>,
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Upload failed");
  }
  return res.json();
}

export async function uploadSubscriberMedia(files: File[]): Promise<{ items: Array<{ id: string; picturePath: string; mediaType?: string | null; sortOrder: number }> }> {
  const form = new FormData();
  files.forEach((f) => form.append("media", f));
  const res = await fetch(`${API_BASE_URL}/profile/subscriber-media/upload`, {
    method: "POST",
    headers: authHeaders() as Record<string, string>,
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Upload failed");
  }
  return res.json();
}

export async function setProfilePicture(pictureId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/profile/pictures/profile`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ pictureId }),
  });
  if (!res.ok) throw new Error("Failed to set profile picture");
}

export async function setPictureExclusive(pictureId: string, isExclusive: boolean): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/profile/pictures/${pictureId}/exclusive`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ isExclusive }),
  });
  if (!res.ok) throw new Error("Failed to update");
}

export async function deletePicture(pictureId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/profile/pictures/${pictureId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete");
}

export async function upsertPrices(serviceLocation: "IN_CALL" | "OUT_CALL", prices: { price30min?: number; price1hour?: number; priceWholeNight?: number }): Promise<unknown> {
  const res = await fetch(`${API_BASE_URL}/profile/prices`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ serviceLocation, ...prices }),
  });
  if (!res.ok) throw new Error("Failed to save prices");
  return res.json();
}
