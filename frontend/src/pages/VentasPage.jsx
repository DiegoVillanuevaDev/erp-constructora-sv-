import React, { useState, useEffect, useMemo } from 'react';
import {
  Landmark,
  FileText,
  Calculator,
  Building,
  Users,
  ShieldAlert,
  CheckCircle2,
  Receipt,
  Lock,
  Plus,
  X,
} from 'lucide-react';
import {
  ventasApi,
  proyectosApi,
  generarTablaAmortizacionLocal,
  calcularDesgloseFiscalSVLocal,
  formatCurrencyUSD,
  formatNumber,
  formatDateSV,
  round2,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const ESTADOS_UNIDAD = ['DISPONIBLE', 'RESERVADA', 'VENDIDA', 'ESCRITURADA'];

const UNIDAD_BADGES = {
  DISPONIBLE: 'bg-emerald-50 text-emerald-900 border-emerald-300',
  RESERVADA: 'bg-amber-50 text-amber-900 border-amber-300',
  VENDIDA: 'bg-sky-50 text-sky-900 border-sky-300',
  ESCRITURADA: 'bg-indigo-50 text-indigo-900 border-indigo-300',
};

const VentasPage = () => {
  const { user, hasRole } = useAuth();
  const canViewModule = hasRole('ADMIN', 'DIRECTOR_PROYECTO', 'INGENIERO_RESIDENTE', 'VENTAS');
  const canMutateSales = hasRole('ADMIN', 'VENTAS');

  const [activeTab, setActiveTab] = useState('CONTRATOS'); // 'CONTRATOS' | 'SIMULADOR' | 'UNIDADES' | 'CLIENTES'
  const [clientes, setClientes] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [documentosFiscales, setDocumentosFiscales] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [selectedContratoId, setSelectedContratoId] = useState('');
  const [filtroEstadoUnidad, setFiltroEstadoUnidad] = useState('');
  const [loading, setLoading] = useState(true);

  const [fiscalErrorBanner, setFiscalErrorBanner] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  // Formulario de Formalización de Nuevo Contrato de Venta
  const [contratoForm, setContratoForm] = useState({
    clienteId: '',
    unidadId: '',
    precioVentaAcordado: '265000',
    montoPrima: '26500',
    plazoMeses: '12',
    tasaInteresAnual: '8.50',
    tipoDocumentoPrima: 'FACTURA_CONSUMIDOR_FINAL',
  });
  const [creatingContrato, setCreatingContrato] = useState(false);

  // Selector de tipo de documento fiscal al cobrar cuota (DTE-01 / DTE-03 CCF / RECIBO_ABONO)
  const [tipoDocCobroCuota, setTipoDocCobroCuota] = useState('FACTURA_CONSUMIDOR_FINAL');
  const [payingCuotaId, setPayingCuotaId] = useState(null);

  // Estado del Simulador Financiero Hipotecario y Tributario SV (IVA 13% + ITBR 3%)
  const [simFinForm, setSimFinForm] = useState({
    precioVentaAcordado: '285000',
    montoPrima: '28500',
    plazoMeses: '24',
    tasaInteresAnual: '8.50',
    tipoDocumento: 'CREDITO_FISCAL_CCF',
  });

  // Modal de Registro de Nueva Unidad Inmobiliaria
  const [showUnidadModal, setShowUnidadModal] = useState(false);
  const [nuevaUnidadForm, setNuevaUnidadForm] = useState({
    proyectoId: '',
    codigo: 'APTO-SB-204',
    tipo: 'APARTAMENTO',
    areaMetrosCuadrados: '132.00',
    precioLista: '248000.00',
  });

  // Modal de Registro de Nuevo Cliente CRM
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [nuevoClienteForm, setNuevoClienteForm] = useState({
    tipo: 'JURIDICO',
    nombreCompleto: '',
    dui: '',
    nit: '0614-200518-104-2',
    nrc: '301928-4',
    giro: 'Servicios de ingeniería, arquitectura y desarrollo inmobiliario',
    direccion: 'Colonia Escalón, Paseo General Escalón #4120, San Salvador',
    telefono: '+503 2264-8800',
    email: 'contacto@corporacionsv.com',
  });

  const loadSalesData = async () => {
    if (!canViewModule) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [cliRes, uniRes, cntRes, docRes, proyRes] = await Promise.all([
        ventasApi.listClientes(),
        ventasApi.listUnidades(),
        ventasApi.listContratos(),
        ventasApi.listDocumentosFiscales(),
        proyectosApi.list(),
      ]);

      const listaClientes = cliRes.data || [];
      const listaUnidades = uniRes.data || [];
      const listaContratos = cntRes.data || [];
      const listaDocs = docRes.data || [];
      const listaProyectos = proyRes.data || [];

      setClientes(listaClientes);
      setUnidades(listaUnidades);
      setContratos(listaContratos);
      setDocumentosFiscales(listaDocs);
      setProyectos(listaProyectos);

      if (listaContratos.length > 0 && !selectedContratoId) {
        setSelectedContratoId(listaContratos[0].id);
      }

      const dispUnidad =
        listaUnidades.find((u) => u.estado === 'DISPONIBLE') || listaUnidades[0];
      const primerCliente = listaClientes[0];

      setContratoForm((prev) => ({
        ...prev,
        clienteId: prev.clienteId || primerCliente?.id || '',
        unidadId: dispUnidad?.id || prev.unidadId || '',
        precioVentaAcordado: dispUnidad ? String(dispUnidad.precioLista) : prev.precioVentaAcordado,
        montoPrima: dispUnidad
          ? String(round2(Number(dispUnidad.precioLista) * 0.1))
          : prev.montoPrima,
      }));

      setNuevaUnidadForm((prev) => ({
        ...prev,
        proyectoId: prev.proyectoId || listaProyectos[0]?.id || '',
      }));
    } catch (error) {
      const data = error.response?.data;
      setFiscalErrorBanner({
        status: error.response?.status || 400,
        errorCode: data?.errorCode || 'VENTAS_LOAD_ERROR',
        message: data?.message || 'Error al cargar el catálogo inmobiliario y contratos.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalesData();
  }, [user?.rol]);

  const unidadesDisponibles = useMemo(() => {
    return unidades.filter((u) => u.estado === 'DISPONIBLE' || u.estado === 'RESERVADA');
  }, [unidades]);

  const unidadesFiltradas = useMemo(() => {
    return unidades.filter((u) => (!filtroEstadoUnidad ? true : u.estado === filtroEstadoUnidad));
  }, [unidades, filtroEstadoUnidad]);

  const selectedContrato = useMemo(() => {
    return contratos.find((c) => c.id === selectedContratoId) || contratos[0] || null;
  }, [contratos, selectedContratoId]);

  const clienteSeleccionadoContrato = useMemo(() => {
    return clientes.find((c) => c.id === contratoForm.clienteId) || null;
  }, [clientes, contratoForm.clienteId]);

  // Cálculos en vivo para la pestaña Simulador Financiero Hipotecario y Tributario SV
  const simulacionHipotecaria = useMemo(() => {
    const precio = round2(Number(simFinForm.precioVentaAcordado || 0));
    const prima = round2(Number(simFinForm.montoPrima || 0));
    const financiado = round2(Math.max(0, precio - prima));

    const tabla = generarTablaAmortizacionLocal({
      montoFinanciado: financiado,
      plazoMeses: Number(simFinForm.plazoMeses || 12),
      tasaInteresAnual: Number(simFinForm.tasaInteresAnual || 0),
    });

    const fiscal = calcularDesgloseFiscalSVLocal({
      montoTotal: precio,
      tipoDocumento: simFinForm.tipoDocumento,
      precioInmueble: precio,
    });

    return {
      precio,
      prima,
      financiado,
      tabla,
      fiscal,
    };
  }, [simFinForm]);

  const handleUnidadContratoChange = (newUnidadId) => {
    const u = unidades.find((item) => item.id === newUnidadId);
    setContratoForm((prev) => ({
      ...prev,
      unidadId: newUnidadId,
      precioVentaAcordado: u ? String(u.precioLista) : prev.precioVentaAcordado,
      montoPrima: u ? String(round2(Number(u.precioLista) * 0.1)) : prev.montoPrima,
    }));
  };

  const handleFirmarContrato = async (e) => {
    e.preventDefault();
    setFiscalErrorBanner(null);
    setSuccessBanner(null);
    setCreatingContrato(true);

    try {
      const payload = {
        clienteId: contratoForm.clienteId,
        unidadId: contratoForm.unidadId,
        precioVentaAcordado: Number(contratoForm.precioVentaAcordado),
        montoPrima: Number(contratoForm.montoPrima || 0),
        plazoMeses: Number(contratoForm.plazoMeses || 12),
        tasaInteresAnual: Number(contratoForm.tasaInteresAnual || 0),
        tipoDocumentoPrima: contratoForm.tipoDocumentoPrima,
      };

      const res = await ventasApi.crearContrato(payload);
      setSuccessBanner(
        res.message ||
          `Contrato '${res.data?.codigo}' formalizado con tabla de amortización francesa.`
      );
      await loadSalesData();
      if (res.data?.id) {
        setSelectedContratoId(res.data.id);
      }
    } catch (error) {
      const data = error.response?.data;
      setFiscalErrorBanner({
        status: error.response?.status || 422,
        errorCode: data?.errorCode || 'FISCAL_CCF_REQUIRES_NRC_AND_GIRO',
        message:
          data?.message ||
          'Operación bloqueada por validación tributaria del Ministerio de Hacienda de El Salvador.',
        details: data?.details || null,
      });
    } finally {
      setCreatingContrato(false);
    }
  };

  const handlePagarCuota = async (contrato, cuota) => {
    setFiscalErrorBanner(null);
    setSuccessBanner(null);
    setPayingCuotaId(cuota.id);

    try {
      const res = await ventasApi.pagarCuota(contrato.id, cuota.id, {
        tipoDocumento: tipoDocCobroCuota,
      });
      setSuccessBanner(
        res.message ||
          `Cuota #${cuota.numeroCuota} pagada y DTE emitido con desglose de IVA 13%.`
      );
      await loadSalesData();
    } catch (error) {
      const data = error.response?.data;
      setFiscalErrorBanner({
        status: error.response?.status || 422,
        errorCode: data?.errorCode || 'FISCAL_CCF_REQUIRES_NRC_AND_GIRO',
        message:
          data?.message ||
          'No se pudo emitir el Comprobante de Crédito Fiscal (DTE-03) al cliente.',
        details: data?.details || null,
      });
    } finally {
      setPayingCuotaId(null);
    }
  };

  const handleCrearUnidad = async (e) => {
    e.preventDefault();
    setFiscalErrorBanner(null);
    setSuccessBanner(null);
    try {
      const res = await ventasApi.createUnidad({
        proyectoId: nuevaUnidadForm.proyectoId,
        codigo: nuevaUnidadForm.codigo,
        tipo: nuevaUnidadForm.tipo,
        areaMetrosCuadrados: Number(nuevaUnidadForm.areaMetrosCuadrados),
        precioLista: Number(nuevaUnidadForm.precioLista),
      });
      setSuccessBanner(res.message || `Unidad '${res.data?.codigo}' agregada al catálogo.`);
      setShowUnidadModal(false);
      await loadSalesData();
    } catch (error) {
      const data = error.response?.data;
      setFiscalErrorBanner({
        status: error.response?.status || 400,
        errorCode: data?.errorCode || 'UNIDAD_CREATE_ERROR',
        message: data?.message || 'No se pudo registrar la unidad inmobiliaria.',
      });
    }
  };

  const handleCrearCliente = async (e) => {
    e.preventDefault();
    setFiscalErrorBanner(null);
    setSuccessBanner(null);
    try {
      const res = await ventasApi.createCliente(nuevoClienteForm);
      setSuccessBanner(res.message || `Cliente '${res.data?.nombreCompleto}' registrado.`);
      setShowClienteModal(false);
      await loadSalesData();
    } catch (error) {
      const data = error.response?.data;
      setFiscalErrorBanner({
        status: error.response?.status || 400,
        errorCode: data?.errorCode || 'CLIENTE_CREATE_ERROR',
        message: data?.message || 'Error al registrar el cliente.',
      });
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
          El Módulo 5 (Ventas CRM y Facturación Fiscal DTE) está habilitado para{' '}
          <code className="font-mono font-semibold">ADMIN</code>,{' '}
          <code className="font-mono font-semibold">VENTAS</code>,{' '}
          <code className="font-mono font-semibold">DIRECTOR_PROYECTO</code> e{' '}
          <code className="font-mono font-semibold">INGENIERO_RESIDENTE</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado Módulo 5 */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-900 text-amber-400">
              MÓDULO 05
            </span>
            <span className="font-mono text-xs text-slate-500">
              AMORTIZACIÓN FRANCESA · DTE-01 (FACTURA) / DTE-03 (CCF 13% IVA) · ITBR 3%
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Ventas CRM, Financiamiento Inmobiliario y Facturación Fiscal de El Salvador
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generación de planes de pago con ajuste de centavos en la última cuota (
            <code className="font-mono">$0.00</code> de descuadre) y bloqueo tributario{' '}
            <code className="font-mono">HTTP 422 FISCAL_CCF_REQUIRES_NRC_AND_GIRO</code> conforme al
            Art. 114 del Código Tributario SV.
          </p>
        </div>

        {canMutateSales && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowClienteModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800"
            >
              <Plus className="w-4 h-4" />
              Nuevo Cliente CRM
            </button>
            <button
              type="button"
              onClick={() => setShowUnidadModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              Nueva Unidad Inmobiliaria
            </button>
          </div>
        )}
      </div>

      {/* Banner de Bloqueo Fiscal del Ministerio de Hacienda SV (HTTP 422 FISCAL_CCF_REQUIRES_NRC_AND_GIRO) */}
      {fiscalErrorBanner && (
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
                    HTTP {fiscalErrorBanner.status} · {fiscalErrorBanner.errorCode}
                  </span>
                  <span className="font-bold text-sm text-red-900">
                    Rechazo Tributario — Ministerio de Hacienda de El Salvador (DTE-03 CCF)
                  </span>
                </div>
                <p className="mt-1.5 text-red-800 leading-relaxed">{fiscalErrorBanner.message}</p>

                {fiscalErrorBanner.details && (
                  <div className="mt-2.5 p-2.5 rounded bg-white border border-red-200 font-mono text-[11px] flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Cliente: <strong>{fiscalErrorBanner.details.nombreCompleto}</strong> (
                      {fiscalErrorBanner.details.tipoCliente})
                    </span>
                    <span className="text-red-700 font-bold">
                      Campos Faltantes:{' '}
                      {(fiscalErrorBanner.details.camposFaltantes || []).join(', ').toUpperCase()}
                    </span>
                    <span className="text-slate-600">
                      {fiscalErrorBanner.details.normativaLegal}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFiscalErrorBanner(null)}
              className="text-red-500 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {successBanner && (
        <div className="bg-emerald-50 border-l-4 border-l-emerald-600 border border-emerald-200 rounded-lg p-3.5 text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successBanner}</span>
          </div>
          <button type="button" onClick={() => setSuccessBanner(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pestañas Técnicas del Módulo 5 */}
      <div className="border-b border-slate-200 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('CONTRATOS')}
          className={`px-4 py-2.5 text-xs font-mono font-bold uppercase border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'CONTRATOS'
              ? 'border-amber-600 text-slate-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          1. Contratos, Cuotas y Facturación DTE ({contratos.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SIMULADOR')}
          className={`px-4 py-2.5 text-xs font-mono font-bold uppercase border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'SIMULADOR'
              ? 'border-amber-600 text-slate-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calculator className="w-4 h-4" />
          2. Simulador Hipotecario y Tributario SV (IVA 13% + ITBR 3%)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('UNIDADES')}
          className={`px-4 py-2.5 text-xs font-mono font-bold uppercase border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'UNIDADES'
              ? 'border-amber-600 text-slate-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          3. Catálogo de Unidades ({unidades.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CLIENTES')}
          className={`px-4 py-2.5 text-xs font-mono font-bold uppercase border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'CLIENTES'
              ? 'border-amber-600 text-slate-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          4. Directorio de Clientes CRM ({clientes.length})
        </button>
      </div>

      {/* PESTAÑA 1: CONTRATOS DE VENTA, AMORTIZACIÓN FRANCESA Y FACTURACIÓN FISCAL DTE */}
      {activeTab === 'CONTRATOS' && (
        <div className="space-y-6">
          {/* Panel de Formalización de Nuevo Contrato de Venta */}
          {canMutateSales && (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Formalizar Nuevo Contrato de Compraventa y Generar Tabla de Amortización
                    Francesa
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-amber-400">
                  POST /api/v1/ventas/contratos
                </span>
              </div>

              <form onSubmit={handleFirmarContrato} className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold uppercase text-slate-700 mb-1">
                      1. Cliente Comprador
                    </label>
                    <select
                      value={contratoForm.clienteId}
                      onChange={(e) =>
                        setContratoForm({ ...contratoForm, clienteId: e.target.value })
                      }
                      className="w-full px-3 py-2 font-mono text-xs bg-slate-50 border border-slate-300 rounded-md"
                    >
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          [{c.tipo}] {c.nombreCompleto}{' '}
                          {c.nrc ? `(NRC: ${c.nrc})` : '(Sin NRC - Solo DTE-01)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold uppercase text-slate-700 mb-1">
                      2. Unidad Inmobiliaria Disponible
                    </label>
                    <select
                      value={contratoForm.unidadId}
                      onChange={(e) => handleUnidadContratoChange(e.target.value)}
                      className="w-full px-3 py-2 font-mono text-xs bg-slate-50 border border-slate-300 rounded-md"
                    >
                      {unidadesDisponibles.length === 0 ? (
                        <option value="">Todas las unidades están vendidas</option>
                      ) : (
                        unidadesDisponibles.map((u) => (
                          <option key={u.id} value={u.id}>
                            [{u.codigo}] {u.tipo} ({u.areaMetrosCuadrados} m²) —{' '}
                            {formatCurrencyUSD(u.precioLista)}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold uppercase text-slate-700 mb-1">
                      3. Documento Fiscal para la Prima (MH SV)
                    </label>
                    <select
                      value={contratoForm.tipoDocumentoPrima}
                      onChange={(e) =>
                        setContratoForm({
                          ...contratoForm,
                          tipoDocumentoPrima: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 font-mono text-xs font-bold bg-slate-50 border border-slate-300 rounded-md"
                    >
                      <option value="FACTURA_CONSUMIDOR_FINAL">
                        DTE-01 · FACTURA_CONSUMIDOR_FINAL
                      </option>
                      <option value="CREDITO_FISCAL_CCF">
                        DTE-03 · CREDITO_FISCAL_CCF (Exige NRC y Giro)
                      </option>
                      <option value="RECIBO_ABONO">RECIBO_ABONO (Caja)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-semibold uppercase text-slate-700 mb-1">
                      Precio Venta Acordado ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      value={contratoForm.precioVentaAcordado}
                      onChange={(e) =>
                        setContratoForm({
                          ...contratoForm,
                          precioVentaAcordado: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 font-mono text-xs font-bold border border-slate-300 rounded-md tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase text-slate-700 mb-1">
                      Prima Inicial ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={contratoForm.montoPrima}
                      onChange={(e) =>
                        setContratoForm({ ...contratoForm, montoPrima: e.target.value })
                      }
                      className="w-full px-3 py-2 font-mono text-xs font-bold border border-slate-300 rounded-md tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase text-slate-700 mb-1">
                      Plazo (Meses)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="360"
                      required
                      value={contratoForm.plazoMeses}
                      onChange={(e) =>
                        setContratoForm({ ...contratoForm, plazoMeses: e.target.value })
                      }
                      className="w-full px-3 py-2 font-mono text-xs font-bold border border-slate-300 rounded-md tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase text-slate-700 mb-1">
                      Tasa Anual (%)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      required
                      value={contratoForm.tasaInteresAnual}
                      onChange={(e) =>
                        setContratoForm({
                          ...contratoForm,
                          tasaInteresAnual: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 font-mono text-xs font-bold border border-slate-300 rounded-md tabular-nums"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-600">
                    {clienteSeleccionadoContrato && !clienteSeleccionadoContrato.nrc ? (
                      <span>
                        Tip Auditoría Fiscal: El cliente{' '}
                        <strong>{clienteSeleccionadoContrato.nombreCompleto}</strong> es Persona
                        Natural sin NRC. Si selecciona{' '}
                        <code className="font-mono font-bold text-red-700">CREDITO_FISCAL_CCF</code>{' '}
                        verá el bloqueo <code className="font-mono">HTTP 422</code> del Ministerio
                        de Hacienda.
                      </span>
                    ) : (
                      <span>
                        Cliente contribuyente con NRC{' '}
                        <code className="font-mono font-bold">
                          {clienteSeleccionadoContrato?.nrc}
                        </code>{' '}
                        habilitado para emisión de Crédito Fiscal (DTE-03).
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={creatingContrato || unidadesDisponibles.length === 0}
                    className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 disabled:bg-slate-400 text-white font-semibold uppercase tracking-wider transition-colors"
                  >
                    {creatingContrato
                      ? 'Formalizando Contrato...'
                      : 'Firmar Contrato y Emitir Amortización'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Listado de Contratos Activos y Tabla de Amortización Francesa */}
          {contratos.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
              <FileText className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-900">
                No hay contratos formalizados en esta sesión
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Utilice el formulario superior para firmar un contrato sobre cualquiera de las
                unidades disponibles y generar su tabla de amortización francesa.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Selector de Contratos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {contratos.map((cnt) => {
                  const isSelected = selectedContrato?.id === cnt.id;
                  return (
                    <button
                      key={cnt.id}
                      type="button"
                      onClick={() => setSelectedContratoId(cnt.id)}
                      className={`text-left p-4 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                          {cnt.codigo}
                        </span>
                        <span className="font-mono text-[10px] text-emerald-400">{cnt.estado}</span>
                      </div>
                      <div className="text-sm font-bold truncate mt-1">
                        {cnt.cliente?.nombreCompleto}
                      </div>
                      <div
                        className={`text-xs font-mono mt-0.5 ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        Unidad: {cnt.unidad?.codigo} · Plazo: {cnt.plazoMeses} meses (
                        {cnt.tasaInteresAnual}%)
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-700/30 flex justify-between font-mono text-xs tabular-nums">
                        <span>Saldo: {formatCurrencyUSD(cnt.saldoPendiente)}</span>
                        <span className="font-bold">
                          Precio: {formatCurrencyUSD(cnt.precioVentaAcordado)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Detalle de Tabla de Amortización y Cobro Fiscal de Cuotas */}
              {selectedContrato && (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-5 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400">
                          [{selectedContrato.codigo}]
                        </span>
                        <h3 className="text-sm font-bold">
                          Tabla de Amortización Francesa — {selectedContrato.cliente?.nombreCompleto}
                        </h3>
                      </div>
                      <p className="text-xs font-mono text-slate-300 mt-0.5">
                        Financiado: {formatCurrencyUSD(selectedContrato.montoFinanciado)} · Prima:{' '}
                        {formatCurrencyUSD(selectedContrato.montoPrima)} · Saldo Pendiente:{' '}
                        {formatCurrencyUSD(selectedContrato.saldoPendiente)} · Cliente NRC:{' '}
                        {selectedContrato.cliente?.nrc || 'SIN NRC'}
                      </p>
                    </div>

                    {canMutateSales && (
                      <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded border border-slate-700">
                        <span className="font-mono text-[10px] uppercase text-amber-400">
                          EMITIR AL COBRAR CUOTA:
                        </span>
                        <select
                          value={tipoDocCobroCuota}
                          onChange={(e) => setTipoDocCobroCuota(e.target.value)}
                          className="bg-slate-900 text-white font-mono text-xs px-2 py-1 rounded border border-slate-600"
                        >
                          <option value="FACTURA_CONSUMIDOR_FINAL">
                            DTE-01 Factura Consumidor Final
                          </option>
                          <option value="CREDITO_FISCAL_CCF">
                            DTE-03 Comprobante Crédito Fiscal (CCF)
                          </option>
                          <option value="RECIBO_ABONO">Recibo de Abono</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-mono text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500">
                          <th className="py-2.5 px-4">N° Cuota</th>
                          <th className="py-2.5 px-4">Vencimiento</th>
                          <th className="py-2.5 px-4 text-right">Abono Capital</th>
                          <th className="py-2.5 px-4 text-right">Interés Mes</th>
                          <th className="py-2.5 px-4 text-right">Cuota Nivelada</th>
                          <th className="py-2.5 px-4 text-center">Estado</th>
                          {canMutateSales && (
                            <th className="py-2.5 px-4 text-right">Facturación DTE MH</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(selectedContrato.cuotas || []).map((cuota) => (
                          <tr key={cuota.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-bold text-slate-900">
                              #{cuota.numeroCuota}
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 tabular-nums">
                              {formatDateSV(cuota.fechaVencimiento)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-semibold text-slate-900 tabular-nums">
                              {formatCurrencyUSD(cuota.montoCapital)}
                            </td>
                            <td className="py-2.5 px-4 text-right text-amber-700 tabular-nums">
                              {formatCurrencyUSD(cuota.montoInteres)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-slate-900 tabular-nums">
                              {formatCurrencyUSD(cuota.montoTotalCuota)}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {cuota.estado === 'PAGADA' ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                  PAGADA
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                                  PENDIENTE
                                </span>
                              )}
                            </td>
                            {canMutateSales && (
                              <td className="py-2.5 px-4 text-right">
                                {cuota.estado === 'PAGADA' ? (
                                  <span className="text-[11px] text-emerald-700 font-semibold">
                                    Facturada ({formatDateSV(cuota.fechaPago)})
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={payingCuotaId === cuota.id}
                                    onClick={() => handlePagarCuota(selectedContrato, cuota)}
                                    className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-[11px]"
                                  >
                                    {payingCuotaId === cuota.id
                                      ? 'Emitiendo...'
                                      : `Cobrar + Emitir ${
                                          tipoDocCobroCuota === 'CREDITO_FISCAL_CCF'
                                            ? 'CCF'
                                            : 'DTE-01'
                                        }`}
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Bitácora de Documentos Fiscales Emitidos (DTE-01 / DTE-03 CCF) */}
              {documentosFiscales.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-5 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold uppercase text-slate-900 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-amber-600" />
                      Libro de Ventas y Documentos Tributarios Electrónicos Emitidos (
                      {documentosFiscales.length})
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      IVA Débito Fiscal 13.00%
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-mono text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500">
                          <th className="py-2.5 px-4">N° Documento DTE</th>
                          <th className="py-2.5 px-4">Tipo Fiscal</th>
                          <th className="py-2.5 px-4">Concepto</th>
                          <th className="py-2.5 px-4 text-right">Base Gravada</th>
                          <th className="py-2.5 px-4 text-right">IVA (13%)</th>
                          <th className="py-2.5 px-4 text-right">Total Facturado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {documentosFiscales.map((doc) => (
                          <tr key={doc.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-bold text-slate-900">
                              {doc.numeroDocumento}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-400 text-[10px] font-bold">
                                {doc.tipoDocumento}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-sans text-slate-700">{doc.concepto}</td>
                            <td className="py-2.5 px-4 text-right tabular-nums">
                              {formatCurrencyUSD(doc.montoGravado)}
                            </td>
                            <td className="py-2.5 px-4 text-right text-amber-700 font-semibold tabular-nums">
                              {formatCurrencyUSD(doc.montoIva)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-emerald-800 tabular-nums">
                              {formatCurrencyUSD(doc.montoTotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: SIMULADOR FINANCIERO HIPOTECARIO Y TRIBUTARIO SV (IVA 13% + ITBR 3%) */}
      {activeTab === 'SIMULADOR' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Parámetros del Simulador */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-slate-900 text-white">
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Parámetros de estructuración hipotecaria
                </h3>
              </div>

              <div className="p-4 space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Valor del Inmueble (USD)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    min="1000"
                    value={simFinForm.precioVentaAcordado}
                    onChange={(e) =>
                      setSimFinForm({ ...simFinForm, precioVentaAcordado: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono text-sm font-bold border border-slate-300 rounded-md tabular-nums"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Prima / Enganche Inicial (USD)
                  </label>
                  <input
                    type="number"
                    step="500"
                    min="0"
                    value={simFinForm.montoPrima}
                    onChange={(e) =>
                      setSimFinForm({ ...simFinForm, montoPrima: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono text-sm font-bold border border-slate-300 rounded-md tabular-nums"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold uppercase text-slate-700 mb-1">
                      Plazo (Meses)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="360"
                      value={simFinForm.plazoMeses}
                      onChange={(e) =>
                        setSimFinForm({ ...simFinForm, plazoMeses: e.target.value })
                      }
                      className="w-full px-3 py-2 font-mono text-sm font-bold border border-slate-300 rounded-md tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase text-slate-700 mb-1">
                      Tasa Anual (%)
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={simFinForm.tasaInteresAnual}
                      onChange={(e) =>
                        setSimFinForm({ ...simFinForm, tasaInteresAnual: e.target.value })
                      }
                      className="w-full px-3 py-2 font-mono text-sm font-bold border border-slate-300 rounded-md tabular-nums"
                    />
                  </div>
                </div>

                {/* Cuadro de Impuesto a la Transferencia de Bienes Raíces (ITBR El Salvador) */}
                <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 space-y-1.5 font-mono">
                  <div className="text-[11px] font-bold uppercase text-slate-900">
                    Liquidación Tributaria SV (IVA 13% + ITBR 3%)
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Base Gravada (Sin IVA):</span>
                    <strong className="tabular-nums">
                      {formatCurrencyUSD(simulacionHipotecaria.fiscal.montoGravado)}
                    </strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Débito Fiscal IVA (13%):</span>
                    <strong className="text-amber-700 tabular-nums">
                      {formatCurrencyUSD(simulacionHipotecaria.fiscal.montoIva)}
                    </strong>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200 flex justify-between text-xs">
                    <span className="text-slate-600">Tramo Exento ITBR (¢250k):</span>
                    <span className="tabular-nums">$28,571.43</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">ITBR (3% s/ exceso):</span>
                    <strong className="text-emerald-800 tabular-nums">
                      {formatCurrencyUSD(
                        simulacionHipotecaria.fiscal.impuestoTransferenciaBienesRaices
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla de Amortización Simulada */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Proyección de Tabla de Amortización Francesa (Cuota Nivelada:{' '}
                    {formatCurrencyUSD(simulacionHipotecaria.tabla.cuotaNiveladaReferencia)})
                  </h3>
                  <p className="text-[11px] font-mono text-slate-300">
                    Capital Financiado: {formatCurrencyUSD(simulacionHipotecaria.tabla.totalCapital)}{' '}
                    · Total Intereses:{' '}
                    {formatCurrencyUSD(simulacionHipotecaria.tabla.totalIntereses)} · Saldo Final
                    Última Cuota: $0.00
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[10px] uppercase text-slate-600">
                    <tr>
                      <th className="py-2 px-3">Cuota</th>
                      <th className="py-2 px-3 text-right">Saldo Inicial</th>
                      <th className="py-2 px-3 text-right">Capital</th>
                      <th className="py-2 px-3 text-right">Interés</th>
                      <th className="py-2 px-3 text-right">Cuota Total</th>
                      <th className="py-2 px-3 text-right">Saldo Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {simulacionHipotecaria.tabla.cuotas.map((c) => (
                      <tr key={c.numeroCuota} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-900">#{c.numeroCuota}</td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {formatCurrencyUSD(c.saldoInicial)}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-900 tabular-nums">
                          {formatCurrencyUSD(c.montoCapital)}
                        </td>
                        <td className="py-2 px-3 text-right text-amber-700 tabular-nums">
                          {formatCurrencyUSD(c.montoInteres)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">
                          {formatCurrencyUSD(c.montoTotalCuota)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-800 tabular-nums">
                          {formatCurrencyUSD(c.saldoFinal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: CATÁLOGO DE UNIDADES INMOBILIARIAS */}
      {activeTab === 'UNIDADES' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs uppercase text-slate-500 mr-1">Estado:</span>
            <button
              type="button"
              onClick={() => setFiltroEstadoUnidad('')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold border ${
                filtroEstadoUnidad === ''
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              TODAS ({unidades.length})
            </button>
            {ESTADOS_UNIDAD.map((est) => (
              <button
                key={est}
                type="button"
                onClick={() => setFiltroEstadoUnidad(est)}
                className={`px-3 py-1 rounded text-xs font-mono font-bold border ${
                  filtroEstadoUnidad === est
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                {est}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {unidadesFiltradas.map((u) => (
              <div
                key={u.id}
                className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-slate-900 text-amber-400">
                      {u.codigo}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                        UNIDAD_BADGES[u.estado] || UNIDAD_BADGES.DISPONIBLE
                      }`}
                    >
                      {u.estado}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {u.tipo} — {formatNumber(u.areaMetrosCuadrados)} m²
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Proyecto: [{u.proyecto?.codigo}] {u.proyecto?.nombre}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between font-mono">
                  <span className="text-[10px] uppercase text-slate-500">PRECIO DE LISTA</span>
                  <span className="text-base font-bold text-slate-900 tabular-nums">
                    {formatCurrencyUSD(u.precioLista)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA 4: DIRECTORIO DE CLIENTES CRM (NATURALES Y JURÍDICOS CONTRIBUYENTES) */}
      {activeTab === 'CLIENTES' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500">
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Nombre / Razón Social</th>
                  <th className="py-3 px-4">DUI / NIT</th>
                  <th className="py-3 px-4">NRC y Giro (Actividad Económica)</th>
                  <th className="py-3 px-4 text-center">Aptitud Fiscal MH SV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {clientes.map((c) => {
                  const aptoCcf = Boolean(c.nrc && c.giro);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{c.tipo}</td>
                      <td className="py-3 px-4 font-sans">
                        <div className="font-bold text-slate-900">{c.nombreCompleto}</div>
                        <div className="text-[11px] text-slate-500">{c.email}</div>
                      </td>
                      <td className="py-3 px-4 tabular-nums text-slate-700">
                        <div>DUI: {c.dui || '—'}</div>
                        <div>NIT: {c.nit || '—'}</div>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <div className="font-mono font-bold text-slate-900">
                          NRC: {c.nrc || 'SIN NRC'}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {c.giro || 'Sin giro económico registrado'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {aptoCcf ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-300 text-[10px] font-bold">
                            Habilitado para CCF (DTE-03)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold">
                            Solo Consumidor Final (DTE-01)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL PARA REGISTRAR NUEVA UNIDAD INMOBILIARIA */}
      {showUnidadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full overflow-hidden shadow-xl">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Nueva Unidad Inmobiliaria
              </h3>
              <button
                type="button"
                onClick={() => setShowUnidadModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCrearUnidad} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold uppercase text-slate-700 mb-1">
                  Proyecto
                </label>
                <select
                  value={nuevaUnidadForm.proyectoId}
                  onChange={(e) =>
                    setNuevaUnidadForm({ ...nuevaUnidadForm, proyectoId: e.target.value })
                  }
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                >
                  {proyectos.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.codigo}] {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Código Unidad
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevaUnidadForm.codigo}
                    onChange={(e) =>
                      setNuevaUnidadForm({ ...nuevaUnidadForm, codigo: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={nuevaUnidadForm.tipo}
                    onChange={(e) =>
                      setNuevaUnidadForm({ ...nuevaUnidadForm, tipo: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  >
                    <option value="CASA">CASA</option>
                    <option value="APARTAMENTO">APARTAMENTO</option>
                    <option value="LOTE">LOTE</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Área (m²)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={nuevaUnidadForm.areaMetrosCuadrados}
                    onChange={(e) =>
                      setNuevaUnidadForm({
                        ...nuevaUnidadForm,
                        areaMetrosCuadrados: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Precio Lista ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={nuevaUnidadForm.precioLista}
                    onChange={(e) =>
                      setNuevaUnidadForm({ ...nuevaUnidadForm, precioLista: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUnidadModal(false)}
                  className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                >
                  Guardar Unidad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA REGISTRAR NUEVO CLIENTE CRM */}
      {showClienteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-lg w-full overflow-hidden shadow-xl">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Registrar Cliente en Directorio CRM
              </h3>
              <button
                type="button"
                onClick={() => setShowClienteModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCrearCliente} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Personería
                  </label>
                  <select
                    value={nuevoClienteForm.tipo}
                    onChange={(e) =>
                      setNuevoClienteForm({ ...nuevoClienteForm, tipo: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  >
                    <option value="NATURAL">NATURAL (Persona Natural)</option>
                    <option value="JURIDICO">JURIDICO (Sociedad Contribuyente)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    NIT / DUI Homologado
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoClienteForm.nit}
                    onChange={(e) =>
                      setNuevoClienteForm({ ...nuevoClienteForm, nit: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold uppercase text-slate-700 mb-1">
                  Nombre Completo o Razón Social
                </label>
                <input
                  type="text"
                  required
                  value={nuevoClienteForm.nombreCompleto}
                  onChange={(e) =>
                    setNuevoClienteForm({
                      ...nuevoClienteForm,
                      nombreCompleto: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    NRC (Registro IVA MH)
                  </label>
                  <input
                    type="text"
                    value={nuevoClienteForm.nrc}
                    onChange={(e) =>
                      setNuevoClienteForm({ ...nuevoClienteForm, nrc: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                    placeholder="Ej. 245890-1"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Giro Económico
                  </label>
                  <input
                    type="text"
                    value={nuevoClienteForm.giro}
                    onChange={(e) =>
                      setNuevoClienteForm({ ...nuevoClienteForm, giro: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowClienteModal(false)}
                  className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                >
                  Registrar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VentasPage;
