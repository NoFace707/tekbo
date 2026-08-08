import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/routing/ProtectedRoute";
import AdminRoute from "./components/routing/AdminRoute";
import ManagementRoute from "./components/routing/ManagementRoute";
import PageLoader from "./components/routing/PageLoader";

// Eager
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/auth/LoginPage";
import VendedorPanelPage from "./pages/VendedorPanelPage";

// Lazy
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const AdminProductsPage = lazy(() => import("./pages/AdminProductsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SalesDocumentsPage = lazy(() => import("./pages/SalesDocumentsPage"));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Publicas */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protegidas: cualquier usuario autenticado */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/perfil" element={<ProfilePage />} />
              {/* Generador Tekbo: visible para cualquier usuario autenticado,
                  pensado para el rol vendedor. */}
              <Route path="/panel" element={<VendedorPanelPage />} />
            </Route>

            {/* Lectura gerencial de documentos de todos los vendedores */}
            <Route element={<ManagementRoute />}>
              <Route path="/documentos" element={<SalesDocumentsPage />} />
            </Route>

            {/* Solo admin */}
            <Route element={<AdminRoute />}>
              <Route path="/usuarios" element={<AdminUsersPage />} />
              <Route path="/productos" element={<AdminProductsPage />} />
            </Route>

            {/* Comodin */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
