import { API_BASE_URL } from "./api";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("auth_token");
  return {
    "ngrok-skip-browser-warning": "true",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface Conversation {
  userId: string;
  email: string;
  lastMessage: { content: string | null; hasAttachment: boolean; createdAt: string };
}

export interface MessageDto {
  id: string;
  senderId: string;
  receiverId: string;
  content: string | null;
  attachmentPath: string | null;
  attachmentOriginalName: string | null;
  createdAt: string;
}

export async function getConversations(): Promise<Conversation[]> {
  const res = await fetch(`${API_BASE_URL}/messages/conversations`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load conversations");
  return res.json();
}

export async function getMessagesWith(
  userId: string,
  limit?: number,
  before?: string
): Promise<{ messages: MessageDto[]; hasMore: boolean }> {
  const params = new URLSearchParams();
  if (limit != null) params.set("limit", String(limit));
  if (before) params.set("before", before);
  const q = params.toString();
  const res = await fetch(
    `${API_BASE_URL}/messages/with/${encodeURIComponent(userId)}${q ? `?${q}` : ""}`,
    { headers: getAuthHeaders() }
  );
  if (!res.ok) throw new Error("Failed to load messages");
  return res.json();
}

export async function sendMessage(
  receiverId: string,
  content?: string,
  file?: File
): Promise<MessageDto> {
  const form = new FormData();
  form.append("receiverId", receiverId);
  if (content) form.append("content", content);
  if (file) form.append("attachment", file);

  const res = await fetch(`${API_BASE_URL}/messages`, {
    method: "POST",
    headers: getAuthHeaders() as Record<string, string>,
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to send message");
  }
  return res.json();
}

export function buildAttachmentUrl(path: string): string {
  if (!path) return "";
  const encoded = path.replace(/^\/uploads\/dm\//, "").split("/").map(encodeURIComponent).join("/");
  return `${API_BASE_URL}/messages/attachment/${encoded}`;
}
