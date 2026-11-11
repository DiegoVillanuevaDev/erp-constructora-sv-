import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProyectosPage from './pages/ProyectosPage';
import BodegasPage from './pages/BodegasPage';
import PartidasPage from './pages/PartidasPage';
import PlanillasPage from './pages/PlanillasPage';
import VentasPage from './pages/VentasPage';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

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
        <Route path="partidas" element={<PartidasPage />} />
        <Route path="planillas" element={<PlanillasPage />} />
        <Route path="ventas" element={<VentasPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
