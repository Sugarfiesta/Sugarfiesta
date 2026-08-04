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
};

export function wsUrl(token: string) {
  const base = (process.env.EXPO_PUBLIC_BACKEND_URL || "").replace(/^http/, "ws");
  return `${base}/api/ws?token=${encodeURIComponent(token)}`;
}
