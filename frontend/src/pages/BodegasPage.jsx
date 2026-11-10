import React, { useState, useEffect, useMemo } from 'react';
import {
  Warehouse,
  Package,
  ArrowLeftRight,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Lock,
  X,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  bodegasApi,
  formatCurrencyUSD,
  formatNumber,
  formatDateSV,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const BodegasPage = () => {
  const { user, hasRole } = useAuth();
  const canViewModule = hasRole('ADMIN', 'DIRECTOR_PROYECTO', 'INGENIERO_RESIDENTE', 'BODEGUERO');
  const canMutateInventory = hasRole('ADMIN', 'BODEGUERO');

  const [activeTab, setActiveTab] = useState('BODEGAS'); // 'BODEGAS' | 'MATERIALES' | 'TRASLADOS'
  const [bodegas, setBodegas] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [traslados, setTraslados] = useState([]);
  const [selectedBodegaId, setSelectedBodegaId] = useState('');
  const [loading, setLoading] = useState(true);

  const [errorBanner, setErrorBanner] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  // Estado del formulario de Traslado Multi-sitio (Bodega Origen -> Bodega Destino)
  const [trasladoForm, setTrasladoForm] = useState({
    bodegaOrigenId: '',
    bodegaDestinoId: '',
    observaciones: 'Abastecimiento programado desde Bodega Central hacia frente de obra.',
    items: [{ materialId: '', cantidad: '100' }],
  });
  const [submittingTraslado, setSubmittingTraslado] = useState(false);

  // Estado del formulario de Entrada / Compra a Bodega Central
  const [entradaForm, setEntradaForm] = useState({
    bodegaId: '',
    materialId: '',
    cantidad: '250',
    nuevoCostoUnitario: '',
  });
  const [submittingEntrada, setSubmittingEntrada] = useState(false);

  // Modal de nuevo material en catálogo
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [nuevoMaterialForm, setNuevoMaterialForm] = useState({
    sku: 'MAT-TUB-006',
    nombre: '',
    unidadMedida: 'UNIDAD',
    costoUnitarioPromedio: '',
    stockMinimoAlerta: '50',
    stockInicialCentral: '200',
  });

  const loadWarehouseData = async () => {
    if (!canViewModule) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [bodRes, matRes, trasRes] = await Promise.all([
        bodegasApi.listBodegas(),
        bodegasApi.listMateriales(),
        bodegasApi.listTraslados(),
      ]);

      const listaBodegas = bodRes.data || [];
      const listaMateriales = matRes.data || [];
      const listaTraslados = trasRes.data || [];

      setBodegas(listaBodegas);
      setMateriales(listaMateriales);
      setTraslados(listaTraslados);

      if (listaBodegas.length > 0 && !selectedBodegaId) {
        setSelectedBodegaId(listaBodegas[0].id);
      }

      const central = listaBodegas.find((b) => b.tipo === 'CENTRAL') || listaBodegas[0];
      const primeraObra = listaBodegas.find((b) => b.tipo === 'PROYECTO') || listaBodegas[1];
      const primerMat = listaMateriales[0];

      setTrasladoForm((prev) => ({
        ...prev,
        bodegaOrigenId: prev.bodegaOrigenId || central?.id || '',
        bodegaDestinoId: prev.bodegaDestinoId || primeraObra?.id || '',
        items:
          prev.items[0]?.materialId || !primerMat
            ? prev.items
            : [{ materialId: primerMat.id, cantidad: '100' }],
      }));

      setEntradaForm((prev) => ({
        ...prev,
        bodegaId: prev.bodegaId || central?.id || '',
        materialId: prev.materialId || primerMat?.id || '',
      }));
    } catch (error) {
      const data = error.response?.data;
      setErrorBanner({
        status: error.response?.status || 400,
        errorCode: data?.errorCode || 'BODEGAS_LOAD_ERROR',
        message: data?.message || 'Error al consultar las bodegas e inventarios.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouseData();
  }, [user?.rol]);

  const selectedBodega = useMemo(() => {
    return bodegas.find((b) => b.id === selectedBodegaId) || bodegas[0] || null;
  }, [bodegas, selectedBodegaId]);

  const handleAddItemTraslado = () => {
    const unusedMat =
      materiales.find((m) => !trasladoForm.items.some((i) => i.materialId === m.id)) ||
      materiales[0];
    setTrasladoForm((prev) => ({
      ...prev,
      items: [...prev.items, { materialId: unusedMat?.id || '', cantidad: '50' }],
    }));
  };

  const handleRemoveItemTraslado = (idx) => {
    if (trasladoForm.items.length <= 1) return;
    setTrasladoForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleChangeItemTraslado = (idx, field, value) => {
    setTrasladoForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    }));
  };

  const handleEjecutarTraslado = async (e) => {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);
    setSubmittingTraslado(true);

    try {
      const payload = {
        bodegaOrigenId: trasladoForm.bodegaOrigenId,
        bodegaDestinoId: trasladoForm.bodegaDestinoId,
        observaciones: trasladoForm.observaciones,
        items: trasladoForm.items.map((i) => ({
          materialId: i.materialId,
          cantidad: Number(i.cantidad),
        })),
      };

      const res = await bodegasApi.crearTraslado(payload);
      setSuccessBanner(
        res.message || `Traslado '${res.data?.codigo}' ejecutado y completado exitosamente.`
      );
      await loadWarehouseData();
    } catch (error) {
      const data = error.response?.data;
      setErrorBanner({
        status: error.response?.status || 422,
        errorCode: data?.errorCode || 'INSUFFICIENT_WAREHOUSE_STOCK',
        message: data?.message || 'Error al procesar el traslado entre bodegas.',
        details: data?.details || null,
      });
    } finally {
      setSubmittingTraslado(false);
    }
  };

  const handleRegistrarEntrada = async (e) => {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);
    setSubmittingEntrada(true);

    try {
      const payload = {
        bodegaId: entradaForm.bodegaId,
        materialId: entradaForm.materialId,
        cantidad: Number(entradaForm.cantidad),
        ...(entradaForm.nuevoCostoUnitario
          ? { nuevoCostoUnitario: Number(entradaForm.nuevoCostoUnitario) }
          : {}),
      };
      const res = await bodegasApi.registrarEntrada(payload);
      setSuccessBanner(
        res.message ||
          `Entrada de ${formatNumber(payload.cantidad)} unidades registrada exitosamente.`
      );
      await loadWarehouseData();
    } catch (error) {
      const data = error.response?.data;
      setErrorBanner({
        status: error.response?.status || 400,
        errorCode: data?.errorCode || 'ENTRADA_ERROR',
        message: data?.message || 'Error al registrar la entrada de inventario.',
      });
    } finally {
      setSubmittingEntrada(false);
    }
  };

  const handleCrearMaterial = async (e) => {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);
    try {
      const res = await bodegasApi.createMaterial({
        sku: nuevoMaterialForm.sku,
        nombre: nuevoMaterialForm.nombre,
        unidadMedida: nuevoMaterialForm.unidadMedida,
        costoUnitarioPromedio: Number(nuevoMaterialForm.costoUnitarioPromedio),
        stockMinimoAlerta: Number(nuevoMaterialForm.stockMinimoAlerta || 0),
        stockInicialCentral: Number(nuevoMaterialForm.stockInicialCentral || 0),
      });
      setSuccessBanner(res.message || `Material '${res.data?.sku}' creado en el catálogo.`);
      setShowMaterialModal(false);
      await loadWarehouseData();
    } catch (error) {
      const data = error.response?.data;
      setErrorBanner({
        status: error.response?.status || 400,
        errorCode: data?.errorCode || 'MATERIAL_CREATE_ERROR',
        message: data?.message || 'No se pudo registrar el material.',
      });
    }
  };

  if (!canViewModule) {
    return (
      <div className="bg-white border border-slate-200 rounded-md p-8 text-center max-w-xl mx-auto my-8">
        <Lock className="w-8 h-8 text-amber-600 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900">
          Acceso Restringido por Matriz RBAC ({user?.rol})
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          El Módulo 2 (Bodegas e Inventario Multi-sitio) está autorizado para los roles{' '}
          <code className="font-mono font-semibold">ADMIN</code>,{' '}
          <code className="font-mono font-semibold">BODEGUERO</code>,{' '}
          <code className="font-mono font-semibold">DIRECTOR_PROYECTO</code> e{' '}
          <code className="font-mono font-semibold">INGENIERO_RESIDENTE</code>. Utilice el selector
          superior para cambiar de rol.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado del Módulo 2 */}
      <div className="bg-white border border-slate-200 rounded-md p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-900 text-amber-400">
              MÓDULO 02
            </span>
            <span className="font-mono text-xs text-slate-500">
              LOGÍSTICA MULTI-SITIO · BODEGA CENTRAL Y BODEGAS DE PROYECTO
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Control de Inventarios, Catálogo Maestro y Traslados Transaccionales
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Trazabilidad exacta de existencias en Bodega Central San Salvador y Bodegas de Obra con
            bloqueo atómico ante insuficiencia de stock (<code className="font-mono">HTTP 422</code>).
          </p>
        </div>

        {canMutateInventory && (
          <button
            type="button"
            onClick={() => setShowMaterialModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            Nuevo Material SKU
          </button>
        )}
      </div>

      {/* Banner de Error Transaccional HTTP 422 (INSUFFICIENT_WAREHOUSE_STOCK) */}
      {errorBanner && (
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
                    HTTP {errorBanner.status} · {errorBanner.errorCode}
                  </span>
                  <span className="font-bold text-sm text-red-900">
                    Operación de Bodega Rechazada (Rollback ACID)
                  </span>
                </div>
                <p className="mt-1 text-red-800">{errorBanner.message}</p>

                {errorBanner.details?.sku && (
                  <div className="mt-2.5 p-2.5 rounded bg-white border border-red-200 font-mono text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="text-slate-500 block">BODEGA ORIGEN</span>
                      <strong className="text-slate-900">
                        {errorBanner.details.bodegaOrigenCodigo}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">MATERIAL SKU</span>
                      <strong className="text-slate-900">{errorBanner.details.sku}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">DISPONIBLE / SOLICITADO</span>
                      <strong className="text-red-700 tabular-nums">
                        {formatNumber(errorBanner.details.stockDisponible)} /{' '}
                        {formatNumber(errorBanner.details.cantidadSolicitada)}{' '}
                        {errorBanner.details.unidadMedida}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">DÉFICIT DETECTADO</span>
                      <strong className="text-red-800 tabular-nums">
                        -{formatNumber(errorBanner.details.faltante)}{' '}
                        {errorBanner.details.unidadMedida}
                      </strong>
                    </div>
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

      {successBanner && (
        <div className="bg-emerald-50 border-l-4 border-l-emerald-600 border border-emerald-200 rounded-md p-3.5 flex items-center justify-between gap-3 text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Paneles de Operación Transaccional: Traslado Multi-sitio + Entrada a Bodega Central */}
      {canMutateInventory && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Formulario 1: Traslado de Materiales (Bodega Central -> Bodega de Proyecto) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Traslado Transaccional entre Bodegas (ACID)
                </h3>
              </div>
              <span className="font-mono text-[10px] text-amber-400">
                POST /api/v1/bodegas/traslados
              </span>
            </div>

            <form onSubmit={handleEjecutarTraslado} className="p-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Bodega de Origen
                  </label>
                  <select
                    value={trasladoForm.bodegaOrigenId}
                    onChange={(e) =>
                      setTrasladoForm({ ...trasladoForm, bodegaOrigenId: e.target.value })
                    }
                    className="w-full px-2.5 py-2 font-mono text-xs bg-slate-50 border border-slate-300 rounded-md"
                  >
                    {bodegas.map((b) => (
                      <option key={b.id} value={b.id}>
                        [{b.codigo}] {b.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Bodega de Destino (Obra)
                  </label>
                  <select
                    value={trasladoForm.bodegaDestinoId}
                    onChange={(e) =>
                      setTrasladoForm({ ...trasladoForm, bodegaDestinoId: e.target.value })
                    }
                    className="w-full px-2.5 py-2 font-mono text-xs bg-slate-50 border border-slate-300 rounded-md"
                  >
                    {bodegas.map((b) => (
                      <option key={b.id} value={b.id}>
                        [{b.codigo}] {b.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Líneas de Materiales a Trasladar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold uppercase text-slate-700">
                    Ítems a Trasladar
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemTraslado}
                    className="font-mono text-[11px] text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Línea
                  </button>
                </div>

                {trasladoForm.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={item.materialId}
                      onChange={(e) =>
                        handleChangeItemTraslado(idx, 'materialId', e.target.value)
                      }
                      className="flex-1 px-2.5 py-1.5 font-mono text-xs bg-white border border-slate-300 rounded-md"
                    >
                      {materiales.map((m) => (
                        <option key={m.id} value={m.id}>
                          [{m.sku}] {m.nombre} — Disp. Central: {formatNumber(m.stockBodegaCentral)}{' '}
                          {m.unidadMedida}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={item.cantidad}
                      onChange={(e) => handleChangeItemTraslado(idx, 'cantidad', e.target.value)}
                      className="w-28 px-2.5 py-1.5 font-mono text-xs text-right border border-slate-300 rounded-md tabular-nums"
                      placeholder="Cantidad"
                    />
                    {trasladoForm.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemTraslado(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 gap-2 flex-wrap">
                <span className="text-[11px] text-slate-500">
                  Tip: Intente enviar <code className="font-mono font-semibold">99999</code> para
                  verificar el bloqueo <code className="font-mono">422 INSUFFICIENT_WAREHOUSE_STOCK</code>.
                </span>
                <button
                  type="submit"
                  disabled={submittingTraslado}
                  className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-semibold uppercase tracking-wider transition-colors"
                >
                  {submittingTraslado ? 'Procesando...' : 'Ejecutar Traslado'}
                </button>
              </div>
            </form>
          </div>

          {/* Formulario 2: Compra / Abastecimiento en Bodega Central */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="px-4 py-3 bg-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Ingreso / Compra a Bodega Central
                </h3>
              </div>
              <span className="font-mono text-[10px] text-emerald-400">
                POST /api/v1/bodegas/entradas
              </span>
            </div>

            <form onSubmit={handleRegistrarEntrada} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold uppercase text-slate-700 mb-1">
                  Bodega Receptora
                </label>
                <select
                  value={entradaForm.bodegaId}
                  onChange={(e) => setEntradaForm({ ...entradaForm, bodegaId: e.target.value })}
                  className="w-full px-2.5 py-2 font-mono text-xs bg-slate-50 border border-slate-300 rounded-md"
                >
                  {bodegas.map((b) => (
                    <option key={b.id} value={b.id}>
                      [{b.codigo}] {b.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-700 mb-1">
                  Material a Abastecer
                </label>
                <select
                  value={entradaForm.materialId}
                  onChange={(e) => setEntradaForm({ ...entradaForm, materialId: e.target.value })}
                  className="w-full px-2.5 py-2 font-mono text-xs bg-slate-50 border border-slate-300 rounded-md"
                >
                  {materiales.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.sku}] {m.nombre} ({formatCurrencyUSD(m.costoUnitarioPromedio)}/
                      {m.unidadMedida})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Cantidad a Ingresar
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={entradaForm.cantidad}
                    onChange={(e) => setEntradaForm({ ...entradaForm, cantidad: e.target.value })}
                    className="w-full px-2.5 py-1.5 font-mono text-xs border border-slate-300 rounded-md tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Nuevo Costo Unit. ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={entradaForm.nuevoCostoUnitario}
                    onChange={(e) =>
                      setEntradaForm({ ...entradaForm, nuevoCostoUnitario: e.target.value })
                    }
                    placeholder="Opcional"
                    className="w-full px-2.5 py-1.5 font-mono text-xs border border-slate-300 rounded-md tabular-nums"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end">
                <button
                  type="submit"
                  disabled={submittingEntrada}
                  className="w-full py-2 px-4 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold uppercase tracking-wider transition-colors"
                >
                  {submittingEntrada ? 'Registrando...' : 'Registrar Entrada en Kardex'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Navegación de Pestañas Técnicas del Módulo 2 */}
      <div className="border-b border-slate-200 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('BODEGAS')}
          className={`px-4 py-2.5 text-xs font-mono font-bold uppercase border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'BODEGAS'
              ? 'border-amber-600 text-slate-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Warehouse className="w-4 h-4" />
          Existencias por Bodega ({bodegas.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('MATERIALES')}
          className={`px-4 py-2.5 text-xs font-mono font-bold uppercase border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'MATERIALES'
              ? 'border-amber-600 text-slate-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          Catálogo Maestro de Materiales ({materiales.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TRASLADOS')}
          className={`px-4 py-2.5 text-xs font-mono font-bold uppercase border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'TRASLADOS'
              ? 'border-amber-600 text-slate-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          Bitácora de Traslados Multi-sitio ({traslados.length})
        </button>
      </div>

      {/* PESTAÑA 1: EXISTENCIAS POR BODEGA */}
      {activeTab === 'BODEGAS' && (
        <div className="space-y-4">
          {/* Selector de Tarjetas de Bodega */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bodegas.map((bod) => {
              const isSelected = selectedBodega?.id === bod.id;
              return (
                <button
                  key={bod.id}
                  type="button"
                  onClick={() => setSelectedBodegaId(bod.id)}
                  className={`text-left p-4 rounded-md border transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-100 text-slate-800 border border-slate-300'
                      }`}
                    >
                      {bod.codigo}
                    </span>
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                        bod.tipo === 'CENTRAL'
                          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {bod.tipo}
                    </span>
                  </div>
                  <div className="text-sm font-bold truncate">{bod.nombre}</div>
                  <div
                    className={`text-[11px] truncate mt-0.5 ${
                      isSelected ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {bod.ubicacion}
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-700/30 flex items-center justify-between font-mono text-xs tabular-nums">
                    <span>{bod.totalItemsCatalogo || bod.inventarios?.length || 0} SKUs</span>
                    <span className="font-bold">
                      {formatCurrencyUSD(bod.valorTotalInventario)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Tabla de Inventario de la Bodega Seleccionada */}
          {selectedBodega && (
            <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-900">
                    [{selectedBodega.codigo}] {selectedBodega.nombre}
                  </span>
                  <p className="text-[11px] text-slate-500">{selectedBodega.ubicacion}</p>
                </div>
                <div className="font-mono text-xs">
                  VALORIZACIÓN TOTAL SITIO:{' '}
                  <strong className="text-slate-900 text-sm tabular-nums">
                    {formatCurrencyUSD(selectedBodega.valorTotalInventario)}
                  </strong>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500">
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4">Material de Construcción</th>
                      <th className="py-3 px-4">Unidad</th>
                      <th className="py-3 px-4 text-right">Cantidad Disponible</th>
                      <th className="py-3 px-4 text-right">Costo Unit. Promedio</th>
                      <th className="py-3 px-4 text-right">Subtotal Valorizado</th>
                      <th className="py-3 px-4 text-center">Estado Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {(selectedBodega.inventarios || []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 font-mono">
                          Esta bodega de obra aún no registra existencias. Ejecute un traslado desde
                          Bodega Central arriba.
                        </td>
                      </tr>
                    ) : (
                      (selectedBodega.inventarios || []).map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {inv.material?.sku}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {inv.material?.nombre}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {inv.material?.unidadMedida}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                            {formatNumber(inv.cantidadDisponible)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600 tabular-nums">
                            {formatCurrencyUSD(inv.material?.costoUnitarioPromedio)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                            {formatCurrencyUSD(inv.subtotalValorizado)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {inv.alertaStockMinimo ? (
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300">
                                <AlertTriangle className="w-3 h-3" /> STOCK BAJO
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                ÓPTIMO
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: CATÁLOGO MAESTRO DE MATERIALES */}
      {activeTab === 'MATERIALES' && (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500">
                  <th className="py-3 px-4">Código SKU</th>
                  <th className="py-3 px-4">Descripción Técnica</th>
                  <th className="py-3 px-4">U.M.</th>
                  <th className="py-3 px-4 text-right">Costo Unitario</th>
                  <th className="py-3 px-4 text-right">Stock Central</th>
                  <th className="py-3 px-4 text-right">Stock en Obras</th>
                  <th className="py-3 px-4 text-right">Total Consolidado</th>
                  <th className="py-3 px-4 text-right">Valor Consolidado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {materiales.map((mat) => (
                  <tr key={mat.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{mat.sku}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{mat.nombre}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{mat.unidadMedida}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {formatCurrencyUSD(mat.costoUnitarioPromedio)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-sky-800 tabular-nums">
                      {formatNumber(mat.stockBodegaCentral)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-amber-800 tabular-nums">
                      {formatNumber(mat.stockBodegasProyecto)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatNumber(mat.stockTotalConsolidado)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrencyUSD(mat.valorTotalConsolidado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: BITÁCORA DE TRASLADOS MULTI-SITIO */}
      {activeTab === 'TRASLADOS' && (
        <div className="space-y-4">
          {traslados.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-slate-200 rounded-md p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-slate-900 text-amber-400">
                    {t.codigo}
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-800">
                    {t.bodegaOrigen?.codigo} → {t.bodegaDestino?.codigo}
                  </span>
                  <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {t.estado}
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-500 tabular-nums">
                  Fecha: {formatDateSV(t.fechaTraslado)} · Valor Total:{' '}
                  <strong className="text-slate-900">
                    {formatCurrencyUSD(t.valorTotalTraslado)}
                  </strong>
                </div>
              </div>

              <p className="text-xs text-slate-600">{t.observaciones}</p>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase text-slate-500">
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3">Material</th>
                      <th className="py-2 px-3 text-right">Cantidad Trasladada</th>
                      <th className="py-2 px-3 text-right">Costo Snap</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-mono">
                    {(t.detalles || []).map((d) => (
                      <tr key={d.id}>
                        <td className="py-2 px-3 font-bold text-slate-900">{d.material?.sku}</td>
                        <td className="py-2 px-3 font-sans text-slate-800">
                          {d.material?.nombre}
                        </td>
                        <td className="py-2 px-3 text-right font-bold tabular-nums">
                          {formatNumber(d.cantidad)} {d.material?.unidadMedida}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {formatCurrencyUSD(d.costoUnitarioSnap)}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold tabular-nums">
                          {formatCurrencyUSD(d.subtotalLinea)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para Registrar Nuevo Material en Catálogo */}
      {showMaterialModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-md max-w-md w-full overflow-hidden shadow-xl">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider">
                Registrar Nuevo Material en Catálogo Maestro
              </span>
              <button
                type="button"
                onClick={() => setShowMaterialModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCrearMaterial} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Código SKU
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoMaterialForm.sku}
                    onChange={(e) =>
                      setNuevoMaterialForm({ ...nuevoMaterialForm, sku: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Unidad de Medida
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoMaterialForm.unidadMedida}
                    onChange={(e) =>
                      setNuevoMaterialForm({ ...nuevoMaterialForm, unidadMedida: e.target.value })
                    }
                    placeholder="BOLSA, M3, VARILLA..."
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-700 mb-1">
                  Nombre Técnico del Material
                </label>
                <input
                  type="text"
                  required
                  value={nuevoMaterialForm.nombre}
                  onChange={(e) =>
                    setNuevoMaterialForm({ ...nuevoMaterialForm, nombre: e.target.value })
                  }
                  placeholder="Ej. Tubería PVC Hidráulica 1/2 pulg SDR-26"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Costo Unit ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={nuevoMaterialForm.costoUnitarioPromedio}
                    onChange={(e) =>
                      setNuevoMaterialForm({
                        ...nuevoMaterialForm,
                        costoUnitarioPromedio: e.target.value,
                      })
                    }
                    className="w-full px-2.5 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Stock Mínimo
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={nuevoMaterialForm.stockMinimoAlerta}
                    onChange={(e) =>
                      setNuevoMaterialForm({
                        ...nuevoMaterialForm,
                        stockMinimoAlerta: e.target.value,
                      })
                    }
                    className="w-full px-2.5 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Stock Inicial
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={nuevoMaterialForm.stockInicialCentral}
                    onChange={(e) =>
                      setNuevoMaterialForm({
                        ...nuevoMaterialForm,
                        stockInicialCentral: e.target.value,
                      })
                    }
                    className="w-full px-2.5 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMaterialModal(false)}
                  className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-slate-900 text-white font-semibold"
                >
                  Guardar Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BodegasPage;
