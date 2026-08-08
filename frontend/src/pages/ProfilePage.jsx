import { useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../lib/utils";
import { changePassword, ROLE_LABEL } from "../services/authService";

export default function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    newPasswordConfirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (form.newPassword !== form.newPasswordConfirm) {
      setError("Las contrasenas nuevas no coinciden.");
      return;
    }
    if (form.newPassword.length < 6) {
      setError("La nueva contrasena debe tener al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await changePassword(form);
      setSuccess("Contrasena actualizada correctamente.");
      setForm({ currentPassword: "", newPassword: "", newPasswordConfirm: "" });
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cambiar la contrasena."));
    } finally {
      setLoading(false);
    }
  };

  const initials =
    (user?.first_name?.[0] || "") + (user?.last_name?.[0] || "") ||
    (user?.username?.[0] || "U");

  return (
    <MainLayout title="Mi perfil" subtitle="Datos de tu cuenta">
      <section className="grid gap-5 lg:grid-cols-3">
        {/* Tarjeta resumen */}
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-800 text-2xl font-bold text-white">
              {initials.toUpperCase()}
            </div>
            <p className="mt-4 font-display text-lg font-bold text-slate-900">
              {(user?.first_name || user?.last_name)
                ? `${user?.first_name || ""} ${user?.last_name || ""}`.trim()
                : user?.username}
            </p>
            <p className="text-sm text-slate-500">@{user?.username}</p>
            <span className="mt-3 inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
              {ROLE_LABEL[user?.role] || user?.role}
            </span>
          </CardContent>
        </Card>

        {/* Datos + cambio de clave */}
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-display text-sm font-bold text-slate-800">
                Datos de la cuenta
              </h3>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Usuario" value={user?.username} />
                <Field label="Email" value={user?.email || "—"} />
                <Field label="Nombre" value={user?.first_name || "—"} />
                <Field label="Apellido" value={user?.last_name || "—"} />
                <Field label="Rol" value={ROLE_LABEL[user?.role] || user?.role} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-display text-sm font-bold text-slate-800">
                Cambiar contrasena
              </h3>
              {error && (
                <Alert tone="danger" className="mt-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert tone="success" className="mt-4">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="currentPassword">Contrasena actual</Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={form.currentPassword}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword">Nueva contrasena</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={form.newPassword}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="newPasswordConfirm">Repetir nueva contrasena</Label>
                    <Input
                      id="newPasswordConfirm"
                      name="newPasswordConfirm"
                      type="password"
                      value={form.newPasswordConfirm}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Guardando..." : "Actualizar contrasena"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </MainLayout>
  );
}

function Field({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}
