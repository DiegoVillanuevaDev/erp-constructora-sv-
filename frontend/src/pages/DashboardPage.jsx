import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Warehouse,
  ClipboardCheck,
  Users,
  Landmark,
  ShieldAlert,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import {
  proyectosApi,
  bodegasApi,
  partidasApi,
  planillasApi,
  ventasApi,
  formatCurrencyUSD,
  formatNumber,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const PERMISO_BADGE = {
  APROBADO: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  EN_TRAMITE: 'bg-sky-50 text-sky-800 border-sky-300',
  OBSERVADO: 'bg-amber-50 text-amber-800 border-amber-300',
  PENDIENTE: 'bg-slate-100 text-slate-700 border-slate-300',
  RECHAZADO: 'bg-red-50 text-red-800 border-red-300',
};

const FASE_BADGE = {
  DISENO: 'bg-slate-100 text-slate-800 border-slate-300',
  TERRACERIA: 'bg-amber-50 text-amber-800 border-amber-300',
  OBRA_GRIS: 'bg-sky-50 text-sky-800 border-sky-300',
  ACABADOS: 'bg-indigo-50 text-indigo-800 border-indigo-300',
  FINALIZADO: 'bg-emerald-50 text-emerald-800 border-emerald-300',
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [proyectos, setProyectos] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [partidas, setPartidas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [proyRes, bodRes, partRes, empRes, uniRes] = await Promise.allSettled([
        proyectosApi.list(),
        bodegasApi.listBodegas(),
        partidasApi.list(),
        planillasApi.listEmpleados(),
        ventasApi.listUnidades(),
      ]);

      if (proyRes.status === 'fulfilled') setProyectos(proyRes.value.data || []);
      if (bodRes.status === 'fulfilled') setBodegas(bodRes.value.data || []);
      if (partRes.status === 'fulfilled') setPartidas(partRes.value.data || []);
      if (empRes.status === 'fulfilled') setEmpleados(empRes.value.data || []);
      if (uniRes.status === 'fulfilled') setUnidades(uniRes.value.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user?.rol]);

  // Cálculos dinámicos con .reduce() y .filter()
  const kpis = useMemo(() => {
    const presupuestoTotalCartera = proyectos.reduce(
      (acc, p) => acc + Number(p.presupuestoTotal || 0),
      0
    );
    const costoEjecutadoTotal = proyectos.reduce(
      (acc, p) => acc + Number(p.costoEjecutado || 0),
      0
    );
    const valorizacionTotalBodegas = bodegas.reduce(
      (acc, b) => acc + Number(b.valorTotalInventario || 0),
      0
    );

    const proyectosHabilitados = proyectos.filter(
      (p) => p.estadoRegulatorio?.habilitadoParaConstruccion
    );
    const proyectosBloqueados = proyectos.filter(
      (p) => !p.estadoRegulatorio?.habilitadoParaConstruccion
    );

    const unidadesDisponibles = unidades.filter((u) => u.estado === 'DISPONIBLE');
    const valorCarteraInmobiliaria = unidadesDisponibles.reduce(
      (acc, u) => acc + Number(u.precioLista || 0),
      0
    );

    const porcentajeEjecucionGlobal =
      presupuestoTotalCartera > 0
        ? (costoEjecutadoTotal / presupuestoTotalCartera) * 100
        : 0;

    return {
      presupuestoTotalCartera,
      costoEjecutadoTotal,
      valorizacionTotalBodegas,
      proyectosHabilitadosCount: proyectosHabilitados.length,
      proyectosBloqueadosCount: proyectosBloqueados.length,
      unidadesDisponiblesCount: unidadesDisponibles.length,
      valorCarteraInmobiliaria,
      porcentajeEjecucionGlobal,
    };
  }, [proyectos, bodegas, unidades]);

  return (
    <div className="space-y-6">
      {/* Encabezado Ejecutivo */}
      <div className="bg-white border border-slate-200 rounded-md p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              CONSOLIDADO OPERATIVO EL SALVADOR
            </span>
            <span className="font-mono text-xs text-slate-500">
              ROL ACTIVO: <strong className="text-slate-900">{user?.rol}</strong>
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Tablero de Control de Ingeniería, Inventarios y Finanzas Inmobiliarias
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Indicadores calculados en tiempo real sobre presupuestos de obra, semáforo regulatorio
            (OPAMSS, MARN, ANDA) y existencias valorizadas.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboardData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar Indicadores
        </button>
      </div>

      {/* Tarjetas KPI Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Presupuesto Total de Cartera */}
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>PRESUPUESTO TOTAL DE CARTERA</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrencyUSD(kpis.presupuestoTotalCartera)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>PROYECTOS ACTIVOS: {proyectos.length}</span>
            <span className="text-slate-700 font-semibold">MONEDA USD</span>
          </div>
        </div>

        {/* KPI 2: Costo Ejecutado en Obra */}
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>COSTO EJECUTADO EN OBRA</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrencyUSD(kpis.costoEjecutadoTotal)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>EJECUCIÓN FINANCIERA:</span>
            <span className="text-amber-700 font-semibold tabular-nums">
              {formatNumber(kpis.porcentajeEjecucionGlobal)}%
            </span>
          </div>
        </div>

        {/* KPI 3: Valorización en Bodegas Multi-sitio */}
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>VALORIZACIÓN EN BODEGAS</span>
            <Warehouse className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrencyUSD(kpis.valorizacionTotalBodegas)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>SITIOS ACTIVOS: {bodegas.length}</span>
            <span className="text-sky-700 font-semibold">CENTRAL + OBRAS</span>
          </div>
        </div>

        {/* KPI 4: Estado Regulatorio SV (Habilitados vs Bloqueados) */}
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>GUARDIA REGULATORIA SV</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-3 font-mono tabular-nums">
            <div>
              <span className="text-2xl font-bold text-emerald-700">
                {kpis.proyectosHabilitadosCount}
              </span>
              <span className="text-xs text-slate-500 ml-1">HABILITADOS</span>
            </div>
            <span className="text-slate-300">/</span>
            <div>
              <span className="text-2xl font-bold text-amber-600">
                {kpis.proyectosBloqueadosCount}
              </span>
              <span className="text-xs text-slate-500 ml-1">EN DISEÑO (BLOQ.)</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] font-mono text-slate-500">
            REQUISITO: OPAMSS + MARN + ANDA
          </div>
        </div>
      </div>

      {/* Tabla Resumen de Proyectos y Semáforo Regulatorio SV */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Matriz de Proyectos y Semáforo Regulatorio (OPAMSS · MARN · ANDA)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Estado de factibilidades legales requeridas en El Salvador para habilitar fases de
              Terracería y Obra Gris.
            </p>
          </div>
          <Link
            to="/proyectos"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors"
          >
            Gestionar Permisos y Fases
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500">
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Proyecto / Ubicación</th>
                <th className="py-3 px-4">Fase Constructiva</th>
                <th className="py-3 px-4">Semáforo OPAMSS · MARN · ANDA</th>
                <th className="py-3 px-4">Dictamen Legal</th>
                <th className="py-3 px-4 text-right">Presupuesto USD</th>
                <th className="py-3 px-4 text-right">Costo Ejecutado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {proyectos.map((proy) => {
                const hab = proy.estadoRegulatorio?.habilitadoParaConstruccion;
                return (
                  <tr key={proy.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {proy.codigo}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{proy.nombre}</div>
                      <div className="text-[11px] text-slate-500">{proy.ubicacion}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`font-mono text-[11px] font-semibold px-2.5 py-1 rounded border ${
                          FASE_BADGE[proy.faseActual] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {proy.faseActual}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(proy.permisos || []).map((perm) => (
                          <span
                            key={perm.institucion}
                            className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded border ${
                              PERMISO_BADGE[perm.estado] || PERMISO_BADGE.PENDIENTE
                            }`}
                          >
                            {perm.institucion}: {perm.estado}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {hab ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          3/3 HABILITADO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          {proy.estadoRegulatorio?.aprobados || 0}/3 BLOQUEO FASE
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatCurrencyUSD(proy.presupuestoTotal)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                      {formatCurrencyUSD(proy.costoEjecutado)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accesos Rápidos a los 5 Módulos Operativos */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Link
          to="/proyectos"
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-md p-4 transition-colors group"
        >
          <div className="flex items-center justify-between mb-2">
            <Building2 className="w-5 h-5 text-amber-600" />
            <span className="font-mono text-[10px] text-slate-400 group-hover:text-slate-700">
              MÓDULO 01 →
            </span>
          </div>
          <h4 className="text-xs font-bold text-slate-900">Proyectos y Permisos SV</h4>
          <p className="text-[11px] text-slate-500 mt-1">
            Control de factibilidades OPAMSS, MARN y ANDA y avance de fases constructivas.
          </p>
        </Link>

        <Link
          to="/bodegas"
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-md p-4 transition-colors group"
        >
          <div className="flex items-center justify-between mb-2">
            <Warehouse className="w-5 h-5 text-sky-600" />
            <span className="font-mono text-[10px] text-slate-400 group-hover:text-slate-700">
              MÓDULO 02 →
            </span>
          </div>
          <h4 className="text-xs font-bold text-slate-900">Bodegas Multi-sitio</h4>
          <p className="text-[11px] text-slate-500 mt-1">
            {bodegas.length} bodegas activas. Traslados transaccionales Central → Obra.
          </p>
        </Link>

        <Link
          to="/partidas"
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-md p-4 transition-colors group"
        >
          <div className="flex items-center justify-between mb-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-600" />
            <span className="font-mono text-[10px] text-slate-400 group-hover:text-slate-700">
              MÓDULO 03 →
            </span>
          </div>
          <h4 className="text-xs font-bold text-slate-900">Partidas y Avance Físico</h4>
          <p className="text-[11px] text-slate-500 mt-1">
            {partidas.length} partidas registradas con descarga automática de receta.
          </p>
        </Link>

        <Link
          to="/planillas"
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-md p-4 transition-colors group"
        >
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span className="font-mono text-[10px] text-slate-400 group-hover:text-slate-700">
              MÓDULO 04 →
            </span>
          </div>
          <h4 className="text-xs font-bold text-slate-900">Planilla Dual SV</h4>
          <p className="text-[11px] text-slate-500 mt-1">
            {empleados.length} empleados activos. Motor ISSS (3%), AFP (7.25%) e ISR MH.
          </p>
        </Link>

        <Link
          to="/ventas"
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-md p-4 transition-colors group"
        >
          <div className="flex items-center justify-between mb-2">
            <Landmark className="w-5 h-5 text-teal-600" />
            <span className="font-mono text-[10px] text-slate-400 group-hover:text-slate-700">
              MÓDULO 05 →
            </span>
          </div>
          <h4 className="text-xs font-bold text-slate-900">Ventas CRM &amp; Fiscal DTE</h4>
          <p className="text-[11px] text-slate-500 mt-1">
            {kpis.unidadesDisponiblesCount} unidades disponibles ({formatCurrencyUSD(kpis.valorCarteraInmobiliaria)}).
          </p>
        </Link>
      </div>
    </div>
  );
};

export default DashboardPage;
