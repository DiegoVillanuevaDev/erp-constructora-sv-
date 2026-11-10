const prisma = require('../../config/prisma');
const AppError = require('../../utils/AppError');

// ============================================================================
// CONSTANTES LEGALES, FINANCIERAS Y TRIBUTARIAS DE EL SALVADOR (MÓDULO 5)
// ============================================================================

// Art. 54 Ley de Impuesto a la Transferencia de Bienes Muebles y a la Prestación de Servicios (IVA 13%)
const IVA_RATE = Number(process.env.SV_IVA_RATE || 0.13);

// Ley del Impuesto sobre Transferencia de Bienes Raíces (ITBR El Salvador):
// Exento hasta ¢250,000.00 colones salvadoreños equivalentes a $28,571.43 USD; 3% sobre el exceso.
const ITBR_EXENTO_LIMITE = Number(process.env.SV_ITBR_EXENTO_LIMITE || 28571.43);
const ITBR_RATE = Number(process.env.SV_ITBR_RATE || 0.03);

const TIPOS_CLIENTE_VALIDOS = ['NATURAL', 'JURIDICO'];
const TIPOS_UNIDAD_VALIDOS = ['CASA', 'APARTAMENTO', 'LOTE'];
const ESTADOS_UNIDAD_VALIDOS = ['DISPONIBLE', 'RESERVADA', 'VENDIDA', 'ESCRITURADA'];
const ESTADOS_CONTRATO_VALIDOS = ['ACTIVO', 'CANCELADO', 'FINALIZADO'];
const ESTADOS_CUOTA_VALIDOS = ['PENDIENTE', 'PAGADA', 'MORA'];
const TIPOS_DOCUMENTO_FISCAL_VALIDOS = [
  'RECIBO_ABONO',
  'FACTURA_CONSUMIDOR_FINAL',
  'CREDITO_FISCAL_CCF',
];

// Catálogo CAT-002 Ministerio de Hacienda El Salvador (Documentos Tributarios Electrónicos - DTE)
const CODIGOS_DTE_MH_SV = {
  FACTURA_CONSUMIDOR_FINAL: '01', // Factura de Consumidor Final
  CREDITO_FISCAL_CCF: '03', // Comprobante de Crédito Fiscal (CCF)
  RECIBO_ABONO: 'REC-CAJA', // Recibo Interno de Abono / Reserva
};

// Formato oficial salvadoreño de DUI: 00000000-0 o 9 dígitos continuos
const DUI_SV_REGEX = /^\d{8}-?\d$/;

/**
 * Redondeo financiero simétrico a 2 decimales exactos.
 */
const round2 = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

/**
 * Formatea un número como string Decimal(p, 2) para escritura segura en Prisma.
 */
const toDecimalFixed = (value) => round2(value).toFixed(2);

/**
 * Normaliza un número de DUI salvadoreño al formato estándar 00000000-0.
 */
const normalizarDuiSV = (duiRaw) => {
  if (!duiRaw || typeof duiRaw !== 'string') {
    throw AppError.badRequest(
      'El Documento Único de Identidad (DUI) es obligatorio para personas naturales en El Salvador.',
      'CLIENTE_DUI_REQUIRED'
    );
  }
  const limpio = duiRaw.trim();
  if (!DUI_SV_REGEX.test(limpio)) {
    throw AppError.badRequest(
      `El DUI '${limpio}' no cumple con el formato oficial de El Salvador (00000000-0 o 9 dígitos).`,
      'CLIENTE_INVALID_DUI_FORMAT',
      { duiRecibido: limpio, formatoEsperado: '00000000-0' }
    );
  }
  const soloDigitos = limpio.replace('-', '');
  return `${soloDigitos.slice(0, 8)}-${soloDigitos.slice(8)}`;
};

/**
 * Suma meses a una fecha preservando el día del mes sin desbordamiento inválido.
 */
const addMonthsUTC = (baseDate, monthsToAdd) => {
  const date = new Date(baseDate.getTime());
  const targetMonth = date.getUTCMonth() + monthsToAdd;
  const day = date.getUTCDate();
  const result = new Date(Date.UTC(date.getUTCFullYear(), targetMonth, 1, 12, 0, 0, 0));
  const maxDaysInMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();
  result.setUTCDate(Math.min(day, maxDaysInMonth));
  return result;
};

/**
 * Genera un número único de documento fiscal o código de contrato.
 */
const generarNumeroDocumentoFiscal = (tipoDocumento, correlativoHint = null) => {
  const prefijoMap = {
    CREDITO_FISCAL_CCF: 'DTE-03-CCF',
    FACTURA_CONSUMIDOR_FINAL: 'DTE-01-FCF',
    RECIBO_ABONO: 'REC-ABO',
  };
  const prefijo = prefijoMap[tipoDocumento] || 'DOC-VTA';
  const timestamp = Date.now().toString().slice(-7);
  const randomSuffix =
    correlativoHint !== null
      ? String(correlativoHint).padStart(4, '0')
      : String(Math.floor(1000 + Math.random() * 9000));
  return `${prefijo}-${timestamp}-${randomSuffix}`;
};

// ============================================================================
// 1. MOTOR FINANCIERO Y TRIBUTARIO SALVADOREÑO (FUNCIONES PURAS EXPORTADAS)
// ============================================================================

/**
 * Genera la tabla de amortización bajo el sistema de cuota nivelada (Francés)
 * o cuotas de capital iguales si `tasaInteresAnual === 0`.
 * Ajusta en la última cuota (`numeroCuota === plazoMeses`) cualquier diferencia de centavos
 * por redondeo para que la suma de `montoCapital` sea exactamente igual a `montoFinanciado` (0.00 descuadre).
 *
 * @param {object} params
 * @param {number} params.montoFinanciado - Saldo a financiar tras descontar la prima.
 * @param {number} params.plazoMeses - Número total de cuotas mensuales.
 * @param {number} [params.tasaInteresAnual=0] - Tasa nominal anual en porcentaje (ej. 8.5 para 8.50%).
 * @param {string|Date} [params.fechaPrimerPago] - Fecha de vencimiento de la cuota #1.
 */
const generarTablaAmortizacionFrancesa = ({
  montoFinanciado,
  plazoMeses,
  tasaInteresAnual = 0,
  fechaPrimerPago = null,
} = {}) => {
  const montoFinanciadoNum = Number(montoFinanciado);
  if (!Number.isFinite(montoFinanciadoNum) || montoFinanciadoNum < 0) {
    throw AppError.badRequest(
      'El montoFinanciado debe ser un número mayor o igual a cero.',
      'AMORTIZACION_INVALID_MONTO_FINANCIADO',
      { montoFinanciado }
    );
  }

  const capitalTotal = round2(montoFinanciadoNum);

  if (capitalTotal === 0) {
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

  const plazoNum = Number(plazoMeses);
  if (!Number.isInteger(plazoNum) || plazoNum < 1 || plazoNum > 600) {
    throw AppError.badRequest(
      'El plazoMeses debe ser un número entero entre 1 y 600 meses.',
      'AMORTIZACION_INVALID_PLAZO_MESES',
      { plazoMeses }
    );
  }

  const tasaAnualNum = Number(tasaInteresAnual ?? 0);
  if (!Number.isFinite(tasaAnualNum) || tasaAnualNum < 0 || tasaAnualNum > 100) {
    throw AppError.badRequest(
      'La tasaInteresAnual debe ser un porcentaje válido entre 0 y 100.',
      'AMORTIZACION_INVALID_TASA_INTERES',
      { tasaInteresAnual }
    );
  }

  let fechaBasePrimeraCuota;
  if (fechaPrimerPago) {
    const parsed = new Date(fechaPrimerPago);
    if (Number.isNaN(parsed.getTime())) {
      throw AppError.badRequest(
        'La fechaPrimerPago proporcionada no tiene un formato de fecha válido.',
        'AMORTIZACION_INVALID_FECHA_PRIMER_PAGO',
        { fechaPrimerPago }
      );
    }
    fechaBasePrimeraCuota = parsed;
  } else {
    fechaBasePrimeraCuota = addMonthsUTC(new Date(), 1);
  }

  const tasaAnualRedondeada = round2(tasaAnualNum);
  const tasaMensual = tasaAnualRedondeada > 0 ? tasaAnualRedondeada / 100 / 12 : 0;

  let cuotaNiveladaReferencia;
  if (tasaMensual === 0) {
    cuotaNiveladaReferencia = round2(capitalTotal / plazoNum);
  } else {
    const factor = Math.pow(1 + tasaMensual, plazoNum);
    cuotaNiveladaReferencia = round2(
      capitalTotal * ((tasaMensual * factor) / (factor - 1))
    );
  }

  const cuotas = [];
  let saldoRestante = capitalTotal;
  let capitalAcumulado = 0;
  let interesesAcumulados = 0;

  for (let numeroCuota = 1; numeroCuota <= plazoNum; numeroCuota += 1) {
    const fechaVencimiento = addMonthsUTC(fechaBasePrimeraCuota, numeroCuota - 1);
    const saldoInicial = saldoRestante;
    const montoInteres = tasaMensual > 0 ? round2(saldoInicial * tasaMensual) : 0;

    let montoCapital;
    if (numeroCuota === plazoNum) {
      // Ajuste exacto de centavos en la última cuota para garantizar cuadratura 0.00
      montoCapital = round2(capitalTotal - capitalAcumulado);
    } else {
      montoCapital = round2(cuotaNiveladaReferencia - montoInteres);
      if (montoCapital <= 0) {
        montoCapital = round2(capitalTotal / plazoNum);
      }
      if (montoCapital > saldoRestante) {
        montoCapital = saldoRestante;
      }
    }

    const montoTotalCuota = round2(montoCapital + montoInteres);
    capitalAcumulado = round2(capitalAcumulado + montoCapital);
    interesesAcumulados = round2(interesesAcumulados + montoInteres);
    saldoRestante = round2(capitalTotal - capitalAcumulado);

    cuotas.push({
      numeroCuota,
      fechaVencimiento,
      saldoInicial,
      montoCapital,
      montoInteres,
      montoTotalCuota,
      saldoFinal: saldoRestante,
    });
  }

  const totalCapital = round2(capitalAcumulado);
  const totalIntereses = round2(interesesAcumulados);
  const totalPagar = round2(totalCapital + totalIntereses);

  return {
    montoFinanciado: capitalTotal,
    plazoMeses: plazoNum,
    tasaInteresAnual: tasaAnualRedondeada,
    tasaInteresMensual: Number((tasaMensual * 100).toFixed(6)),
    cuotaNiveladaReferencia,
    totalCapital,
    totalIntereses,
    totalPagar,
    cuotas,
  };
};

/**
 * Calcula el desglose tributario salvadoreño (IVA 13% según Arts. 54, 107 y 114 Código Tributario / Ley IVA)
 * y el Impuesto a la Transferencia de Bienes Raíces (ITBR 3% sobre exceso de $28,571.43).
 *
 * @param {object} params
 * @param {number} [params.montoTotal] - Monto total de la operación (IVA incluido si aplica).
 * @param {number} [params.montoGravado] - Base imponible sin IVA (si se desea calcular IVA hacia arriba en CCF).
 * @param {string} [params.tipoDocumento='FACTURA_CONSUMIDOR_FINAL'] - 'CREDITO_FISCAL_CCF' | 'FACTURA_CONSUMIDOR_FINAL' | 'RECIBO_ABONO'
 * @param {number} [params.precioInmueble] - Precio del inmueble para evaluación de ITBR (3% sobre exceso de $28,571.43).
 * @param {boolean} [params.incluirIvaEnRecibo=false] - Si un recibo de abono debe desglosar IVA o registrarse sin IVA.
 */
const calcularDesgloseFiscalSV = ({
  montoTotal,
  montoGravado,
  tipoDocumento = 'FACTURA_CONSUMIDOR_FINAL',
  precioInmueble,
  incluirIvaEnRecibo = false,
} = {}) => {
  const tipoNorm = String(tipoDocumento || 'FACTURA_CONSUMIDOR_FINAL')
    .toUpperCase()
    .trim();

  if (!TIPOS_DOCUMENTO_FISCAL_VALIDOS.includes(tipoNorm)) {
    throw AppError.badRequest(
      `El tipoDocumento '${tipoDocumento}' no es válido. Valores permitidos: ${TIPOS_DOCUMENTO_FISCAL_VALIDOS.join(', ')}.`,
      'FISCAL_INVALID_TIPO_DOCUMENTO',
      { tiposPermitidos: TIPOS_DOCUMENTO_FISCAL_VALIDOS }
    );
  }

  const tieneMontoTotal =
    montoTotal !== undefined && montoTotal !== null && montoTotal !== '';
  const tieneMontoGravado =
    montoGravado !== undefined && montoGravado !== null && montoGravado !== '';

  if (!tieneMontoTotal && !tieneMontoGravado) {
    throw AppError.badRequest(
      'Debe proporcionar montoTotal o montoGravado para calcular el desglose fiscal.',
      'FISCAL_MONTO_REQUIRED'
    );
  }

  let baseGravada = 0;
  let iva = 0;
  let total = 0;

  if (tipoNorm === 'CREDITO_FISCAL_CCF') {
    // Comprobante de Crédito Fiscal (DTE 03):
    // Si se proporciona montoGravado sin montoTotal, agrega el 13% de IVA sobre la base.
    // Si se proporciona montoTotal (ej. cuota o prima pactada), desglosa base = total / 1.13 e IVA = total - base.
    if (tieneMontoGravado && !tieneMontoTotal) {
      const gravadoNum = Number(montoGravado);
      if (!Number.isFinite(gravadoNum) || gravadoNum <= 0) {
        throw AppError.badRequest(
          'El montoGravado debe ser un número mayor a 0.',
          'FISCAL_INVALID_MONTO_GRAVADO'
        );
      }
      baseGravada = round2(gravadoNum);
      iva = round2(baseGravada * IVA_RATE);
      total = round2(baseGravada + iva);
    } else {
      const totalNum = Number(montoTotal);
      if (!Number.isFinite(totalNum) || totalNum <= 0) {
        throw AppError.badRequest(
          'El montoTotal debe ser un número mayor a 0.',
          'FISCAL_INVALID_MONTO_TOTAL'
        );
      }
      total = round2(totalNum);
      baseGravada = tieneMontoGravado
        ? round2(Number(montoGravado))
        : round2(total / (1 + IVA_RATE));
      iva = round2(total - baseGravada);
    }
  } else if (tipoNorm === 'FACTURA_CONSUMIDOR_FINAL') {
    // Factura de Consumidor Final (DTE 01):
    // El precio final al consumidor incluye el 13% de IVA (Art. 107 Código Tributario SV).
    if (tieneMontoTotal) {
      const totalNum = Number(montoTotal);
      if (!Number.isFinite(totalNum) || totalNum <= 0) {
        throw AppError.badRequest(
          'El montoTotal debe ser un número mayor a 0.',
          'FISCAL_INVALID_MONTO_TOTAL'
        );
      }
      total = round2(totalNum);
      baseGravada = round2(total / (1 + IVA_RATE));
      iva = round2(total - baseGravada);
    } else {
      const gravadoNum = Number(montoGravado);
      if (!Number.isFinite(gravadoNum) || gravadoNum <= 0) {
        throw AppError.badRequest(
          'El montoGravado debe ser un número mayor a 0.',
          'FISCAL_INVALID_MONTO_GRAVADO'
        );
      }
      baseGravada = round2(gravadoNum);
      iva = round2(baseGravada * IVA_RATE);
      total = round2(baseGravada + iva);
    }
  } else if (tipoNorm === 'RECIBO_ABONO') {
    // Recibo de caja por amortización de capital o reserva
    const montoRef = Number(tieneMontoTotal ? montoTotal : montoGravado);
    if (!Number.isFinite(montoRef) || montoRef <= 0) {
      throw AppError.badRequest(
        'El monto del recibo de abono debe ser un número mayor a 0.',
        'FISCAL_INVALID_MONTO_RECIBO'
      );
    }
    total = round2(montoRef);
    if (incluirIvaEnRecibo) {
      baseGravada = round2(total / (1 + IVA_RATE));
      iva = round2(total - baseGravada);
    } else {
      baseGravada = total;
      iva = 0;
    }
  }

  // Cálculo del Impuesto a la Transferencia de Bienes Raíces (ITBR El Salvador)
  // Exento hasta $28,571.43 (¢250,000 colones); 3% sobre el exceso.
  const valorInmuebleEvaluado =
    precioInmueble !== undefined && precioInmueble !== null
      ? round2(Number(precioInmueble))
      : total;

  const excesoItbr = Math.max(
    0,
    round2(valorInmuebleEvaluado - ITBR_EXENTO_LIMITE)
  );
  const impuestoTransferenciaBienesRaices = round2(excesoItbr * ITBR_RATE);

  return {
    tipoDocumento: tipoNorm,
    codigoDteMH: CODIGOS_DTE_MH_SV[tipoNorm],
    tasaIva: IVA_RATE,
    montoGravado: baseGravada,
    montoIva: iva,
    montoTotal: total,
    requiereNrcYGiro: tipoNorm === 'CREDITO_FISCAL_CCF',
    impuestoTransferenciaBienesRaices,
    itbr: {
      valorInmuebleEvaluado,
      limiteExentoSV: ITBR_EXENTO_LIMITE,
      tasaItbr: ITBR_RATE,
      exentoItbr: excesoItbr === 0,
      baseGravableExceso: excesoItbr,
      impuestoTransferenciaBienesRaices,
    },
  };
};

/**
 * Valida la REGLA DE ORO FISCAL DEL MÓDULO 5 (Art. 114 Código Tributario de El Salvador):
 * Para emitir un Comprobante de Crédito Fiscal (`CREDITO_FISCAL_CCF`), el cliente debe poseer
 * obligatoriamente `nrc` (Número de Registro de Contribuyente) y `giro` (Actividad Económica).
 */
const validarCumplimientoFiscalCCF = (cliente, tipoDocumento) => {
  const tipoNorm = String(tipoDocumento || '').toUpperCase().trim();
  if (tipoNorm !== 'CREDITO_FISCAL_CCF') {
    return true;
  }

  const tieneNrc = Boolean(cliente?.nrc && String(cliente.nrc).trim().length > 0);
  const tieneGiro = Boolean(cliente?.giro && String(cliente.giro).trim().length > 0);

  if (!tieneNrc || !tieneGiro) {
    throw AppError.unprocessable(
      `Bloqueo Fiscal Ministerio de Hacienda SV (Art. 114 Código Tributario): No se puede emitir un Comprobante de Crédito Fiscal (CREDITO_FISCAL_CCF - DTE 03) al cliente '${cliente?.nombreCompleto || cliente?.id}' porque no posee NRC (Número de Registro de Contribuyente) ni Giro (Actividad Económica) registrados.`,
      'FISCAL_CCF_REQUIRES_NRC_AND_GIRO',
      {
        clienteId: cliente?.id || null,
        nombreCompleto: cliente?.nombreCompleto || null,
        tipoCliente: cliente?.tipo || null,
        nrcRegistrado: cliente?.nrc || null,
        giroRegistrado: cliente?.giro || null,
        camposFaltantes: [
          ...(!tieneNrc ? ['nrc'] : []),
          ...(!tieneGiro ? ['giro'] : []),
        ],
        normativaLegal:
          'Art. 107 y Art. 114 del Código Tributario de la República de El Salvador (Emisión de Comprobante de Crédito Fiscal DTE-03)',
      }
    );
  }

  return true;
};

/**
 * Simulador interactivo de financiamiento hipotecario/inmobiliario + desglose fiscal SV (IVA 13% e ITBR 3%).
 */
const simularFinanciamiento = (payload = {}) => {
  const {
    precioVentaAcordado,
    montoPrima = 0,
    plazoMeses = 12,
    tasaInteresAnual = 0,
    fechaPrimerPago = null,
    tipoDocumento = 'FACTURA_CONSUMIDOR_FINAL',
  } = payload;

  const precioNum = Number(precioVentaAcordado);
  if (!Number.isFinite(precioNum) || precioNum <= 0) {
    throw AppError.badRequest(
      'El precioVentaAcordado es obligatorio y debe ser mayor a 0.',
      'SIMULACION_INVALID_PRECIO_VENTA',
      { precioVentaAcordado }
    );
  }

  const primaNum = Number(montoPrima ?? 0);
  if (!Number.isFinite(primaNum) || primaNum < 0 || primaNum > precioNum) {
    throw AppError.badRequest(
      'El montoPrima debe ser mayor o igual a 0 y no puede exceder el precioVentaAcordado.',
      'SIMULACION_INVALID_MONTO_PRIMA',
      { montoPrima, precioVentaAcordado: precioNum }
    );
  }

  const precioVenta = round2(precioNum);
  const prima = round2(primaNum);
  const montoFinanciado = round2(precioVenta - prima);
  const porcentajePrima = round2((prima / precioVenta) * 100);

  const tablaAmortizacion = generarTablaAmortizacionFrancesa({
    montoFinanciado,
    plazoMeses: montoFinanciado > 0 ? Number(plazoMeses) : 0,
    tasaInteresAnual: Number(tasaInteresAnual ?? 0),
    fechaPrimerPago,
  });

  const desgloseFiscalInmueble = calcularDesgloseFiscalSV({
    montoTotal: precioVenta,
    tipoDocumento,
    precioInmueble: precioVenta,
  });

  const desgloseFiscalPrima =
    prima > 0
      ? calcularDesgloseFiscalSV({
          montoTotal: prima,
          tipoDocumento,
          precioInmueble: precioVenta,
        })
      : null;

  return {
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
    desgloseFiscalSV: desgloseFiscalInmueble,
    desgloseFiscalPrima,
    tablaAmortizacion,
  };
};

// ============================================================================
// 2. GESTIÓN DE CLIENTES CRM (PERSONAS NATURALES Y JURÍDICAS SV)
// ============================================================================

/**
 * Lista clientes filtrables por `tipo` (`NATURAL` | `JURIDICO`) o búsqueda libre `search`.
 */
const listClientes = async (filters = {}) => {
  const { tipo, search } = filters;
  const where = {};

  if (tipo) {
    const tipoNorm = String(tipo).toUpperCase().trim();
    if (!TIPOS_CLIENTE_VALIDOS.includes(tipoNorm)) {
      throw AppError.badRequest(
        `El tipo de cliente '${tipo}' no es válido. Valores permitidos: ${TIPOS_CLIENTE_VALIDOS.join(', ')}.`,
        'CLIENTE_INVALID_TIPO',
        { tiposPermitidos: TIPOS_CLIENTE_VALIDOS }
      );
    }
    where.tipo = tipoNorm;
  }

  if (search && String(search).trim()) {
    const term = String(search).trim();
    where.OR = [
      { nombreCompleto: { contains: term, mode: 'insensitive' } },
      { dui: { contains: term, mode: 'insensitive' } },
      { nit: { contains: term, mode: 'insensitive' } },
      { nrc: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
    ];
  }

  const clientes = await prisma.cliente.findMany({
    where,
    include: {
      _count: {
        select: {
          contratos: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return clientes;
};

/**
 * Registra un nuevo cliente en el CRM inmobiliario cumpliendo las validaciones fiscales de El Salvador:
 * - Si `tipo === 'NATURAL'`: exige `dui` válido (`00000000-0`). Si además registra `nrc` (contribuyente IVA), exige `giro`.
 * - Si `tipo === 'JURIDICO'`: exige `nit`, `nrc` y `giro` obligatoriamente.
 */
const createCliente = async (payload = {}) => {
  const {
    tipo,
    nombreCompleto,
    dui,
    nit,
    nrc,
    giro,
    direccion,
    telefono,
    email,
  } = payload;

  if (!tipo || !nombreCompleto || !direccion || !telefono || !email) {
    throw AppError.badRequest(
      'Los campos tipo, nombreCompleto, direccion, telefono y email son obligatorios.',
      'CLIENTE_REQUIRED_FIELDS_MISSING'
    );
  }

  const tipoNorm = String(tipo).toUpperCase().trim();
  if (!TIPOS_CLIENTE_VALIDOS.includes(tipoNorm)) {
    throw AppError.badRequest(
      `El tipo de cliente '${tipo}' no es válido. Valores permitidos: ${TIPOS_CLIENTE_VALIDOS.join(', ')}.`,
      'CLIENTE_INVALID_TIPO',
      { tiposPermitidos: TIPOS_CLIENTE_VALIDOS }
    );
  }

  let duiNorm = null;
  let nitNorm = nit && String(nit).trim() ? String(nit).trim() : null;
  const nrcNorm = nrc && String(nrc).trim() ? String(nrc).trim() : null;
  const giroNorm = giro && String(giro).trim() ? String(giro).trim() : null;

  if (tipoNorm === 'NATURAL') {
    duiNorm = normalizarDuiSV(String(dui || ''));
    // Homologación NIT/DUI en El Salvador para personas naturales si no se envía NIT separado
    if (!nitNorm) {
      nitNorm = duiNorm;
    }
    if (nrcNorm && !giroNorm) {
      throw AppError.badRequest(
        'Cuando una persona NATURAL se registra como contribuyente de IVA con NRC, el campo giro (actividad económica) es obligatorio.',
        'CLIENTE_NATURAL_CONTRIBUYENTE_GIRO_REQUIRED',
        { nrc: nrcNorm }
      );
    }
  } else if (tipoNorm === 'JURIDICO') {
    if (!nitNorm || !nrcNorm || !giroNorm) {
      throw AppError.badRequest(
        'Para clientes de tipo JURIDICO (sociedades/empresas), los campos fiscales nit, nrc y giro son obligatorios conforme al Código Tributario de El Salvador.',
        'CLIENTE_JURIDICO_FISCAL_FIELDS_REQUIRED',
        {
          camposRequeridos: ['nit', 'nrc', 'giro'],
          recibidos: { nit: nitNorm, nrc: nrcNorm, giro: giroNorm },
        }
      );
    }
    if (dui && String(dui).trim()) {
      duiNorm = normalizarDuiSV(String(dui));
    }
  }

  return prisma.$transaction(async (tx) => {
    if (duiNorm) {
      const existenteDui = await tx.cliente.findUnique({ where: { dui: duiNorm } });
      if (existenteDui) {
        throw AppError.conflict(
          `Ya existe un cliente registrado con el DUI '${duiNorm}'.`,
          'CLIENTE_DUI_DUPLICATE',
          { dui: duiNorm }
        );
      }
    }

    if (nitNorm) {
      const existenteNit = await tx.cliente.findUnique({ where: { nit: nitNorm } });
      if (existenteNit) {
        throw AppError.conflict(
          `Ya existe un cliente registrado con el NIT '${nitNorm}'.`,
          'CLIENTE_NIT_DUPLICATE',
          { nit: nitNorm }
        );
      }
    }

    if (nrcNorm) {
      const existenteNrc = await tx.cliente.findUnique({ where: { nrc: nrcNorm } });
      if (existenteNrc) {
        throw AppError.conflict(
          `Ya existe un cliente registrado con el NRC '${nrcNorm}'.`,
          'CLIENTE_NRC_DUPLICATE',
          { nrc: nrcNorm }
        );
      }
    }

    const nuevoCliente = await tx.cliente.create({
      data: {
        tipo: tipoNorm,
        nombreCompleto: String(nombreCompleto).trim(),
        dui: duiNorm,
        nit: nitNorm,
        nrc: nrcNorm,
        giro: giroNorm,
        direccion: String(direccion).trim(),
        telefono: String(telefono).trim(),
        email: String(email).toLowerCase().trim(),
      },
      include: {
        _count: {
          select: {
            contratos: true,
          },
        },
      },
    });

    return nuevoCliente;
  });
};

// ============================================================================
// 3. CATÁLOGO DE UNIDADES INMOBILIARIAS (CASAS, APARTAMENTOS, LOTES)
// ============================================================================

/**
 * Lista las unidades inmobiliarias filtrables por `proyectoId`, `tipo` o `estado`.
 */
const listUnidades = async (filters = {}) => {
  const { proyectoId, tipo, estado } = filters;
  const where = {};

  if (proyectoId) {
    where.proyectoId = String(proyectoId).trim();
  }

  if (tipo) {
    const tipoNorm = String(tipo).toUpperCase().trim();
    if (!TIPOS_UNIDAD_VALIDOS.includes(tipoNorm)) {
      throw AppError.badRequest(
        `El tipo de unidad inmobiliaria '${tipo}' no es válido. Valores permitidos: ${TIPOS_UNIDAD_VALIDOS.join(', ')}.`,
        'UNIDAD_INVALID_TIPO',
        { tiposPermitidos: TIPOS_UNIDAD_VALIDOS }
      );
    }
    where.tipo = tipoNorm;
  }

  if (estado) {
    const estadoNorm = String(estado).toUpperCase().trim();
    if (!ESTADOS_UNIDAD_VALIDOS.includes(estadoNorm)) {
      throw AppError.badRequest(
        `El estado de unidad '${estado}' no es válido. Valores permitidos: ${ESTADOS_UNIDAD_VALIDOS.join(', ')}.`,
        'UNIDAD_INVALID_ESTADO',
        { estadosPermitidos: ESTADOS_UNIDAD_VALIDOS }
      );
    }
    where.estado = estadoNorm;
  }

  const unidades = await prisma.unidadInmobiliaria.findMany({
    where,
    include: {
      proyecto: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
          ubicacion: true,
          faseActual: true,
        },
      },
      contrato: {
        select: {
          id: true,
          codigo: true,
          estado: true,
          precioVentaAcordado: true,
          saldoPendiente: true,
          fechaFirma: true,
          cliente: {
            select: {
              id: true,
              nombreCompleto: true,
              tipo: true,
              dui: true,
              nit: true,
              nrc: true,
            },
          },
        },
      },
    },
    orderBy: [{ proyectoId: 'asc' }, { codigo: 'asc' }],
  });

  return unidades;
};

/**
 * Crea una nueva unidad inmobiliaria dentro de un proyecto.
 */
const createUnidad = async (payload = {}) => {
  const {
    proyectoId,
    codigo,
    tipo,
    areaMetrosCuadrados,
    precioLista,
    estado = 'DISPONIBLE',
  } = payload;

  if (
    !proyectoId ||
    !codigo ||
    !tipo ||
    areaMetrosCuadrados === undefined ||
    precioLista === undefined
  ) {
    throw AppError.badRequest(
      'Los campos proyectoId, codigo, tipo, areaMetrosCuadrados y precioLista son obligatorios.',
      'UNIDAD_REQUIRED_FIELDS_MISSING'
    );
  }

  const codigoNorm = String(codigo).toUpperCase().trim();
  const tipoNorm = String(tipo).toUpperCase().trim();
  if (!TIPOS_UNIDAD_VALIDOS.includes(tipoNorm)) {
    throw AppError.badRequest(
      `El tipo de unidad '${tipo}' no es válido. Valores permitidos: ${TIPOS_UNIDAD_VALIDOS.join(', ')}.`,
      'UNIDAD_INVALID_TIPO',
      { tiposPermitidos: TIPOS_UNIDAD_VALIDOS }
    );
  }

  const estadoNorm = String(estado || 'DISPONIBLE').toUpperCase().trim();
  if (!ESTADOS_UNIDAD_VALIDOS.includes(estadoNorm)) {
    throw AppError.badRequest(
      `El estado de unidad '${estado}' no es válido. Valores permitidos: ${ESTADOS_UNIDAD_VALIDOS.join(', ')}.`,
      'UNIDAD_INVALID_ESTADO',
      { estadosPermitidos: ESTADOS_UNIDAD_VALIDOS }
    );
  }

  const areaNum = Number(areaMetrosCuadrados);
  if (!Number.isFinite(areaNum) || areaNum <= 0) {
    throw AppError.badRequest(
      'El campo areaMetrosCuadrados debe ser un número mayor a 0.',
      'UNIDAD_INVALID_AREA',
      { areaMetrosCuadrados }
    );
  }

  const precioNum = Number(precioLista);
  if (!Number.isFinite(precioNum) || precioNum <= 0) {
    throw AppError.badRequest(
      'El campo precioLista debe ser un número mayor a 0.',
      'UNIDAD_INVALID_PRECIO_LISTA',
      { precioLista }
    );
  }

  return prisma.$transaction(async (tx) => {
    const [proyecto, unidadExistente] = await Promise.all([
      tx.proyecto.findUnique({ where: { id: String(proyectoId).trim() } }),
      tx.unidadInmobiliaria.findUnique({ where: { codigo: codigoNorm } }),
    ]);

    if (!proyecto) {
      throw AppError.notFound(
        `No se encontró el proyecto con ID '${proyectoId}'.`,
        'PROYECTO_NOT_FOUND'
      );
    }

    if (unidadExistente) {
      throw AppError.conflict(
        `Ya existe una unidad inmobiliaria registrada con el código '${codigoNorm}'.`,
        'UNIDAD_CODIGO_DUPLICATE',
        { codigo: codigoNorm }
      );
    }

    const nuevaUnidad = await tx.unidadInmobiliaria.create({
      data: {
        proyectoId: proyecto.id,
        codigo: codigoNorm,
        tipo: tipoNorm,
        areaMetrosCuadrados: toDecimalFixed(areaNum),
        precioLista: toDecimalFixed(precioNum),
        estado: estadoNorm,
      },
      include: {
        proyecto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            ubicacion: true,
            faseActual: true,
          },
        },
      },
    });

    return nuevaUnidad;
  });
};

/**
 * Cambia el estado de una unidad inmobiliaria (ej. DISPONIBLE -> RESERVADA o VENDIDA -> ESCRITURADA).
 */
const cambiarEstadoUnidad = async (id, payload = {}) => {
  if (!id) {
    throw AppError.badRequest(
      'El identificador de la unidad inmobiliaria es obligatorio.',
      'UNIDAD_ID_REQUIRED'
    );
  }

  const { estado } = payload;
  const estadoNorm = String(estado || '').toUpperCase().trim();
  if (!ESTADOS_UNIDAD_VALIDOS.includes(estadoNorm)) {
    throw AppError.badRequest(
      `El estado '${estado}' no es válido. Valores permitidos: ${ESTADOS_UNIDAD_VALIDOS.join(', ')}.`,
      'UNIDAD_INVALID_ESTADO',
      { estadosPermitidos: ESTADOS_UNIDAD_VALIDOS }
    );
  }

  const unidad = await prisma.unidadInmobiliaria.findUnique({
    where: { id },
    include: { contrato: true },
  });

  if (!unidad) {
    throw AppError.notFound(
      `No se encontró la unidad inmobiliaria con ID '${id}'.`,
      'UNIDAD_NOT_FOUND'
    );
  }

  if (
    unidad.contrato &&
    unidad.contrato.estado === 'ACTIVO' &&
    (estadoNorm === 'DISPONIBLE' || estadoNorm === 'RESERVADA')
  ) {
    throw AppError.unprocessable(
      `No se puede cambiar la unidad '${unidad.codigo}' a '${estadoNorm}' porque posee un contrato de venta activo ('${unidad.contrato.codigo}').`,
      'UNIT_HAS_ACTIVE_CONTRACT',
      { unidadId: unidad.id, contratoCodigo: unidad.contrato.codigo }
    );
  }

  return prisma.unidadInmobiliaria.update({
    where: { id },
    data: { estado: estadoNorm },
    include: {
      proyecto: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
          ubicacion: true,
        },
      },
      contrato: true,
    },
  });
};

// ============================================================================
// 4. CONTRATOS DE VENTA Y TABLA DE AMORTIZACIÓN TRANSACCIONAL (REGLA DE ORO 1)
// ============================================================================

/**
 * Lista los contratos de venta filtrables por `estado`, `clienteId` o `proyectoId`.
 */
const listContratos = async (filters = {}) => {
  const { estado, clienteId, proyectoId } = filters;
  const where = {};

  if (estado) {
    const estadoNorm = String(estado).toUpperCase().trim();
    if (!ESTADOS_CONTRATO_VALIDOS.includes(estadoNorm)) {
      throw AppError.badRequest(
        `El estado de contrato '${estado}' no es válido. Valores permitidos: ${ESTADOS_CONTRATO_VALIDOS.join(', ')}.`,
        'CONTRATO_INVALID_ESTADO',
        { estadosPermitidos: ESTADOS_CONTRATO_VALIDOS }
      );
    }
    where.estado = estadoNorm;
  }

  if (clienteId) {
    where.clienteId = String(clienteId).trim();
  }

  if (proyectoId) {
    where.unidad = {
      proyectoId: String(proyectoId).trim(),
    };
  }

  const contratos = await prisma.contratoVenta.findMany({
    where,
    include: {
      cliente: true,
      unidad: {
        include: {
          proyecto: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
              ubicacion: true,
            },
          },
        },
      },
      vendedor: {
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true,
        },
      },
      _count: {
        select: {
          cuotas: true,
          documentosFiscales: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return contratos;
};

/**
 * Obtiene el detalle completo de un contrato de venta incluyendo su tabla de amortización y documentos fiscales.
 */
const getContratoById = async (id) => {
  if (!id) {
    throw AppError.badRequest(
      'El identificador del contrato de venta es obligatorio.',
      'CONTRATO_ID_REQUIRED'
    );
  }

  const contrato = await prisma.contratoVenta.findUnique({
    where: { id },
    include: {
      cliente: true,
      unidad: {
        include: {
          proyecto: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
              ubicacion: true,
              faseActual: true,
            },
          },
        },
      },
      vendedor: {
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true,
        },
      },
      cuotas: {
        orderBy: { numeroCuota: 'asc' },
      },
      documentosFiscales: {
        orderBy: { fechaEmision: 'desc' },
      },
    },
  });

  if (!contrato) {
    throw AppError.notFound(
      `No se encontró el contrato de venta con ID '${id}'.`,
      'CONTRATO_NOT_FOUND'
    );
  }

  const cuotasPagadas = contrato.cuotas.filter((c) => c.estado === 'PAGADA');
  const cuotasPendientes = contrato.cuotas.filter((c) => c.estado !== 'PAGADA');
  const capitalAmortizadoCuotas = round2(
    cuotasPagadas.reduce((acc, c) => acc + Number(c.montoCapital), 0)
  );
  const interesesPagados = round2(
    cuotasPagadas.reduce((acc, c) => acc + Number(c.montoInteres), 0)
  );

  const desgloseFiscalReferencia = calcularDesgloseFiscalSV({
    montoTotal: Number(contrato.precioVentaAcordado),
    tipoDocumento:
      contrato.cliente.nrc && contrato.cliente.giro
        ? 'CREDITO_FISCAL_CCF'
        : 'FACTURA_CONSUMIDOR_FINAL',
    precioInmueble: Number(contrato.precioVentaAcordado),
  });

  return {
    ...contrato,
    resumenFinanciero: {
      precioVentaAcordado: Number(contrato.precioVentaAcordado),
      montoPrima: Number(contrato.montoPrima),
      montoFinanciado: Number(contrato.montoFinanciado),
      saldoPendiente: Number(contrato.saldoPendiente),
      totalCuotas: contrato.cuotas.length,
      cuotasPagadasCount: cuotasPagadas.length,
      cuotasPendientesCount: cuotasPendientes.length,
      capitalAmortizadoCuotas,
      interesesPagados,
      impuestoTransferenciaBienesRaicesEstimado:
        desgloseFiscalReferencia.impuestoTransferenciaBienesRaices,
    },
  };
};

/**
 * REGLA DE ORO 1 DEL MÓDULO 5:
 * Crea un Contrato de Venta dentro de una transacción ACID (`prisma.$transaction`),
 * cambia la Unidad Inmobiliaria a `VENDIDA`, genera automáticamente las `N` cuotas de la
 * Tabla de Amortización en `CuotaPago` y emite el primer `DocumentoFiscalVenta` por la prima si aplica.
 */
const crearContratoVenta = async (payload = {}, vendedorIdFromToken = null) => {
  const {
    codigo,
    clienteId,
    unidadId,
    vendedorId: vendedorIdPayload,
    precioVentaAcordado,
    montoPrima = 0,
    plazoMeses = 12,
    tasaInteresAnual = 0,
    fechaPrimerPago = null,
    tipoDocumentoPrima = null,
    emitirDocumentoPrima = true,
    numeroDocumentoPrima = null,
  } = payload;

  const vendedorId = vendedorIdFromToken || vendedorIdPayload;

  if (!clienteId || !unidadId || precioVentaAcordado === undefined) {
    throw AppError.badRequest(
      'Los campos clienteId, unidadId y precioVentaAcordado son obligatorios para formalizar un contrato de venta.',
      'CONTRATO_REQUIRED_FIELDS_MISSING'
    );
  }

  if (!vendedorId) {
    throw AppError.badRequest(
      'Se requiere identificar al vendedor responsable del contrato (vendedorId).',
      'CONTRATO_VENDEDOR_REQUIRED'
    );
  }

  const precioNum = Number(precioVentaAcordado);
  if (!Number.isFinite(precioNum) || precioNum <= 0) {
    throw AppError.badRequest(
      'El precioVentaAcordado debe ser un monto mayor a 0.',
      'CONTRATO_INVALID_PRECIO_VENTA',
      { precioVentaAcordado }
    );
  }

  const primaNum = Number(montoPrima ?? 0);
  if (!Number.isFinite(primaNum) || primaNum < 0 || primaNum > precioNum) {
    throw AppError.badRequest(
      'El montoPrima debe ser mayor o igual a 0 y no puede superar el precioVentaAcordado.',
      'CONTRATO_INVALID_MONTO_PRIMA',
      { montoPrima, precioVentaAcordado: precioNum }
    );
  }

  const precioAcordado = round2(precioNum);
  const prima = round2(primaNum);
  const montoFinanciado = round2(precioAcordado - prima);
  const saldoPendiente = montoFinanciado;

  const plazoNum = Number(plazoMeses ?? (montoFinanciado > 0 ? 12 : 1));
  if (!Number.isInteger(plazoNum) || plazoNum < 1) {
    throw AppError.badRequest(
      'El plazoMeses debe ser un número entero mayor o igual a 1.',
      'CONTRATO_INVALID_PLAZO_MESES',
      { plazoMeses }
    );
  }

  const tasaNum = Number(tasaInteresAnual ?? 0);
  if (!Number.isFinite(tasaNum) || tasaNum < 0 || tasaNum > 100) {
    throw AppError.badRequest(
      'La tasaInteresAnual debe ser un valor entre 0 y 100.',
      'CONTRATO_INVALID_TASA_INTERES',
      { tasaInteresAnual }
    );
  }

  const contratoCreadoId = await prisma.$transaction(async (tx) => {
    const [cliente, unidad, vendedor] = await Promise.all([
      tx.cliente.findUnique({ where: { id: String(clienteId).trim() } }),
      tx.unidadInmobiliaria.findUnique({
        where: { id: String(unidadId).trim() },
        include: { contrato: true },
      }),
      tx.usuario.findUnique({ where: { id: String(vendedorId).trim() } }),
    ]);

    if (!cliente) {
      throw AppError.notFound(
        `No se encontró el cliente con ID '${clienteId}'.`,
        'CLIENTE_NOT_FOUND'
      );
    }

    if (!unidad) {
      throw AppError.notFound(
        `No se encontró la unidad inmobiliaria con ID '${unidadId}'.`,
        'UNIDAD_NOT_FOUND'
      );
    }

    if (!vendedor) {
      throw AppError.notFound(
        `No se encontró el usuario vendedor con ID '${vendedorId}'.`,
        'VENDEDOR_NOT_FOUND'
      );
    }

    if (
      unidad.estado === 'VENDIDA' ||
      unidad.estado === 'ESCRITURADA' ||
      unidad.contrato
    ) {
      throw AppError.unprocessable(
        `La unidad inmobiliaria '${unidad.codigo}' no está disponible para la venta (estado actual: '${unidad.estado}').`,
        'UNIT_NOT_AVAILABLE',
        {
          unidadId: unidad.id,
          codigo: unidad.codigo,
          estadoActual: unidad.estado,
          contratoExistenteId: unidad.contrato?.id || null,
        }
      );
    }

    const codigoContrato = codigo
      ? String(codigo).toUpperCase().trim()
      : `CV-${unidad.codigo}-${Date.now().toString().slice(-6)}`;

    const existenteCodigo = await tx.contratoVenta.findUnique({
      where: { codigo: codigoContrato },
    });

    if (existenteCodigo) {
      throw AppError.conflict(
        `Ya existe un contrato de venta registrado con el código '${codigoContrato}'.`,
        'CONTRATO_CODIGO_DUPLICATE',
        { codigo: codigoContrato }
      );
    }

    // Validación anticipada de regla fiscal si se emitirá documento por la prima
    let tipoDocPrimaResuelto = null;
    if (prima > 0 && emitirDocumentoPrima !== false) {
      tipoDocPrimaResuelto = tipoDocumentoPrima
        ? String(tipoDocumentoPrima).toUpperCase().trim()
        : 'FACTURA_CONSUMIDOR_FINAL';

      if (!TIPOS_DOCUMENTO_FISCAL_VALIDOS.includes(tipoDocPrimaResuelto)) {
        throw AppError.badRequest(
          `El tipoDocumentoPrima '${tipoDocumentoPrima}' no es válido.`,
          'FISCAL_INVALID_TIPO_DOCUMENTO',
          { tiposPermitidos: TIPOS_DOCUMENTO_FISCAL_VALIDOS }
        );
      }

      validarCumplimientoFiscalCCF(cliente, tipoDocPrimaResuelto);
    }

    // 1. Crear el ContratoVenta
    const nuevoContrato = await tx.contratoVenta.create({
      data: {
        codigo: codigoContrato,
        clienteId: cliente.id,
        unidadId: unidad.id,
        vendedorId: vendedor.id,
        precioVentaAcordado: toDecimalFixed(precioAcordado),
        montoPrima: toDecimalFixed(prima),
        montoFinanciado: toDecimalFixed(montoFinanciado),
        plazoMeses: plazoNum,
        tasaInteresAnual: toDecimalFixed(tasaNum),
        saldoPendiente: toDecimalFixed(saldoPendiente),
        estado: saldoPendiente === 0 ? 'FINALIZADO' : 'ACTIVO',
      },
    });

    // 2. Actualizar la UnidadInmobiliaria a estado VENDIDA
    await tx.unidadInmobiliaria.update({
      where: { id: unidad.id },
      data: { estado: 'VENDIDA' },
    });

    // 3. Generar y persistir la Tabla de Amortización si existe saldo financiado > 0
    if (montoFinanciado > 0) {
      const tabla = generarTablaAmortizacionFrancesa({
        montoFinanciado,
        plazoMeses: plazoNum,
        tasaInteresAnual: tasaNum,
        fechaPrimerPago,
      });

      const cuotasData = tabla.cuotas.map((cuota) => ({
        contratoId: nuevoContrato.id,
        numeroCuota: cuota.numeroCuota,
        fechaVencimiento: cuota.fechaVencimiento,
        montoCapital: toDecimalFixed(cuota.montoCapital),
        montoInteres: toDecimalFixed(cuota.montoInteres),
        montoTotalCuota: toDecimalFixed(cuota.montoTotalCuota),
        estado: 'PENDIENTE',
      }));

      await tx.cuotaPago.createMany({
        data: cuotasData,
      });
    }

    // 4. Emitir documento fiscal por la prima si montoPrima > 0
    if (prima > 0 && emitirDocumentoPrima !== false && tipoDocPrimaResuelto) {
      const desglosePrima = calcularDesgloseFiscalSV({
        montoTotal: prima,
        tipoDocumento: tipoDocPrimaResuelto,
        precioInmueble: precioAcordado,
      });

      const numDoc = numeroDocumentoPrima
        ? String(numeroDocumentoPrima).toUpperCase().trim()
        : generarNumeroDocumentoFiscal(tipoDocPrimaResuelto, 1);

      await tx.documentoFiscalVenta.create({
        data: {
          numeroDocumento: numDoc,
          contratoId: nuevoContrato.id,
          cuotaId: null,
          tipoDocumento: tipoDocPrimaResuelto,
          montoGravado: toDecimalFixed(desglosePrima.montoGravado),
          montoIva: toDecimalFixed(desglosePrima.montoIva),
          montoTotal: toDecimalFixed(desglosePrima.montoTotal),
          concepto: `Pago de Prima Inicial — Contrato ${codigoContrato} (Unidad ${unidad.codigo})`,
        },
      });
    }

    return nuevoContrato.id;
  });

  return getContratoById(contratoCreadoId);
};

// ============================================================================
// 5. PAGO DE CUOTAS Y EMISIÓN DE DOCUMENTOS FISCALES MH SV (REGLA DE ORO 2)
// ============================================================================

/**
 * REGLA DE ORO 2 DEL MÓDULO 5:
 * Registra el pago de una cuota de amortización dentro de `prisma.$transaction`:
 * 1. Verifica que la cuota pertenezca al contrato y no esté ya `PAGADA`.
 * 2. Aplica el bloqueo fiscal salvadoreño si solicita `CREDITO_FISCAL_CCF` y el cliente no posee `nrc` y `giro`.
 * 3. Marca la cuota como `PAGADA`, descuenta `montoCapital` del `saldoPendiente` del contrato
 *    (y marca el contrato como `FINALIZADO` si el saldo llega a 0.00).
 * 4. Emite automáticamente el `DocumentoFiscalVenta` con desglose exacto de IVA 13%.
 */
const registrarPagoCuota = async (contratoId, cuotaId, payload = {}) => {
  if (!contratoId || !cuotaId) {
    throw AppError.badRequest(
      'Los parámetros contratoId y cuotaId son obligatorios para registrar el pago de una cuota.',
      'CUOTA_PAGO_IDS_REQUIRED'
    );
  }

  const {
    tipoDocumento = 'FACTURA_CONSUMIDOR_FINAL',
    numeroDocumento = null,
    concepto = null,
    fechaPago = null,
  } = payload;

  const tipoDocNorm = String(tipoDocumento || 'FACTURA_CONSUMIDOR_FINAL')
    .toUpperCase()
    .trim();

  if (!TIPOS_DOCUMENTO_FISCAL_VALIDOS.includes(tipoDocNorm)) {
    throw AppError.badRequest(
      `El tipoDocumento '${tipoDocumento}' no es válido. Valores permitidos: ${TIPOS_DOCUMENTO_FISCAL_VALIDOS.join(', ')}.`,
      'FISCAL_INVALID_TIPO_DOCUMENTO',
      { tiposPermitidos: TIPOS_DOCUMENTO_FISCAL_VALIDOS }
    );
  }

  return prisma.$transaction(async (tx) => {
    const [contrato, cuota] = await Promise.all([
      tx.contratoVenta.findUnique({
        where: { id: String(contratoId).trim() },
        include: {
          cliente: true,
          unidad: true,
        },
      }),
      tx.cuotaPago.findUnique({
        where: { id: String(cuotaId).trim() },
      }),
    ]);

    if (!contrato) {
      throw AppError.notFound(
        `No se encontró el contrato de venta con ID '${contratoId}'.`,
        'CONTRATO_NOT_FOUND'
      );
    }

    if (!cuota || cuota.contratoId !== contrato.id) {
      throw AppError.notFound(
        `No se encontró la cuota con ID '${cuotaId}' asociada al contrato '${contrato.codigo}'.`,
        'INSTALLMENT_NOT_FOUND',
        { contratoId: contrato.id, cuotaId }
      );
    }

    if (contrato.estado === 'CANCELADO') {
      throw AppError.unprocessable(
        `No se pueden registrar pagos sobre el contrato '${contrato.codigo}' porque se encuentra en estado 'CANCELADO'.`,
        'CONTRACT_CANCELLED'
      );
    }

    if (cuota.estado === 'PAGADA') {
      throw AppError.unprocessable(
        `La cuota #${cuota.numeroCuota} del contrato '${contrato.codigo}' ya fue pagada previamente en fecha ${cuota.fechaPago?.toISOString() || 'N/A'}.`,
        'INSTALLMENT_ALREADY_PAID',
        {
          cuotaId: cuota.id,
          numeroCuota: cuota.numeroCuota,
          fechaPago: cuota.fechaPago,
        }
      );
    }

    // Validación estricta de cumplimiento fiscal salvadoreño (Art. 114 Código Tributario SV)
    validarCumplimientoFiscalCCF(contrato.cliente, tipoDocNorm);

    const fechaPagoEfectiva = fechaPago ? new Date(fechaPago) : new Date();
    if (Number.isNaN(fechaPagoEfectiva.getTime())) {
      throw AppError.badRequest(
        'La fechaPago proporcionada no es válida.',
        'CUOTA_INVALID_FECHA_PAGO'
      );
    }

    // 1. Marcar cuota como PAGADA
    const cuotaActualizada = await tx.cuotaPago.update({
      where: { id: cuota.id },
      data: {
        estado: 'PAGADA',
        fechaPago: fechaPagoEfectiva,
      },
    });

    // 2. Descontar montoCapital del saldoPendiente del contrato
    const saldoAnterior = Number(contrato.saldoPendiente);
    const capitalCuota = Number(cuota.montoCapital);
    const nuevoSaldoPendiente = round2(Math.max(0, saldoAnterior - capitalCuota));

    const cuotasPendientesRestantes = await tx.cuotaPago.count({
      where: {
        contratoId: contrato.id,
        estado: { not: 'PAGADA' },
      },
    });

    const nuevoEstadoContrato =
      nuevoSaldoPendiente === 0 && cuotasPendientesRestantes === 0
        ? 'FINALIZADO'
        : contrato.estado;

    const contratoActualizado = await tx.contratoVenta.update({
      where: { id: contrato.id },
      data: {
        saldoPendiente: toDecimalFixed(nuevoSaldoPendiente),
        estado: nuevoEstadoContrato,
      },
      include: {
        cliente: true,
        unidad: true,
      },
    });

    // 3. Calcular desglose fiscal (IVA 13%) y emitir DocumentoFiscalVenta
    const montoTotalCuota = Number(cuota.montoTotalCuota);
    const desgloseFiscal = calcularDesgloseFiscalSV({
      montoTotal: montoTotalCuota,
      tipoDocumento: tipoDocNorm,
      precioInmueble: Number(contrato.precioVentaAcordado),
    });

    const numDoc = numeroDocumento
      ? String(numeroDocumento).toUpperCase().trim()
      : generarNumeroDocumentoFiscal(tipoDocNorm, cuota.numeroCuota);

    const existeNumDoc = await tx.documentoFiscalVenta.findUnique({
      where: { numeroDocumento: numDoc },
    });
    if (existeNumDoc) {
      throw AppError.conflict(
        `Ya existe un documento fiscal registrado con el número '${numDoc}'.`,
        'DOCUMENTO_FISCAL_DUPLICATE',
        { numeroDocumento: numDoc }
      );
    }

    const conceptoDoc =
      concepto && String(concepto).trim()
        ? String(concepto).trim()
        : `Pago de Cuota #${cuota.numeroCuota}/${contrato.plazoMeses} (Capital: $${toDecimalFixed(cuota.montoCapital)}, Interés: $${toDecimalFixed(cuota.montoInteres)}) — Contrato ${contrato.codigo}`;

    const documentoFiscal = await tx.documentoFiscalVenta.create({
      data: {
        numeroDocumento: numDoc,
        contratoId: contrato.id,
        cuotaId: cuota.id,
        tipoDocumento: tipoDocNorm,
        montoGravado: toDecimalFixed(desgloseFiscal.montoGravado),
        montoIva: toDecimalFixed(desgloseFiscal.montoIva),
        montoTotal: toDecimalFixed(desgloseFiscal.montoTotal),
        concepto: conceptoDoc,
      },
    });

    return {
      cuota: cuotaActualizada,
      contrato: {
        id: contratoActualizado.id,
        codigo: contratoActualizado.codigo,
        estado: contratoActualizado.estado,
        saldoAnterior: round2(saldoAnterior),
        capitalAmortizado: round2(capitalCuota),
        saldoPendiente: nuevoSaldoPendiente,
        cuotasPendientesRestantes,
        cliente: contratoActualizado.cliente,
        unidad: contratoActualizado.unidad,
      },
      documentoFiscal,
      desgloseFiscalSV: desgloseFiscal,
    };
  });
};

/**
 * Emite un Documento Fiscal de Venta (`RECIBO_ABONO`, `FACTURA_CONSUMIDOR_FINAL` o `CREDITO_FISCAL_CCF`)
 * asociado a un contrato (y opcionalmente a una cuota), aplicando la validación estricta de NRC y Giro para CCF.
 */
const emitirDocumentoFiscal = async (payload = {}) => {
  const {
    contratoId,
    cuotaId = null,
    numeroDocumento = null,
    tipoDocumento,
    montoTotal,
    montoGravado,
    concepto,
  } = payload;

  if (!contratoId || !tipoDocumento || !concepto) {
    throw AppError.badRequest(
      'Los campos contratoId, tipoDocumento y concepto son obligatorios para emitir un documento fiscal.',
      'DOCUMENTO_FISCAL_REQUIRED_FIELDS_MISSING'
    );
  }

  const tipoDocNorm = String(tipoDocumento).toUpperCase().trim();
  if (!TIPOS_DOCUMENTO_FISCAL_VALIDOS.includes(tipoDocNorm)) {
    throw AppError.badRequest(
      `El tipoDocumento '${tipoDocumento}' no es válido. Valores permitidos: ${TIPOS_DOCUMENTO_FISCAL_VALIDOS.join(', ')}.`,
      'FISCAL_INVALID_TIPO_DOCUMENTO',
      { tiposPermitidos: TIPOS_DOCUMENTO_FISCAL_VALIDOS }
    );
  }

  return prisma.$transaction(async (tx) => {
    const contrato = await tx.contratoVenta.findUnique({
      where: { id: String(contratoId).trim() },
      include: {
        cliente: true,
        unidad: true,
      },
    });

    if (!contrato) {
      throw AppError.notFound(
        `No se encontró el contrato de venta con ID '${contratoId}'.`,
        'CONTRATO_NOT_FOUND'
      );
    }

    // REGLA DE ORO 2: Bloqueo Fiscal Estricto para CREDITO_FISCAL_CCF sin NRC o Giro
    validarCumplimientoFiscalCCF(contrato.cliente, tipoDocNorm);

    let cuotaVinculada = null;
    if (cuotaId) {
      cuotaVinculada = await tx.cuotaPago.findUnique({
        where: { id: String(cuotaId).trim() },
      });
      if (!cuotaVinculada || cuotaVinculada.contratoId !== contrato.id) {
        throw AppError.notFound(
          `No se encontró la cuota '${cuotaId}' dentro del contrato '${contrato.codigo}'.`,
          'INSTALLMENT_NOT_FOUND'
        );
      }
    }

    const desglose = calcularDesgloseFiscalSV({
      montoTotal,
      montoGravado,
      tipoDocumento: tipoDocNorm,
      precioInmueble: Number(contrato.precioVentaAcordado),
    });

    const numDoc = numeroDocumento
      ? String(numeroDocumento).toUpperCase().trim()
      : generarNumeroDocumentoFiscal(tipoDocNorm);

    const existente = await tx.documentoFiscalVenta.findUnique({
      where: { numeroDocumento: numDoc },
    });

    if (existente) {
      throw AppError.conflict(
        `Ya existe un documento fiscal registrado con el número '${numDoc}'.`,
        'DOCUMENTO_FISCAL_DUPLICATE',
        { numeroDocumento: numDoc }
      );
    }

    const nuevoDocumento = await tx.documentoFiscalVenta.create({
      data: {
        numeroDocumento: numDoc,
        contratoId: contrato.id,
        cuotaId: cuotaVinculada ? cuotaVinculada.id : null,
        tipoDocumento: tipoDocNorm,
        montoGravado: toDecimalFixed(desglose.montoGravado),
        montoIva: toDecimalFixed(desglose.montoIva),
        montoTotal: toDecimalFixed(desglose.montoTotal),
        concepto: String(concepto).trim(),
      },
      include: {
        contrato: {
          include: {
            cliente: true,
            unidad: true,
          },
        },
        cuota: true,
      },
    });

    return {
      ...nuevoDocumento,
      desgloseFiscalSV: desglose,
    };
  });
};

/**
 * Lista los documentos fiscales emitidos filtrables por `contratoId`, `tipoDocumento` o `clienteId`.
 */
const listDocumentosFiscales = async (filters = {}) => {
  const { contratoId, tipoDocumento, clienteId } = filters;
  const where = {};

  if (contratoId) {
    where.contratoId = String(contratoId).trim();
  }

  if (tipoDocumento) {
    const tipoNorm = String(tipoDocumento).toUpperCase().trim();
    if (!TIPOS_DOCUMENTO_FISCAL_VALIDOS.includes(tipoNorm)) {
      throw AppError.badRequest(
        `El tipoDocumento '${tipoDocumento}' no es válido. Valores permitidos: ${TIPOS_DOCUMENTO_FISCAL_VALIDOS.join(', ')}.`,
        'FISCAL_INVALID_TIPO_DOCUMENTO',
        { tiposPermitidos: TIPOS_DOCUMENTO_FISCAL_VALIDOS }
      );
    }
    where.tipoDocumento = tipoNorm;
  }

  if (clienteId) {
    where.contrato = {
      clienteId: String(clienteId).trim(),
    };
  }

  const documentos = await prisma.documentoFiscalVenta.findMany({
    where,
    include: {
      contrato: {
        select: {
          id: true,
          codigo: true,
          precioVentaAcordado: true,
          estado: true,
          cliente: {
            select: {
              id: true,
              tipo: true,
              nombreCompleto: true,
              dui: true,
              nit: true,
              nrc: true,
              giro: true,
            },
          },
          unidad: {
            select: {
              id: true,
              codigo: true,
              tipo: true,
            },
          },
        },
      },
      cuota: {
        select: {
          id: true,
          numeroCuota: true,
          montoCapital: true,
          montoInteres: true,
          montoTotalCuota: true,
          estado: true,
        },
      },
    },
    orderBy: { fechaEmision: 'desc' },
  });

  return documentos;
};

module.exports = {
  IVA_RATE,
  ITBR_EXENTO_LIMITE,
  ITBR_RATE,
  CODIGOS_DTE_MH_SV,
  generarTablaAmortizacionFrancesa,
  calcularDesgloseFiscalSV,
  validarCumplimientoFiscalCCF,
  simularFinanciamiento,
  listClientes,
  createCliente,
  listUnidades,
  createUnidad,
  cambiarEstadoUnidad,
  listContratos,
  getContratoById,
  crearContratoVenta,
  registrarPagoCuota,
  emitirDocumentoFiscal,
  listDocumentosFiscales,
};
