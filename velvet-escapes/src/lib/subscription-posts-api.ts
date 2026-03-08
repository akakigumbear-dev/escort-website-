import { apiFetch } from "./api";
import { API_BASE_URL } from "./api";

export interface SubscriptionPostDto {
  id: string;
  profileId: string;
  authorUserId: string;
  content: string | null;
  mediaPath: string | null;
  mediaType: string | null;
  createdAt: string;
  upvoteCount: number;
  commentCount: number;
  upvotedByMe?: boolean;
}

export interface PostCommentDto {
  id: string;
  postId: string;
  userId: string;
  userEmail?: string;
  content: string;
  createdAt: string;
}

export async function getMyPosts(): Promise<{ posts: SubscriptionPostDto[] }> {
  return apiFetch("/subscription-posts/my");
}

export async function getPostsForProfile(profileId: string): Promise<{ posts: SubscriptionPostDto[] }> {
  return apiFetch(`/subscription-posts/profile/${profileId}`);
}

export async function createPost(profileId: string, content?: string, media?: File): Promise<SubscriptionPostDto> {
  const form = new FormData();
  form.append("profileId", profileId);
  if (content) form.append("content", content);
  if (media) form.append("media", media);
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${API_BASE_URL}/subscription-posts`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" } : {},
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to create post");
  }
  return res.json();
}

export async function upvotePost(postId: string): Promise<{ upvoted: boolean }> {
  return apiFetch(`/subscription-posts/${postId}/upvote`, { method: "POST" });
}

export async function unvotePost(postId: string): Promise<{ upvoted: boolean }> {
  return apiFetch(`/subscription-posts/${postId}/unvote`, { method: "POST" });
}

export async function addPostComment(postId: string, content: string): Promise<PostCommentDto> {
  return apiFetch(`/subscription-posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function getPostComments(postId: string): Promise<{ comments: PostCommentDto[] }> {
  return apiFetch(`/subscription-posts/${postId}/comments`);
}

export async function deletePost(postId: string): Promise<void> {
  await apiFetch(`/subscription-posts/${postId}`, { method: "DELETE" });
}

export function buildPostMediaUrl(path: string): string {
  if (!path) return "";
  return `${API_BASE_URL}${path}`;
}
