import { storage } from "@/src/utils/storage";

const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;
export const TOKEN_KEY = "sugar_token";

export type User = {
  id: string;
  email: string;
  name: string;
  gender: string;
  verified: boolean;
  has_selfie?: boolean;
  preference?: string;
  bio?: string;
  age?: number | null;
  country?: string;
  photos?: string[];
  tier?: string;
  tier_until?: string | null;
};

export type DiscoverCard = {
  id: string;
  name: string;
  age?: number | null;
  gender: string;
  country: string;
  bio: string;
  photo?: string | null;
  is_demo: boolean;
  verified: boolean;
};

export type MatchView = {
  id: string;
  partner: { id: string; name: string; photo?: string | null; gender: string; verified: boolean };
  is_demo: boolean;
  last_text?: string | null;
  last_at?: string | null;
  created_at?: string | null;
};

async function req(path: string, options: RequestInit = {}, auth = false) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (auth) {
    const token = await storage.secureGet(TOKEN_KEY, "");
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = (data && data.detail) || "Etwas ist schiefgelaufen";
    throw new Error(typeof detail === "string" ? detail : "Fehler");
  }
  return data;
}

export const api = {
  signup: (email: string, password: string, name: string, gender: string) =>
    req("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name, gender }),
    }),
  login: (email: string, password: string) =>
    req("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => req("/auth/me", { method: "GET" }, true),
  verify: (selfie: string) =>
    req("/profile/verify", { method: "POST", body: JSON.stringify({ selfie }) }, true),
  setPreference: (preference: string) =>
    req("/profile/preferences", { method: "PATCH", body: JSON.stringify({ preference }) }, true),
  report: (reported_id: string | null, reason: string) =>
    req("/report", { method: "POST", body: JSON.stringify({ reported_id, reason }) }, true),
  updateProfile: (data: {
    name?: string;
    bio?: string;
    age?: number | null;
    country?: string;
    photos?: string[];
  }) => req("/profile", { method: "PATCH", body: JSON.stringify(data) }, true),
  discover: (country?: string) =>
    req(`/discover${country ? `?country=${encodeURIComponent(country)}` : ""}`, { method: "GET" }, true),
  swipe: (target_id: string, action: "like" | "pass" | "heart") =>
    req("/swipe", { method: "POST", body: JSON.stringify({ target_id, action }) }, true),
  matches: () => req("/matches", { method: "GET" }, true),
  matchDetail: (id: string) => req(`/matches/${id}`, { method: "GET" }, true),
  sendMatchMessage: (id: string, text: string) =>
    req(`/matches/${id}/messages`, { method: "POST", body: JSON.stringify({ text }) }, true),
  getSubscription: () => req("/subscription", { method: "GET" }, true),
  subscribe: (tier: string) =>
    req("/subscription", { method: "POST", body: JSON.stringify({ tier }) }, true),
  deleteAccount: () => req("/account", { method: "DELETE" }, true),
};

export function wsUrl(token: string) {
  const base = (process.env.EXPO_PUBLIC_BACKEND_URL || "").replace(/^http/, "ws");
  return `${base}/api/ws?token=${encodeURIComponent(token)}`;
}
