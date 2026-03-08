export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export async function apiFetch(path: string, options?: RequestInit) {
  const url = `${API_BASE_URL}${path}`;
  const token = localStorage.getItem("auth_token");
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface EscortFilters {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  minAge?: number;
  maxAge?: number;
  minHeight?: number;
  maxHeight?: number;
  minWeight?: number;
  maxWeight?: number;
  minPrice?: number;
  maxPrice?: number;
  gender?: string;
  ethnicity?: string;
  sortBy?: "viewCount" | "createdAt" | "username";
  sortOrder?: "ASC" | "DESC";
}

/** Inline SVG placeholder when photo is missing or fails to load (no external file). */
export const PLACEHOLDER_THUMBNAIL =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 267" fill="none"><rect width="200" height="267" fill="%23e5e7eb"/><circle cx="100" cy="85" r="38" fill="%239ca3af"/><path d="M40 267c0-55 27-100 60-100s60 45 60 100H40z" fill="%239ca3af"/></svg>'
  );

export function buildImageUrl(picturePath: string): string {
  if (!picturePath) return PLACEHOLDER_THUMBNAIL;
  // Encode each path segment to handle special characters and emojis
  const encodedPath = picturePath
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return `${API_BASE_URL}/escort/image/${encodedPath}`;
}

export function buildFilterParams(filters: EscortFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== null) {
      params.append(key, String(value));
    }
  });
  return params.toString();
}
