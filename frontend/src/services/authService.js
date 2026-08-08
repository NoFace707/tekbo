import {
  clearAuthTokens,
  getStoredUser,
  requestJson,
  requestJsonWithAuthRetry,
  setAuthTokens,
  setStoredUser,
} from "./apiClient";

export const ROLE = {
  ADMIN: "admin",
  SUPERVISOR: "supervisor",
  VENDEDOR: "vendedor",
};

export const ROLE_LABEL = {
  admin: "Administrador",
  supervisor: "Supervisor",
  vendedor: "Vendedor",
};

export function saveSession({ user, tokens }) {
  setStoredUser(user);
  if (tokens) setAuthTokens(tokens);
}

export function clearSession() {
  setStoredUser(null);
  clearAuthTokens();
}

export function getStoredSessionUser() {
  return getStoredUser();
}

export function isAdmin(user) {
  return user?.role === ROLE.ADMIN;
}

export function isSupervisor(user) {
  return user?.role === ROLE.SUPERVISOR;
}

export function isVendedor(user) {
  return user?.role === ROLE.VENDEDOR;
}

export async function loginUser({ email, password }) {
  return requestJson("/api/auth/login/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function getCurrentUser() {
  return requestJsonWithAuthRetry("/api/auth/me/");
}

export async function logoutUser() {
  // Intentamos blacklista el refresh; si falla, no importa.
  const refresh = localStorage.getItem("auth_refresh_token");
  try {
    await requestJson("/api/auth/logout/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(refresh ? { refresh } : {}),
    });
  } catch {
    // noop
  }
}

export async function changePassword({ currentPassword, newPassword, newPasswordConfirm }) {
  return requestJsonWithAuthRetry("/api/auth/change-password/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm,
    }),
  });
}
