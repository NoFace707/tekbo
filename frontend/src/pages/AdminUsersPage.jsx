import { useCallback, useEffect, useMemo, useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../lib/utils";
import {
  createUser as apiCreateUser,
  deleteUser as apiDeleteUser,
  listUsers,
  updateUser as apiUpdateUser,
} from "../services/usersService";
import { ROLE, ROLE_LABEL } from "../services/authService";

const ROLES = [ROLE.ADMIN, ROLE.SUPERVISOR, ROLE.VENDEDOR];

function emptyForm() {
  return {
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    role: ROLE.VENDEDOR,
    phone: "",
    is_active: true,
    is_active_employee: true,
    password: "",
    password_confirm: "",
  };
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listUsers({
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        is_active: activeFilter === "" ? undefined : activeFilter === "true",
      });
      setUsers(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cargar la lista de usuarios."));
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, activeFilter]);

  useEffect(() => {
    const t = setTimeout(loadUsers, 300);
    return () => clearTimeout(t);
  }, [loadUsers]);

  const openCreate = () => {
    setForm(emptyForm());
    setEditingId(null);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setForm({
      username: u.username || "",
      email: u.email || "",
      first_name: u.first_name || "",
      last_name: u.last_name || "",
      role: u.role || ROLE.VENDEDOR,
      phone: u.phone || "",
      is_active: u.is_active !== false,
      is_active_employee: u.is_active_employee !== false,
      password: "",
      password_confirm: "",
    });
    setEditingId(u.id);
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (form.password || form.password_confirm) {
      if (form.password !== form.password_confirm) {
        setFormError("Las contrasenas no coinciden.");
        return;
      }
      if (form.password.length < 6) {
        setFormError("La contrasena debe tener al menos 6 caracteres.");
        return;
      }
    }
    if (!editingId && (!form.password || form.password.length < 6)) {
      setFormError("La contrasena es obligatoria al crear (minimo 6 caracteres).");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        username: form.username,
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        role: form.role,
        phone: form.phone,
        is_active: form.is_active,
        is_active_employee: form.is_active_employee,
      };
      if (form.password) {
        payload.password = form.password;
        payload.password_confirm = form.password_confirm;
      }

      if (editingId) {
        await apiUpdateUser(editingId, payload);
      } else {
        await apiCreateUser(payload);
      }
      setModalOpen(false);
      await loadUsers();
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo guardar el usuario."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await apiDeleteUser(confirmDelete.id);
      setConfirmDelete(null);
      await loadUsers();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo eliminar el usuario."));
      setConfirmDelete(null);
    }
  };

  const filteredCount = users.length;

  return (
    <MainLayout
      title="Gestion de usuarios"
      subtitle={`${filteredCount} ${filteredCount === 1 ? "usuario" : "usuarios"}`}
    >
      <section className="space-y-5">
        {error && (
          <Alert tone="danger" onClose={() => setError("")}>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, usuario o email..."
                className="w-72 pl-9"
              />
              <svg
                className="pointer-events-none absolute left-2.5 top-2.5 h-5 w-5 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
              </svg>
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            >
              <option value="">Todos los roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>

            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>

          <Button onClick={openCreate} className="shrink-0">
            <PlusIcon className="mr-2 h-4 w-4" />
            Nuevo usuario
          </Button>
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex animate-pulse items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-200" />
                  <div className="h-4 w-32 rounded bg-slate-200" />
                  <div className="h-4 w-48 rounded bg-slate-200" />
                  <div className="h-6 w-20 rounded-full bg-slate-200" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <svg
                className="mb-3 h-12 w-12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-sm font-medium">No hay usuarios para mostrar</p>
              <p className="mt-1 text-xs">Crea un usuario o ajusta los filtros</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="py-3.5 pl-6 pr-4">Usuario</th>
                    <th className="py-3.5 pr-4">Nombre</th>
                    <th className="py-3.5 pr-4">Email</th>
                    <th className="py-3.5 pr-4">Telefono</th>
                    <th className="py-3.5 pr-4">Rol</th>
                    <th className="py-3.5 pr-4">Estado</th>
                    <th className="py-3.5 pr-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-slate-50 transition-colors hover:bg-slate-50/60"
                    >
                      <td className="py-3.5 pl-6 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-800 text-xs font-bold text-white">
                            {(u.first_name?.[0] || "") + (u.last_name?.[0] || "") || (u.username?.[0] || "U").toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{u.username}</p>
                            <p className="text-[11px] text-slate-400">ID: {u.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 text-slate-700">
                        {(u.first_name || u.last_name)
                          ? `${u.first_name || ""} ${u.last_name || ""}`.trim()
                          : "—"}
                      </td>
                      <td className="py-3.5 pr-4 text-slate-600">{u.email || "—"}</td>
                      <td className="py-3.5 pr-4 text-slate-600">{u.phone || "—"}</td>
                      <td className="py-3.5 pr-4">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="py-3.5 pr-4">
                        <span
                          className={[
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                            u.is_active
                              ? "bg-lime-100 text-lime-900"
                              : "bg-slate-100 text-slate-500",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "h-1.5 w-1.5 rounded-full",
                              u.is_active ? "bg-lime-700" : "bg-slate-400",
                            ].join(" ")}
                          />
                          {u.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="py-3.5 pr-6">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-800"
                            title="Editar"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(u)}
                            disabled={u.id === currentUser?.id}
                            className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                            title={u.id === currentUser?.id ? "No puedes eliminarte" : "Eliminar"}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Modal crear/editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={closeModal}
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {editingId ? "Editar usuario" : "Nuevo usuario"}
                </h2>
                <p className="text-xs text-slate-500">
                  {editingId
                    ? "Actualiza los datos del usuario"
                    : "Completa los campos para crear el usuario"}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              {formError && (
                <Alert tone="danger">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Usuario" required>
                  <Input
                    value={form.username}
                    onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
                    required
                    placeholder="jperez"
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                    placeholder="jperez@example.com"
                  />
                </Field>
                <Field label="Nombres">
                  <Input
                    value={form.first_name}
                    onChange={(e) => setForm((s) => ({ ...s, first_name: e.target.value }))}
                  />
                </Field>
                <Field label="Apellidos">
                  <Input
                    value={form.last_name}
                    onChange={(e) => setForm((s) => ({ ...s, last_name: e.target.value }))}
                  />
                </Field>
                <Field label="Rol" required>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                    required
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Telefono">
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                    placeholder="+591 7XX XXX XX"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={
                    editingId
                      ? "Nueva contrasena (opcional)"
                      : "Contrasena (min. 6)"
                  }
                  required={!editingId}
                >
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                    placeholder={editingId ? "Dejar en blanco para mantener" : "******"}
                    required={!editingId}
                  />
                </Field>
                <Field
                  label={
                    editingId
                      ? "Confirmar nueva contrasena"
                      : "Confirmar contrasena"
                  }
                  required={!editingId}
                >
                  <Input
                    type="password"
                    value={form.password_confirm}
                    onChange={(e) => setForm((s) => ({ ...s, password_confirm: e.target.value }))}
                    placeholder="******"
                    required={!editingId}
                  />
                </Field>
              </div>

              <div className="flex flex-wrap items-center gap-5 rounded-xl bg-slate-50 p-4">
                <Toggle
                  checked={form.is_active}
                  onChange={(v) => setForm((s) => ({ ...s, is_active: v }))}
                  label="Usuario activo"
                  hint="Puede iniciar sesion"
                />
                <Toggle
                  checked={form.is_active_employee}
                  onChange={(v) => setForm((s) => ({ ...s, is_active_employee: v }))}
                  label="Empleado activo"
                  hint="Esta en planta"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button type="button" variant="secondary" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="mr-2 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Guardando...
                    </>
                  ) : editingId ? (
                    "Guardar cambios"
                  ) : (
                    "Crear usuario"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmacion de borrado */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setConfirmDelete(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
              <svg className="h-6 w-6 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900">
              Eliminar usuario
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Estas a punto de eliminar a{" "}
              <span className="font-semibold text-slate-800">{confirmDelete.username}</span>.
              Esta accion no se puede deshacer.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </Button>
              <button
                onClick={handleDelete}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required && <span className="text-rose-500">*</span>}
      </Label>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={[
          "relative inline-flex h-6 w-11 items-center rounded-full transition",
          checked ? "bg-brand-800" : "bg-slate-300",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition",
            checked ? "translate-x-6" : "translate-x-1",
          ].join(" ")}
        />
      </button>
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
      </div>
    </label>
  );
}

function RoleBadge({ role }) {
  const styles = {
    admin: "bg-brand-100 text-brand-800",
    supervisor: "bg-violet-100 text-violet-700",
    vendedor: "bg-lime-200 text-lime-900",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${styles[role] || "bg-slate-100 text-slate-600"}`}
    >
      {ROLE_LABEL[role] || role}
    </span>
  );
}

function PlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
function PencilIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function TrashIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
