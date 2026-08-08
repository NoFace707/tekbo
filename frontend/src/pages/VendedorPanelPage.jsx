/**
 * VendedorPanelPage.jsx
 *
 * Single Responsibility: página del generador Tekbo para el rol vendedor.
 * Envuelve TekboControlPanel dentro de MainLayout para reutilizar sidebar,
 * header y auth.
 */

import MainLayout from "../components/layout/MainLayout";
import TekboControlPanel from "../components/tekbo/TekboControlPanel";
import { ROLE_LABEL } from "../services/authService";
import { useAuth } from "../context/AuthContext";

export default function VendedorPanelPage() {
  const { user } = useAuth();
  return (
    <MainLayout
      title="Generador Tekbo"
      subtitle={ROLE_LABEL[user?.role] || user?.role}
    >
      <TekboControlPanel />
    </MainLayout>
  );
}
