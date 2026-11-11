import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardCheck,
  HardHat,
  Package,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Plus,
  History,
  Sliders,
  Lock,
  Warehouse,
  X,
  Trash2,
} from 'lucide-react';
import {
  partidasApi,
  proyectosApi,
  bodegasApi,
  formatCurrencyUSD,
  formatNumber,
  formatDateSV,
  round2,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const FASES_CONSTRUCTIVAS = ['DISENO', 'TERRACERIA', 'OBRA_GRIS', 'ACABADOS', 'FINALIZADO'];

const FASE_BADGES = {
  DISENO: 'bg-slate-100 text-slate-800 border-slate-300',
  TERRACERIA: 'bg-amber-50 text-amber-900 border-amber-300',
  OBRA_GRIS: 'bg-sky-50 text-sky-900 border-sky-300',
  ACABADOS: 'bg-indigo-50 text-indigo-900 border-indigo-300',
  FINALIZADO: 'bg-emerald-50 text-emerald-900 border-emerald-300',
};

const PartidasPage = () => {
  const { user, hasRole } = useAuth();
  const canViewModule = hasRole('ADMIN', 'DIRECTOR_PROYECTO', 'INGENIERO_RESIDENTE', 'BODEGUERO');
  const canReportAvance = hasRole('ADMIN', 'DIRECTOR_PROYECTO', 'INGENIERO_RESIDENTE');
  const canCreatePartida = hasRole('ADMIN', 'DIRECTOR_PROYECTO');

  const [proyectos, setProyectos] = useState([]);
  const [partidas, setPartidas] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [filtroProyectoId, setFiltroProyectoId] = useState('');
  const [loading, setLoading] = useState(true);

  const [errorBanner, setErrorBanner] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);
  const [ultimoConsumoConfirmado, setUltimoConsumoConfirmado] = useState(null);

  // Modal / Panel de Reporte de Avance Físico con Previsualización de Explosión de Insumos
  const [avancePartidaActiva, setAvancePartidaActiva] = useState(null);
  const [porcentajeNuevoInput, setPorcentajeNuevoInput] = useState('25');
  const [observacionesAvance, setObservacionesAvance] = useState(
    'Inspección de campo aprobada por residencia de obra. Descarga automática de materiales.'
  );
  const [submittingAvance, setSubmittingAvance] = useState(false);

  // Modal de Creación de Nueva Partida con Receta Técnica
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingPartida, setCreatingPartida] = useState(false);
  const [nuevaPartidaForm, setNuevaPartidaForm] = useState({
    proyectoId: '',
    codigo: 'PART-002',
    nombre: '',
    faseRequerida: 'OBRA_GRIS',
    presupuestoAsignado: '45000',
    recetaMateriales: [{ materialId: '', cantidadTotalRequerida: '120' }],
  });

  const loadModuleData = async () => {
    if (!canViewModule) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [proyRes, partRes, matRes, bodRes] = await Promise.all([
        proyectosApi.list(),
        partidasApi.list(),
        bodegasApi.listMateriales(),
        bodegasApi.listBodegas(),
      ]);

      const listaProyectos = proyRes.data || [];
      const listaPartidas = partRes.data || [];
      const listaMateriales = matRes.data || [];
      const listaBodegas = bodRes.data || [];

      setProyectos(listaProyectos);
      setPartidas(listaPartidas);
      setMateriales(listaMateriales);
      setBodegas(listaBodegas);

      const defaultProy =
        listaProyectos.find((p) => p.codigo === 'PROY-SV-002') || listaProyectos[0];

      setNuevaPartidaForm((prev) => ({
        ...prev,
        proyectoId: prev.proyectoId || defaultProy?.id || '',
        codigo: `PART-00${listaPartidas.length + 1}`,
        recetaMateriales:
          prev.recetaMateriales[0]?.materialId || !listaMateriales[0]
            ? prev.recetaMateriales
            : [{ materialId: listaMateriales[0].id, cantidadTotalRequerida: '150' }],
      }));
    } catch (error) {
      const data = error.response?.data;
      setErrorBanner({
        status: error.response?.status || 400,
        errorCode: data?.errorCode || 'PARTIDAS_LOAD_ERROR',
        message: data?.message || 'Error al cargar las partidas de obra y recetas técnicas.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModuleData();
  }, [user?.rol]);

  const partidasFiltradas = useMemo(() => {
    return partidas.filter((p) => (!filtroProyectoId ? true : p.proyectoId === filtroProyectoId));
  }, [partidas, filtroProyectoId]);

  // Resumen de KPIs físico-financieros EVM (Earned Value Management)
  const kpisEjecucion = useMemo(() => {
    const totalPresupuesto = round2(
      partidasFiltradas.reduce((acc, p) => acc + Number(p.presupuestoAsignado || 0), 0)
    );
    const totalCostoMateriales = round2(
      partidasFiltradas.reduce((acc, p) => acc + Number(p.costoMaterialesAcumulado || 0), 0)
    );
    const totalValorGanado = round2(
      partidasFiltradas.reduce((acc, p) => {
        const pres = Number(p.presupuestoAsignado || 0);
        const av = Number(p.porcentajeAvance || 0);
        return acc + (pres * av) / 100;
      }, 0)
    );
    const alertasSobrecosto = partidasFiltradas.filter(
      (p) => p.indicadores?.sobrecosto || p.indicadores?.presupuestoExcedido
    ).length;

    return {
      totalPresupuesto,
      totalCostoMateriales,
      totalValorGanado,
      alertasSobrecosto,
    };
  }, [partidasFiltradas]);

  // Previsualización en tiempo real del descuento de materiales en Bodega de Obra
  const previewConsumoAvance = useMemo(() => {
    if (!avancePartidaActiva) return null;

    const avActual = round2(Number(avancePartidaActiva.porcentajeAvance || 0));
    const avNuevo = round2(Number(porcentajeNuevoInput || 0));
    const delta = round2(avNuevo - avActual);
    const cierraPartida = avNuevo === 100;

    const bodegaObra = bodegas.find((b) => b.proyectoId === avancePartidaActiva.proyectoId);

    let costoEstimadoDelta = 0;
    const lineas = (avancePartidaActiva.recetaMateriales || []).map((linea) => {
      const mat =
        linea.material || materiales.find((m) => m.id === linea.materialId) || {};
      const totalReq = round2(Number(linea.cantidadTotalRequerida || 0));
      const consumida = round2(Number(linea.cantidadConsumidaAcumulada || 0));
      const remanente = round2(Math.max(0, totalReq - consumida));

      const aDescontar =
        delta <= 0
          ? 0
          : cierraPartida
          ? remanente
          : round2(Math.min(remanente, (totalReq * delta) / 100));

      const invEnObra = (bodegaObra?.inventarios || []).find(
        (i) => i.materialId === linea.materialId
      );
      const stockDisponibleObra = invEnObra ? round2(Number(invEnObra.cantidadDisponible)) : 0;
      const costoUnitario = round2(Number(mat.costoUnitarioPromedio || 0));
      const subtotalCosto = round2(aDescontar * costoUnitario);
      costoEstimadoDelta = round2(costoEstimadoDelta + subtotalCosto);

      const suficiente = stockDisponibleObra >= aDescontar;
      const faltante = suficiente ? 0 : round2(aDescontar - stockDisponibleObra);

      return {
        materialId: linea.materialId,
        sku: mat.sku || 'SKU',
        nombre: mat.nombre || 'Material',
        unidadMedida: mat.unidadMedida || 'UND',
        totalReq,
        consumida,
        remanente,
        aDescontar,
        stockDisponibleObra,
        costoUnitario,
        subtotalCosto,
        suficiente,
        faltante,
      };
    });

    const hayDeficitStock = lineas.some((l) => !l.suficiente);

    return {
      avActual,
      avNuevo,
      delta,
      bodegaObra,
      lineas,
      costoEstimadoDelta,
      hayDeficitStock,
    };
  }, [avancePartidaActiva, porcentajeNuevoInput, bodegas, materiales]);

  const abrirModalAvance = (partida) => {
    setErrorBanner(null);
    setSuccessBanner(null);
    const actual = round2(Number(partida.porcentajeAvance || 0));
    const sugerido = Math.min(100, round2(actual + 25));
    setAvancePartidaActiva(partida);
    setPorcentajeNuevoInput(String(sugerido > actual ? sugerido : 100));
  };

  const handleConfirmarAvance = async (e) => {
    e.preventDefault();
    if (!avancePartidaActiva) return;

    setErrorBanner(null);
    setSuccessBanner(null);
    setSubmittingAvance(true);

    try {
      const res = await partidasApi.reportarAvance(avancePartidaActiva.id, {
        porcentajeNuevo: Number(porcentajeNuevoInput),
        observaciones: observacionesAvance,
      });

      setSuccessBanner(
        res.message ||
          `Avance físico de '${avancePartidaActiva.codigo}' registrado y materiales descargados de la bodega del proyecto.`
      );
      setUltimoConsumoConfirmado(res.data || null);
      setAvancePartidaActiva(null);
      await loadModuleData();
    } catch (error) {
      const data = error.response?.data;
      setErrorBanner({
        status: error.response?.status || 422,
        errorCode: data?.errorCode || 'AVANCE_EXECUTION_ERROR',
        message:
          data?.message ||
          'No se pudo registrar el avance físico por restricciones técnicas o de stock en obra.',
        details: data?.details || null,
      });
    } finally {
      setSubmittingAvance(false);
    }
  };

  const handleAddRecetaItem = () => {
    const mat =
      materiales.find(
        (m) => !nuevaPartidaForm.recetaMateriales.some((r) => r.materialId === m.id)
      ) || materiales[0];
    setNuevaPartidaForm((prev) => ({
      ...prev,
      recetaMateriales: [
        ...prev.recetaMateriales,
        { materialId: mat?.id || '', cantidadTotalRequerida: '80' },
      ],
    }));
  };

  const handleRemoveRecetaItem = (idx) => {
    if (nuevaPartidaForm.recetaMateriales.length <= 1) return;
    setNuevaPartidaForm((prev) => ({
      ...prev,
      recetaMateriales: prev.recetaMateriales.filter((_, i) => i !== idx),
    }));
  };

  const handleChangeRecetaItem = (idx, field, value) => {
    setNuevaPartidaForm((prev) => ({
      ...prev,
      recetaMateriales: prev.recetaMateriales.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleCrearPartida = async (e) => {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);
    setCreatingPartida(true);

    try {
      const payload = {
        proyectoId: nuevaPartidaForm.proyectoId,
        codigo: nuevaPartidaForm.codigo,
        nombre: nuevaPartidaForm.nombre,
        faseRequerida: nuevaPartidaForm.faseRequerida,
        presupuestoAsignado: Number(nuevaPartidaForm.presupuestoAsignado),
        recetaMateriales: nuevaPartidaForm.recetaMateriales.map((r) => ({
          materialId: r.materialId,
          cantidadTotalRequerida: Number(r.cantidadTotalRequerida),
        })),
      };

      const res = await partidasApi.create(payload);
      setSuccessBanner(
        res.message || `Partida '${res.data?.codigo}' creada con su receta de materiales.`
      );
      setShowCreateModal(false);
      await loadModuleData();
    } catch (error) {
      const data = error.response?.data;
      setErrorBanner({
        status: error.response?.status || 400,
        errorCode: data?.errorCode || 'PARTIDA_CREATE_ERROR',
        message: data?.message || 'Error al registrar la partida de obra.',
      });
    } finally {
      setCreatingPartida(false);
    }
  };

  if (!canViewModule) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center max-w-xl mx-auto my-8">
        <Lock className="w-8 h-8 text-amber-600 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900">
          Acceso Restringido por Matriz RBAC ({user?.rol})
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          El Módulo 3 (Partidas y Control Físico de Obra) está habilitado para{' '}
          <code className="font-mono font-semibold">ADMIN</code>,{' '}
          <code className="font-mono font-semibold">DIRECTOR_PROYECTO</code>,{' '}
          <code className="font-mono font-semibold">INGENIERO_RESIDENTE</code> y{' '}
          <code className="font-mono font-semibold">BODEGUERO</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado Técnico Módulo 3 */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-900 text-amber-400">
              MÓDULO 03
            </span>
            <span className="font-mono text-xs text-slate-500">
              EXPLOSIÓN DE INSUMOS · DESCARGA PROPORCIONAL DE BODEGA DE OBRA
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Ejecución de Partidas de Obra y Reportes de Avance Físico
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cada incremento de porcentaje (<code className="font-mono">deltaPorcentaje</code>)
            calcula y descuenta atómicamente los materiales de la bodega del proyecto e incrementa
            el <code className="font-mono">costoEjecutado</code>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canCreatePartida && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              Nueva Partida + Receta
            </button>
          )}
        </div>
      </div>

      {/* KPIs de Ejecución Física-Financiera */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="font-mono text-[10px] uppercase text-slate-500 block">
            PRESUPUESTO DE PARTIDAS
          </span>
          <div className="font-mono text-xl font-bold text-slate-900 tabular-nums mt-1">
            {formatCurrencyUSD(kpisEjecucion.totalPresupuesto)}
          </div>
          <span className="text-[11px] text-slate-500">
            {partidasFiltradas.length} partida(s) en seguimiento
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="font-mono text-[10px] uppercase text-slate-500 block">
            COSTO MATERIALES ACUMULADO (AC)
          </span>
          <div className="font-mono text-xl font-bold text-amber-700 tabular-nums mt-1">
            {formatCurrencyUSD(kpisEjecucion.totalCostoMateriales)}
          </div>
          <span className="text-[11px] text-slate-500">
            Valorizado por consumo real de bodega
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="font-mono text-[10px] uppercase text-slate-500 block">
            VALOR GANADO FÍSICO (EV)
          </span>
          <div className="font-mono text-xl font-bold text-emerald-700 tabular-nums mt-1">
            {formatCurrencyUSD(kpisEjecucion.totalValorGanado)}
          </div>
          <span className="text-[11px] text-slate-500">
            Presupuesto × % Avance Físico
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="font-mono text-[10px] uppercase text-slate-500 block">
            ALERTAS DE SOBRECOSTO
          </span>
          <div className="font-mono text-xl font-bold text-slate-900 tabular-nums mt-1">
            {kpisEjecucion.alertasSobrecosto}
          </div>
          <span className="text-[11px] text-slate-500">
            Partidas donde Costo Real &gt; EV
          </span>
        </div>
      </div>

      {/* Banner de Error HTTP 422 (PROGRESS_MUST_INCREASE / LEGAL_PERMITS_NOT_APPROVED / INSUFFICIENT_PROJECT_STOCK) */}
      {errorBanner && (
        <div
          role="alert"
          className="bg-red-50 border-l-4 border-l-red-600 border border-red-200 rounded-lg p-4 text-xs text-red-900"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold px-2 py-0.5 rounded bg-red-900 text-white text-[11px]">
                    HTTP {errorBanner.status} · {errorBanner.errorCode}
                  </span>
                  <span className="font-bold text-sm text-red-900">
                    Reporte de Avance Bloqueado por Regla de Ingeniería / Inventario
                  </span>
                </div>
                <p className="mt-1.5 text-red-800 leading-relaxed">{errorBanner.message}</p>

                {Array.isArray(errorBanner.details?.faltantes) && (
                  <div className="mt-3 p-3 rounded bg-white border border-red-200 overflow-x-auto">
                    <p className="font-mono text-[11px] font-bold uppercase text-red-900 mb-2">
                      Materiales Faltantes en Bodega de Obra ({errorBanner.details.bodegaProyectoCodigo}):
                    </p>
                    <table className="w-full text-left border-collapse font-mono text-[11px]">
                      <thead>
                        <tr className="border-b border-red-200 text-slate-600">
                          <th className="py-1.5 pr-3">SKU</th>
                          <th className="py-1.5 pr-3">Material</th>
                          <th className="py-1.5 pr-3 text-right">Requerido Delta</th>
                          <th className="py-1.5 pr-3 text-right">Disponible Obra</th>
                          <th className="py-1.5 text-right">Faltante</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {errorBanner.details.faltantes.map((f) => (
                          <tr key={f.sku}>
                            <td className="py-1.5 pr-3 font-bold text-slate-900">{f.sku}</td>
                            <td className="py-1.5 pr-3 text-slate-800">{f.nombre}</td>
                            <td className="py-1.5 pr-3 text-right tabular-nums">
                              {formatNumber(f.requerido)} {f.unidadMedida}
                            </td>
                            <td className="py-1.5 pr-3 text-right tabular-nums">
                              {formatNumber(f.disponible)} {f.unidadMedida}
                            </td>
                            <td className="py-1.5 text-right font-bold text-red-700 tabular-nums">
                              -{formatNumber(f.faltante)} {f.unidadMedida}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-red-500 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Banner de Confirmación de Avance + Desglose de Materiales Descontados */}
      {successBanner && (
        <div className="bg-emerald-50 border-l-4 border-l-emerald-600 border border-emerald-200 rounded-lg p-4 text-xs text-emerald-950 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">{successBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSuccessBanner(null);
                setUltimoConsumoConfirmado(null);
              }}
              className="text-emerald-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {ultimoConsumoConfirmado?.consumoMateriales?.length > 0 && (
            <div className="p-3 rounded bg-white border border-emerald-200 font-mono text-[11px]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold uppercase text-slate-800">
                  Comprobante de Descarga Automática de Inventario en Obra:
                </span>
                <span className="font-bold text-emerald-800 tabular-nums">
                  Costo Imputado al Proyecto:{' '}
                  {formatCurrencyUSD(ultimoConsumoConfirmado.costoMaterialesDelta)}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {ultimoConsumoConfirmado.consumoMateriales.map((c) => (
                  <div
                    key={c.sku}
                    className="p-2 rounded bg-slate-50 border border-slate-200 flex flex-col justify-between"
                  >
                    <div className="font-bold text-slate-900">
                      [{c.sku}] {c.nombre}
                    </div>
                    <div className="text-emerald-800 font-semibold tabular-nums mt-1">
                      Descontado: -{formatNumber(c.consumoDelta)} {c.unidadMedida} (
                      {formatCurrencyUSD(c.subtotal)})
                    </div>
                    <div className="text-slate-500 tabular-nums">
                      Stock restante obra: {formatNumber(c.stockRestanteBodegaProyecto)}{' '}
                      {c.unidadMedida}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Barra de Filtro por Proyecto Constructivo */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs uppercase text-slate-500">Proyecto:</span>
          <button
            type="button"
            onClick={() => setFiltroProyectoId('')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-semibold border transition-colors ${
              filtroProyectoId === ''
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            TODOS LOS PROYECTOS ({partidas.length})
          </button>
          {proyectos.map((proy) => (
            <button
              key={proy.id}
              type="button"
              onClick={() => setFiltroProyectoId(proy.id)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-semibold border transition-colors ${
                filtroProyectoId === proy.id
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              [{proy.codigo}] {proy.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Listado de Fichas Técnicas de Partidas de Obra */}
      <div className="space-y-5">
        {partidasFiltradas.map((partida) => {
          const avanceNum = round2(Number(partida.porcentajeAvance || 0));
          const bodegaProy = bodegas.find((b) => b.proyectoId === partida.proyectoId);

          return (
            <div
              key={partida.id}
              className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm"
            >
              {/* Cabecera de la Partida */}
              <div className="px-5 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-amber-500 text-slate-950">
                    {partida.codigo}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-white">{partida.nombre}</h3>
                      <span
                        className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          FASE_BADGES[partida.faseRequerida] || FASE_BADGES.OBRA_GRIS
                        }`}
                      >
                        FASE REQ: {partida.faseRequerida}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-300 mt-0.5">
                      Proyecto: [{partida.proyecto?.codigo}] {partida.proyecto?.nombre} · Bodega
                      Obra: {bodegaProy?.codigo || 'BOD-PROY'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right font-mono">
                    <span className="text-[10px] uppercase text-slate-400 block">
                      AVANCE FÍSICO ACTUAL
                    </span>
                    <span className="text-lg font-bold text-amber-400 tabular-nums">
                      {formatNumber(avanceNum)}%
                    </span>
                  </div>

                  {canReportAvance && (
                    <button
                      type="button"
                      disabled={avanceNum >= 100}
                      onClick={() => abrirModalAvance(partida)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-amber-600 hover:bg-amber-700 disabled:bg-slate-700 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      {avanceNum >= 100 ? 'Partida al 100%' : 'Reportar Avance Físico'}
                    </button>
                  )}
                </div>
              </div>

              {/* Barra de Progreso Físico y Métricas Financieras de la Partida */}
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-600 font-semibold">
                      Curva de Ejecución Física de la Partida
                    </span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {formatNumber(avanceNum)}% / 100.00%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-600 transition-all duration-300"
                      style={{ width: `${Math.min(100, avanceNum)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 text-xs font-mono">
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 block">
                      PRESUPUESTO ASIGNADO
                    </span>
                    <strong className="text-sm text-slate-900 tabular-nums">
                      {formatCurrencyUSD(partida.presupuestoAsignado)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 block">
                      COSTO MATERIALES ACUMULADO
                    </span>
                    <strong className="text-sm text-amber-700 tabular-nums">
                      {formatCurrencyUSD(partida.costoMaterialesAcumulado)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 block">
                      VALOR GANADO (EV)
                    </span>
                    <strong className="text-sm text-emerald-700 tabular-nums">
                      {formatCurrencyUSD(partida.indicadores?.valorGanado)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 block">
                      DESVIACIÓN COSTO VS EV
                    </span>
                    <strong
                      className={`text-sm tabular-nums ${
                        (partida.indicadores?.desviacionPresupuestaria || 0) > 0
                          ? 'text-red-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {formatCurrencyUSD(partida.indicadores?.desviacionPresupuestaria)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Tabla de Receta de Materiales (Explosión de Insumos) */}
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-600" />
                    Receta Técnica de Materiales (Explosión de Insumos para 100% de la Partida)
                  </h4>
                  <span className="font-mono text-[11px] text-slate-500">
                    Bodega Vinculada: {bodegaProy?.codigo}
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-md">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500">
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3">Material Requerido</th>
                        <th className="py-2.5 px-3">U.M.</th>
                        <th className="py-2.5 px-3 text-right">Total Receta (100%)</th>
                        <th className="py-2.5 px-3 text-right">Consumido Acumulado</th>
                        <th className="py-2.5 px-3 text-right">Pendiente por Consumir</th>
                        <th className="py-2.5 px-3 text-right">Stock Actual en Obra</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs font-mono">
                      {(partida.recetaMateriales || []).map((linea) => {
                        const invObra = (bodegaProy?.inventarios || []).find(
                          (i) => i.materialId === linea.materialId
                        );
                        const dispObra = invObra ? Number(invObra.cantidadDisponible) : 0;

                        return (
                          <tr key={linea.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {linea.material?.sku}
                            </td>
                            <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                              {linea.material?.nombre}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {linea.material?.unidadMedida}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-slate-900 tabular-nums">
                              {formatNumber(linea.cantidadTotalRequerida)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-amber-700 tabular-nums">
                              {formatNumber(linea.cantidadConsumidaAcumulada)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-700 tabular-nums">
                              {formatNumber(linea.cantidadPendiente)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-800 tabular-nums">
                              {formatNumber(dispObra)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Historial de Reportes de Avance Físico de esta Partida */}
                {(partida.reportesAvance || []).length > 0 && (
                  <div className="pt-2">
                    <h5 className="text-[11px] font-mono font-bold uppercase text-slate-600 mb-2 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      Bitácora de Inspecciones de Avance ({partida.reportesAvance.length})
                    </h5>
                    <div className="space-y-1.5">
                      {partida.reportesAvance.map((rep) => (
                        <div
                          key={rep.id}
                          className="p-2.5 rounded bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-mono"
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-400 font-bold tabular-nums">
                              {formatNumber(rep.porcentajeAnterior)}% →{' '}
                              {formatNumber(rep.porcentajeNuevo)}% (+
                              {formatNumber(rep.deltaPorcentaje)}%)
                            </span>
                            <span className="font-sans text-slate-700">{rep.observaciones}</span>
                          </div>
                          <div className="flex items-center gap-3 text-slate-600 tabular-nums">
                            <span className="font-bold text-amber-800">
                              Costo Imputado: {formatCurrencyUSD(rep.costoMaterialesDelta)}
                            </span>
                            <span>{formatDateSV(rep.fechaReporte)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL INTERACTIVO DE REPORTE DE AVANCE FÍSICO CON PREVISUALIZACIÓN DE DESCARGA DE INVENTARIO */}
      {avancePartidaActiva && previewConsumoAvance && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-3xl w-full overflow-hidden shadow-xl">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <HardHat className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    Reporte de Avance Físico y Explosión de Materiales en Vivo
                  </h3>
                  <p className="text-[11px] font-mono text-slate-300">
                    [{avancePartidaActiva.codigo}] {avancePartidaActiva.nombre} · Bodega:{' '}
                    {previewConsumoAvance.bodegaObra?.codigo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAvancePartidaActiva(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmarAvance} className="p-5 space-y-4 text-xs">
              {/* Controles de Deslizador y Porcentaje Objetivo */}
              <div className="p-4 rounded-md bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-[11px] uppercase text-slate-500 block">
                      PORCENTAJE ACTUAL EN OBRA
                    </span>
                    <span className="font-mono text-lg font-bold text-slate-800 tabular-nums">
                      {formatNumber(previewConsumoAvance.avActual)}%
                    </span>
                  </div>

                  <div className="text-center">
                    <span className="font-mono text-[11px] uppercase text-slate-500 block">
                      INCREMENTO FÍSICO (DELTA)
                    </span>
                    <span
                      className={`font-mono text-lg font-bold tabular-nums ${
                        previewConsumoAvance.delta > 0 ? 'text-amber-600' : 'text-red-600'
                      }`}
                    >
                      {previewConsumoAvance.delta > 0 ? '+' : ''}
                      {formatNumber(previewConsumoAvance.delta)}%
                    </span>
                  </div>

                  <div className="text-right">
                    <label
                      htmlFor="nuevo-porcentaje-input"
                      className="font-mono text-[11px] uppercase text-slate-700 font-bold block"
                    >
                      NUEVO % ACUMULADO
                    </label>
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        id="nuevo-porcentaje-input"
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        required
                        value={porcentajeNuevoInput}
                        onChange={(e) => setPorcentajeNuevoInput(e.target.value)}
                        className="w-24 px-2.5 py-1 font-mono text-sm font-bold text-right bg-white border border-slate-300 rounded tabular-nums"
                      />
                      <span className="font-mono font-bold text-sm">%</span>
                    </div>
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  step="1"
                  value={porcentajeNuevoInput}
                  onChange={(e) => setPorcentajeNuevoInput(e.target.value)}
                  className="w-full accent-amber-600 cursor-pointer"
                />

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>0% (Inicio)</span>
                  <div className="flex gap-2">
                    {[25, 50, 75, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setPorcentajeNuevoInput(String(preset))}
                        className="px-2 py-0.5 rounded bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-semibold"
                      >
                        Fijar {preset}%
                      </button>
                    ))}
                  </div>
                  <span>100% (Cierre de Partida)</span>
                </div>
              </div>

              {/* Tabla de Previsualización de Descuento de Materiales en Bodega del Proyecto */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px] font-bold uppercase text-slate-800">
                    Previsualización de Descarga Automática de Bodega (
                    {previewConsumoAvance.bodegaObra?.codigo}):
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-800 tabular-nums">
                    Costo Total a Imputar:{' '}
                    {formatCurrencyUSD(previewConsumoAvance.costoEstimadoDelta)}
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-md">
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase text-slate-600">
                        <th className="py-2 px-3">SKU</th>
                        <th className="py-2 px-3">Material</th>
                        <th className="py-2 px-3 text-right">Stock Obra</th>
                        <th className="py-2 px-3 text-right">A Descontar</th>
                        <th className="py-2 px-3 text-right">Costo Imputado</th>
                        <th className="py-2 px-3 text-center">Factibilidad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {previewConsumoAvance.lineas.map((l) => (
                        <tr key={l.materialId}>
                          <td className="py-2 px-3 font-bold text-slate-900">{l.sku}</td>
                          <td className="py-2 px-3 font-sans text-slate-800">{l.nombre}</td>
                          <td className="py-2 px-3 text-right tabular-nums">
                            {formatNumber(l.stockDisponibleObra)} {l.unidadMedida}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-amber-700 tabular-nums">
                            -{formatNumber(l.aDescontar)} {l.unidadMedida}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-900 tabular-nums">
                            {formatCurrencyUSD(l.subtotalCosto)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {l.suficiente ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                STOCK OK
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-red-50 text-red-800 border border-red-200 text-[10px] font-bold">
                                FALTA {formatNumber(l.faltante)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-700 mb-1">
                  Observaciones de Bitácora de Residencia
                </label>
                <input
                  type="text"
                  value={observacionesAvance}
                  onChange={(e) => setObservacionesAvance(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-500">
                  Si el porcentaje es menor o igual al actual, el servidor responderá con{' '}
                  <code className="font-mono">HTTP 422 PROGRESS_MUST_INCREASE</code>.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAvancePartidaActiva(null)}
                    className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAvance}
                    className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-semibold uppercase tracking-wider"
                  >
                    {submittingAvance
                      ? 'Ejecutando Transacción...'
                      : 'Confirmar Avance y Descontar Stock'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR NUEVA PARTIDA DE OBRA CON RECETA DE MATERIALES */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full overflow-hidden shadow-xl">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Nueva Partida de Obra y Explosión de Materiales
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

            <form onSubmit={handleCrearPartida} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Proyecto Constructivo
                  </label>
                  <select
                    value={nuevaPartidaForm.proyectoId}
                    onChange={(e) =>
                      setNuevaPartidaForm({ ...nuevaPartidaForm, proyectoId: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  >
                    {proyectos.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.codigo}] {p.nombre} ({p.faseActual})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Fase Constructiva Requerida
                  </label>
                  <select
                    value={nuevaPartidaForm.faseRequerida}
                    onChange={(e) =>
                      setNuevaPartidaForm({ ...nuevaPartidaForm, faseRequerida: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  >
                    {FASES_CONSTRUCTIVAS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Código Partida
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevaPartidaForm.codigo}
                    onChange={(e) =>
                      setNuevaPartidaForm({ ...nuevaPartidaForm, codigo: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Presupuesto (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={nuevaPartidaForm.presupuestoAsignado}
                    onChange={(e) =>
                      setNuevaPartidaForm({
                        ...nuevaPartidaForm,
                        presupuestoAsignado: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md tabular-nums"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Nombre de la Partida
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevaPartidaForm.nombre}
                    onChange={(e) =>
                      setNuevaPartidaForm({ ...nuevaPartidaForm, nombre: e.target.value })
                    }
                    placeholder="Ej. Levantamiento de Paredes Nivel 2"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="font-semibold uppercase text-slate-700">
                    Receta de Materiales para el 100% de la Partida
                  </label>
                  <button
                    type="button"
                    onClick={handleAddRecetaItem}
                    className="font-mono text-[11px] font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Insumo
                  </button>
                </div>

                {nuevaPartidaForm.recetaMateriales.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={item.materialId}
                      onChange={(e) =>
                        handleChangeRecetaItem(idx, 'materialId', e.target.value)
                      }
                      className="flex-1 px-2.5 py-1.5 font-mono text-xs border border-slate-300 rounded-md"
                    >
                      {materiales.map((m) => (
                        <option key={m.id} value={m.id}>
                          [{m.sku}] {m.nombre} ({m.unidadMedida})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={item.cantidadTotalRequerida}
                      onChange={(e) =>
                        handleChangeRecetaItem(idx, 'cantidadTotalRequerida', e.target.value)
                      }
                      className="w-32 px-2.5 py-1.5 font-mono text-xs text-right border border-slate-300 rounded-md tabular-nums"
                      placeholder="Cant. Total"
                    />
                    {nuevaPartidaForm.recetaMateriales.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRecetaItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingPartida}
                  className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                >
                  {creatingPartida ? 'Guardando...' : 'Crear Partida y Receta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartidasPage;
