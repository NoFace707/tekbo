import { requestJsonWithAuthRetry } from "./apiClient";

export async function listUsers({ search, role, is_active } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (role) params.set("role", role);
  if (is_active !== undefined && is_active !== null && is_active !== "") {
    params.set("is_active", is_active);
  }
  const qs = params.toString();
  const url = `/api/users/${qs ? `?${qs}` : ""}`;
  return requestJsonWithAuthRetry(url, { method: "GET" });
}

export async function getUser(id) {
  return requestJsonWithAuthRetry(`/api/users/${id}/`, { method: "GET" });
}

export async function createUser(payload) {
  return requestJsonWithAuthRetry("/api/users/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateUser(id, payload) {
  return requestJsonWithAuthRetry(`/api/users/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(id) {
  return requestJsonWithAuthRetry(`/api/users/${id}/`, { method: "DELETE" });
}
