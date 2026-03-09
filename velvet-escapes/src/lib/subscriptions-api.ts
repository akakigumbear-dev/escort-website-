import { apiFetch } from "./api";

export async function subscribeToEscort(escortProfileId: string) {
  return apiFetch("/subscriptions", {
    method: "POST",
    body: JSON.stringify({ escortProfileId }),
  });
}

export async function getMySubscriptions() {
  return apiFetch("/subscriptions/me");
}

export async function getMySubscribers() {
  return apiFetch("/subscriptions/subscribers");
}

export async function unsubscribeFromEscort(escortProfileId: string) {
  return apiFetch(`/subscriptions/${encodeURIComponent(escortProfileId)}`, {
    method: "DELETE",
  });
}

export async function checkSubscription(escortProfileId: string): Promise<{ subscribed: boolean }> {
  return apiFetch(`/subscriptions/check/${encodeURIComponent(escortProfileId)}`);
}
