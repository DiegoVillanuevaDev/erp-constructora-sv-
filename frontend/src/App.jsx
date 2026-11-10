import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProyectosPage from './pages/ProyectosPage';
import BodegasPage from './pages/BodegasPage';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const ModuleStep2Placeholder = ({ code, title, description }) => (
  <div className="bg-white border border-slate-200 rounded-md p-6">
    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-amber-400">
      {code}
    </span>
    <h2 className="text-lg font-bold text-slate-900 mt-2">{title}</h2>
    <p className="text-xs text-slate-500 mt-1">{description}</p>
  </div>
);

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="proyectos" element={<ProyectosPage />} />
        <Route path="bodegas" element={<BodegasPage />} />
        <Route
          path="partidas"
          element={
            <ModuleStep2Placeholder
              code="MÓDULO 03"
              title="Ejecución de Obra, Recetas y Reportes de Avance Físico"
              description="Vista operativa lista para integración de PartidasPage."
            />
          }
        />
        <Route
          path="planillas"
          element={
            <ModuleStep2Placeholder
              code="MÓDULO 04"
              title="Recursos Humanos y Nómina Dual de El Salvador (ISSS, AFP, ISR)"
              description="Vista operativa lista para integración de PlanillasPage."
            />
          }
        />
        <Route
          path="ventas"
          element={
            <ModuleStep2Placeholder
              code="MÓDULO 05"
              title="Ventas CRM, Amortización Francesa y Facturación Fiscal DTE (13% IVA)"
              description="Vista operativa lista para integración de VentasPage."
            />
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
