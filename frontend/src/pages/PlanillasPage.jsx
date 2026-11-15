import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Calculator,
  FileSpreadsheet,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Plus,
  X,
  ArrowRight,
  Scale,
} from 'lucide-react';
import {
  planillasApi,
  proyectosApi,
  calcularDeduccionesLeySVLocal,
  formatCurrencyUSD,
  formatNumber,
  formatDateSV,
  round2,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const TRAMOS_OFICIALES_MH_SV = {
  ADMINISTRATIVA_QUINCENAL: [
    { tramo: 'TRAMO_I', rango: '$0.01 a $275.00', porcentaje: 'EXENTO (0%)', sobreExceso: '$0.00', cuotaFija: '$0.00' },
    { tramo: 'TRAMO_II', rango: '$275.01 a $447.62', porcentaje: '10%', sobreExceso: '$275.00', cuotaFija: '$8.83' },
    { tramo: 'TRAMO_III', rango: '$447.63 a $1,019.05', porcentaje: '20%', sobreExceso: '$447.62', cuotaFija: '$30.00' },
    { tramo: 'TRAMO_IV', rango: '$1,019.06 en adelante', porcentaje: '30%', sobreExceso: '$1,019.05', cuotaFija: '$144.28' },
  ],
  CAMPO_SEMANAL: [
    { tramo: 'TRAMO_I', rango: '$0.01 a $137.50', porcentaje: 'EXENTO (0%)', sobreExceso: '$0.00', cuotaFija: '$0.00' },
    { tramo: 'TRAMO_II', rango: '$137.51 a $223.81', porcentaje: '10%', sobreExceso: '$137.50', cuotaFija: '$4.42' },
    { tramo: 'TRAMO_III', rango: '$223.82 a $509.52', porcentaje: '20%', sobreExceso: '$223.81', cuotaFija: '$15.00' },
    { tramo: 'TRAMO_IV', rango: '$509.53 en adelante', porcentaje: '30%', sobreExceso: '$509.52', cuotaFija: '$72.14' },
  ],
};

const ESTADO_PLANILLA_BADGES = {
  BORRADOR: 'bg-amber-50 text-amber-900 border-amber-300',
  APROBADA: 'bg-sky-50 text-sky-900 border-sky-300',
  PAGADA: 'bg-emerald-50 text-emerald-900 border-emerald-300',
};

const PlanillasPage = () => {
  const { user, hasRole } = useAuth();
  const canViewModule = hasRole('ADMIN', 'DIRECTOR_PROYECTO', 'RRHH');
  const canMutatePayroll = hasRole('ADMIN', 'RRHH');

  const [activeTab, setActiveTab] = useState('SIMULADOR'); // 'SIMULADOR' | 'PLANILLAS' | 'EMPLEADOS'
  const [empleados, setEmpleados] = useState([]);
  const [planillas, setPlanillas] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [selectedPlanillaId, setSelectedPlanillaId] = useState('');
  const [loading, setLoading] = useState(true);

  const [errorBanner, setErrorBanner] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  // Estado de la Calculadora Interactiva de Ley Salvadoreña (Simulador en Tiempo Real)
  const [escenarioSim, setEscenarioSim] = useState('QUINCENAL_ADMIN'); // 'QUINCENAL_ADMIN' | 'SEMANAL_JORNAL' | 'SEMANAL_DESTAJO_10'
  const [simForm, setSimForm] = useState({
    tipoPlanilla: 'ADMINISTRATIVA_QUINCENAL',
    modalidadPago: 'SALARIO_MENSUAL',
    salarioBaseMensual: '1500.00',
    diasTrabajados: '15',
    tarifaDiaria: '25.00',
    tarifaUnitariaDestajo: '12.50',
    unidadesDestajo: '20',
    otrasDeducciones: '0.00',
    aplicarRetencionEventual10: false,
  });
  const [simulacionServer, setSimulacionServer] = useState(null);

  // Modal de Generación de Planilla Quincenal o Semanal
  const [showGenerarModal, setShowGenerarModal] = useState(false);
  const [generatingPlanilla, setGeneratingPlanilla] = useState(false);
  const [planillaForm, setPlanillaForm] = useState({
    tipo: 'ADMINISTRATIVA_QUINCENAL',
    periodoInicio: '2026-03-01',
    periodoFin: '2026-03-15',
  });

  // Modal de Registro de Nuevo Empleado
  const [showEmpleadoModal, setShowEmpleadoModal] = useState(false);
  const [creatingEmpleado, setCreatingEmpleado] = useState(false);
  const [nuevoEmpleadoForm, setNuevoEmpleadoForm] = useState({
    codigo: 'EMP-CAM-003',
    nombres: '',
    apellidos: '',
    dui: '05128394-1',
    nup: '591029384711',
    numeroIsss: '405918273',
    cargo: 'Armador de Hierro Estructural',
    tipoPlanilla: 'CAMPO_SEMANAL',
    modalidadPago: 'DIA_TRABAJADO',
    salarioBaseMensual: '1200.00',
    tarifaDiaria: '28.00',
    tarifaUnitariaDestajo: '14.00',
    proyectoAsignadoId: '',
  });

  const loadPayrollData = async () => {
    if (!canViewModule) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [empRes, plnRes, proyRes] = await Promise.all([
        planillasApi.listEmpleados(),
        planillasApi.listPlanillas(),
        proyectosApi.list(),
      ]);

      const listaEmp = empRes.data || [];
      const listaPln = plnRes.data || [];
      const listaProy = proyRes.data || [];

      setEmpleados(listaEmp);
      setPlanillas(listaPln);
      setProyectos(listaProy);

      if (listaPln.length > 0 && !selectedPlanillaId) {
        setSelectedPlanillaId(listaPln[0].id);
      }

      setNuevoEmpleadoForm((prev) => ({
        ...prev,
        codigo: `EMP-SV-00${listaEmp.length + 1}`,
        proyectoAsignadoId: prev.proyectoAsignadoId || listaProy[1]?.id || listaProy[0]?.id || '',
      }));
    } catch (error) {
      const data = error.response?.data;
      setErrorBanner({
        status: error.response?.status || 400,
        errorCode: data?.errorCode || 'PLANILLAS_LOAD_ERROR',
        message: data?.message || 'Error al cargar el padrón laboral y las planillas.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayrollData();
  }, [user?.rol]);

  const handleSelectEscenarioSim = (modo) => {
    setEscenarioSim(modo);
    if (modo === 'QUINCENAL_ADMIN') {
      setSimForm({
        tipoPlanilla: 'ADMINISTRATIVA_QUINCENAL',
        modalidadPago: 'SALARIO_MENSUAL',
        salarioBaseMensual: '1500.00',
        diasTrabajados: '15',
        tarifaDiaria: '25.00',
        tarifaUnitariaDestajo: '12.50',
        unidadesDestajo: '20',
        otrasDeducciones: '0.00',
        aplicarRetencionEventual10: false,
      });
    } else if (modo === 'SEMANAL_JORNAL') {
      setSimForm({
        tipoPlanilla: 'CAMPO_SEMANAL',
        modalidadPago: 'DIA_TRABAJADO',
        salarioBaseMensual: '1500.00',
        diasTrabajados: '6',
        tarifaDiaria: '25.00',
        tarifaUnitariaDestajo: '12.50',
        unidadesDestajo: '20',
        otrasDeducciones: '0.00',
        aplicarRetencionEventual10: false,
      });
    } else if (modo === 'SEMANAL_DESTAJO_10') {
      setSimForm({
        tipoPlanilla: 'CAMPO_SEMANAL',
        modalidadPago: 'DESTAJO',
        salarioBaseMensual: '1500.00',
        diasTrabajados: '6',
        tarifaDiaria: '25.00',
        tarifaUnitariaDestajo: '12.50',
        unidadesDestajo: '24',
        otrasDeducciones: '0.00',
        aplicarRetencionEventual10: true,
      });
    }
  };

  // Cálculo instantáneo local + sincronización con backend `planillasApi.simularCalculo`
  const calculoEnVivo = useMemo(() => {
    let ingresoBruto = 0;
    if (simForm.modalidadPago === 'SALARIO_MENSUAL') {
      const dias = Number(simForm.diasTrabajados || 15);
      ingresoBruto = round2((Number(simForm.salarioBaseMensual || 0) / 2) * (dias / 15));
    } else if (simForm.modalidadPago === 'DIA_TRABAJADO') {
      ingresoBruto = round2(
        Number(simForm.tarifaDiaria || 0) * Number(simForm.diasTrabajados || 0)
      );
    } else if (simForm.modalidadPago === 'DESTAJO') {
      ingresoBruto = round2(
        Number(simForm.tarifaUnitariaDestajo || 0) * Number(simForm.unidadesDestajo || 0)
      );
    }

    return calcularDeduccionesLeySVLocal({
      ingresoBruto,
      tipoPlanilla: simForm.tipoPlanilla,
      otrasDeducciones: Number(simForm.otrasDeducciones || 0),
      aplicarRetencionEventual10: Boolean(simForm.aplicarRetencionEventual10),
    });
  }, [simForm]);

  const handleVerificarEnServidor = async () => {
    try {
      const res = await planillasApi.simularCalculo({
        tipoPlanilla: simForm.tipoPlanilla,
        modalidadPago: simForm.modalidadPago,
        salarioBaseMensual: Number(simForm.salarioBaseMensual),
        diasTrabajados: Number(simForm.diasTrabajados),
        tarifaDiaria: Number(simForm.tarifaDiaria),
        tarifaUnitariaDestajo: Number(simForm.tarifaUnitariaDestajo),
        unidadesDestajo: Number(simForm.unidadesDestajo),
        otrasDeducciones: Number(simForm.otrasDeducciones || 0),
        aplicarRetencionEventual10: Boolean(simForm.aplicarRetencionEventual10),
      });
      setSimulacionServer(res.data);
      setSuccessBanner(
        `Simulación validada contra el motor fiscal SV: Líquido a pagar ${formatCurrencyUSD(
          res.data?.liquidoPagar
        )} (Código F-910: ${res.data?.codigoIngresoF910}).`
      );
    } catch (_e) {
      // Fallback silencioso ya cubierto por calculoEnVivo
    }
  };

  const handleGenerarPlanilla = async (e) => {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);
    setGeneratingPlanilla(true);

    try {
      const res = await planillasApi.generarPlanilla({
        tipo: planillaForm.tipo,
        periodoInicio: planillaForm.periodoInicio,
        periodoFin: planillaForm.periodoFin,
      });

      setSuccessBanner(
        res.message ||
          `Planilla '${res.data?.codigo}' procesada exitosamente con sus boletas de pago.`
      );
      setShowGenerarModal(false);
      await loadPayrollData();
      if (res.data?.id) {
        setSelectedPlanillaId(res.data.id);
      }
      setActiveTab('PLANILLAS');
    } catch (error) {
      const data = error.response?.data;
      setErrorBanner({
        status: error.response?.status || 400,
        errorCode: data?.errorCode || 'PLANILLA_GENERATION_ERROR',
        message: data?.message || 'Error al procesar la planilla.',
      });
    } finally {
      setGeneratingPlanilla(false);
    }
  };

  const handleCambiarEstadoPlanilla = async (planilla, nuevoEstado) => {
    setErrorBanner(null);
    setSuccessBanner(null);
    try {
      const res = await planillasApi.cambiarEstado(planilla.id, { estado: nuevoEstado });
      setSuccessBanner(
        res.message || `Estado de planilla '${planilla.codigo}' actualizado a ${nuevoEstado}.`
      );
      await loadPayrollData();
    } catch (error) {
      const data = error.response?.data;
      setErrorBanner({
        status: error.response?.status || 400,
        errorCode: data?.errorCode || 'PLANILLA_STATUS_ERROR',
        message: data?.message || 'No se pudo actualizar el estado de la planilla.',
      });
    }
  };

  const handleCrearEmpleado = async (e) => {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);
    setCreatingEmpleado(true);

    try {
      const payload = {
        codigo: nuevoEmpleadoForm.codigo,
        nombres: nuevoEmpleadoForm.nombres,
        apellidos: nuevoEmpleadoForm.apellidos,
        dui: nuevoEmpleadoForm.dui,
        nit: nuevoEmpleadoForm.dui,
        nup: nuevoEmpleadoForm.nup,
        numeroIsss: nuevoEmpleadoForm.numeroIsss,
        cargo: nuevoEmpleadoForm.cargo,
        tipoPlanilla: nuevoEmpleadoForm.tipoPlanilla,
        modalidadPago: nuevoEmpleadoForm.modalidadPago,
        proyectoAsignadoId: nuevoEmpleadoForm.proyectoAsignadoId,
        ...(nuevoEmpleadoForm.modalidadPago === 'SALARIO_MENSUAL'
          ? { salarioBaseMensual: Number(nuevoEmpleadoForm.salarioBaseMensual) }
          : {}),
        ...(nuevoEmpleadoForm.modalidadPago === 'DIA_TRABAJADO'
          ? { tarifaDiaria: Number(nuevoEmpleadoForm.tarifaDiaria) }
          : {}),
        ...(nuevoEmpleadoForm.modalidadPago === 'DESTAJO'
          ? { tarifaUnitariaDestajo: Number(nuevoEmpleadoForm.tarifaUnitariaDestajo) }
          : {}),
      };

      const res = await planillasApi.createEmpleado(payload);
      setSuccessBanner(
        res.message || `Empleado '${res.data?.codigo}' incorporado al padrón laboral.`
      );
      setShowEmpleadoModal(false);
      await loadPayrollData();
    } catch (error) {
      const data = error.response?.data;
      setErrorBanner({
        status: error.response?.status || 400,
        errorCode: data?.errorCode || 'EMPLEADO_CREATE_ERROR',
        message: data?.message || 'Error al registrar el empleado.',
      });
    } finally {
      setCreatingEmpleado(false);
    }
  };

  const selectedPlanilla = useMemo(() => {
    return planillas.find((p) => p.id === selectedPlanillaId) || planillas[0] || null;
  }, [planillas, selectedPlanillaId]);

  if (!canViewModule) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center max-w-xl mx-auto my-8">
        <Lock className="w-8 h-8 text-amber-600 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900">
          Acceso Restringido por Matriz RBAC ({user?.rol})
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          El Módulo 4 (Recursos Humanos y Nómina Dual SV) está autorizado únicamente para{' '}
          <code className="font-mono font-semibold">ADMIN</code>,{' '}
          <code className="font-mono font-semibold">RRHH</code> y{' '}
          <code className="font-mono font-semibold">DIRECTOR_PROYECTO</code>.
        </p>
      </div>
    );
  }

  const resultadoActivo = calculoEnVivo;
  const tablaIsrReferencia =
    TRAMOS_OFICIALES_MH_SV[simForm.tipoPlanilla] ||
    TRAMOS_OFICIALES_MH_SV.ADMINISTRATIVA_QUINCENAL;

  return (
    <div className="space-y-6">
      {/* Encabezado Módulo 4 */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-900 text-amber-400">
              MÓDULO 04
            </span>
            <span className="font-mono text-xs text-slate-500">
              DECRETO EJECUTIVO NO. 10 (ISR MH SV) · ART. 155 Y 156 CÓDIGO TRIBUTARIO
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Recursos Humanos y Nómina Dual de El Salvador (Administrativa Quincenal y Campo Semanal)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cálculo exacto de ISSS (<code className="font-mono">3%</code> con tope de{' '}
            <code className="font-mono">$1,000/mes</code>), AFP (<code className="font-mono">7.25%</code>
            ), tablas progresivas de Renta (exento hasta <code className="font-mono">$275.00</code>{' '}
            quincenal / <code className="font-mono">$137.50</code> semanal) y retención eventual del{' '}
            <code className="font-mono">10%</code> (Código F-910: <code className="font-mono">11</code>).
          </p>
        </div>

        {canMutatePayroll && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowEmpleadoModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800"
            >
              <Plus className="w-4 h-4 text-slate-700" />
              Registrar Empleado
            </button>
            <button
              type="button"
              onClick={() => setShowGenerarModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Generar Planilla Oficial
            </button>
          </div>
        )}
      </div>

      {errorBanner && (
        <div
          role="alert"
          className="bg-red-50 border-l-4 border-l-red-600 border border-red-200 rounded-lg p-4 text-xs text-red-900 flex items-center justify-between"
        >
          <div>
            <span className="font-mono font-bold mr-2">
              HTTP {errorBanner.status} · {errorBanner.errorCode}:
            </span>
            <span>{errorBanner.message}</span>
          </div>
          <button type="button" onClick={() => setErrorBanner(null)}>
            <X className="w-4 h-4" />
          </button>
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

      {/* Pestañas Técnicas del Módulo 4 */}
      <div className="border-b border-slate-200 flex items-center gap-2 flex-wrap">
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
          1. Calculadora de Ley Salvadoreña (ISSS · AFP · ISR)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PLANILLAS')}
          className={`px-4 py-2.5 text-xs font-mono font-bold uppercase border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'PLANILLAS'
              ? 'border-amber-600 text-slate-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          2. Procesamiento de Planillas y Boletas ({planillas.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('EMPLEADOS')}
          className={`px-4 py-2.5 text-xs font-mono font-bold uppercase border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'EMPLEADOS'
              ? 'border-amber-600 text-slate-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          3. Padrón de Empleados ({empleados.length})
        </button>
      </div>

      {/* PESTAÑA 1: CALCULADORA INTERACTIVA DE LEY SALVADOREÑA */}
      {activeTab === 'SIMULADOR' && (
        <div className="space-y-6">
          {/* Selector de los 3 Escenarios Legales de El Salvador */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => handleSelectEscenarioSim('QUINCENAL_ADMIN')}
              className={`text-left p-4 rounded-lg border transition-all ${
                escenarioSim === 'QUINCENAL_ADMIN'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                  ADMINISTRATIVA_QUINCENAL
                </span>
                <span className="font-mono text-[10px] text-amber-400">F-910: CÓD. 01</span>
              </div>
              <div className="text-sm font-bold mt-1">
                1. Nómina Administrativa Quincenal (Art. 155 CT)
              </div>
              <p
                className={`text-[11px] mt-1 ${
                  escenarioSim === 'QUINCENAL_ADMIN' ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                Salario base mensual dividido en 2 quincenas. Tope ISSS quincenal de $500.00 ($15.00
                ISSS) y tabla progresiva quincenal Decreto No. 10.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleSelectEscenarioSim('SEMANAL_JORNAL')}
              className={`text-left p-4 rounded-lg border transition-all ${
                escenarioSim === 'SEMANAL_JORNAL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-sky-400 text-slate-950">
                  CAMPO_SEMANAL (JORNAL)
                </span>
                <span className="font-mono text-[10px] text-sky-300">F-910: CÓD. 01</span>
              </div>
              <div className="text-sm font-bold mt-1">
                2. Planilla de Obra por Día Trabajado (Semanal)
              </div>
              <p
                className={`text-[11px] mt-1 ${
                  escenarioSim === 'SEMANAL_JORNAL' ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                Albañiles y auxiliares permanentes de campo. Tope ISSS semanal de $250.00 ($7.50
                ISSS) y Tramo I exento hasta $137.50 semanales.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleSelectEscenarioSim('SEMANAL_DESTAJO_10')}
              className={`text-left p-4 rounded-lg border transition-all ${
                escenarioSim === 'SEMANAL_DESTAJO_10'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-400 text-slate-950">
                  DESTAJO EVENTUAL (10% ISR)
                </span>
                <span className="font-mono text-[10px] text-emerald-300">F-910: CÓD. 11</span>
              </div>
              <div className="text-sm font-bold mt-1">
                3. Destajo Eventual sin Dependencia (Art. 156 CT)
              </div>
              <p
                className={`text-[11px] mt-1 ${
                  escenarioSim === 'SEMANAL_DESTAJO_10' ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                Subcontratistas o maestros de obra por unidad de avance sin relación de dependencia:
                exento de ISSS/AFP y retención directa del 10% ISR.
              </p>
            </button>
          </div>

          {/* Panel Dual: Parámetros de Entrada + Boleta de Liquidación Fiscal SV */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Izquierda: Parámetros de Simulación */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Parámetros de Devengo del Empleado
                </span>
                <span className="font-mono text-[10px] text-amber-400">
                  {simForm.tipoPlanilla}
                </span>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold uppercase text-slate-700 mb-1">
                      Régimen de Planilla
                    </label>
                    <select
                      value={simForm.tipoPlanilla}
                      onChange={(e) =>
                        setSimForm({ ...simForm, tipoPlanilla: e.target.value })
                      }
                      className="w-full px-2.5 py-2 font-mono text-xs bg-slate-50 border border-slate-300 rounded-md"
                    >
                      <option value="ADMINISTRATIVA_QUINCENAL">ADMINISTRATIVA_QUINCENAL</option>
                      <option value="CAMPO_SEMANAL">CAMPO_SEMANAL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold uppercase text-slate-700 mb-1">
                      Modalidad de Pago
                    </label>
                    <select
                      value={simForm.modalidadPago}
                      onChange={(e) =>
                        setSimForm({ ...simForm, modalidadPago: e.target.value })
                      }
                      className="w-full px-2.5 py-2 font-mono text-xs bg-slate-50 border border-slate-300 rounded-md"
                    >
                      <option value="SALARIO_MENSUAL">SALARIO_MENSUAL</option>
                      <option value="DIA_TRABAJADO">DIA_TRABAJADO</option>
                      <option value="DESTAJO">DESTAJO (Obra)</option>
                    </select>
                  </div>
                </div>

                {simForm.modalidadPago === 'SALARIO_MENSUAL' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold uppercase text-slate-700 mb-1">
                        Salario Base Mensual ($)
                      </label>
                      <input
                        type="number"
                        step="10"
                        min="0"
                        value={simForm.salarioBaseMensual}
                        onChange={(e) =>
                          setSimForm({ ...simForm, salarioBaseMensual: e.target.value })
                        }
                        className="w-full px-3 py-2 font-mono text-sm font-bold border border-slate-300 rounded-md tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold uppercase text-slate-700 mb-1">
                        Días Laborados Quincena
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        max="15"
                        value={simForm.diasTrabajados}
                        onChange={(e) =>
                          setSimForm({ ...simForm, diasTrabajados: e.target.value })
                        }
                        className="w-full px-3 py-2 font-mono text-sm font-bold border border-slate-300 rounded-md tabular-nums"
                      />
                    </div>
                  </div>
                )}

                {simForm.modalidadPago === 'DIA_TRABAJADO' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold uppercase text-slate-700 mb-1">
                        Jornal Diario ($)
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={simForm.tarifaDiaria}
                        onChange={(e) =>
                          setSimForm({ ...simForm, tarifaDiaria: e.target.value })
                        }
                        className="w-full px-3 py-2 font-mono text-sm font-bold border border-slate-300 rounded-md tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold uppercase text-slate-700 mb-1">
                        Días Trabajados Semana
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="7"
                        value={simForm.diasTrabajados}
                        onChange={(e) =>
                          setSimForm({ ...simForm, diasTrabajados: e.target.value })
                        }
                        className="w-full px-3 py-2 font-mono text-sm font-bold border border-slate-300 rounded-md tabular-nums"
                      />
                    </div>
                  </div>
                )}

                {simForm.modalidadPago === 'DESTAJO' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold uppercase text-slate-700 mb-1">
                        Tarifa por Unidad/m² ($)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={simForm.tarifaUnitariaDestajo}
                        onChange={(e) =>
                          setSimForm({ ...simForm, tarifaUnitariaDestajo: e.target.value })
                        }
                        className="w-full px-3 py-2 font-mono text-sm font-bold border border-slate-300 rounded-md tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold uppercase text-slate-700 mb-1">
                        Unidades / m² Ejecutados
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={simForm.unidadesDestajo}
                        onChange={(e) =>
                          setSimForm({ ...simForm, unidadesDestajo: e.target.value })
                        }
                        className="w-full px-3 py-2 font-mono text-sm font-bold border border-slate-300 rounded-md tabular-nums"
                      />
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simForm.aplicarRetencionEventual10}
                      onChange={(e) =>
                        setSimForm({
                          ...simForm,
                          aplicarRetencionEventual10: e.target.checked,
                        })
                      }
                      className="mt-0.5 accent-amber-600"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">
                        Aplicar Retención Fija 10% ISR sin Dependencia Laboral (Art. 156 CT)
                      </span>
                      <span className="text-[11px] text-slate-600">
                        Marca Código de Ingreso <code className="font-mono font-bold">11</code> en
                        Informe F-910 MH SV (Exime cotización ISSS y AFP).
                      </span>
                    </div>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleVerificarEnServidor}
                  className="w-full py-2.5 px-4 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Validar Cálculo contra Endpoint Backend (/calcular-simulacion)
                </button>
              </div>
            </div>

            {/* Derecha: Desglose de Ley Salvadoreña (Trabajador + Patrono) */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Liquidación de Boleta y Retenciones de Ley (El Salvador)
                  </h3>
                  <p className="text-[11px] font-mono text-slate-300">
                    Código F-910 MH: {resultadoActivo.codigoIngresoF910} · Tramo ISR Aplicado:{' '}
                    {resultadoActivo.tramoIsr}
                  </p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-[10px] uppercase text-slate-400 block">
                    SALARIO LÍQUIDO A RECIBIR
                  </span>
                  <span className="text-lg font-bold text-emerald-400 tabular-nums">
                    {formatCurrencyUSD(resultadoActivo.liquidoPagar)}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Tabla Contable de Deducciones Laborales */}
                <div className="overflow-x-auto border border-slate-200 rounded-md">
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500">
                        <th className="py-2.5 px-3">Concepto Legal (El Salvador)</th>
                        <th className="py-2.5 px-3">Base / Regla Aplicada</th>
                        <th className="py-2.5 px-3 text-right">Monto (USD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className="bg-slate-50/60">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          (+) INGRESO BRUTO DEL PERÍODO
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          Devengo bruto ({resultadoActivo.tipoPlanilla})
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                          {formatCurrencyUSD(resultadoActivo.ingresoBruto)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          (-) Cotización ISSS Laboral (3.00%)
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 tabular-nums">
                          Base cotizable: {formatCurrencyUSD(resultadoActivo.baseCotizableIsss)}{' '}
                          (Tope período: {formatCurrencyUSD(resultadoActivo.techoIsssPeriodo)})
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-red-700 tabular-nums">
                          -{formatCurrencyUSD(resultadoActivo.descuentoIsss)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          (-) Cotización AFP Laboral (7.25%)
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 tabular-nums">
                          7.25% sobre {formatCurrencyUSD(resultadoActivo.ingresoBruto)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-red-700 tabular-nums">
                          -{formatCurrencyUSD(resultadoActivo.descuentoAfp)}
                        </td>
                      </tr>
                      <tr className="bg-amber-50/50">
                        <td className="py-2.5 px-3 font-bold text-amber-950">
                          (=) RENTA NETA GRAVADA (BASE ISR)
                        </td>
                        <td className="py-2.5 px-3 text-amber-900">
                          Ingreso Bruto − ISSS − AFP (Art. 33 LISR)
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-950 tabular-nums">
                          {formatCurrencyUSD(resultadoActivo.rentaGravada)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          (-) Retención Impuesto Sobre la Renta (ISR MH)
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-400 font-bold text-[10px]">
                            {resultadoActivo.tramoIsr}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-red-700 tabular-nums">
                          -{formatCurrencyUSD(resultadoActivo.descuentoRenta)}
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/70">
                        <td className="py-3 px-3 font-bold text-emerald-950">
                          (=) LÍQUIDO NETO A PAGAR AL TRABAJADOR
                        </td>
                        <td className="py-3 px-3 text-emerald-800">
                          Total Descuentos: -{formatCurrencyUSD(resultadoActivo.totalDescuentos)}
                        </td>
                        <td className="py-3 px-3 text-right text-sm font-bold text-emerald-900 tabular-nums">
                          {formatCurrencyUSD(resultadoActivo.liquidoPagar)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Cuadro de Aportes Patronales de la Constructora */}
                <div className="p-4 rounded-md bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[11px] font-bold uppercase text-slate-800">
                      Aportes Patronales de la Constructora (Costo Real Empleador SV)
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      ISSS Patronal 7.50% · AFP Patronal 8.75%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                    <div className="p-2.5 rounded bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">ISSS PATRONAL (7.5%)</span>
                      <strong className="text-slate-900 tabular-nums">
                        {formatCurrencyUSD(resultadoActivo.aportesPatronales?.isssPatronal)}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">AFP PATRONAL (8.75%)</span>
                      <strong className="text-slate-900 tabular-nums">
                        {formatCurrencyUSD(resultadoActivo.aportesPatronales?.afpPatronal)}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">TOTAL CARGA PATRONAL</span>
                      <strong className="text-amber-700 tabular-nums">
                        {formatCurrencyUSD(resultadoActivo.aportesPatronales?.totalAportePatronal)}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 text-white">
                      <span className="text-[10px] text-amber-400 block">COSTO TOTAL OBRA</span>
                      <strong className="text-white tabular-nums">
                        {formatCurrencyUSD(resultadoActivo.aportesPatronales?.costoTotalEmpleador)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla Oficial de Referencia de los 4 Tramos ISR (Decreto Ejecutivo No. 10 El Salvador) */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Tabla Oficial de Retención ISR — Ministerio de Hacienda de El Salvador (Decreto
                  Ejecutivo No. 10)
                </h4>
              </div>
              <span className="font-mono text-xs font-semibold text-slate-700">
                Tabla Activa: {simForm.tipoPlanilla}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500">
                    <th className="py-2.5 px-4">Tramo Oficial</th>
                    <th className="py-2.5 px-4">Rango de Renta Neta Gravada</th>
                    <th className="py-2.5 px-4">% a Aplicar</th>
                    <th className="py-2.5 px-4 text-right">Sobre el Exceso de</th>
                    <th className="py-2.5 px-4 text-right">Más Cuota Fija</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {tablaIsrReferencia.map((row) => {
                    const isCurrentTramo = resultadoActivo.tramoIsr === row.tramo;
                    return (
                      <tr
                        key={row.tramo}
                        className={isCurrentTramo ? 'bg-amber-50 font-bold' : 'hover:bg-slate-50'}
                      >
                        <td className="py-2.5 px-4 text-slate-900">
                          {row.tramo}{' '}
                          {isCurrentTramo && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-600 text-white text-[10px]">
                              APLICADO
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-800 tabular-nums">{row.rango}</td>
                        <td className="py-2.5 px-4 text-slate-800">{row.porcentaje}</td>
                        <td className="py-2.5 px-4 text-right text-slate-800 tabular-nums">
                          {row.sobreExceso}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-900 tabular-nums">
                          {row.cuotaFija}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: PROCESAMIENTO DE PLANILLAS Y BOLETAS DE PAGO */}
      {activeTab === 'PLANILLAS' && (
        <div className="space-y-5">
          {planillas.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
              <FileSpreadsheet className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-900">
                Aún no se han generado cierres de planilla en el período actual
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
                Utilice el botón superior <strong>&ldquo;Generar Planilla Oficial&rdquo;</strong>{' '}
                para procesar automáticamente las boletas de pago de todos los empleados activos.
              </p>
              {canMutatePayroll && (
                <button
                  type="button"
                  onClick={() => setShowGenerarModal(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold uppercase tracking-wider"
                >
                  <Plus className="w-4 h-4" />
                  Procesar Primera Planilla Ahora
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Tarjetas de Planillas Generadas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {planillas.map((pln) => {
                  const isSelected = selectedPlanilla?.id === pln.id;
                  return (
                    <button
                      key={pln.id}
                      type="button"
                      onClick={() => setSelectedPlanillaId(pln.id)}
                      className={`text-left p-4 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                          {pln.codigo}
                        </span>
                        <span
                          className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded border ${
                            ESTADO_PLANILLA_BADGES[pln.estado] || ESTADO_PLANILLA_BADGES.BORRADOR
                          }`}
                        >
                          {pln.estado}
                        </span>
                      </div>
                      <div className="text-xs font-mono font-semibold mt-1">{pln.tipo}</div>
                      <div
                        className={`text-[11px] font-mono mt-0.5 ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        Período: {formatDateSV(pln.periodoInicio)} → {formatDateSV(pln.periodoFin)}
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-700/30 flex justify-between font-mono text-xs tabular-nums">
                        <span>{pln.boletas?.length || pln._count?.boletas || 0} Boletas</span>
                        <span className="font-bold">Líquido: {formatCurrencyUSD(pln.totalLiquido)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Detalle de Boletas de la Planilla Seleccionada */}
              {selectedPlanilla && (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-5 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400">
                          [{selectedPlanilla.codigo}]
                        </span>
                        <span className="text-sm font-bold">{selectedPlanilla.tipo}</span>
                      </div>
                      <p className="text-xs font-mono text-slate-300 mt-0.5">
                        Total Bruto: {formatCurrencyUSD(selectedPlanilla.totalBruto)} · ISSS:{' '}
                        {formatCurrencyUSD(selectedPlanilla.totalIsss)} · AFP:{' '}
                        {formatCurrencyUSD(selectedPlanilla.totalAfp)} · ISR:{' '}
                        {formatCurrencyUSD(selectedPlanilla.totalRenta)} · Líquido:{' '}
                        {formatCurrencyUSD(selectedPlanilla.totalLiquido)}
                      </p>
                    </div>

                    {canMutatePayroll && (
                      <div className="flex items-center gap-2">
                        {['BORRADOR', 'APROBADA', 'PAGADA'].map((est) => (
                          <button
                            key={est}
                            type="button"
                            onClick={() => handleCambiarEstadoPlanilla(selectedPlanilla, est)}
                            className={`px-2.5 py-1 rounded font-mono text-xs font-bold border ${
                              selectedPlanilla.estado === est
                                ? 'bg-amber-500 text-slate-950 border-amber-500'
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            {est}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-mono text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500">
                          <th className="py-3 px-4">Código / Empleado</th>
                          <th className="py-3 px-4">DUI / ISSS</th>
                          <th className="py-3 px-4">Modalidad</th>
                          <th className="py-3 px-4 text-right">Ingreso Bruto</th>
                          <th className="py-3 px-4 text-right">ISSS (3%)</th>
                          <th className="py-3 px-4 text-right">AFP (7.25%)</th>
                          <th className="py-3 px-4 text-right">ISR MH</th>
                          <th className="py-3 px-4 text-right">Líquido a Pagar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(selectedPlanilla.boletas || []).map((bol) => (
                          <tr key={bol.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{bol.empleado?.codigo}</div>
                              <div className="font-sans text-slate-700">
                                {bol.empleado?.nombres} {bol.empleado?.apellidos}
                              </div>
                            </td>
                            <td className="py-3 px-4 tabular-nums text-slate-600">
                              <div>DUI: {bol.empleado?.dui}</div>
                              <div>ISSS: {bol.empleado?.numeroIsss || '—'}</div>
                            </td>
                            <td className="py-3 px-4 text-slate-700">
                              {bol.empleado?.modalidadPago}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-slate-900 tabular-nums">
                              {formatCurrencyUSD(bol.ingresoBruto)}
                            </td>
                            <td className="py-3 px-4 text-right text-red-700 tabular-nums">
                              -{formatCurrencyUSD(bol.descuentoIsss)}
                            </td>
                            <td className="py-3 px-4 text-right text-red-700 tabular-nums">
                              -{formatCurrencyUSD(bol.descuentoAfp)}
                            </td>
                            <td className="py-3 px-4 text-right text-red-700 tabular-nums">
                              -{formatCurrencyUSD(bol.descuentoRenta)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-800 tabular-nums">
                              {formatCurrencyUSD(bol.liquidoPagar)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* PESTAÑA 3: PADRÓN DE EMPLEADOS (ADMINISTRATIVOS Y DE CAMPO) */}
      {activeTab === 'EMPLEADOS' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500">
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Nombre Completo y Cargo</th>
                  <th className="py-3 px-4">DUI Homologado / NUP / ISSS</th>
                  <th className="py-3 px-4">Régimen Planilla</th>
                  <th className="py-3 px-4">Modalidad</th>
                  <th className="py-3 px-4 text-right">Remuneración Base</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {empleados.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{emp.codigo}</td>
                    <td className="py-3 px-4 font-sans">
                      <div className="font-bold text-slate-900">
                        {emp.nombres} {emp.apellidos}
                      </div>
                      <div className="text-slate-500 text-[11px]">{emp.cargo}</div>
                    </td>
                    <td className="py-3 px-4 tabular-nums text-[11px] text-slate-700">
                      <div>DUI/NIT: {emp.dui}</div>
                      <div>
                        NUP: {emp.nup || '—'} · ISSS: {emp.numeroIsss || '—'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          emp.tipoPlanilla === 'ADMINISTRATIVA_QUINCENAL'
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : 'bg-sky-50 text-sky-900 border-sky-300'
                        }`}
                      >
                        {emp.tipoPlanilla}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{emp.modalidadPago}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                      {emp.modalidadPago === 'SALARIO_MENSUAL' &&
                        `${formatCurrencyUSD(emp.salarioBaseMensual)} / mes`}
                      {emp.modalidadPago === 'DIA_TRABAJADO' &&
                        `${formatCurrencyUSD(emp.tarifaDiaria)} / día`}
                      {emp.modalidadPago === 'DESTAJO' &&
                        `${formatCurrencyUSD(emp.tarifaUnitariaDestajo)} / unid.`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL PARA GENERAR NUEVA PLANILLA */}
      {showGenerarModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full overflow-hidden shadow-xl">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Generar Cierre de Planilla Oficial SV
              </h3>
              <button
                type="button"
                onClick={() => setShowGenerarModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerarPlanilla} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase text-slate-700 mb-1">
                  Tipo de Planilla a Procesar
                </label>
                <select
                  value={planillaForm.tipo}
                  onChange={(e) => setPlanillaForm({ ...planillaForm, tipo: e.target.value })}
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                >
                  <option value="ADMINISTRATIVA_QUINCENAL">
                    ADMINISTRATIVA_QUINCENAL (Quincena Oficina)
                  </option>
                  <option value="CAMPO_SEMANAL">CAMPO_SEMANAL (Semana Obra Civil)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Inicio Período
                  </label>
                  <input
                    type="date"
                    required
                    value={planillaForm.periodoInicio}
                    onChange={(e) =>
                      setPlanillaForm({ ...planillaForm, periodoInicio: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Fin Período
                  </label>
                  <input
                    type="date"
                    required
                    value={planillaForm.periodoFin}
                    onChange={(e) =>
                      setPlanillaForm({ ...planillaForm, periodoFin: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGenerarModal(false)}
                  className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={generatingPlanilla}
                  className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-semibold uppercase tracking-wider"
                >
                  {generatingPlanilla ? 'Calculando Boletas...' : 'Generar Planilla y Boletas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA REGISTRAR NUEVO EMPLEADO */}
      {showEmpleadoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-lg w-full overflow-hidden shadow-xl">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Registrar Empleado en Padrón Salvadoreño
              </h3>
              <button
                type="button"
                onClick={() => setShowEmpleadoModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCrearEmpleado} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Código Empleado
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoEmpleadoForm.codigo}
                    onChange={(e) =>
                      setNuevoEmpleadoForm({ ...nuevoEmpleadoForm, codigo: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    DUI Homologado (00000000-0)
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoEmpleadoForm.dui}
                    onChange={(e) =>
                      setNuevoEmpleadoForm({ ...nuevoEmpleadoForm, dui: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Nombres
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoEmpleadoForm.nombres}
                    onChange={(e) =>
                      setNuevoEmpleadoForm({ ...nuevoEmpleadoForm, nombres: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoEmpleadoForm.apellidos}
                    onChange={(e) =>
                      setNuevoEmpleadoForm({ ...nuevoEmpleadoForm, apellidos: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Tipo de Planilla
                  </label>
                  <select
                    value={nuevoEmpleadoForm.tipoPlanilla}
                    onChange={(e) =>
                      setNuevoEmpleadoForm({
                        ...nuevoEmpleadoForm,
                        tipoPlanilla: e.target.value,
                        modalidadPago:
                          e.target.value === 'ADMINISTRATIVA_QUINCENAL'
                            ? 'SALARIO_MENSUAL'
                            : 'DIA_TRABAJADO',
                      })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  >
                    <option value="ADMINISTRATIVA_QUINCENAL">ADMINISTRATIVA_QUINCENAL</option>
                    <option value="CAMPO_SEMANAL">CAMPO_SEMANAL</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Modalidad de Pago
                  </label>
                  <select
                    value={nuevoEmpleadoForm.modalidadPago}
                    onChange={(e) =>
                      setNuevoEmpleadoForm({
                        ...nuevoEmpleadoForm,
                        modalidadPago: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  >
                    <option value="SALARIO_MENSUAL">SALARIO_MENSUAL</option>
                    <option value="DIA_TRABAJADO">DIA_TRABAJADO</option>
                    <option value="DESTAJO">DESTAJO</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Cargo Operativo
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoEmpleadoForm.cargo}
                    onChange={(e) =>
                      setNuevoEmpleadoForm({ ...nuevoEmpleadoForm, cargo: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Tarifa / Salario Base ($)
                  </label>
                  {nuevoEmpleadoForm.modalidadPago === 'SALARIO_MENSUAL' && (
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={nuevoEmpleadoForm.salarioBaseMensual}
                      onChange={(e) =>
                        setNuevoEmpleadoForm({
                          ...nuevoEmpleadoForm,
                          salarioBaseMensual: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                    />
                  )}
                  {nuevoEmpleadoForm.modalidadPago === 'DIA_TRABAJADO' && (
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={nuevoEmpleadoForm.tarifaDiaria}
                      onChange={(e) =>
                        setNuevoEmpleadoForm({
                          ...nuevoEmpleadoForm,
                          tarifaDiaria: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                    />
                  )}
                  {nuevoEmpleadoForm.modalidadPago === 'DESTAJO' && (
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={nuevoEmpleadoForm.tarifaUnitariaDestajo}
                      onChange={(e) =>
                        setNuevoEmpleadoForm({
                          ...nuevoEmpleadoForm,
                          tarifaUnitariaDestajo: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                    />
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmpleadoModal(false)}
                  className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingEmpleado}
                  className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                >
                  {creatingEmpleado ? 'Guardando...' : 'Registrar Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanillasPage;
