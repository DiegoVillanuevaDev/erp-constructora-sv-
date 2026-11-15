import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Warehouse,
  Lock,
  ArrowRight,
  X,
} from 'lucide-react';
import {
  proyectosApi,
  formatCurrencyUSD,
  formatDateSV,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const FASES = ['DISENO', 'TERRACERIA', 'OBRA_GRIS', 'ACABADOS', 'FINALIZADO'];
const ESTADOS_PERMISO = ['PENDIENTE', 'EN_TRAMITE', 'OBSERVADO', 'APROBADO', 'RECHAZADO'];

const PERMISO_STYLES = {
  APROBADO: 'bg-emerald-50 text-emerald-900 border-emerald-300',
  EN_TRAMITE: 'bg-sky-50 text-sky-900 border-sky-300',
  OBSERVADO: 'bg-amber-50 text-amber-900 border-amber-300',
  PENDIENTE: 'bg-slate-100 text-slate-800 border-slate-300',
  RECHAZADO: 'bg-red-50 text-red-900 border-red-300',
};

const FASE_STYLES = {
  DISENO: 'bg-slate-100 text-slate-800 border-slate-300',
  TERRACERIA: 'bg-amber-50 text-amber-900 border-amber-300',
  OBRA_GRIS: 'bg-sky-50 text-sky-900 border-sky-300',
  ACABADOS: 'bg-indigo-50 text-indigo-900 border-indigo-300',
  FINALIZADO: 'bg-emerald-50 text-emerald-900 border-emerald-300',
};

const ProyectosPage = () => {
  const { user, hasRole } = useAuth();
  const canManagePermits = hasRole('ADMIN', 'DIRECTOR_PROYECTO');
  const canChangePhase = hasRole('ADMIN', 'DIRECTOR_PROYECTO', 'INGENIERO_RESIDENTE');

  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroFase, setFiltroFase] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Alertas de bloqueo regulatorio HTTP 422 o confirmaciones de operación
  const [legalErrorBanner, setLegalErrorBanner] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  // Estado para edición rápida de número de expediente por permiso
  const [expedientesEdit, setExpedientesEdit] = useState({});

  // Modal de creación de nuevo proyecto
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProyectoForm, setNewProyectoForm] = useState({
    codigo: 'PROY-SV-003',
    nombre: '',
    ubicacion: '',
    presupuestoTotal: '',
    fechaInicio: '2026-03-01',
    fechaFinEstimada: '2027-12-31',
    faseActual: 'DISENO',
  });

  const fetchProyectos = async () => {
    setLoading(true);
    try {
      const response = await proyectosApi.list();
      const lista = response.data || [];
      setProyectos(lista);

      const expMap = {};
      lista.forEach((p) => {
        (p.permisos || []).forEach((perm) => {
          expMap[`${p.id}-${perm.institucion}`] = perm.numeroExpediente || '';
        });
      });
      setExpedientesEdit(expMap);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProyectos();
  }, []);

  const proyectosFiltrados = useMemo(() => {
    return proyectos
      .filter((p) => (!filtroFase ? true : p.faseActual === filtroFase))
      .filter((p) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase().trim();
        return (
          p.codigo.toLowerCase().includes(q) ||
          p.nombre.toLowerCase().includes(q) ||
          p.ubicacion.toLowerCase().includes(q)
        );
      });
  }, [proyectos, filtroFase, searchTerm]);

  const handleUpdatePermiso = async (proyecto, institucion, nuevoEstado) => {
    setLegalErrorBanner(null);
    setSuccessBanner(null);

    const key = `${proyecto.id}-${institucion}`;
    const expActual =
      expedientesEdit[key] ||
      (nuevoEstado === 'APROBADO' ? `${institucion}-APR-2026-${Math.floor(100 + Math.random() * 900)}` : '');

    try {
      const res = await proyectosApi.updatePermiso(proyecto.id, institucion, {
        estado: nuevoEstado,
        numeroExpediente: expActual || null,
      });

      setSuccessBanner(
        res.message ||
          `Permiso regulatorio ${institucion} de '${proyecto.codigo}' actualizado a ${nuevoEstado}.`
      );
      await fetchProyectos();
    } catch (error) {
      const data = error.response?.data;
      setLegalErrorBanner({
        status: error.response?.status || 400,
        errorCode: data?.errorCode || 'PERMISO_UPDATE_ERROR',
        message: data?.message || 'No se pudo actualizar el permiso regulatorio.',
        details: data?.details || null,
      });
    }
  };

  const handleCambiarFase = async (proyecto, nuevaFase) => {
    if (nuevaFase === proyecto.faseActual) return;
    setLegalErrorBanner(null);
    setSuccessBanner(null);

    try {
      const res = await proyectosApi.cambiarFase(proyecto.id, { nuevaFase });
      setSuccessBanner(
        res.message ||
          `El proyecto '${proyecto.codigo}' avanzó exitosamente a la fase '${nuevaFase}'.`
      );
      await fetchProyectos();
    } catch (error) {
      const data = error.response?.data;
      setLegalErrorBanner({
        status: error.response?.status || 422,
        errorCode: data?.errorCode || 'LEGAL_PERMITS_NOT_APPROVED',
        message:
          data?.message ||
          `Bloqueo Regulatorio SV: El proyecto '${proyecto.codigo}' no puede avanzar a '${nuevaFase}' sin los 3 permisos aprobados.`,
        details: data?.details || null,
      });
    }
  };

  const handleCreateProyecto = async (e) => {
    e.preventDefault();
    setCreating(true);
    setLegalErrorBanner(null);
    setSuccessBanner(null);

    try {
      const res = await proyectosApi.create({
        ...newProyectoForm,
        presupuestoTotal: Number(newProyectoForm.presupuestoTotal),
      });
      setSuccessBanner(
        res.message || `Proyecto '${res.data?.codigo}' registrado con sus 3 permisos y bodega.`
      );
      setShowCreateModal(false);
      setNewProyectoForm({
        codigo: `PROY-SV-00${proyectos.length + 2}`,
        nombre: '',
        ubicacion: '',
        presupuestoTotal: '',
        fechaInicio: '2026-03-01',
        fechaFinEstimada: '2027-12-31',
        faseActual: 'DISENO',
      });
      await fetchProyectos();
    } catch (error) {
      const data = error.response?.data;
      setLegalErrorBanner({
        status: error.response?.status || 400,
        errorCode: data?.errorCode || 'PROYECTO_CREATE_ERROR',
        message: data?.message || 'Error al registrar el proyecto.',
        details: data?.details || null,
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado del Módulo 1 */}
      <div className="bg-white border border-slate-200 rounded-md p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-900 text-amber-400">
              MÓDULO 01
            </span>
            <span className="font-mono text-xs text-slate-500">
              GUARDIA REGULATORIA: OPAMSS · MARN · ANDA
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Planificación de Proyectos y Permisología Salvadoreña
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ningún proyecto puede avanzar de <code className="font-mono">DISENO</code> a{' '}
            <code className="font-mono">TERRACERIA</code> u <code className="font-mono">OBRA_GRIS</code>{' '}
            si sus 3 factibilidades institucionales no se encuentran en estado{' '}
            <code className="font-mono font-semibold text-emerald-700">APROBADO</code>.
          </p>
        </div>

        {canManagePermits ? (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Proyecto + Bodega
          </button>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100 border border-slate-200 text-xs font-mono text-slate-600">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            Modo Lectura para Rol {user?.rol}
          </div>
        )}
      </div>

      {/* Banner de Alerta Legal HTTP 422 (LEGAL_PERMITS_NOT_APPROVED) */}
      {legalErrorBanner && (
        <div
          role="alert"
          className="bg-red-50 border-l-4 border-l-red-600 border border-red-200 rounded-md p-4 text-xs text-red-900"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold px-2 py-0.5 rounded bg-red-900 text-white text-[11px]">
                    HTTP {legalErrorBanner.status} · {legalErrorBanner.errorCode}
                  </span>
                  <span className="font-bold text-sm text-red-900">
                    Transición Constructiva Bloqueada por Normativa Salvadoreña
                  </span>
                </div>
                <p className="mt-1.5 text-red-800 leading-relaxed">{legalErrorBanner.message}</p>

                {Array.isArray(legalErrorBanner.details?.permisosBloqueantes) && (
                  <div className="mt-3 p-3 rounded bg-white border border-red-200">
                    <p className="font-mono text-[11px] font-bold uppercase text-red-900 mb-2">
                      Instituciones Regulatorias Bloqueantes Detectadas:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {legalErrorBanner.details.permisosBloqueantes.map((b) => (
                        <div
                          key={b.institucion}
                          className="p-2 rounded bg-red-50/70 border border-red-200 font-mono text-[11px]"
                        >
                          <div className="font-bold text-red-900">{b.institucion}</div>
                          <div className="text-red-700">Estado actual: {b.estadoActual}</div>
                          <div className="text-slate-600 truncate">
                            Exp: {b.numeroExpediente || 'Sin expediente'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLegalErrorBanner(null)}
              className="text-red-500 hover:text-red-800 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Banner de Confirmación Exitosa */}
      {successBanner && (
        <div className="bg-emerald-50 border-l-4 border-l-emerald-600 border border-emerald-200 rounded-md p-3.5 flex items-center justify-between gap-3 text-xs text-emerald-900">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-600 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Barra de Filtros por Fase y Buscador */}
      <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-xs uppercase text-slate-500 mr-1">Fase:</span>
          <button
            type="button"
            onClick={() => setFiltroFase('')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium border transition-colors ${
              filtroFase === ''
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            TODAS ({proyectos.length})
          </button>
          {FASES.map((fase) => (
            <button
              key={fase}
              type="button"
              onClick={() => setFiltroFase(fase)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium border transition-colors ${
                filtroFase === fase
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {fase}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código o nombre..."
            className="w-full pl-9 pr-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:bg-white focus:border-slate-900"
          />
        </div>
      </div>

      {/* Listado de Fichas Técnicas de Proyectos */}
      <div className="space-y-5">
        {proyectosFiltrados.map((proyecto) => {
          const hab = proyecto.estadoRegulatorio?.habilitadoParaConstruccion;
          const aprobadosCount = proyecto.estadoRegulatorio?.aprobados || 0;

          return (
            <div
              key={proyecto.id}
              className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm"
            >
              {/* Cabecera del Proyecto */}
              <div className="px-5 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-amber-500 text-slate-950">
                    {proyecto.codigo}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">{proyecto.nombre}</h3>
                    <p className="text-xs text-slate-300">{proyecto.ubicacion}</p>
                  </div>
                </div>

                {/* Estado Regulatorio y Selector de Fase Constructiva */}
                <div className="flex items-center gap-3 flex-wrap">
                  {hab ? (
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <ShieldCheck className="w-4 h-4" />
                      3/3 PERMISOS APROBADOS · HABILITADO
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <AlertTriangle className="w-4 h-4" />
                      {aprobadosCount}/3 PERMISOS · BLOQUEO CONSTRUCTIVO
                    </span>
                  )}

                  <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded border border-slate-700">
                    <span className="font-mono text-[10px] uppercase text-slate-400">
                      FASE ACTUAL:
                    </span>
                    {canChangePhase ? (
                      <select
                        aria-label={`Cambiar fase de ${proyecto.codigo}`}
                        value={proyecto.faseActual}
                        onChange={(e) => handleCambiarFase(proyecto, e.target.value)}
                        className="bg-slate-900 text-amber-400 font-mono text-xs font-bold px-2 py-0.5 rounded border border-slate-600 focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        {FASES.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-mono text-xs font-bold text-amber-400">
                        {proyecto.faseActual}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Resumen Financiero y Logístico del Proyecto */}
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">
                    PRESUPUESTO TOTAL
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                    {formatCurrencyUSD(proyecto.presupuestoTotal)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">
                    COSTO EJECUTADO EN OBRA
                  </span>
                  <span className="font-mono text-sm font-bold text-amber-700 tabular-nums">
                    {formatCurrencyUSD(proyecto.costoEjecutado)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">
                    BODEGA DE OBRA VINCULADA
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                    <Warehouse className="w-3.5 h-3.5 text-sky-600" />
                    {proyecto.bodega?.codigo || `BOD-${proyecto.codigo}`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">
                    CRONOGRAMA ESTIMADO
                  </span>
                  <span className="font-mono text-xs text-slate-700 tabular-nums">
                    {formatDateSV(proyecto.fechaInicio)} → {formatDateSV(proyecto.fechaFinEstimada)}
                  </span>
                </div>
              </div>

              {/* Semáforo Regulatorio Interactivo: OPAMSS, MARN, ANDA */}
              <div className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Semáforo Regulatorio de El Salvador (OPAMSS · MARN · ANDA)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {canManagePermits
                        ? 'Actualice el estado de cada institución o pruebe avanzar de fase para verificar la Guardia Regulatoria HTTP 422.'
                        : 'Vista de auditoría de permisos institucionales (Edición reservada a ADMIN y DIRECTOR_PROYECTO).'}
                    </p>
                  </div>

                  {/* Botones de Prueba Rápida de Guardia Regulatoria */}
                  {canChangePhase && proyecto.faseActual === 'DISENO' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCambiarFase(proyecto, 'TERRACERIA')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-semibold transition-colors"
                      >
                        <span>Avanzar a TERRACERIA</span>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(proyecto.permisos || []).map((perm) => {
                    const inputKey = `${proyecto.id}-${perm.institucion}`;
                    return (
                      <div
                        key={perm.institucion}
                        className="border border-slate-200 rounded-md p-3.5 bg-slate-50/60 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-mono text-sm font-bold text-slate-900">
                              {perm.institucion}
                            </span>
                            <span
                              className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded border ${
                                PERMISO_STYLES[perm.estado] || PERMISO_STYLES.PENDIENTE
                              }`}
                            >
                              {perm.estado}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 mb-3">
                            {perm.observaciones ||
                              `Expediente regulatorio ante ${perm.institucion}`}
                          </p>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-200/80">
                          <div>
                            <label className="block font-mono text-[10px] uppercase text-slate-500 mb-1">
                              N° de Expediente Oficial
                            </label>
                            <input
                              type="text"
                              disabled={!canManagePermits}
                              value={expedientesEdit[inputKey] ?? perm.numeroExpediente ?? ''}
                              onChange={(e) =>
                                setExpedientesEdit((prev) => ({
                                  ...prev,
                                  [inputKey]: e.target.value,
                                }))
                              }
                              placeholder={`Ej. ${perm.institucion}-2026-001`}
                              className="w-full px-2.5 py-1 text-xs font-mono bg-white border border-slate-300 rounded disabled:bg-slate-100 disabled:text-slate-500"
                            />
                          </div>

                          <div>
                            <label className="block font-mono text-[10px] uppercase text-slate-500 mb-1">
                              Dictamen Institucional
                            </label>
                            <select
                              disabled={!canManagePermits}
                              value={perm.estado}
                              onChange={(e) =>
                                handleUpdatePermiso(proyecto, perm.institucion, e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold bg-white border border-slate-300 rounded focus:outline-none focus:border-slate-900 disabled:bg-slate-100 cursor-pointer"
                            >
                              {ESTADOS_PERMISO.map((est) => (
                                <option key={est} value={est}>
                                  {est}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Creación Transaccional de Proyecto */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-md max-w-lg w-full overflow-hidden shadow-xl">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Registrar Nuevo Proyecto Constructivo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProyecto} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                Al crear el proyecto se inicializan automáticamente en una transacción ACID sus{' '}
                <strong className="text-slate-900">3 registros regulatorios (OPAMSS, MARN, ANDA)</strong>{' '}
                en estado <code className="font-mono">PENDIENTE</code> y su{' '}
                <strong className="text-slate-900">Bodega de Obra</strong> asociada.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Código Técnico
                  </label>
                  <input
                    type="text"
                    required
                    value={newProyectoForm.codigo}
                    onChange={(e) =>
                      setNewProyectoForm({ ...newProyectoForm, codigo: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                    placeholder="PROY-SV-003"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Presupuesto Total (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={newProyectoForm.presupuestoTotal}
                    onChange={(e) =>
                      setNewProyectoForm({ ...newProyectoForm, presupuestoTotal: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                    placeholder="1850000.00"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-700 mb-1">
                  Nombre del Proyecto
                </label>
                <input
                  type="text"
                  required
                  value={newProyectoForm.nombre}
                  onChange={(e) =>
                    setNewProyectoForm({ ...newProyectoForm, nombre: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  placeholder="Ej. Condominio Logístico Santa Elena"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-700 mb-1">
                  Ubicación Geográfica (El Salvador)
                </label>
                <input
                  type="text"
                  required
                  value={newProyectoForm.ubicacion}
                  onChange={(e) =>
                    setNewProyectoForm({ ...newProyectoForm, ubicacion: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  placeholder="Ej. Blvd. Orden de Malta, Antiguo Cuscatlán, La Libertad"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    required
                    value={newProyectoForm.fechaInicio}
                    onChange={(e) =>
                      setNewProyectoForm({ ...newProyectoForm, fechaInicio: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Fecha Fin Estimada
                  </label>
                  <input
                    type="date"
                    value={newProyectoForm.fechaFinEstimada}
                    onChange={(e) =>
                      setNewProyectoForm({ ...newProyectoForm, fechaFinEstimada: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                >
                  {creating ? 'Registrando...' : 'Crear Proyecto y Permisos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProyectosPage;
