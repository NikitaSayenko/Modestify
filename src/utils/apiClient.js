// ==========================
// Authenticated Fetch Client
// ==========================

import { getAuth } from "firebase/auth";
// Resolve API base URL.
// In production, leave empty to use same-origin.
// In development without CRA proxy, this guesses :4000 from :3000.
const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (typeof window !== "undefined" && window.location.origin.includes(":3000")
    ? window.location.origin.replace(":3000", ":4000")
    : "");
/* authFetch
 * Wraps window.fetch and attaches a Firebase ID token (if the user is signed in).
 * Only admins are expected to call protected endpoints (verified on the server). */
async function authFetch(url, options = {}) {
  const auth = getAuth();
  const user = auth.currentUser;

  // Base headers; JSON by default
  const headers = new Headers(options.headers || { "Content-Type": "application/json" });

  // Require a signed-in user (admin validation is enforced server-side)
  if (user) {
    const idToken = await user.getIdToken(); // short-lived; refresh handled by SDK
    headers.set("Authorization", `Bearer ${idToken}`);
  } else {
    throw new Error("Must be signed in as admin to call this endpoint.");
  }

  // Perform the request against API_BASE
  const res = await fetch(API_BASE + url, { ...options, headers, cache: "no-store" });

  // Enforce JSON so wrong-origin HTML doesn't look like success
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text().catch(() => "");
    throw new Error(`Unexpected response (${res.status}): ${text.slice(0, 120)}`);
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

// Public client surface
export const apiClient = {
  get: (url) => authFetch(url),
  post: (url, body) =>
    authFetch(url, { method: "POST", body: JSON.stringify(body ?? {}) }),
};
