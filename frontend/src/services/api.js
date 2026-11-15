import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const TOKEN_STORAGE_KEY = 'erp_sv_token';
export const USER_STORAGE_KEY = 'erp_sv_user';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de solicitud: adjunta el JWT Bearer Token automáticamente
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================================
// UTILIDADES DE FORMATO Y REDONDEO FINANCIERO
// ============================================================================

export const round2 = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

export const formatCurrencyUSD = (value) => {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatNumber = (value, decimals = 2) => {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '0.00';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatDateSV = (dateInput) => {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-SV', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

// Crea un error compatible con la estructura de Axios + AppError del backend
const createFallbackHttpError = (statusCode, message, errorCode, details = null) => {
  const err = new Error(message);
  err.isFallbackError = true;
  err.response = {
    status: statusCode,
    data: {
      success: false,
      status: statusCode >= 400 && statusCode < 500 ? 'fail' : 'error',
      message,
      errorCode,
      details,
    },
  };
  return err;
};

const isBackendUnreachable = (error) => {
  if (!error) return false;
  if (error.isFallbackError) return false;
  if (!error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
    return true;
  }
  const { status, data } = error.response;
  // Cuando Vite proxy no logra conectar a localhost:4000, responde 500/502/503/504 sin errorCode JSON del backend
  if (status >= 502) return true;
  if (status === 500 && (!data || typeof data !== 'object' || !data.errorCode)) {
    return true;
  }
  return false;
};

let connectionMode = 'AUTO'; // 'BACKEND_ONLINE' | 'FALLBACK_MEMORIA' | 'AUTO'
export const getConnectionMode = () => connectionMode;

const withResilientFallback = async (apiCall, fallbackFn) => {
  try {
    const response = await apiCall();
    connectionMode = 'BACKEND_ONLINE';
    return response.data;
  } catch (error) {
    if (isBackendUnreachable(error)) {
      connectionMode = 'FALLBACK_MEMORIA';
      return fallbackFn();
    }
    throw error;
  }
};

// ============================================================================
// CUENTAS SEMILLA Y MATRIZ RBAC DE EL SALVADOR
// ============================================================================

export const DEFAULT_SEED_PASSWORD = 'ConstructoraSV2026!';

export const SEED_USERS = [
  {
    id: 'usr-admin-001',
    nombre: 'Administrador General ERP',
    email: 'admin@constructorasv.com',
    rol: 'ADMIN',
    cargo: 'Dirección de Tecnología y Auditoría General',
    activo: true,
  },
  {
    id: 'usr-director-002',
    nombre: 'Ing. Roberto Salazar (Director de Proyectos)',
    email: 'director@constructorasv.com',
    rol: 'DIRECTOR_PROYECTO',
    cargo: 'Dirección Técnica y Permisología OPAMSS/MARN/ANDA',
    activo: true,
  },
  {
    id: 'usr-residente-003',
    nombre: 'Ing. Carlos Méndez (Ingeniero Residente)',
    email: 'residente@constructorasv.com',
    rol: 'INGENIERO_RESIDENTE',
    cargo: 'Residencia de Obra Civil y Control de Partidas',
    activo: true,
  },
  {
    id: 'usr-bodega-004',
    nombre: 'Mauricio Quintanilla (Jefe de Bodega)',
    email: 'bodega@constructorasv.com',
    rol: 'BODEGUERO',
    cargo: 'Jefatura de Almacén Central y Logística Multi-sitio',
    activo: true,
  },
  {
    id: 'usr-rrhh-005',
    nombre: 'Licda. Claudia Morales (Recursos Humanos)',
    email: 'rrhh@constructorasv.com',
    rol: 'RRHH',
    cargo: 'Administración de Nómina Quincenal/Semanal (ISSS/AFP/ISR)',
    activo: true,
  },
  {
    id: 'usr-ventas-006',
    nombre: 'Licda. Sofía Argueta (Ejecutiva de Ventas)',
    email: 'ventas@constructorasv.com',
    rol: 'VENTAS',
    cargo: 'Comercialización Inmobiliaria y Facturación DTE MH',
    activo: true,
  },
];

export const RBAC_MATRIX = {
  ADMIN: {
    etiqueta: 'ADMIN',
    nombreCorto: 'Administrador General',
    descripcion: 'Control total del ERP, configuración global, usuarios y auditoría.',
    modulosPermitidos: ['PROYECTOS', 'PERMISOS', 'BODEGAS', 'PARTIDAS_OBRA', 'RRHH_PLANILLAS', 'VENTAS_CRM'],
    rutasPermitidas: ['/', '/proyectos', '/bodegas', '/partidas', '/planillas', '/ventas'],
  },
  DIRECTOR_PROYECTO: {
    etiqueta: 'DIRECTOR_PROYECTO',
    nombreCorto: 'Director de Proyecto',
    descripcion: 'Dirección técnica, presupuestos, cambios de fase y gestión de permisos OPAMSS/MARN/ANDA.',
    modulosPermitidos: ['PROYECTOS', 'PERMISOS', 'BODEGAS_LECTURA', 'PARTIDAS_OBRA', 'RRHH_LECTURA', 'VENTAS_LECTURA'],
    rutasPermitidas: ['/', '/proyectos', '/bodegas', '/partidas', '/planillas', '/ventas'],
  },
  INGENIERO_RESIDENTE: {
    etiqueta: 'INGENIERO_RESIDENTE',
    nombreCorto: 'Ingeniero Residente',
    descripcion: 'Ejecución de obra en campo, control de fase y reportes de avance físico con descarga de materiales.',
    modulosPermitidos: ['PROYECTOS_LECTURA', 'PARTIDAS_OBRA', 'BODEGAS_LECTURA'],
    rutasPermitidas: ['/', '/proyectos', '/bodegas', '/partidas'],
  },
  BODEGUERO: {
    etiqueta: 'BODEGUERO',
    nombreCorto: 'Jefe de Bodega',
    descripcion: 'Control de inventarios multi-sitio, ingresos a bodega central y traslados transaccionales a proyectos.',
    modulosPermitidos: ['PROYECTOS_LECTURA', 'BODEGAS', 'MATERIALES', 'TRASLADOS'],
    rutasPermitidas: ['/', '/proyectos', '/bodegas', '/partidas'],
  },
  RRHH: {
    etiqueta: 'RRHH',
    nombreCorto: 'Recursos Humanos',
    descripcion: 'Gestión de personal administrativo y de obra, cálculo de planillas quincenales/semanales (ISSS, AFP, ISR).',
    modulosPermitidos: ['PROYECTOS_LECTURA', 'EMPLEADOS', 'PLANILLAS', 'BOLETAS_PAGO'],
    rutasPermitidas: ['/', '/proyectos', '/planillas'],
  },
  VENTAS: {
    etiqueta: 'VENTAS',
    nombreCorto: 'Ejecutivo de Ventas CRM',
    descripcion: 'Gestión comercial inmobiliaria, clientes, contratos con amortización francesa y facturación fiscal SV (13% IVA).',
    modulosPermitidos: ['PROYECTOS_LECTURA', 'CLIENTES', 'UNIDADES_INMOBILIARIAS', 'CONTRATOS_VENTA', 'FACTURACION_FISCAL'],
    rutasPermitidas: ['/', '/proyectos', '/ventas'],
  },
};

// ============================================================================
// MOTOR REACTIVO EN MEMORIA (STATEFUL FALLBACK STORE) — SEMILLA EL SALVADOR
// ============================================================================

const REQUIRED_INSTITUTIONS = ['OPAMSS', 'MARN', 'ANDA'];
const FASES_CONSTRUCCION_BLOQUEADAS = ['TERRACERIA', 'OBRA_GRIS', 'ACABADOS', 'FINALIZADO'];
const ORDEN_FASES = ['DISENO', 'TERRACERIA', 'OBRA_GRIS', 'ACABADOS', 'FINALIZADO'];

const createInitialFallbackState = () => {
  const materiales = [
    {
      id: 'mat-cem-001',
      sku: 'MAT-CEM-001',
      nombre: 'Cemento Portland Tipo I (Bolsa 42.5 kg)',
      unidadMedida: 'BOLSA',
      costoUnitarioPromedio: '9.85',
      stockMinimoAlerta: '200.00',
    },
    {
      id: 'mat-hie-002',
      sku: 'MAT-HIE-002',
      nombre: 'Hierro Corrugado 3/8" Grado 40 (Varilla 6m)',
      unidadMedida: 'VARILLA',
      costoUnitarioPromedio: '6.40',
      stockMinimoAlerta: '300.00',
    },
    {
      id: 'mat-are-003',
      sku: 'MAT-ARE-003',
      nombre: 'Arena de Río Lavada',
      unidadMedida: 'M3',
      costoUnitarioPromedio: '24.50',
      stockMinimoAlerta: '50.00',
    },
    {
      id: 'mat-gra-004',
      sku: 'MAT-GRA-004',
      nombre: 'Grava Triturada 3/4"',
      unidadMedida: 'M3',
      costoUnitarioPromedio: '28.00',
      stockMinimoAlerta: '50.00',
    },
    {
      id: 'mat-blo-005',
      sku: 'MAT-BLO-005',
      nombre: 'Bloque de Concreto Estructural 15x20x40 cm',
      unidadMedida: 'UNIDAD',
      costoUnitarioPromedio: '0.78',
      stockMinimoAlerta: '1000.00',
    },
  ];

  const proyectos = [
    {
      id: 'proy-sv-001',
      codigo: 'PROY-SV-001',
      nombre: 'Residencial Cumbres de Escalón',
      ubicacion: 'Colonia Escalón Norte, San Salvador, El Salvador',
      presupuestoTotal: '2450000.00',
      costoEjecutado: '0.00',
      faseActual: 'DISENO',
      fechaInicio: '2026-01-15T00:00:00.000Z',
      fechaFinEstimada: '2027-06-30T00:00:00.000Z',
      createdAt: '2026-01-15T08:00:00.000Z',
      permisos: [
        {
          id: 'perm-001-opamss',
          proyectoId: 'proy-sv-001',
          institucion: 'OPAMSS',
          numeroExpediente: 'OPAMSS-TRAM-2026-0104',
          estado: 'PENDIENTE',
          fechaEmision: null,
          fechaVencimiento: null,
          observaciones: 'Trámite inicial de factibilidad y línea de construcción ante OPAMSS',
        },
        {
          id: 'perm-001-marn',
          proyectoId: 'proy-sv-001',
          institucion: 'MARN',
          numeroExpediente: 'MARN-FA-2026-0089',
          estado: 'PENDIENTE',
          fechaEmision: null,
          fechaVencimiento: null,
          observaciones: 'Formulario Ambiental en evaluación técnica ante MARN',
        },
        {
          id: 'perm-001-anda',
          proyectoId: 'proy-sv-001',
          institucion: 'ANDA',
          numeroExpediente: 'ANDA-FACT-2026-0211',
          estado: 'PENDIENTE',
          fechaEmision: null,
          fechaVencimiento: null,
          observaciones: 'Solicitud de factibilidad de acueductos y alcantarillados ante ANDA',
        },
      ],
    },
    {
      id: 'proy-sv-002',
      codigo: 'PROY-SV-002',
      nombre: 'Torre Corporativa San Benito',
      ubicacion: 'Av. La Revolución, Colonia San Benito, San Salvador, El Salvador',
      presupuestoTotal: '4850000.00',
      costoEjecutado: '0.00',
      faseActual: 'OBRA_GRIS',
      fechaInicio: '2025-11-01T00:00:00.000Z',
      fechaFinEstimada: '2027-08-31T00:00:00.000Z',
      createdAt: '2025-11-01T08:00:00.000Z',
      permisos: [
        {
          id: 'perm-002-opamss',
          proyectoId: 'proy-sv-002',
          institucion: 'OPAMSS',
          numeroExpediente: 'OPAMSS-PC-2025-0891',
          estado: 'APROBADO',
          fechaEmision: '2025-10-20T00:00:00.000Z',
          fechaVencimiento: '2027-10-20T00:00:00.000Z',
          observaciones: 'Permiso de construcción y planos estructurales aprobados por OPAMSS.',
        },
        {
          id: 'perm-002-marn',
          proyectoId: 'proy-sv-002',
          institucion: 'MARN',
          numeroExpediente: 'MARN-NFA-2025-1142',
          estado: 'APROBADO',
          fechaEmision: '2025-10-20T00:00:00.000Z',
          fechaVencimiento: '2027-10-20T00:00:00.000Z',
          observaciones: 'Resolución de Categorización y Permiso Ambiental emitidos por MARN.',
        },
        {
          id: 'perm-002-anda',
          proyectoId: 'proy-sv-002',
          institucion: 'ANDA',
          numeroExpediente: 'ANDA-FACT-2025-0534',
          estado: 'APROBADO',
          fechaEmision: '2025-10-20T00:00:00.000Z',
          fechaVencimiento: '2027-10-20T00:00:00.000Z',
          observaciones: 'Factibilidad de acueductos y alcantarillados aprobada por ANDA.',
        },
      ],
    },
  ];

  const bodegas = [
    {
      id: 'bod-central-ss',
      codigo: 'BOD-CENTRAL-SS',
      nombre: 'Bodega Central San Salvador',
      tipo: 'CENTRAL',
      ubicacion: 'Blvd. del Ejército Nacional Km 5.5, Soyapango, San Salvador',
      proyectoId: null,
    },
    {
      id: 'bod-proy-001',
      codigo: 'BOD-PROY-001',
      nombre: 'Bodega de Obra — Residencial Cumbres de Escalón',
      tipo: 'PROYECTO',
      ubicacion: 'Colonia Escalón Norte, San Salvador',
      proyectoId: 'proy-sv-001',
    },
    {
      id: 'bod-proy-002',
      codigo: 'BOD-PROY-002',
      nombre: 'Bodega de Obra — Torre Corporativa San Benito',
      tipo: 'PROYECTO',
      ubicacion: 'Av. La Revolución, Colonia San Benito, San Salvador',
      proyectoId: 'proy-sv-002',
    },
  ];

  const inventarios = [
    // Bodega Central San Salvador
    { id: 'inv-c-1', bodegaId: 'bod-central-ss', materialId: 'mat-cem-001', cantidadDisponible: '2500.00' },
    { id: 'inv-c-2', bodegaId: 'bod-central-ss', materialId: 'mat-hie-002', cantidadDisponible: '4000.00' },
    { id: 'inv-c-3', bodegaId: 'bod-central-ss', materialId: 'mat-are-003', cantidadDisponible: '500.00' },
    { id: 'inv-c-4', bodegaId: 'bod-central-ss', materialId: 'mat-gra-004', cantidadDisponible: '450.00' },
    { id: 'inv-c-5', bodegaId: 'bod-central-ss', materialId: 'mat-blo-005', cantidadDisponible: '15000.00' },
    // Bodega Proyecto 2 (Torre Corporativa San Benito)
    { id: 'inv-sb-1', bodegaId: 'bod-proy-002', materialId: 'mat-cem-001', cantidadDisponible: '600.00' },
    { id: 'inv-sb-2', bodegaId: 'bod-proy-002', materialId: 'mat-hie-002', cantidadDisponible: '800.00' },
    { id: 'inv-sb-3', bodegaId: 'bod-proy-002', materialId: 'mat-are-003', cantidadDisponible: '90.00' },
    { id: 'inv-sb-4', bodegaId: 'bod-proy-002', materialId: 'mat-gra-004', cantidadDisponible: '85.00' },
    { id: 'inv-sb-5', bodegaId: 'bod-proy-002', materialId: 'mat-blo-005', cantidadDisponible: '3500.00' },
  ];

  const traslados = [
    {
      id: 'tras-seed-sb-001',
      codigo: 'TRAS-SEED-SB-001',
      bodegaOrigenId: 'bod-central-ss',
      bodegaDestinoId: 'bod-proy-002',
      autorizadoPorId: 'usr-bodega-004',
      estado: 'COMPLETADO',
      fechaTraslado: '2026-01-10T08:30:00.000Z',
      observaciones: 'Abastecimiento inicial de materiales desde Bodega Central hacia Torre Corporativa San Benito.',
      detalles: [
        { id: 'dt-1', materialId: 'mat-cem-001', cantidad: '600.00', costoUnitarioSnap: '9.85' },
        { id: 'dt-2', materialId: 'mat-hie-002', cantidad: '800.00', costoUnitarioSnap: '6.40' },
        { id: 'dt-3', materialId: 'mat-are-003', cantidad: '90.00', costoUnitarioSnap: '24.50' },
        { id: 'dt-4', materialId: 'mat-gra-004', cantidad: '85.00', costoUnitarioSnap: '28.00' },
        { id: 'dt-5', materialId: 'mat-blo-005', cantidad: '3500.00', costoUnitarioSnap: '0.78' },
      ],
    },
  ];

  const partidas = [
    {
      id: 'part-sb-001',
      proyectoId: 'proy-sv-002',
      codigo: 'PART-001',
      nombre: 'Fundición de Losa Nivel 1',
      faseRequerida: 'OBRA_GRIS',
      presupuestoAsignado: '85000.00',
      costoMaterialesAcumulado: '0.00',
      porcentajeAvance: '0.00',
      recetaMateriales: [
        { id: 'pm-1', partidaId: 'part-sb-001', materialId: 'mat-cem-001', cantidadTotalRequerida: '300.00', cantidadConsumidaAcumulada: '0.00' },
        { id: 'pm-2', partidaId: 'part-sb-001', materialId: 'mat-hie-002', cantidadTotalRequerida: '450.00', cantidadConsumidaAcumulada: '0.00' },
        { id: 'pm-3', partidaId: 'part-sb-001', materialId: 'mat-are-003', cantidadTotalRequerida: '40.00', cantidadConsumidaAcumulada: '0.00' },
        { id: 'pm-4', partidaId: 'part-sb-001', materialId: 'mat-gra-004', cantidadTotalRequerida: '45.00', cantidadConsumidaAcumulada: '0.00' },
      ],
      reportesAvance: [],
    },
  ];

  const empleados = [
    {
      id: 'emp-adm-001',
      codigo: 'EMP-ADM-001',
      nombres: 'Héctor Alejandro',
      apellidos: 'Lemus Portillo',
      dui: '04589123-7',
      nit: '04589123-7',
      nup: '281940581920',
      numeroIsss: '109283746',
      cargo: 'Contador General de Proyectos',
      tipoPlanilla: 'ADMINISTRATIVA_QUINCENAL',
      modalidadPago: 'SALARIO_MENSUAL',
      salarioBaseMensual: '1500.00',
      tarifaDiaria: null,
      tarifaUnitariaDestajo: null,
      proyectoAsignadoId: 'proy-sv-002',
      activo: true,
    },
    {
      id: 'emp-cam-001',
      codigo: 'EMP-CAM-001',
      nombres: 'José Rigoberto',
      apellidos: 'Hernández Cornejo',
      dui: '02948172-4',
      nit: '02948172-4',
      nup: '391048572911',
      numeroIsss: '204958172',
      cargo: 'Albañil de Obra Gris',
      tipoPlanilla: 'CAMPO_SEMANAL',
      modalidadPago: 'DIA_TRABAJADO',
      salarioBaseMensual: null,
      tarifaDiaria: '25.00',
      tarifaUnitariaDestajo: null,
      proyectoAsignadoId: 'proy-sv-002',
      activo: true,
    },
    {
      id: 'emp-cam-002',
      codigo: 'EMP-CAM-002',
      nombres: 'Santos Vladimir',
      apellidos: 'Orellana Mejía',
      dui: '03819204-9',
      nit: '03819204-9',
      nup: '482910495823',
      numeroIsss: '309481726',
      cargo: 'Maestro de Obra (Especialista en Paredes y Repello)',
      tipoPlanilla: 'CAMPO_SEMANAL',
      modalidadPago: 'DESTAJO',
      salarioBaseMensual: null,
      tarifaDiaria: null,
      tarifaUnitariaDestajo: '12.50',
      proyectoAsignadoId: 'proy-sv-002',
      activo: true,
    },
  ];

  const planillas = [];

  const clientes = [
    {
      id: 'cli-nat-001',
      tipo: 'NATURAL',
      nombreCompleto: 'Ana Patricia Calderón de Iraheta',
      dui: '04128934-5',
      nit: '04128934-5',
      nrc: null,
      giro: null,
      direccion: 'Colonia Médica, Pje. Dr. Figueroa #14, San Salvador',
      telefono: '+503 7890-4512',
      email: 'pcalderon@correo.com.sv',
      createdAt: '2026-01-12T10:00:00.000Z',
    },
    {
      id: 'cli-jur-002',
      tipo: 'JURIDICO',
      nombreCompleto: 'Inversiones Cuscatlán S.A. de C.V.',
      dui: null,
      nit: '0614-150812-102-8',
      nrc: '245890-1',
      giro: 'Desarrollo inmobiliario y arrendamiento de bienes raíces comerciales',
      direccion: 'Av. La Revolución #222, Colonia San Benito, San Salvador',
      telefono: '+503 2248-9000',
      email: 'gerencia@inversionescuscatlan.com.sv',
      createdAt: '2026-01-14T14:00:00.000Z',
    },
  ];

  const unidades = [
    {
      id: 'uni-ce-01',
      codigo: 'CASA-CE-01',
      proyectoId: 'proy-sv-001',
      tipo: 'CASA',
      areaMetrosCuadrados: '240.00',
      precioLista: '285000.00',
      estado: 'DISPONIBLE',
    },
    {
      id: 'uni-sb-101',
      codigo: 'APTO-SB-101',
      proyectoId: 'proy-sv-002',
      tipo: 'APARTAMENTO',
      areaMetrosCuadrados: '145.50',
      precioLista: '265000.00',
      estado: 'DISPONIBLE',
    },
    {
      id: 'uni-ce-12',
      codigo: 'LOTE-CE-12',
      proyectoId: 'proy-sv-001',
      tipo: 'LOTE',
      areaMetrosCuadrados: '350.00',
      precioLista: '95000.00',
      estado: 'DISPONIBLE',
    },
  ];

  const contratos = [];
  const documentosFiscales = [];

  return {
    usuarios: [...SEED_USERS],
    materiales,
    proyectos,
    bodegas,
    inventarios,
    traslados,
    partidas,
    empleados,
    planillas,
    clientes,
    unidades,
    contratos,
    documentosFiscales,
  };
};

const fallbackStore = createInitialFallbackState();

// ============================================================================
// FUNCIONES DE ENRIQUECIMIENTO Y VALIDACIONES DE NEGOCIO EN MEMORIA
// ============================================================================

export const calcularEstadoRegulatorioLocal = (permisos = []) => {
  const mapa = new Map(permisos.map((p) => [p.institucion, p]));
  const permisosPendientes = [];
  const detalleBloqueantes = [];
  let aprobados = 0;

  for (const inst of REQUIRED_INSTITUTIONS) {
    const reg = mapa.get(inst);
    const estadoActual = reg ? reg.estado : 'PENDIENTE';
    if (estadoActual === 'APROBADO') {
      aprobados += 1;
    } else {
      permisosPendientes.push(inst);
      detalleBloqueantes.push({
        institucion: inst,
        estadoActual,
        numeroExpediente: reg?.numeroExpediente || null,
        observaciones: reg?.observaciones || null,
      });
    }
  }

  return {
    habilitadoParaConstruccion: aprobados === REQUIRED_INSTITUTIONS.length,
    aprobados,
    totalRequeridos: REQUIRED_INSTITUTIONS.length,
    permisosPendientes,
    detalleBloqueantes,
  };
};

const enrichProyectoLocal = (proyecto) => {
  const permisosOrdenados = [...(proyecto.permisos || [])].sort(
    (a, b) => REQUIRED_INSTITUTIONS.indexOf(a.institucion) - REQUIRED_INSTITUTIONS.indexOf(b.institucion)
  );
  const bodega = fallbackStore.bodegas.find((b) => b.proyectoId === proyecto.id) || null;
  const partidasCount = fallbackStore.partidas.filter((p) => p.proyectoId === proyecto.id).length;
  const empleadosCount = fallbackStore.empleados.filter((e) => e.proyectoAsignadoId === proyecto.id).length;
  const unidadesCount = fallbackStore.unidades.filter((u) => u.proyectoId === proyecto.id).length;

  return {
    ...proyecto,
    permisos: permisosOrdenados,
    bodega,
    _count: {
      partidas: partidasCount,
      empleadosAsignados: empleadosCount,
      unidadesInmobiliarias: unidadesCount,
    },
    estadoRegulatorio: calcularEstadoRegulatorioLocal(permisosOrdenados),
  };
};

const enrichBodegaLocal = (bodega) => {
  const proyecto = bodega.proyectoId
    ? fallbackStore.proyectos.find((p) => p.id === bodega.proyectoId) || null
    : null;

  const invs = fallbackStore.inventarios
    .filter((i) => i.bodegaId === bodega.id)
    .map((inv) => {
      const material = fallbackStore.materiales.find((m) => m.id === inv.materialId);
      const cantidad = Number(inv.cantidadDisponible);
      const costoUnitario = Number(material?.costoUnitarioPromedio || 0);
      const stockMinimo = Number(material?.stockMinimoAlerta || 0);
      const subtotalValorizado = round2(cantidad * costoUnitario);
      const alertaStockMinimo = cantidad <= stockMinimo;
      return {
        ...inv,
        material,
        subtotalValorizado,
        alertaStockMinimo,
      };
    });

  const valorTotalInventario = round2(invs.reduce((acc, item) => acc + item.subtotalValorizado, 0));
  const totalUnidadesFisicas = round2(invs.reduce((acc, item) => acc + Number(item.cantidadDisponible), 0));
  const alertasStockBajo = invs.filter((item) => item.alertaStockMinimo).length;

  return {
    ...bodega,
    proyecto: proyecto
      ? {
          id: proyecto.id,
          codigo: proyecto.codigo,
          nombre: proyecto.nombre,
          ubicacion: proyecto.ubicacion,
          faseActual: proyecto.faseActual,
        }
      : null,
    inventarios: invs,
    totalItemsCatalogo: invs.length,
    totalUnidadesFisicas,
    valorTotalInventario,
    alertasStockBajo,
  };
};

const enrichMaterialLocal = (material) => {
  const invs = fallbackStore.inventarios
    .filter((i) => i.materialId === material.id)
    .map((inv) => {
      const bodega = fallbackStore.bodegas.find((b) => b.id === inv.bodegaId);
      const proyecto = bodega?.proyectoId
        ? fallbackStore.proyectos.find((p) => p.id === bodega.proyectoId)
        : null;
      return {
        ...inv,
        bodega: bodega
          ? {
              ...bodega,
              proyecto: proyecto
                ? { id: proyecto.id, codigo: proyecto.codigo, nombre: proyecto.nombre, faseActual: proyecto.faseActual }
                : null,
            }
          : null,
      };
    });

  let stockTotalConsolidado = 0;
  let stockBodegaCentral = 0;
  let stockBodegasProyecto = 0;

  for (const inv of invs) {
    const cant = Number(inv.cantidadDisponible);
    stockTotalConsolidado += cant;
    if (inv.bodega?.tipo === 'CENTRAL') {
      stockBodegaCentral += cant;
    } else {
      stockBodegasProyecto += cant;
    }
  }

  stockTotalConsolidado = round2(stockTotalConsolidado);
  stockBodegaCentral = round2(stockBodegaCentral);
  stockBodegasProyecto = round2(stockBodegasProyecto);

  const costoUnitario = Number(material.costoUnitarioPromedio);
  const stockMinimo = Number(material.stockMinimoAlerta);

  return {
    ...material,
    inventarios: invs,
    stockTotalConsolidado,
    stockBodegaCentral,
    stockBodegasProyecto,
    valorTotalConsolidado: round2(stockTotalConsolidado * costoUnitario),
    alertaStockMinimo: stockBodegaCentral <= stockMinimo,
  };
};

const enrichPartidaLocal = (partida) => {
  const proyecto = fallbackStore.proyectos.find((p) => p.id === partida.proyectoId) || null;
  const recetaMateriales = (partida.recetaMateriales || []).map((linea) => {
    const material = fallbackStore.materiales.find((m) => m.id === linea.materialId);
    const total = Number(linea.cantidadTotalRequerida);
    const consumida = Number(linea.cantidadConsumidaAcumulada);
    return {
      ...linea,
      material,
      cantidadPendiente: round2(Math.max(0, total - consumida)),
    };
  });

  const avance = round2(partida.porcentajeAvance);
  const presupuesto = round2(partida.presupuestoAsignado);
  const costo = round2(partida.costoMaterialesAcumulado);
  const valorGanado = round2((presupuesto * avance) / 100);
  const desviacionPresupuestaria = round2(costo - valorGanado);

  return {
    ...partida,
    proyecto: proyecto
      ? {
          id: proyecto.id,
          codigo: proyecto.codigo,
          nombre: proyecto.nombre,
          faseActual: proyecto.faseActual,
        }
      : null,
    recetaMateriales,
    _count: {
      reportesAvance: (partida.reportesAvance || []).length,
    },
    indicadores: {
      porcentajeAvance: avance,
      presupuestoAsignado: presupuesto,
      costoMaterialesAcumulado: costo,
      valorGanado,
      desviacionPresupuestaria,
      sobrecosto: desviacionPresupuestaria > 0,
      presupuestoExcedido: costo > presupuesto,
    },
  };
};

// ============================================================================
// MOTOR DE CÁLCULO LEGAL SALVADOREÑO (MÓDULO 4: ISSS, AFP, ISR MH SV)
// ============================================================================

const TABLAS_ISR_MH_SV = {
  ADMINISTRATIVA_QUINCENAL: [
    { tramo: 'TRAMO_I', desde: 0.0, hasta: 275.0, porcentaje: 0.0, sobreExcesoDe: 0.0, cuotaFija: 0.0 },
    { tramo: 'TRAMO_II', desde: 275.01, hasta: 447.62, porcentaje: 0.1, sobreExcesoDe: 275.0, cuotaFija: 8.83 },
    { tramo: 'TRAMO_III', desde: 447.63, hasta: 1019.05, porcentaje: 0.2, sobreExcesoDe: 447.62, cuotaFija: 30.0 },
    { tramo: 'TRAMO_IV', desde: 1019.06, hasta: Infinity, porcentaje: 0.3, sobreExcesoDe: 1019.05, cuotaFija: 144.28 },
  ],
  CAMPO_SEMANAL: [
    { tramo: 'TRAMO_I', desde: 0.0, hasta: 137.5, porcentaje: 0.0, sobreExcesoDe: 0.0, cuotaFija: 0.0 },
    { tramo: 'TRAMO_II', desde: 137.51, hasta: 223.81, porcentaje: 0.1, sobreExcesoDe: 137.5, cuotaFija: 4.42 },
    { tramo: 'TRAMO_III', desde: 223.82, hasta: 509.52, porcentaje: 0.2, sobreExcesoDe: 223.81, cuotaFija: 15.0 },
    { tramo: 'TRAMO_IV', desde: 509.53, hasta: Infinity, porcentaje: 0.3, sobreExcesoDe: 509.52, cuotaFija: 72.14 },
  ],
  MENSUAL: [
    { tramo: 'TRAMO_I', desde: 0.0, hasta: 550.0, porcentaje: 0.0, sobreExcesoDe: 0.0, cuotaFija: 0.0 },
    { tramo: 'TRAMO_II', desde: 550.01, hasta: 895.24, porcentaje: 0.1, sobreExcesoDe: 550.0, cuotaFija: 17.67 },
    { tramo: 'TRAMO_III', desde: 895.25, hasta: 2038.1, porcentaje: 0.2, sobreExcesoDe: 895.24, cuotaFija: 60.0 },
    { tramo: 'TRAMO_IV', desde: 2038.11, hasta: Infinity, porcentaje: 0.3, sobreExcesoDe: 2038.1, cuotaFija: 288.57 },
  ],
};

export const calcularDeduccionesLeySVLocal = ({
  ingresoBruto,
  tipoPlanilla = 'ADMINISTRATIVA_QUINCENAL',
  otrasDeducciones = 0,
  exentoCotizacionesCampo = false,
  aplicarRetencionEventual10 = false,
}) => {
  const bruto = round2(Number(ingresoBruto || 0));
  const otras = round2(Number(otrasDeducciones || 0));
  const tipo = String(tipoPlanilla).toUpperCase().trim();
  const exento = aplicarRetencionEventual10 ? true : Boolean(exentoCotizacionesCampo);

  let divisorPeriodoIsss = 2;
  if (tipo === 'CAMPO_SEMANAL') divisorPeriodoIsss = 4;
  if (tipo === 'MENSUAL') divisorPeriodoIsss = 1;

  const techoIsssPeriodo = round2(1000.0 / divisorPeriodoIsss);
  const baseCotizableIsss = exento ? 0 : round2(Math.min(bruto, techoIsssPeriodo));
  const descuentoIsss = exento ? 0 : round2(baseCotizableIsss * 0.03);
  const descuentoAfp = exento ? 0 : round2(bruto * 0.0725);

  const isssPatronal = exento ? 0 : round2(baseCotizableIsss * 0.075);
  const afpPatronal = exento ? 0 : round2(bruto * 0.0875);
  const totalAportePatronal = round2(isssPatronal + afpPatronal);
  const costoTotalEmpleador = round2(bruto + totalAportePatronal);

  const rentaGravada = round2(Math.max(0, bruto - descuentoIsss - descuentoAfp));
  let tramoIsr = 'TRAMO_I';
  let descuentoRenta = 0;

  if (rentaGravada > 0) {
    if (aplicarRetencionEventual10) {
      tramoIsr = 'RETENCION_EVENTUAL_10';
      descuentoRenta = round2(rentaGravada * 0.1);
    } else {
      const tabla = TABLAS_ISR_MH_SV[tipo] || TABLAS_ISR_MH_SV.ADMINISTRATIVA_QUINCENAL;
      const tramo = tabla.find((t) => rentaGravada >= t.desde && rentaGravada <= t.hasta) || tabla[tabla.length - 1];
      tramoIsr = tramo.tramo;
      if (tramo.porcentaje > 0) {
        const exceso = Math.max(0, rentaGravada - tramo.sobreExcesoDe);
        descuentoRenta = round2(exceso * tramo.porcentaje + tramo.cuotaFija);
      }
    }
  }

  const totalDescuentos = round2(descuentoIsss + descuentoAfp + descuentoRenta + otras);
  const liquidoPagar = round2(bruto - totalDescuentos);

  return {
    ingresoBruto: bruto,
    tipoPlanilla: tipo,
    codigoIngresoF910: aplicarRetencionEventual10 ? '11' : '01',
    techoIsssPeriodo,
    baseCotizableIsss,
    descuentoIsss,
    descuentoAfp,
    rentaGravada,
    tramoIsr,
    descuentoRenta,
    otrasDeducciones: otras,
    totalDescuentos,
    liquidoPagar,
    aportesPatronales: {
      isssPatronal,
      afpPatronal,
      totalAportePatronal,
      costoTotalEmpleador,
    },
    parametrosLeySV: {
      tasaIsssLaboral: 0.03,
      techoIsssMensual: 1000.0,
      tasaAfpLaboral: 0.0725,
    },
  };
};

// ============================================================================
// MOTOR DE AMORTIZACIÓN FRANCESA Y FISCALIDAD SV (MÓDULO 5: IVA 13% + ITBR 3%)
// ============================================================================

export const generarTablaAmortizacionLocal = ({
  montoFinanciado,
  plazoMeses = 12,
  tasaInteresAnual = 0,
  fechaPrimerPago = null,
}) => {
  const capitalTotal = round2(Number(montoFinanciado || 0));
  const plazoNum = Math.max(1, parseInt(plazoMeses, 10) || 12);
  const tasaAnual = round2(Number(tasaInteresAnual || 0));
  const tasaMensual = tasaAnual > 0 ? tasaAnual / 100 / 12 : 0;

  if (capitalTotal <= 0) {
    return {
      montoFinanciado: 0,
      plazoMeses: 0,
      tasaInteresAnual: 0,
      tasaInteresMensual: 0,
      cuotaNiveladaReferencia: 0,
      totalCapital: 0,
      totalIntereses: 0,
      totalPagar: 0,
      cuotas: [],
    };
  }

  let cuotaNiveladaReferencia;
  if (tasaMensual === 0) {
    cuotaNiveladaReferencia = round2(capitalTotal / plazoNum);
  } else {
    const factor = Math.pow(1 + tasaMensual, plazoNum);
    cuotaNiveladaReferencia = round2(capitalTotal * ((tasaMensual * factor) / (factor - 1)));
  }

  const baseDate = fechaPrimerPago ? new Date(fechaPrimerPago) : new Date(Date.now() + 30 * 86400000);
  const cuotas = [];
  let saldoRestante = capitalTotal;
  let capitalAcumulado = 0;
  let interesesAcumulados = 0;

  for (let i = 1; i <= plazoNum; i += 1) {
    const venc = new Date(baseDate.getTime());
    venc.setMonth(venc.getMonth() + (i - 1));
    const saldoInicial = saldoRestante;
    const montoInteres = tasaMensual > 0 ? round2(saldoInicial * tasaMensual) : 0;
    const montoCapital =
      i === plazoNum ? round2(capitalTotal - capitalAcumulado) : round2(Math.min(saldoRestante, cuotaNiveladaReferencia - montoInteres));
    const montoTotalCuota = round2(montoCapital + montoInteres);

    capitalAcumulado = round2(capitalAcumulado + montoCapital);
    interesesAcumulados = round2(interesesAcumulados + montoInteres);
    saldoRestante = round2(capitalTotal - capitalAcumulado);

    cuotas.push({
      numeroCuota: i,
      fechaVencimiento: venc.toISOString(),
      saldoInicial,
      montoCapital,
      montoInteres,
      montoTotalCuota,
      saldoFinal: saldoRestante,
    });
  }

  return {
    montoFinanciado: capitalTotal,
    plazoMeses: plazoNum,
    tasaInteresAnual: tasaAnual,
    tasaInteresMensual: Number((tasaMensual * 100).toFixed(6)),
    cuotaNiveladaReferencia,
    totalCapital: round2(capitalAcumulado),
    totalIntereses: round2(interesesAcumulados),
    totalPagar: round2(capitalAcumulado + interesesAcumulados),
    cuotas,
  };
};

export const calcularDesgloseFiscalSVLocal = ({
  montoTotal,
  montoGravado,
  tipoDocumento = 'FACTURA_CONSUMIDOR_FINAL',
  precioInmueble,
}) => {
  const tipo = String(tipoDocumento || 'FACTURA_CONSUMIDOR_FINAL').toUpperCase().trim();
  const totalRef = Number(montoTotal ?? montoGravado ?? 0);
  const total = round2(totalRef);
  let baseGravada = total;
  let iva = 0;

  if (tipo === 'CREDITO_FISCAL_CCF' || tipo === 'FACTURA_CONSUMIDOR_FINAL') {
    if (montoGravado !== undefined && montoTotal === undefined) {
      baseGravada = round2(Number(montoGravado));
      iva = round2(baseGravada * 0.13);
    } else {
      baseGravada = round2(total / 1.13);
      iva = round2(total - baseGravada);
    }
  }

  const valorInmuebleEvaluado = precioInmueble !== undefined ? round2(Number(precioInmueble)) : total;
  const excesoItbr = Math.max(0, round2(valorInmuebleEvaluado - 28571.43));
  const impuestoTransferenciaBienesRaices = round2(excesoItbr * 0.03);

  const codigosDte = {
    FACTURA_CONSUMIDOR_FINAL: '01',
    CREDITO_FISCAL_CCF: '03',
    RECIBO_ABONO: 'REC-CAJA',
  };

  return {
    tipoDocumento: tipo,
    codigoDteMH: codigosDte[tipo] || '01',
    tasaIva: 0.13,
    montoGravado: baseGravada,
    montoIva: iva,
    montoTotal: round2(baseGravada + iva),
    requiereNrcYGiro: tipo === 'CREDITO_FISCAL_CCF',
    impuestoTransferenciaBienesRaices,
    itbr: {
      valorInmuebleEvaluado,
      limiteExentoSV: 28571.43,
      tasaItbr: 0.03,
      exentoItbr: excesoItbr === 0,
      baseGravableExceso: excesoItbr,
      impuestoTransferenciaBienesRaices,
    },
  };
};

// ============================================================================
// SERVICIOS DE API POR MÓDULO (CONEXIÓN REAL + FALLBACK EN MEMORIA)
// ============================================================================

export const authApi = {
  login: async ({ email, password }) => {
    return withResilientFallback(
      () => apiClient.post('/auth/login', { email, password }),
      () => {
        const normalizedEmail = String(email || '').toLowerCase().trim();
        const user = fallbackStore.usuarios.find((u) => u.email.toLowerCase() === normalizedEmail);
        if (!user || !password) {
          throw createFallbackHttpError(
            401,
            'Credenciales inválidas. Verifique su correo y contraseña.',
            'AUTH_INVALID_CREDENTIALS'
          );
        }
        const token = `demo-jwt-sv-${user.rol.toLowerCase()}-${Date.now()}`;
        return {
          success: true,
          message: 'Autenticación exitosa (Modo Resiliente SV).',
          data: { user, token },
        };
      }
    );
  },

  me: async () => {
    return withResilientFallback(
      () => apiClient.get('/auth/me'),
      () => {
        const savedUser = localStorage.getItem(USER_STORAGE_KEY);
        const parsed = savedUser ? JSON.parse(savedUser) : SEED_USERS[0];
        return {
          success: true,
          data: parsed,
        };
      }
    );
  },

  getRbacMatrix: async () => {
    return withResilientFallback(
      () => apiClient.get('/auth/rbac-matrix'),
      () => {
        const savedUser = localStorage.getItem(USER_STORAGE_KEY);
        const parsed = savedUser ? JSON.parse(savedUser) : SEED_USERS[0];
        return {
          success: true,
          data: {
            currentUserRole: parsed.rol,
            permissionsForCurrentUser: RBAC_MATRIX[parsed.rol] || null,
            fullMatrix: RBAC_MATRIX,
          },
        };
      }
    );
  },
};

export const proyectosApi = {
  list: async (params = {}) => {
    return withResilientFallback(
      () => apiClient.get('/proyectos', { params }),
      () => {
        let items = fallbackStore.proyectos.map(enrichProyectoLocal);
        if (params.faseActual) {
          items = items.filter((p) => p.faseActual === params.faseActual);
        }
        if (params.search && String(params.search).trim() !== '') {
          const q = String(params.search).toLowerCase().trim();
          items = items.filter(
            (p) =>
              p.codigo.toLowerCase().includes(q) ||
              p.nombre.toLowerCase().includes(q) ||
              p.ubicacion.toLowerCase().includes(q)
          );
        }
        return {
          success: true,
          count: items.length,
          data: items,
        };
      }
    );
  },

  getById: async (id) => {
    return withResilientFallback(
      () => apiClient.get(`/proyectos/${id}`),
      () => {
        const p = fallbackStore.proyectos.find((item) => item.id === id);
        if (!p) {
          throw createFallbackHttpError(404, `No se encontró el proyecto con ID '${id}'.`, 'PROYECTO_NOT_FOUND');
        }
        return {
          success: true,
          data: enrichProyectoLocal(p),
        };
      }
    );
  },

  create: async (payload) => {
    return withResilientFallback(
      () => apiClient.post('/proyectos', payload),
      () => {
        const { codigo, nombre, ubicacion, presupuestoTotal, fechaInicio, fechaFinEstimada, faseActual = 'DISENO' } = payload;
        if (!codigo || !nombre || !ubicacion || !presupuestoTotal || !fechaInicio) {
          throw createFallbackHttpError(
            400,
            'Los campos codigo, nombre, ubicacion, presupuestoTotal y fechaInicio son obligatorios.',
            'PROYECTO_VALIDATION_ERROR'
          );
        }
        const normCodigo = String(codigo).toUpperCase().trim();
        if (fallbackStore.proyectos.some((p) => p.codigo === normCodigo)) {
          throw createFallbackHttpError(
            409,
            `Ya existe un proyecto registrado con el código '${normCodigo}'.`,
            'PROYECTO_CODIGO_DUPLICADO'
          );
        }

        const newId = `proy-${Date.now()}`;
        const permisos = REQUIRED_INSTITUTIONS.map((inst) => ({
          id: `perm-${newId}-${inst.toLowerCase()}`,
          proyectoId: newId,
          institucion: inst,
          numeroExpediente: null,
          estado: 'PENDIENTE',
          fechaEmision: null,
          fechaVencimiento: null,
          observaciones: `Trámite inicial de factibilidad ante ${inst}`,
        }));

        if (FASES_CONSTRUCCION_BLOQUEADAS.includes(faseActual)) {
          const estadoReg = calcularEstadoRegulatorioLocal(permisos);
          if (!estadoReg.habilitadoParaConstruccion) {
            throw createFallbackHttpError(
              422,
              `No se puede crear el proyecto directamente en la fase '${faseActual}'. La normativa salvadoreña exige que los permisos de OPAMSS, MARN y ANDA estén en estado APROBADO antes de iniciar fases constructivas.`,
              'LEGAL_PERMITS_NOT_APPROVED',
              {
                faseSolicitada: faseActual,
                permisosBloqueantes: estadoReg.detalleBloqueantes,
              }
            );
          }
        }

        const nuevoProyecto = {
          id: newId,
          codigo: normCodigo,
          nombre: String(nombre).trim(),
          ubicacion: String(ubicacion).trim(),
          presupuestoTotal: round2(presupuestoTotal).toFixed(2),
          costoEjecutado: '0.00',
          faseActual,
          fechaInicio: new Date(fechaInicio).toISOString(),
          fechaFinEstimada: fechaFinEstimada ? new Date(fechaFinEstimada).toISOString() : null,
          createdAt: new Date().toISOString(),
          permisos,
        };

        fallbackStore.proyectos.unshift(nuevoProyecto);

        fallbackStore.bodegas.push({
          id: `bod-${newId}`,
          codigo: `BOD-${normCodigo}`,
          nombre: `Bodega de Obra — ${String(nombre).trim()}`,
          tipo: 'PROYECTO',
          ubicacion: String(ubicacion).trim(),
          proyectoId: newId,
        });

        return {
          success: true,
          message: 'Proyecto creado exitosamente con sus registros regulatorios (OPAMSS, MARN, ANDA) y bodega de obra.',
          data: enrichProyectoLocal(nuevoProyecto),
        };
      }
    );
  },

  updatePermiso: async (proyectoId, institucion, payload) => {
    return withResilientFallback(
      () => apiClient.patch(`/proyectos/${proyectoId}/permisos/${institucion}`, payload),
      () => {
        const proyecto = fallbackStore.proyectos.find((p) => p.id === proyectoId);
        if (!proyecto) {
          throw createFallbackHttpError(404, 'Proyecto no encontrado.', 'PROYECTO_NOT_FOUND');
        }
        const instNorm = String(institucion).toUpperCase().trim();
        const perm = proyecto.permisos.find((item) => item.institucion === instNorm);
        if (!perm) {
          throw createFallbackHttpError(400, `Institución '${instNorm}' no válida.`, 'PERMISO_INVALID_INSTITUCION');
        }

        perm.estado = String(payload.estado || perm.estado).toUpperCase().trim();
        if (payload.numeroExpediente !== undefined) {
          perm.numeroExpediente = payload.numeroExpediente ? String(payload.numeroExpediente).trim() : null;
        }
        if (payload.observaciones !== undefined) {
          perm.observaciones = payload.observaciones ? String(payload.observaciones).trim() : null;
        }
        if (perm.estado === 'APROBADO' && !perm.fechaEmision) {
          perm.fechaEmision = new Date().toISOString();
        }

        const enriched = enrichProyectoLocal(proyecto);
        return {
          success: true,
          message: `Permiso regulatorio de ${instNorm} actualizado exitosamente.`,
          data: {
            permiso: perm,
            permisosProyecto: enriched.permisos,
            estadoRegulatorio: enriched.estadoRegulatorio,
          },
        };
      }
    );
  },

  cambiarFase: async (proyectoId, payload) => {
    const body = typeof payload === 'string' ? { nuevaFase: payload } : payload;
    return withResilientFallback(
      () => apiClient.patch(`/proyectos/${proyectoId}/fase`, body),
      () => {
        const proyecto = fallbackStore.proyectos.find((p) => p.id === proyectoId);
        if (!proyecto) {
          throw createFallbackHttpError(404, 'Proyecto no encontrado.', 'PROYECTO_NOT_FOUND');
        }
        const faseObjetivo = String(body.nuevaFase || body.faseActual || '').toUpperCase().trim();
        if (!ORDEN_FASES.includes(faseObjetivo)) {
          throw createFallbackHttpError(400, `La fase '${faseObjetivo}' no es válida.`, 'PROYECTO_INVALID_FASE');
        }

        const estadoReg = calcularEstadoRegulatorioLocal(proyecto.permisos);
        if (FASES_CONSTRUCCION_BLOQUEADAS.includes(faseObjetivo) && !estadoReg.habilitadoParaConstruccion) {
          throw createFallbackHttpError(
            422,
            `Bloqueo Regulatorio SV: El proyecto '${proyecto.codigo}' (${proyecto.nombre}) no puede avanzar a la fase '${faseObjetivo}' porque no cuenta con los 3 permisos obligatorios (OPAMSS, MARN, ANDA) en estado APROBADO.`,
            'LEGAL_PERMITS_NOT_APPROVED',
            {
              proyectoId: proyecto.id,
              codigoProyecto: proyecto.codigo,
              faseActual: proyecto.faseActual,
              faseSolicitada: faseObjetivo,
              aprobados: estadoReg.aprobados,
              totalRequeridos: estadoReg.totalRequeridos,
              permisosBloqueantes: estadoReg.detalleBloqueantes,
            }
          );
        }

        proyecto.faseActual = faseObjetivo;
        return {
          success: true,
          message: `El proyecto avanzó exitosamente a la fase '${faseObjetivo}'.`,
          data: enrichProyectoLocal(proyecto),
        };
      }
    );
  },
};

export const bodegasApi = {
  listBodegas: async (params = {}) => {
    return withResilientFallback(
      () => apiClient.get('/bodegas', { params }),
      () => {
        let items = fallbackStore.bodegas.map(enrichBodegaLocal);
        if (params.tipo) {
          items = items.filter((b) => b.tipo === params.tipo);
        }
        if (params.proyectoId) {
          items = items.filter((b) => b.proyectoId === params.proyectoId);
        }
        return {
          success: true,
          count: items.length,
          data: items,
        };
      }
    );
  },

  getBodegaById: async (id) => {
    return withResilientFallback(
      () => apiClient.get(`/bodegas/${id}`),
      () => {
        const bodega = fallbackStore.bodegas.find((b) => b.id === id);
        if (!bodega) {
          throw createFallbackHttpError(404, 'Bodega no encontrada.', 'BODEGA_NOT_FOUND');
        }
        return {
          success: true,
          data: enrichBodegaLocal(bodega),
        };
      }
    );
  },

  listMateriales: async (params = {}) => {
    return withResilientFallback(
      () => apiClient.get('/bodegas/materiales', { params }),
      () => {
        let items = fallbackStore.materiales.map(enrichMaterialLocal);
        if (params.search && String(params.search).trim() !== '') {
          const q = String(params.search).toLowerCase().trim();
          items = items.filter(
            (m) =>
              m.sku.toLowerCase().includes(q) ||
              m.nombre.toLowerCase().includes(q) ||
              m.unidadMedida.toLowerCase().includes(q)
          );
        }
        if (params.soloAlertas === 'true' || params.soloAlertas === true) {
          items = items.filter((m) => m.alertaStockMinimo);
        }
        return {
          success: true,
          count: items.length,
          data: items,
        };
      }
    );
  },

  createMaterial: async (payload) => {
    return withResilientFallback(
      () => apiClient.post('/bodegas/materiales', payload),
      () => {
        const {
          sku,
          nombre,
          unidadMedida,
          costoUnitarioPromedio,
          stockMinimoAlerta = 0,
          stockInicialCentral = 0,
        } = payload;
        if (!sku || !nombre || !unidadMedida || costoUnitarioPromedio === undefined) {
          throw createFallbackHttpError(
            400,
            'Los campos sku, nombre, unidadMedida y costoUnitarioPromedio son obligatorios.',
            'MATERIAL_VALIDATION_ERROR'
          );
        }
        const normSku = String(sku).toUpperCase().trim();
        if (fallbackStore.materiales.some((m) => m.sku === normSku)) {
          throw createFallbackHttpError(
            409,
            `Ya existe un material registrado con el SKU '${normSku}'.`,
            'MATERIAL_SKU_DUPLICADO'
          );
        }
        const newMat = {
          id: `mat-${Date.now()}`,
          sku: normSku,
          nombre: String(nombre).trim(),
          unidadMedida: String(unidadMedida).toUpperCase().trim(),
          costoUnitarioPromedio: round2(costoUnitarioPromedio).toFixed(2),
          stockMinimoAlerta: round2(stockMinimoAlerta).toFixed(2),
        };
        fallbackStore.materiales.push(newMat);

        const stockIni = round2(stockInicialCentral);
        if (stockIni > 0) {
          const central = fallbackStore.bodegas.find((b) => b.tipo === 'CENTRAL');
          if (central) {
            fallbackStore.inventarios.push({
              id: `inv-${Date.now()}`,
              bodegaId: central.id,
              materialId: newMat.id,
              cantidadDisponible: stockIni.toFixed(2),
            });
          }
        }

        return {
          success: true,
          message: 'Material registrado exitosamente en el catálogo corporativo.',
          data: enrichMaterialLocal(newMat),
        };
      }
    );
  },

  registrarEntrada: async (payload) => {
    return withResilientFallback(
      () => apiClient.post('/bodegas/entradas', payload),
      () => {
        const { bodegaId, materialId, cantidad, nuevoCostoUnitario } = payload;
        const cantNum = round2(cantidad);
        if (!materialId || cantNum <= 0) {
          throw createFallbackHttpError(
            400,
            'Debe seleccionar un material y especificar una cantidad mayor a cero.',
            'ENTRADA_INVALID_CANTIDAD'
          );
        }
        const material = fallbackStore.materiales.find((m) => m.id === materialId);
        if (!material) {
          throw createFallbackHttpError(404, 'Material no encontrado.', 'MATERIAL_NOT_FOUND');
        }
        const bodegaDestino = bodegaId
          ? fallbackStore.bodegas.find((b) => b.id === bodegaId)
          : fallbackStore.bodegas.find((b) => b.tipo === 'CENTRAL');

        if (!bodegaDestino) {
          throw createFallbackHttpError(404, 'Bodega destino no encontrada.', 'BODEGA_NOT_FOUND');
        }

        if (nuevoCostoUnitario !== undefined && nuevoCostoUnitario !== null && nuevoCostoUnitario !== '') {
          const costoNum = round2(nuevoCostoUnitario);
          if (costoNum > 0) {
            material.costoUnitarioPromedio = costoNum.toFixed(2);
          }
        }

        let inv = fallbackStore.inventarios.find(
          (i) => i.bodegaId === bodegaDestino.id && i.materialId === material.id
        );
        if (inv) {
          inv.cantidadDisponible = round2(Number(inv.cantidadDisponible) + cantNum).toFixed(2);
        } else {
          inv = {
            id: `inv-${Date.now()}`,
            bodegaId: bodegaDestino.id,
            materialId: material.id,
            cantidadDisponible: cantNum.toFixed(2),
          };
          fallbackStore.inventarios.push(inv);
        }

        return {
          success: true,
          message: 'Entrada de inventario registrada exitosamente.',
          data: {
            bodega: bodegaDestino,
            material,
            cantidadIngresada: cantNum,
            cantidadDisponibleActual: Number(inv.cantidadDisponible),
            subtotalValorizado: round2(Number(inv.cantidadDisponible) * Number(material.costoUnitarioPromedio)),
          },
        };
      }
    );
  },

  listTraslados: async (params = {}) => {
    return withResilientFallback(
      () => apiClient.get('/bodegas/traslados', { params }),
      () => {
        const items = fallbackStore.traslados.map((t) => {
          const bodegaOrigen = fallbackStore.bodegas.find((b) => b.id === t.bodegaOrigenId);
          const bodegaDestino = fallbackStore.bodegas.find((b) => b.id === t.bodegaDestinoId);
          const autorizadoPor =
            fallbackStore.usuarios.find((u) => u.id === t.autorizadoPorId) || SEED_USERS[3];
          let valorTotalTraslado = 0;
          const detalles = (t.detalles || []).map((det) => {
            const material = fallbackStore.materiales.find((m) => m.id === det.materialId);
            const cant = Number(det.cantidad);
            const costo = Number(det.costoUnitarioSnap || material?.costoUnitarioPromedio || 0);
            const subtotalLinea = round2(cant * costo);
            valorTotalTraslado += subtotalLinea;
            return {
              ...det,
              material,
              cantidadEnviada: det.cantidad,
              subtotalLinea,
            };
          });
          return {
            ...t,
            bodegaOrigen,
            bodegaDestino,
            autorizadoPor,
            detalles,
            valorTotalTraslado: round2(valorTotalTraslado),
          };
        });

        return {
          success: true,
          count: items.length,
          data: items,
        };
      }
    );
  },

  crearTraslado: async (payload) => {
    return withResilientFallback(
      () => apiClient.post('/bodegas/traslados', payload),
      () => {
        const { codigo, bodegaOrigenId, bodegaDestinoId, observaciones, items } = payload;
        if (!bodegaOrigenId || !bodegaDestinoId) {
          throw createFallbackHttpError(
            400,
            'Los campos bodegaOrigenId y bodegaDestinoId son obligatorios.',
            'TRASLADO_BODEGAS_REQUIRED'
          );
        }
        if (bodegaOrigenId === bodegaDestinoId) {
          throw createFallbackHttpError(
            400,
            'La bodega de origen y la bodega de destino no pueden ser la misma.',
            'TRASLADO_SAME_WAREHOUSE'
          );
        }
        if (!Array.isArray(items) || items.length === 0) {
          throw createFallbackHttpError(
            400,
            'El traslado debe incluir al menos un material a trasladar.',
            'TRASLADO_ITEMS_REQUIRED'
          );
        }

        const bodegaOrigen = fallbackStore.bodegas.find((b) => b.id === bodegaOrigenId);
        const bodegaDestino = fallbackStore.bodegas.find((b) => b.id === bodegaDestinoId);
        if (!bodegaOrigen || !bodegaDestino) {
          throw createFallbackHttpError(404, 'Bodega de origen o destino no encontrada.', 'BODEGA_NOT_FOUND');
        }

        // 1. Verificar disponibilidad en bodegaOrigen antes de mutar (Atomicidad ACID)
        for (const item of items) {
          const cantSolicitada = round2(item.cantidad ?? item.cantidadEnviada);
          if (cantSolicitada <= 0) {
            throw createFallbackHttpError(
              400,
              'La cantidad solicitada debe ser mayor a cero.',
              'TRASLADO_ITEM_INVALID_QUANTITY'
            );
          }
          const material = fallbackStore.materiales.find((m) => m.id === item.materialId);
          if (!material) {
            throw createFallbackHttpError(404, 'Material no encontrado.', 'MATERIAL_NOT_FOUND');
          }
          const invOrigen = fallbackStore.inventarios.find(
            (i) => i.bodegaId === bodegaOrigenId && i.materialId === material.id
          );
          const stockDisponible = invOrigen ? Number(invOrigen.cantidadDisponible) : 0;

          if (stockDisponible < cantSolicitada) {
            throw createFallbackHttpError(
              422,
              `Stock insuficiente en '${bodegaOrigen.nombre}' (${bodegaOrigen.codigo}) para el material [${material.sku}] ${material.nombre}. Disponible: ${stockDisponible.toFixed(2)} ${material.unidadMedida}, Solicitado: ${cantSolicitada.toFixed(2)} ${material.unidadMedida}.`,
              'INSUFFICIENT_WAREHOUSE_STOCK',
              {
                bodegaOrigenId: bodegaOrigen.id,
                bodegaOrigenCodigo: bodegaOrigen.codigo,
                bodegaOrigenNombre: bodegaOrigen.nombre,
                materialId: material.id,
                sku: material.sku,
                nombre: material.nombre,
                unidadMedida: material.unidadMedida,
                stockDisponible,
                cantidadSolicitada: cantSolicitada,
                faltante: round2(cantSolicitada - stockDisponible),
              }
            );
          }
        }

        // 2. Aplicar descuentos en origen e incrementos en destino
        const detallesCreados = [];
        for (const item of items) {
          const cant = round2(item.cantidad ?? item.cantidadEnviada);
          const material = fallbackStore.materiales.find((m) => m.id === item.materialId);
          const invOrigen = fallbackStore.inventarios.find(
            (i) => i.bodegaId === bodegaOrigenId && i.materialId === material.id
          );
          invOrigen.cantidadDisponible = round2(Number(invOrigen.cantidadDisponible) - cant).toFixed(2);

          let invDestino = fallbackStore.inventarios.find(
            (i) => i.bodegaId === bodegaDestinoId && i.materialId === material.id
          );
          if (invDestino) {
            invDestino.cantidadDisponible = round2(Number(invDestino.cantidadDisponible) + cant).toFixed(2);
          } else {
            invDestino = {
              id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              bodegaId: bodegaDestinoId,
              materialId: material.id,
              cantidadDisponible: cant.toFixed(2),
            };
            fallbackStore.inventarios.push(invDestino);
          }

          detallesCreados.push({
            id: `dt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            materialId: material.id,
            cantidad: cant.toFixed(2),
            costoUnitarioSnap: material.costoUnitarioPromedio,
          });
        }

        const savedUser = localStorage.getItem(USER_STORAGE_KEY);
        const currentUser = savedUser ? JSON.parse(savedUser) : SEED_USERS[3];
        const codigoGenerado = codigo
          ? String(codigo).toUpperCase().trim()
          : `TRAS-SV-${String(fallbackStore.traslados.length + 1).padStart(3, '0')}`;

        const nuevoTraslado = {
          id: `tras-${Date.now()}`,
          codigo: codigoGenerado,
          bodegaOrigenId,
          bodegaDestinoId,
          autorizadoPorId: currentUser.id,
          estado: 'COMPLETADO',
          fechaTraslado: new Date().toISOString(),
          observaciones: observaciones || 'Traslado multi-sitio autorizado en plataforma.',
          detalles: detallesCreados,
        };

        fallbackStore.traslados.unshift(nuevoTraslado);

        return {
          success: true,
          message: `Traslado '${codigoGenerado}' ejecutado y completado exitosamente.`,
          data: nuevoTraslado,
        };
      }
    );
  },
};

export const partidasApi = {
  list: async (params = {}) => {
    return withResilientFallback(
      () => apiClient.get('/partidas', { params }),
      () => {
        let items = fallbackStore.partidas.map(enrichPartidaLocal);
        if (params.proyectoId) {
          items = items.filter((p) => p.proyectoId === params.proyectoId);
        }
        if (params.faseRequerida) {
          items = items.filter((p) => p.faseRequerida === params.faseRequerida);
        }
        return {
          success: true,
          count: items.length,
          data: items,
        };
      }
    );
  },

  getById: async (id) => {
    return withResilientFallback(
      () => apiClient.get(`/partidas/${id}`),
      () => {
        const p = fallbackStore.partidas.find((item) => item.id === id);
        if (!p) {
          throw createFallbackHttpError(404, 'Partida no encontrada.', 'PARTIDA_NOT_FOUND');
        }
        return {
          success: true,
          data: enrichPartidaLocal(p),
        };
      }
    );
  },

  create: async (payload) => {
    return withResilientFallback(
      () => apiClient.post('/partidas', payload),
      () => {
        const { proyectoId, codigo, nombre, faseRequerida, presupuestoAsignado, recetaMateriales = [] } = payload;
        if (!proyectoId || !codigo || !nombre || !faseRequerida || !presupuestoAsignado) {
          throw createFallbackHttpError(
            400,
            'Los campos proyectoId, codigo, nombre, faseRequerida y presupuestoAsignado son obligatorios.',
            'PARTIDA_VALIDATION_ERROR'
          );
        }
        const normCodigo = String(codigo).toUpperCase().trim();
        if (fallbackStore.partidas.some((p) => p.proyectoId === proyectoId && p.codigo === normCodigo)) {
          throw createFallbackHttpError(
            409,
            `Ya existe una partida con el código '${normCodigo}' en este proyecto.`,
            'PARTIDA_CODIGO_DUPLICADO'
          );
        }
        const newId = `part-${Date.now()}`;
        const nuevaPartida = {
          id: newId,
          proyectoId,
          codigo: normCodigo,
          nombre: String(nombre).trim(),
          faseRequerida: String(faseRequerida).toUpperCase().trim(),
          presupuestoAsignado: round2(presupuestoAsignado).toFixed(2),
          costoMaterialesAcumulado: '0.00',
          porcentajeAvance: '0.00',
          recetaMateriales: recetaMateriales.map((r, idx) => ({
            id: `pm-${newId}-${idx}`,
            partidaId: newId,
            materialId: r.materialId,
            cantidadTotalRequerida: round2(r.cantidadTotalRequerida).toFixed(2),
            cantidadConsumidaAcumulada: '0.00',
          })),
          reportesAvance: [],
        };
        fallbackStore.partidas.push(nuevaPartida);
        return {
          success: true,
          message: 'Partida de obra creada exitosamente con su receta técnica de materiales.',
          data: enrichPartidaLocal(nuevaPartida),
        };
      }
    );
  },

  reportarAvance: async (partidaId, payload) => {
    return withResilientFallback(
      () => apiClient.post(`/partidas/${partidaId}/avances`, payload),
      () => {
        const partida = fallbackStore.partidas.find((p) => p.id === partidaId);
        if (!partida) {
          throw createFallbackHttpError(404, 'Partida de obra no encontrada.', 'PARTIDA_NOT_FOUND');
        }
        const proyecto = fallbackStore.proyectos.find((p) => p.id === partida.proyectoId);
        const bodegaProyecto = fallbackStore.bodegas.find((b) => b.proyectoId === proyecto.id);

        const anterior = round2(partida.porcentajeAvance);
        const nuevo = round2(payload.porcentajeNuevo);

        if (!Number.isFinite(nuevo) || nuevo <= 0 || nuevo > 100) {
          throw createFallbackHttpError(
            400,
            'El porcentajeNuevo debe estar entre 0.01% y 100.00%.',
            'AVANCE_INVALID_PORCENTAJE'
          );
        }

        if (nuevo <= anterior) {
          throw createFallbackHttpError(
            422,
            `El nuevo porcentaje de avance (${nuevo.toFixed(2)}%) debe ser mayor al avance actual de la partida '${partida.codigo}' (${anterior.toFixed(2)}%).`,
            'PROGRESS_MUST_INCREASE',
            {
              partidaId: partida.id,
              codigoPartida: partida.codigo,
              porcentajeAvanceActual: anterior,
              porcentajeSolicitado: nuevo,
            }
          );
        }

        if (proyecto.faseActual === 'DISENO' && partida.faseRequerida !== 'DISENO') {
          throw createFallbackHttpError(
            422,
            `El proyecto '${proyecto.codigo}' se encuentra en fase DISENO. No se puede reportar avance de la partida '${partida.codigo}' (fase ${partida.faseRequerida}) hasta que el proyecto avance legalmente a una fase constructiva.`,
            'PROJECT_PHASE_NOT_ENABLED',
            {
              proyectoId: proyecto.id,
              codigoProyecto: proyecto.codigo,
              faseActualProyecto: proyecto.faseActual,
              faseRequeridaPartida: partida.faseRequerida,
            }
          );
        }

        if (FASES_CONSTRUCCION_BLOQUEADAS.includes(partida.faseRequerida)) {
          const estadoReg = calcularEstadoRegulatorioLocal(proyecto.permisos);
          if (!estadoReg.habilitadoParaConstruccion) {
            throw createFallbackHttpError(
              422,
              `Bloqueo Regulatorio SV: No se puede reportar avance de la partida constructiva '${partida.codigo}' porque el proyecto '${proyecto.codigo}' no cuenta con los 3 permisos obligatorios (OPAMSS, MARN, ANDA) en estado APROBADO.`,
              'LEGAL_PERMITS_NOT_APPROVED',
              {
                proyectoId: proyecto.id,
                codigoProyecto: proyecto.codigo,
                permisosBloqueantes: estadoReg.detalleBloqueantes,
              }
            );
          }
        }

        const delta = round2(nuevo - anterior);
        const cierraPartida = nuevo === 100;

        // Evaluar consumo proporcional y verificar stock en la bodega de obra del proyecto
        const faltantes = [];
        const planConsumo = partida.recetaMateriales.map((linea) => {
          const material = fallbackStore.materiales.find((m) => m.id === linea.materialId);
          const totalReq = round2(linea.cantidadTotalRequerida);
          const consumida = round2(linea.cantidadConsumidaAcumulada);
          const remanente = round2(Math.max(0, totalReq - consumida));
          const consumoDelta = cierraPartida
            ? remanente
            : round2(Math.min(remanente, (totalReq * delta) / 100));

          const inv = fallbackStore.inventarios.find(
            (i) => i.bodegaId === bodegaProyecto?.id && i.materialId === material.id
          );
          const disponible = inv ? round2(inv.cantidadDisponible) : 0;

          if (consumoDelta > disponible) {
            faltantes.push({
              materialId: material.id,
              sku: material.sku,
              nombre: material.nombre,
              unidadMedida: material.unidadMedida,
              requerido: consumoDelta,
              disponible,
              faltante: round2(consumoDelta - disponible),
            });
          }

          return { linea, material, inv, consumoDelta, disponible };
        });

        if (faltantes.length > 0) {
          throw createFallbackHttpError(
            422,
            `Stock insuficiente en la bodega de obra '${bodegaProyecto?.nombre}' (${bodegaProyecto?.codigo}) para reportar el avance de la partida '${partida.codigo}'. Solicite un traslado desde Bodega Central para los ${faltantes.length} material(es) faltante(s).`,
            'INSUFFICIENT_PROJECT_STOCK',
            {
              partidaId: partida.id,
              codigoPartida: partida.codigo,
              bodegaProyectoId: bodegaProyecto?.id,
              bodegaProyectoCodigo: bodegaProyecto?.codigo,
              bodegaProyectoNombre: bodegaProyecto?.nombre,
              porcentajeAnterior: anterior,
              porcentajeNuevo: nuevo,
              faltantes,
            }
          );
        }

        let costoMaterialesDelta = 0;
        const consumoMateriales = planConsumo.map(({ linea, material, inv, consumoDelta }) => {
          if (inv && consumoDelta > 0) {
            inv.cantidadDisponible = round2(Number(inv.cantidadDisponible) - consumoDelta).toFixed(2);
          }
          linea.cantidadConsumidaAcumulada = round2(Number(linea.cantidadConsumidaAcumulada) + consumoDelta).toFixed(2);
          const costoUnitario = round2(material.costoUnitarioPromedio);
          const subtotal = round2(consumoDelta * costoUnitario);
          costoMaterialesDelta = round2(costoMaterialesDelta + subtotal);

          return {
            materialId: material.id,
            sku: material.sku,
            nombre: material.nombre,
            unidadMedida: material.unidadMedida,
            consumoDelta,
            costoUnitario,
            subtotal,
            consumidoAcumulado: Number(linea.cantidadConsumidaAcumulada),
            cantidadTotalRequerida: Number(linea.cantidadTotalRequerida),
            stockRestanteBodegaProyecto: inv ? Number(inv.cantidadDisponible) : 0,
          };
        });

        partida.porcentajeAvance = nuevo.toFixed(2);
        partida.costoMaterialesAcumulado = round2(Number(partida.costoMaterialesAcumulado) + costoMaterialesDelta).toFixed(2);
        proyecto.costoEjecutado = round2(Number(proyecto.costoEjecutado) + costoMaterialesDelta).toFixed(2);

        const savedUser = localStorage.getItem(USER_STORAGE_KEY);
        const currentUser = savedUser ? JSON.parse(savedUser) : SEED_USERS[2];

        const nuevoReporte = {
          id: `rep-${Date.now()}`,
          partidaId: partida.id,
          ingenieroId: currentUser.id,
          ingeniero: currentUser,
          porcentajeAnterior: anterior.toFixed(2),
          porcentajeNuevo: nuevo.toFixed(2),
          deltaPorcentaje: delta.toFixed(2),
          costoMaterialesDelta: costoMaterialesDelta.toFixed(2),
          observaciones: payload.observaciones || 'Avance físico verificado en campo.',
          fechaReporte: new Date().toISOString(),
        };

        partida.reportesAvance.unshift(nuevoReporte);

        return {
          success: true,
          message: `Avance físico de la partida '${partida.codigo}' actualizado del ${anterior.toFixed(2)}% al ${nuevo.toFixed(2)}%.`,
          data: {
            partida: enrichPartidaLocal(partida),
            reporte: nuevoReporte,
            consumoMateriales,
            costoMaterialesDelta,
            proyecto: {
              id: proyecto.id,
              codigo: proyecto.codigo,
              nombre: proyecto.nombre,
              presupuestoTotal: Number(proyecto.presupuestoTotal),
              costoEjecutado: Number(proyecto.costoEjecutado),
            },
          },
        };
      }
    );
  },

  listAvances: async (partidaId) => {
    return withResilientFallback(
      () => apiClient.get(`/partidas/${partidaId}/avances`),
      () => {
        const p = fallbackStore.partidas.find((item) => item.id === partidaId);
        return {
          success: true,
          count: p ? p.reportesAvance.length : 0,
          data: p ? p.reportesAvance : [],
        };
      }
    );
  },
};

export const planillasApi = {
  listEmpleados: async (params = {}) => {
    return withResilientFallback(
      () => apiClient.get('/planillas/empleados', { params }),
      () => {
        let items = fallbackStore.empleados.map((emp) => {
          const proy = fallbackStore.proyectos.find((p) => p.id === emp.proyectoAsignadoId);
          return {
            ...emp,
            proyectoAsignado: proy
              ? { id: proy.id, codigo: proy.codigo, nombre: proy.nombre, faseActual: proy.faseActual }
              : null,
          };
        });
        if (params.tipoPlanilla) {
          items = items.filter((e) => e.tipoPlanilla === params.tipoPlanilla);
        }
        return {
          success: true,
          count: items.length,
          data: items,
        };
      }
    );
  },

  createEmpleado: async (payload) => {
    return withResilientFallback(
      () => apiClient.post('/planillas/empleados', payload),
      () => {
        const {
          codigo,
          nombres,
          apellidos,
          dui,
          nit,
          nup,
          numeroIsss,
          cargo,
          tipoPlanilla,
          modalidadPago,
          salarioBaseMensual,
          tarifaDiaria,
          tarifaUnitariaDestajo,
          proyectoAsignadoId,
        } = payload;
        if (!codigo || !nombres || !apellidos || !dui || !cargo || !tipoPlanilla || !modalidadPago) {
          throw createFallbackHttpError(
            400,
            'Los campos codigo, nombres, apellidos, dui, cargo, tipoPlanilla y modalidadPago son obligatorios.',
            'EMPLEADO_REQUIRED_FIELDS_MISSING'
          );
        }
        const nuevo = {
          id: `emp-${Date.now()}`,
          codigo: String(codigo).toUpperCase().trim(),
          nombres: String(nombres).trim(),
          apellidos: String(apellidos).trim(),
          dui: String(dui).trim(),
          nit: nit || String(dui).trim(),
          nup: nup || null,
          numeroIsss: numeroIsss || null,
          cargo: String(cargo).trim(),
          tipoPlanilla,
          modalidadPago,
          salarioBaseMensual: salarioBaseMensual ? round2(salarioBaseMensual).toFixed(2) : null,
          tarifaDiaria: tarifaDiaria ? round2(tarifaDiaria).toFixed(2) : null,
          tarifaUnitariaDestajo: tarifaUnitariaDestajo ? round2(tarifaUnitariaDestajo).toFixed(2) : null,
          proyectoAsignadoId: proyectoAsignadoId || 'proy-sv-002',
          activo: true,
        };
        fallbackStore.empleados.push(nuevo);
        return {
          success: true,
          message: 'Empleado registrado exitosamente en el padrón laboral SV.',
          data: nuevo,
        };
      }
    );
  },

  simularCalculo: async (payload) => {
    return withResilientFallback(
      () => apiClient.post('/planillas/calcular-simulacion', payload),
      () => {
        let ingresoBruto = payload.ingresoBruto;
        if (ingresoBruto === undefined || ingresoBruto === null || ingresoBruto === '') {
          const mod = payload.modalidadPago || (payload.tipoPlanilla === 'CAMPO_SEMANAL' ? 'DIA_TRABAJADO' : 'SALARIO_MENSUAL');
          if (mod === 'SALARIO_MENSUAL') {
            const dias = Number(payload.diasTrabajados ?? 15);
            ingresoBruto = round2((Number(payload.salarioBaseMensual || 0) / 2) * (dias / 15));
          } else if (mod === 'DIA_TRABAJADO') {
            const dias = Number(payload.diasTrabajados ?? 6);
            ingresoBruto = round2(Number(payload.tarifaDiaria || 0) * dias);
          } else if (mod === 'DESTAJO') {
            ingresoBruto = round2(Number(payload.tarifaUnitariaDestajo || 0) * Number(payload.unidadesDestajo || 0));
          }
        }
        const res = calcularDeduccionesLeySVLocal({
          ingresoBruto,
          tipoPlanilla: payload.tipoPlanilla || 'ADMINISTRATIVA_QUINCENAL',
          otrasDeducciones: payload.otrasDeducciones || 0,
          exentoCotizacionesCampo: payload.exentoCotizacionesCampo || false,
          aplicarRetencionEventual10: payload.aplicarRetencionEventual10 || false,
        });
        return {
          success: true,
          data: res,
        };
      }
    );
  },

  listPlanillas: async (params = {}) => {
    return withResilientFallback(
      () => apiClient.get('/planillas', { params }),
      () => {
        let items = [...fallbackStore.planillas];
        if (params.tipo) items = items.filter((p) => p.tipo === params.tipo);
        if (params.estado) items = items.filter((p) => p.estado === params.estado);
        return {
          success: true,
          count: items.length,
          data: items,
        };
      }
    );
  },

  getPlanillaById: async (id) => {
    return withResilientFallback(
      () => apiClient.get(`/planillas/${id}`),
      () => {
        const planilla = fallbackStore.planillas.find((p) => p.id === id);
        if (!planilla) {
          throw createFallbackHttpError(404, 'Planilla no encontrada.', 'PLANILLA_NOT_FOUND');
        }
        return {
          success: true,
          data: planilla,
        };
      }
    );
  },

  generarPlanilla: async (payload) => {
    return withResilientFallback(
      () => apiClient.post('/planillas', payload),
      () => {
        const { codigo, tipo, periodoInicio, periodoFin, novedades = [] } = payload;
        const tipoNorm = String(tipo || 'ADMINISTRATIVA_QUINCENAL').toUpperCase().trim();
        const empleadosTipo = fallbackStore.empleados.filter((e) => e.tipoPlanilla === tipoNorm && e.activo);
        const mapaNov = new Map(novedades.map((n) => [n.empleadoId, n]));

        const boletas = [];
        let totalBruto = 0;
        let totalIsss = 0;
        let totalAfp = 0;
        let totalRenta = 0;
        let totalLiquido = 0;

        for (const emp of empleadosTipo) {
          const nov = mapaNov.get(emp.id) || {};
          let diasTrabajados = null;
          let unidadesDestajo = null;
          let bruto = 0;

          if (emp.modalidadPago === 'SALARIO_MENSUAL') {
            diasTrabajados = Number(nov.diasTrabajados ?? 15);
            bruto = round2((Number(emp.salarioBaseMensual) / 2) * (diasTrabajados / 15));
          } else if (emp.modalidadPago === 'DIA_TRABAJADO') {
            diasTrabajados = Number(nov.diasTrabajados ?? 6);
            bruto = round2(Number(emp.tarifaDiaria) * diasTrabajados);
          } else if (emp.modalidadPago === 'DESTAJO') {
            unidadesDestajo = Number(nov.unidadesDestajo ?? 20);
            if (unidadesDestajo <= 0) continue;
            bruto = round2(Number(emp.tarifaUnitariaDestajo) * unidadesDestajo);
          }

          const calc = calcularDeduccionesLeySVLocal({
            ingresoBruto: bruto,
            tipoPlanilla: tipoNorm,
            otrasDeducciones: nov.otrasDeducciones || 0,
            exentoCotizacionesCampo: nov.exentoCotizacionesCampo || false,
            aplicarRetencionEventual10: nov.aplicarRetencionEventual10 || false,
          });

          totalBruto = round2(totalBruto + calc.ingresoBruto);
          totalIsss = round2(totalIsss + calc.descuentoIsss);
          totalAfp = round2(totalAfp + calc.descuentoAfp);
          totalRenta = round2(totalRenta + calc.descuentoRenta);
          totalLiquido = round2(totalLiquido + calc.liquidoPagar);

          boletas.push({
            id: `bol-${Date.now()}-${emp.id}`,
            empleadoId: emp.id,
            empleado: emp,
            diasTrabajados,
            unidadesDestajo: unidadesDestajo !== null ? unidadesDestajo.toFixed(2) : null,
            ingresoBruto: calc.ingresoBruto.toFixed(2),
            descuentoIsss: calc.descuentoIsss.toFixed(2),
            descuentoAfp: calc.descuentoAfp.toFixed(2),
            descuentoRenta: calc.descuentoRenta.toFixed(2),
            otrasDeducciones: calc.otrasDeducciones.toFixed(2),
            liquidoPagar: calc.liquidoPagar.toFixed(2),
          });
        }

        const prefijo = tipoNorm === 'ADMINISTRATIVA_QUINCENAL' ? 'PLN-QUIN' : 'PLN-SEM';
        const nuevaPlanilla = {
          id: `pln-${Date.now()}`,
          codigo: codigo || `${prefijo}-${String(fallbackStore.planillas.length + 1).padStart(3, '0')}`,
          tipo: tipoNorm,
          periodoInicio: new Date(periodoInicio).toISOString(),
          periodoFin: new Date(periodoFin).toISOString(),
          estado: 'BORRADOR',
          totalBruto: totalBruto.toFixed(2),
          totalIsss: totalIsss.toFixed(2),
          totalAfp: totalAfp.toFixed(2),
          totalRenta: totalRenta.toFixed(2),
          totalLiquido: totalLiquido.toFixed(2),
          createdAt: new Date().toISOString(),
          boletas,
          _count: { boletas: boletas.length },
        };

        fallbackStore.planillas.unshift(nuevaPlanilla);
        return {
          success: true,
          message: `Planilla '${nuevaPlanilla.codigo}' generada con ${boletas.length} boletas de pago.`,
          data: nuevaPlanilla,
        };
      }
    );
  },

  cambiarEstado: async (id, payload) => {
    const body = typeof payload === 'string' ? { estado: payload } : payload;
    return withResilientFallback(
      () => apiClient.patch(`/planillas/${id}/estado`, body),
      () => {
        const planilla = fallbackStore.planillas.find((p) => p.id === id);
        if (!planilla) {
          throw createFallbackHttpError(404, 'Planilla no encontrada.', 'PLANILLA_NOT_FOUND');
        }
        planilla.estado = String(body.estado || body.nuevoEstado).toUpperCase().trim();
        return {
          success: true,
          message: `Planilla actualizada a estado '${planilla.estado}'.`,
          data: planilla,
        };
      }
    );
  },
};

export const ventasApi = {
  listClientes: async (params = {}) => {
    return withResilientFallback(
      () => apiClient.get('/ventas/clientes', { params }),
      () => {
        let items = [...fallbackStore.clientes];
        if (params.tipo) items = items.filter((c) => c.tipo === params.tipo);
        return {
          success: true,
          count: items.length,
          data: items,
        };
      }
    );
  },

  createCliente: async (payload) => {
    return withResilientFallback(
      () => apiClient.post('/ventas/clientes', payload),
      () => {
        const { tipo, nombreCompleto, dui, nit, nrc, giro, direccion, telefono, email } = payload;
        if (!tipo || !nombreCompleto || !direccion || !telefono || !email) {
          throw createFallbackHttpError(
            400,
            'Los campos tipo, nombreCompleto, direccion, telefono y email son obligatorios.',
            'CLIENTE_REQUIRED_FIELDS_MISSING'
          );
        }
        const tipoNorm = String(tipo).toUpperCase().trim();
        if (tipoNorm === 'JURIDICO' && (!nit || !nrc || !giro)) {
          throw createFallbackHttpError(
            400,
            'Para clientes de tipo JURIDICO, los campos fiscales nit, nrc y giro son obligatorios conforme al Código Tributario de El Salvador.',
            'CLIENTE_JURIDICO_FISCAL_FIELDS_REQUIRED'
          );
        }
        const nuevo = {
          id: `cli-${Date.now()}`,
          tipo: tipoNorm,
          nombreCompleto: String(nombreCompleto).trim(),
          dui: dui ? String(dui).trim() : null,
          nit: nit ? String(nit).trim() : dui ? String(dui).trim() : null,
          nrc: nrc ? String(nrc).trim() : null,
          giro: giro ? String(giro).trim() : null,
          direccion: String(direccion).trim(),
          telefono: String(telefono).trim(),
          email: String(email).toLowerCase().trim(),
          createdAt: new Date().toISOString(),
        };
        fallbackStore.clientes.unshift(nuevo);
        return {
          success: true,
          message: 'Cliente registrado exitosamente en el directorio CRM.',
          data: nuevo,
        };
      }
    );
  },

  listUnidades: async (params = {}) => {
    return withResilientFallback(
      () => apiClient.get('/ventas/unidades', { params }),
      () => {
        let items = fallbackStore.unidades.map((u) => {
          const proyecto = fallbackStore.proyectos.find((p) => p.id === u.proyectoId);
          const contrato = fallbackStore.contratos.find((c) => c.unidadId === u.id) || null;
          return {
            ...u,
            proyecto: proyecto
              ? { id: proyecto.id, codigo: proyecto.codigo, nombre: proyecto.nombre, ubicacion: proyecto.ubicacion }
              : null,
            contrato,
          };
        });
        if (params.proyectoId) items = items.filter((u) => u.proyectoId === params.proyectoId);
        if (params.estado) items = items.filter((u) => u.estado === params.estado);
        return {
          success: true,
          count: items.length,
          data: items,
        };
      }
    );
  },

  createUnidad: async (payload) => {
    return withResilientFallback(
      () => apiClient.post('/ventas/unidades', payload),
      () => {
        const { proyectoId, codigo, tipo, areaMetrosCuadrados, precioLista } = payload;
        const nueva = {
          id: `uni-${Date.now()}`,
          proyectoId,
          codigo: String(codigo).toUpperCase().trim(),
          tipo: String(tipo).toUpperCase().trim(),
          areaMetrosCuadrados: round2(areaMetrosCuadrados).toFixed(2),
          precioLista: round2(precioLista).toFixed(2),
          estado: 'DISPONIBLE',
        };
        fallbackStore.unidades.push(nueva);
        return {
          success: true,
          message: 'Unidad inmobiliaria registrada exitosamente.',
          data: nueva,
        };
      }
    );
  },

  simularFinanciamiento: async (payload) => {
    return withResilientFallback(
      () => apiClient.post('/ventas/simular-financiamiento', payload),
      () => {
        const precioVenta = round2(payload.precioVentaAcordado || 0);
        const prima = round2(payload.montoPrima || 0);
        const montoFinanciado = round2(Math.max(0, precioVenta - prima));
        const porcentajePrima = precioVenta > 0 ? round2((prima / precioVenta) * 100) : 0;

        const tablaAmortizacion = generarTablaAmortizacionLocal({
          montoFinanciado,
          plazoMeses: payload.plazoMeses || 12,
          tasaInteresAnual: payload.tasaInteresAnual || 0,
        });

        const desgloseFiscalSV = calcularDesgloseFiscalSVLocal({
          montoTotal: precioVenta,
          tipoDocumento: payload.tipoDocumento || 'FACTURA_CONSUMIDOR_FINAL',
          precioInmueble: precioVenta,
        });

        return {
          success: true,
          data: {
            resumenOperacion: {
              precioVentaAcordado: precioVenta,
              montoPrima: prima,
              porcentajePrima,
              montoFinanciado,
              plazoMeses: tablaAmortizacion.plazoMeses,
              tasaInteresAnual: tablaAmortizacion.tasaInteresAnual,
              cuotaMensualNivelada: tablaAmortizacion.cuotaNiveladaReferencia,
              totalInteresesFinanciamiento: tablaAmortizacion.totalIntereses,
              totalPagarFinanciamiento: tablaAmortizacion.totalPagar,
              costoTotalInmuebleConIntereses: round2(prima + tablaAmortizacion.totalPagar),
            },
            desgloseFiscalSV,
            tablaAmortizacion,
          },
        };
      }
    );
  },

  listContratos: async (params = {}) => {
    return withResilientFallback(
      () => apiClient.get('/ventas/contratos', { params }),
      () => {
        return {
          success: true,
          count: fallbackStore.contratos.length,
          data: fallbackStore.contratos,
        };
      }
    );
  },

  getContratoById: async (id) => {
    return withResilientFallback(
      () => apiClient.get(`/ventas/contratos/${id}`),
      () => {
        const c = fallbackStore.contratos.find((item) => item.id === id);
        if (!c) {
          throw createFallbackHttpError(404, 'Contrato no encontrado.', 'CONTRATO_NOT_FOUND');
        }
        return {
          success: true,
          data: c,
        };
      }
    );
  },

  crearContrato: async (payload) => {
    return withResilientFallback(
      () => apiClient.post('/ventas/contratos', payload),
      () => {
        const {
          clienteId,
          unidadId,
          precioVentaAcordado,
          montoPrima = 0,
          plazoMeses = 12,
          tasaInteresAnual = 8.5,
          tipoDocumentoPrima = 'FACTURA_CONSUMIDOR_FINAL',
        } = payload;

        const cliente = fallbackStore.clientes.find((c) => c.id === clienteId);
        const unidad = fallbackStore.unidades.find((u) => u.id === unidadId);
        if (!cliente || !unidad) {
          throw createFallbackHttpError(404, 'Cliente o unidad inmobiliaria no encontrados.', 'NOT_FOUND');
        }
        if (unidad.estado === 'VENDIDA') {
          throw createFallbackHttpError(
            422,
            `La unidad inmobiliaria '${unidad.codigo}' ya se encuentra VENDIDA.`,
            'UNIT_NOT_AVAILABLE'
          );
        }

        // Validación fiscal Art. 114 Código Tributario SV
        if (tipoDocumentoPrima === 'CREDITO_FISCAL_CCF' && (!cliente.nrc || !cliente.giro)) {
          throw createFallbackHttpError(
            422,
            `Bloqueo Fiscal Ministerio de Hacienda SV (Art. 114 Código Tributario): No se puede emitir un Comprobante de Crédito Fiscal (CREDITO_FISCAL_CCF - DTE 03) al cliente '${cliente.nombreCompleto}' porque no posee NRC (Número de Registro de Contribuyente) ni Giro (Actividad Económica) registrados.`,
            'FISCAL_CCF_REQUIRES_NRC_AND_GIRO',
            {
              clienteId: cliente.id,
              nombreCompleto: cliente.nombreCompleto,
              tipoCliente: cliente.tipo,
              camposFaltantes: [...(!cliente.nrc ? ['nrc'] : []), ...(!cliente.giro ? ['giro'] : [])],
              normativaLegal: 'Art. 107 y Art. 114 del Código Tributario de la República de El Salvador (DTE-03)',
            }
          );
        }

        const precio = round2(precioVentaAcordado);
        const prima = round2(montoPrima);
        const financiado = round2(Math.max(0, precio - prima));
        const tabla = generarTablaAmortizacionLocal({
          montoFinanciado: financiado,
          plazoMeses,
          tasaInteresAnual,
        });

        const contratoId = `cnt-${Date.now()}`;
        const codigoContrato = `CV-${unidad.codigo}-${String(fallbackStore.contratos.length + 1).padStart(3, '0')}`;

        const cuotas = tabla.cuotas.map((c) => ({
          id: `cuo-${contratoId}-${c.numeroCuota}`,
          contratoId,
          numeroCuota: c.numeroCuota,
          fechaVencimiento: c.fechaVencimiento,
          montoCapital: c.montoCapital.toFixed(2),
          montoInteres: c.montoInteres.toFixed(2),
          montoTotalCuota: c.montoTotalCuota.toFixed(2),
          estado: 'PENDIENTE',
          fechaPago: null,
        }));

        unidad.estado = 'VENDIDA';
        const proyecto = fallbackStore.proyectos.find((p) => p.id === unidad.proyectoId);

        const nuevoContrato = {
          id: contratoId,
          codigo: codigoContrato,
          clienteId: cliente.id,
          cliente,
          unidadId: unidad.id,
          unidad: { ...unidad, proyecto },
          precioVentaAcordado: precio.toFixed(2),
          montoPrima: prima.toFixed(2),
          montoFinanciado: financiado.toFixed(2),
          plazoMeses: tabla.plazoMeses,
          tasaInteresAnual: round2(tasaInteresAnual).toFixed(2),
          saldoPendiente: financiado.toFixed(2),
          estado: financiado === 0 ? 'FINALIZADO' : 'ACTIVO',
          fechaFirma: new Date().toISOString(),
          cuotas,
          documentosFiscales: [],
        };

        if (prima > 0) {
          const desglose = calcularDesgloseFiscalSVLocal({
            montoTotal: prima,
            tipoDocumento: tipoDocumentoPrima,
            precioInmueble: precio,
          });
          const doc = {
            id: `doc-${Date.now()}`,
            numeroDocumento: `${tipoDocumentoPrima === 'CREDITO_FISCAL_CCF' ? 'DTE-03-CCF' : 'DTE-01-FCF'}-${Date.now().toString().slice(-6)}-0001`,
            contratoId,
            cuotaId: null,
            tipoDocumento: tipoDocumentoPrima,
            montoGravado: desglose.montoGravado.toFixed(2),
            montoIva: desglose.montoIva.toFixed(2),
            montoTotal: desglose.montoTotal.toFixed(2),
            concepto: `Pago de Prima Inicial — Contrato ${codigoContrato} (Unidad ${unidad.codigo})`,
            fechaEmision: new Date().toISOString(),
            contrato: {
              id: contratoId,
              codigo: codigoContrato,
              cliente,
              unidad,
            },
          };
          nuevoContrato.documentosFiscales.push(doc);
          fallbackStore.documentosFiscales.unshift(doc);
        }

        fallbackStore.contratos.unshift(nuevoContrato);
        return {
          success: true,
          message: `Contrato '${codigoContrato}' formalizado exitosamente con ${cuotas.length} cuotas de amortización.`,
          data: nuevoContrato,
        };
      }
    );
  },

  pagarCuota: async (contratoId, cuotaId, payload = {}) => {
    return withResilientFallback(
      () => apiClient.post(`/ventas/contratos/${contratoId}/cuotas/${cuotaId}/pagar`, payload),
      () => {
        const contrato = fallbackStore.contratos.find((c) => c.id === contratoId);
        if (!contrato) {
          throw createFallbackHttpError(404, 'Contrato no encontrado.', 'CONTRATO_NOT_FOUND');
        }
        const cuota = contrato.cuotas.find((item) => item.id === cuotaId);
        if (!cuota) {
          throw createFallbackHttpError(404, 'Cuota no encontrada.', 'INSTALLMENT_NOT_FOUND');
        }
        if (cuota.estado === 'PAGADA') {
          throw createFallbackHttpError(422, `La cuota #${cuota.numeroCuota} ya fue pagada.`, 'INSTALLMENT_ALREADY_PAID');
        }

        const tipoDoc = String(payload.tipoDocumento || 'FACTURA_CONSUMIDOR_FINAL').toUpperCase().trim();
        const cliente = contrato.cliente;

        if (tipoDoc === 'CREDITO_FISCAL_CCF' && (!cliente.nrc || !cliente.giro)) {
          throw createFallbackHttpError(
            422,
            `Bloqueo Fiscal Ministerio de Hacienda SV (Art. 114 Código Tributario): No se puede emitir un Comprobante de Crédito Fiscal (CREDITO_FISCAL_CCF - DTE 03) al cliente '${cliente.nombreCompleto}' porque no posee NRC ni Giro registrados.`,
            'FISCAL_CCF_REQUIRES_NRC_AND_GIRO',
            {
              clienteId: cliente.id,
              nombreCompleto: cliente.nombreCompleto,
              tipoCliente: cliente.tipo,
              camposFaltantes: [...(!cliente.nrc ? ['nrc'] : []), ...(!cliente.giro ? ['giro'] : [])],
              normativaLegal: 'Art. 107 y Art. 114 del Código Tributario de la República de El Salvador (DTE-03)',
            }
          );
        }

        cuota.estado = 'PAGADA';
        cuota.fechaPago = new Date().toISOString();
        contrato.saldoPendiente = round2(Math.max(0, Number(contrato.saldoPendiente) - Number(cuota.montoCapital))).toFixed(2);
        if (Number(contrato.saldoPendiente) === 0) {
          contrato.estado = 'FINALIZADO';
        }

        const desglose = calcularDesgloseFiscalSVLocal({
          montoTotal: Number(cuota.montoTotalCuota),
          tipoDocumento: tipoDoc,
          precioInmueble: Number(contrato.precioVentaAcordado),
        });

        const doc = {
          id: `doc-${Date.now()}`,
          numeroDocumento: `${tipoDoc === 'CREDITO_FISCAL_CCF' ? 'DTE-03-CCF' : tipoDoc === 'RECIBO_ABONO' ? 'REC-ABO' : 'DTE-01-FCF'}-${Date.now().toString().slice(-6)}-${String(cuota.numeroCuota).padStart(4, '0')}`,
          contratoId: contrato.id,
          cuotaId: cuota.id,
          tipoDocumento: tipoDoc,
          montoGravado: desglose.montoGravado.toFixed(2),
          montoIva: desglose.montoIva.toFixed(2),
          montoTotal: desglose.montoTotal.toFixed(2),
          concepto: `Pago de Cuota #${cuota.numeroCuota}/${contrato.plazoMeses} (Capital: $${cuota.montoCapital}, Interés: $${cuota.montoInteres}) — Contrato ${contrato.codigo}`,
          fechaEmision: new Date().toISOString(),
          contrato: {
            id: contrato.id,
            codigo: contrato.codigo,
            cliente: contrato.cliente,
            unidad: contrato.unidad,
          },
        };

        contrato.documentosFiscales.unshift(doc);
        fallbackStore.documentosFiscales.unshift(doc);

        return {
          success: true,
          message: `Pago de la cuota #${cuota.numeroCuota} registrado y documento fiscal '${doc.numeroDocumento}' emitido exitosamente.`,
          data: {
            cuota,
            contrato,
            documentoFiscal: doc,
            desgloseFiscalSV: desglose,
          },
        };
      }
    );
  },

  listDocumentosFiscales: async (params = {}) => {
    return withResilientFallback(
      () => apiClient.get('/ventas/documentos-fiscales', { params }),
      () => {
        return {
          success: true,
          count: fallbackStore.documentosFiscales.length,
          data: fallbackStore.documentosFiscales,
        };
      }
    );
  },
};
