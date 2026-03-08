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
}

export function buildImageUrl(picturePath: string): string {
  if (!picturePath) return "/placeholder.svg";
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
