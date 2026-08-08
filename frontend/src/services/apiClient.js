const ACCESS_TOKEN_KEY = "auth_access_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";
const USER_KEY = "current_user";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

let refreshInFlightPromise = null;

function buildUrl(endpoint) {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  return `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getStoredAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || "";
}

export function getStoredRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || "";
}

export function setAuthTokens({ access, refresh } = {}) {
  if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function setStoredUser(user) {
  if (!user) {
    localStorage.removeItem(USER_KEY);
    return;
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function request(endpoint, init = {}) {
  const headers = new Headers(init.headers || {});
  const token = getStoredAccessToken();

  if (token) {
    const currentAuth = headers.get("Authorization") || "";
    if (!currentAuth || /^Bearer\s+/i.test(currentAuth)) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return fetch(buildUrl(endpoint), {
    credentials: "include",
    ...init,
    headers,
  });
}

async function safeParseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function refreshAuthSession() {
  if (refreshInFlightPromise) return refreshInFlightPromise;

  const refresh = getStoredRefreshToken();
  refreshInFlightPromise = (async () => {
    const response = await request("/api/auth/refresh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(refresh ? { refresh } : {}),
    });
    if (!response.ok) throw new Error("No se pudo refrescar la sesion.");
    const data = await safeParseJson(response);
    if (data?.access) localStorage.setItem(ACCESS_TOKEN_KEY, data.access);
    if (data?.refresh) localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
    return data;
  })();

  try {
    return await refreshInFlightPromise;
  } finally {
    refreshInFlightPromise = null;
  }
}

export async function requestWithAuthRetry(endpoint, init = {}) {
  const firstResponse = await request(endpoint, init);
  if (firstResponse.status !== 401) return firstResponse;
  try {
    await refreshAuthSession();
  } catch {
    clearAuthTokens();
    setStoredUser(null);
    return firstResponse;
  }
  return request(endpoint, init);
}

export async function requestJson(endpoint, init = {}) {
  const response = await request(endpoint, init);
  const data = await safeParseJson(response);
  if (!response.ok) throw data || { detail: "No se pudo completar la solicitud." };
  return data;
}

export async function requestJsonWithAuthRetry(endpoint, init = {}) {
  const response = await requestWithAuthRetry(endpoint, init);
  const data = await safeParseJson(response);
  if (!response.ok) throw data || { detail: "No se pudo completar la solicitud." };
  return data;
}
