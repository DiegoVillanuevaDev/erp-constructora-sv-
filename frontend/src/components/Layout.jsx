import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  LayoutDashboard,
  HardHat,
  Warehouse,
  ClipboardCheck,
  Users,
  Landmark,
  ShieldCheck,
  FileCode2,
  LogOut,
  ChevronRight,
  Lock,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  {
    path: '/',
    label: 'Resumen Ejecutivo',
    code: 'MOD-00',
    icon: LayoutDashboard,
    allowedRoles: ['ADMIN', 'DIRECTOR_PROYECTO', 'INGENIERO_RESIDENTE', 'BODEGUERO', 'RRHH', 'VENTAS'],
    moduleTag: 'DASHBOARD GERENCIAL',
  },
  {
    path: '/proyectos',
    label: '1. Proyectos y Permisos',
    code: 'MOD-01',
    icon: Building2,
    allowedRoles: ['ADMIN', 'DIRECTOR_PROYECTO', 'INGENIERO_RESIDENTE', 'BODEGUERO', 'RRHH', 'VENTAS'],
    moduleTag: 'OPAMSS · MARN · ANDA',
  },
  {
    path: '/bodegas',
    label: '2. Bodegas e Inventario',
    code: 'MOD-02',
    icon: Warehouse,
    allowedRoles: ['ADMIN', 'DIRECTOR_PROYECTO', 'INGENIERO_RESIDENTE', 'BODEGUERO'],
    moduleTag: 'LOGÍSTICA MULTI-SITIO',
  },
  {
    path: '/partidas',
    label: '3. Partidas y Avance',
    code: 'MOD-03',
    icon: ClipboardCheck,
    allowedRoles: ['ADMIN', 'DIRECTOR_PROYECTO', 'INGENIERO_RESIDENTE', 'BODEGUERO'],
    moduleTag: 'CONTROL FÍSICO DE OBRA',
  },
  {
    path: '/planillas',
    label: '4. Planilla Dual SV',
    code: 'MOD-04',
    icon: Users,
    allowedRoles: ['ADMIN', 'DIRECTOR_PROYECTO', 'RRHH'],
    moduleTag: 'ISSS · AFP · ISR MH SV',
  },
  {
    path: '/ventas',
    label: '5. Ventas e Inmobiliaria',
    code: 'MOD-05',
    icon: Landmark,
    allowedRoles: ['ADMIN', 'DIRECTOR_PROYECTO', 'INGENIERO_RESIDENTE', 'VENTAS'],
    moduleTag: 'CRM · DTE-01 / DTE-03',
  },
];

const ROLE_BADGE_STYLES = {
  ADMIN: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  DIRECTOR_PROYECTO: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  INGENIERO_RESIDENTE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  BODEGUERO: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
  RRHH: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40',
  VENTAS: 'bg-teal-500/15 text-teal-300 border-teal-500/40',
};

const Layout = () => {
  const { user, logout, switchRoleDemo, currentRolePermits, seedUsers } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);

  const currentNav =
    NAV_ITEMS.find((item) =>
      item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
    ) || NAV_ITEMS[0];

  const handleRoleChange = async (e) => {
    const newRole = e.target.value;
    if (!newRole || newRole === user?.rol) return;
    setSwitchingRole(true);
    try {
      await switchRoleDemo(newRole);
    } finally {
      setSwitchingRole(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row text-slate-900">
      {/* Sidebar Corporativo Fijo (Desktop) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0 select-none">
        {/* Identidad de Marca Ingeniería Civil */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-amber-600 flex items-center justify-center text-white shadow-sm">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-sm">TERRACOTA</span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                  SV-ERP
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Ingeniería &amp; Desarrollo Inmobiliario
              </p>
            </div>
          </div>
        </div>

        {/* Ficha del Usuario Activo en Sidebar */}
        <div className="px-4 py-3.5 border-b border-slate-800/80 bg-slate-900/90">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              SESIÓN OPERATIVA RBAC
            </span>
            <span
              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                ROLE_BADGE_STYLES[user?.rol] || 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {user?.rol}
            </span>
          </div>
          <p className="text-xs font-medium text-white truncate">{user?.nombre}</p>
          <p className="text-[11px] font-mono text-slate-400 truncate">{user?.email}</p>
        </div>

        {/* Navegación de Módulos ERP */}
        <div className="flex-1 py-4 overflow-y-auto">
          <div className="px-4 mb-2">
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              MÓDULOS TRANSACCIONALES
            </p>
          </div>
          <nav className="space-y-0.5 px-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const hasAccess = item.allowedRoles.includes(user?.rol);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `group flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-r-md transition-colors border-l-4 ${
                      isActive
                        ? 'border-amber-500 bg-slate-800/80 text-white'
                        : 'border-transparent text-slate-300 hover:bg-slate-800/50 hover:text-white'
                    }`
                  }
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-amber-400 transition-colors" />
                    <div className="truncate">
                      <div className="truncate">{item.label}</div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {item.moduleTag}
                      </div>
                    </div>
                  </div>
                  {!hasAccess ? (
                    <span
                      title="Rol con restricción RBAC en este módulo"
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1"
                    >
                      <Lock className="w-2.5 h-2.5" />
                    </span>
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 shrink-0" />
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Matriz de Cumplimiento Normativo El Salvador */}
          <div className="mt-6 mx-3 p-3 rounded-md bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2 text-amber-400 mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">
                MARCO REGULATORIO SV
              </span>
            </div>
            <ul className="space-y-1 text-[11px] text-slate-400 font-mono">
              <li className="flex justify-between">
                <span>Permisología:</span>
                <span className="text-slate-200">OPAMSS · MARN · ANDA</span>
              </li>
              <li className="flex justify-between">
                <span>ISSS / AFP:</span>
                <span className="text-slate-200 tabular-nums">3.00% / 7.25%</span>
              </li>
              <li className="flex justify-between">
                <span>Tope ISSS Mes:</span>
                <span className="text-slate-200 tabular-nums">$1,000.00</span>
              </li>
              <li className="flex justify-between">
                <span>IVA DTE MH:</span>
                <span className="text-slate-200 tabular-nums">13.00%</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Pie de Sidebar: Swagger OpenAPI + Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 space-y-2">
          <a
            href="/api/v1/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-md bg-slate-800/70 hover:bg-slate-800 text-xs text-slate-200 border border-slate-700 transition-colors"
          >
            <span className="flex items-center gap-2 font-medium">
              <FileCode2 className="w-4 h-4 text-amber-400" />
              Especificación OpenAPI 3.0
            </span>
            <span className="font-mono text-[10px] text-amber-400">/api/v1/docs</span>
          </a>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-slate-900 hover:bg-red-950/50 text-xs font-medium text-slate-300 hover:text-red-300 border border-slate-800 hover:border-red-800/60 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar Sesión Segura
          </button>
        </div>
      </aside>

      {/* Contenedor Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Técnico Superior */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            {/* Izquierda: Ruta activa y descripción de matriz RBAC */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100"
                aria-label="Abrir menú de navegación"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {currentNav.code}
                  </span>
                  <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    {currentNav.label}
                  </h1>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {currentRolePermits?.descripcion ||
                    'Control de operaciones e ingeniería bajo normativa de El Salvador'}
                </p>
              </div>
            </div>

            {/* Derecha: Selector Rápido de Rol RBAC (Demo en 1 clic) + Permisos Activos + OpenAPI */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Chips de Permisos Activos del Rol */}
              <div className="hidden xl:flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-200">
                <span className="text-[10px] font-mono uppercase text-slate-500">
                  ALCANCE RBAC:
                </span>
                {(currentRolePermits?.modulosPermitidos || []).slice(0, 3).map((mod) => (
                  <span
                    key={mod}
                    className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200"
                  >
                    {mod}
                  </span>
                ))}
                {(currentRolePermits?.modulosPermitidos || []).length > 3 && (
                  <span className="font-mono text-[10px] text-slate-500">
                    +{currentRolePermits.modulosPermitidos.length - 3}
                  </span>
                )}
              </div>

              {/* Selector Rápido de Rol RBAC para Demostración Técnica */}
              <div className="flex items-center gap-2 bg-slate-900 text-white px-2.5 py-1.5 rounded-md border border-slate-800">
                <label
                  htmlFor="rbac-role-switcher"
                  className="text-[10px] font-mono uppercase tracking-wider text-amber-400 whitespace-nowrap"
                >
                  ROL RBAC:
                </label>
                <select
                  id="rbac-role-switcher"
                  value={user?.rol || 'ADMIN'}
                  onChange={handleRoleChange}
                  disabled={switchingRole}
                  className="bg-slate-800 text-white font-mono text-xs px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {seedUsers.map((u) => (
                    <option key={u.rol} value={u.rol}>
                      {u.rol} — {u.nombre.split('(')[0].trim()}
                    </option>
                  ))}
                </select>
              </div>

              <a
                href="/api/v1/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-mono font-medium text-slate-700 transition-colors"
              >
                <FileCode2 className="w-3.5 h-3.5 text-amber-600" />
                OpenAPI
              </a>
            </div>
          </div>

          {/* Menú Móvil Desplegable */}
          {mobileMenuOpen && (
            <div className="lg:hidden bg-slate-900 text-slate-200 px-3 py-3 border-t border-slate-800 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded text-xs font-medium border-l-4 ${
                        isActive
                          ? 'border-amber-500 bg-slate-800 text-white'
                          : 'border-transparent text-slate-300 hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-amber-400" />
                      {item.label}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">{item.code}</span>
                  </NavLink>
                );
              })}
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <a
                  href="/api/v1/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-amber-400"
                >
                  /api/v1/docs (Swagger UI)
                </a>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs text-red-400 font-medium flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" /> Salir
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Área de Contenido de Vistas */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
