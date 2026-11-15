const prisma = require('../../config/prisma');
const AppError = require('../../utils/AppError');

// ============================================================================
// CONSTANTES LEGALES Y PARÁMETROS LABORALES DE EL SALVADOR
// ============================================================================

const ISSS_RATE = Number(process.env.SV_ISSS_EMPLOYEE_RATE || 0.03); // 3.00% cotización laboral ISSS
const ISSS_PATRONAL_RATE = Number(process.env.SV_ISSS_EMPLOYER_RATE || 0.075); // 7.50% aporte patronal ISSS
const ISSS_TECHO_MENSUAL = Number(process.env.SV_ISSS_MAX_CEILING_MONTHLY || 1000.00); // Tope mensual $1,000.00 ($30.00 laboral / $75.00 patronal máx)
const AFP_RATE = Number(process.env.SV_AFP_EMPLOYEE_RATE || 0.0725); // 7.25% cotización laboral AFP (Confía / Crecer)
const AFP_PATRONAL_RATE = Number(process.env.SV_AFP_EMPLOYER_RATE || 0.0875); // 8.75% aporte patronal AFP (Ley Integral del Sistema de Pensiones)
const RETENCION_EVENTUAL_RATE = 0.10; // 10% retención ISR por servicios sin dependencia laboral (Art. 156 Código Tributario SV)

const TIPOS_PLANILLA_VALIDOS = ['ADMINISTRATIVA_QUINCENAL', 'CAMPO_SEMANAL'];
const MODALIDADES_PAGO_VALIDAS = ['SALARIO_MENSUAL', 'DIA_TRABAJADO', 'DESTAJO'];
const ESTADOS_PLANILLA_VALIDOS = ['BORRADOR', 'APROBADA', 'PAGADA'];

// Formato salvadoreño de DUI: 00000000-0 o 9 dígitos continuos
const DUI_SV_REGEX = /^\d{8}-?\d$/;

/**
 * Tablas Oficiales de Retención de Impuesto Sobre la Renta (ISR) — VIGENTES
 * Decreto Ejecutivo No. 10 (Ministerio de Hacienda de El Salvador, reforma Art. 37 LISR - Base Exenta $550.00 mensual).
 * Aplicadas sobre Renta Gravada = Ingreso Bruto - ISSS Laboral - AFP Laboral (Art. 155 Código Tributario, Código F-910: 01).
 */
const TABLAS_ISR_MH_SV = {
  ADMINISTRATIVA_QUINCENAL: [
    { tramo: 'TRAMO_I', desde: 0.00, hasta: 275.00, porcentaje: 0.00, sobreExcesoDe: 0.00, cuotaFija: 0.00 },
    { tramo: 'TRAMO_II', desde: 275.01, hasta: 447.62, porcentaje: 0.10, sobreExcesoDe: 275.00, cuotaFija: 8.83 },
    { tramo: 'TRAMO_III', desde: 447.63, hasta: 1019.05, porcentaje: 0.20, sobreExcesoDe: 447.62, cuotaFija: 30.00 },
    { tramo: 'TRAMO_IV', desde: 1019.06, hasta: Infinity, porcentaje: 0.30, sobreExcesoDe: 1019.05, cuotaFija: 144.28 },
  ],
  CAMPO_SEMANAL: [
    { tramo: 'TRAMO_I', desde: 0.00, hasta: 137.50, porcentaje: 0.00, sobreExcesoDe: 0.00, cuotaFija: 0.00 },
    { tramo: 'TRAMO_II', desde: 137.51, hasta: 223.81, porcentaje: 0.10, sobreExcesoDe: 137.50, cuotaFija: 4.42 },
    { tramo: 'TRAMO_III', desde: 223.82, hasta: 509.52, porcentaje: 0.20, sobreExcesoDe: 223.81, cuotaFija: 15.00 },
    { tramo: 'TRAMO_IV', desde: 509.53, hasta: Infinity, porcentaje: 0.30, sobreExcesoDe: 509.52, cuotaFija: 72.14 },
  ],
  MENSUAL: [
    { tramo: 'TRAMO_I', desde: 0.00, hasta: 550.00, porcentaje: 0.00, sobreExcesoDe: 0.00, cuotaFija: 0.00 },
    { tramo: 'TRAMO_II', desde: 550.01, hasta: 895.24, porcentaje: 0.10, sobreExcesoDe: 550.00, cuotaFija: 17.67 },
    { tramo: 'TRAMO_III', desde: 895.25, hasta: 2038.10, porcentaje: 0.20, sobreExcesoDe: 895.24, cuotaFija: 60.00 },
    { tramo: 'TRAMO_IV', desde: 2038.11, hasta: Infinity, porcentaje: 0.30, sobreExcesoDe: 2038.10, cuotaFija: 288.57 },
  ],
};

/**
 * Tablas Históricas de Retención ISR (Decreto Ejecutivo No. 95 de 2015, Base Exenta $472.00 mensual).
 * Conservadas exclusivamente para auditorías retroactivas o comparativas históricas.
 */
const TABLAS_ISR_MH_SV_DECRETO_95 = {
  ADMINISTRATIVA_QUINCENAL: [
    { tramo: 'TRAMO_I', desde: 0.00, hasta: 236.00, porcentaje: 0.00, sobreExcesoDe: 0.00, cuotaFija: 0.00 },
    { tramo: 'TRAMO_II', desde: 236.01, hasta: 447.62, porcentaje: 0.10, sobreExcesoDe: 236.00, cuotaFija: 8.83 },
    { tramo: 'TRAMO_III', desde: 447.63, hasta: 1019.05, porcentaje: 0.20, sobreExcesoDe: 447.62, cuotaFija: 30.00 },
    { tramo: 'TRAMO_IV', desde: 1019.06, hasta: Infinity, porcentaje: 0.30, sobreExcesoDe: 1019.05, cuotaFija: 144.28 },
  ],
  CAMPO_SEMANAL: [
    { tramo: 'TRAMO_I', desde: 0.00, hasta: 118.00, porcentaje: 0.00, sobreExcesoDe: 0.00, cuotaFija: 0.00 },
    { tramo: 'TRAMO_II', desde: 118.01, hasta: 223.81, porcentaje: 0.10, sobreExcesoDe: 118.00, cuotaFija: 4.42 },
    { tramo: 'TRAMO_III', desde: 223.82, hasta: 509.52, porcentaje: 0.20, sobreExcesoDe: 223.81, cuotaFija: 15.00 },
    { tramo: 'TRAMO_IV', desde: 509.53, hasta: Infinity, porcentaje: 0.30, sobreExcesoDe: 509.52, cuotaFija: 72.14 },
  ],
  MENSUAL: [
    { tramo: 'TRAMO_I', desde: 0.00, hasta: 472.00, porcentaje: 0.00, sobreExcesoDe: 0.00, cuotaFija: 0.00 },
    { tramo: 'TRAMO_II', desde: 472.01, hasta: 895.24, porcentaje: 0.10, sobreExcesoDe: 472.00, cuotaFija: 17.67 },
    { tramo: 'TRAMO_III', desde: 895.25, hasta: 2038.10, porcentaje: 0.20, sobreExcesoDe: 895.24, cuotaFija: 60.00 },
    { tramo: 'TRAMO_IV', desde: 2038.11, hasta: Infinity, porcentaje: 0.30, sobreExcesoDe: 2038.10, cuotaFija: 288.57 },
  ],
};

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
      'El Documento Único de Identidad (DUI) es obligatorio.',
      'EMPLEADO_DUI_REQUIRED'
    );
  }
  const limpio = duiRaw.trim();
  if (!DUI_SV_REGEX.test(limpio)) {
    throw AppError.badRequest(
      `El DUI '${limpio}' no cumple con el formato oficial de El Salvador (00000000-0 o 9 dígitos).`,
      'EMPLEADO_INVALID_DUI_FORMAT',
      { duiRecibido: limpio, formatoEsperado: '00000000-0' }
    );
  }
  const soloDigitos = limpio.replace('-', '');
  return `${soloDigitos.slice(0, 8)}-${soloDigitos.slice(8)}`;
};

// ============================================================================
// 1. MOTOR DE CÁLCULO LEGAL SALVADOREÑO (FUNCIÓN PURA EXPORTADA)
// ============================================================================

/**
 * Calcula las deducciones de ley salvadoreña (ISSS, AFP, ISR) y el líquido a pagar.
 * Soporta tanto firma por objeto `{ ingresoBruto, tipoPlanilla, otrasDeducciones, exentoCotizacionesCampo, aplicarRetencionEventual10 }`
 * como firma posicional `(ingresoBruto, tipoPlanilla, options)`.
 *
 * @param {object|number} inputOrBruto - Objeto de parámetros o monto de ingreso bruto.
 * @param {string} [tipoPlanillaArg] - 'ADMINISTRATIVA_QUINCENAL' | 'CAMPO_SEMANAL' | 'MENSUAL'
 * @param {object} [optionsArg] - Opciones adicionales cuando se invoca posicionalmente.
 * @returns {{
 *   ingresoBruto: number,
 *   tipoPlanilla: string,
 *   techoIsssPeriodo: number,
 *   baseCotizableIsss: number,
 *   descuentoIsss: number,
 *   descuentoAfp: number,
 *   rentaGravada: number,
 *   tramoIsr: string,
 *   descuentoRenta: number,
 *   otrasDeducciones: number,
 *   totalDescuentos: number,
 *   liquidoPagar: number
 * }}
 */
const calcularDeduccionesLeySV = (
  inputOrBruto,
  tipoPlanillaArg = 'ADMINISTRATIVA_QUINCENAL',
  optionsArg = {}
) => {
  const params =
    typeof inputOrBruto === 'object' && inputOrBruto !== null
      ? inputOrBruto
      : {
        ingresoBruto: inputOrBruto,
        tipoPlanilla: tipoPlanillaArg,
        ...optionsArg,
      };

  const ingresoBrutoNum = Number(params.ingresoBruto);
  if (!Number.isFinite(ingresoBrutoNum) || ingresoBrutoNum < 0) {
    throw AppError.badRequest(
      'El ingresoBruto para el cálculo de deducciones debe ser un número mayor o igual a cero.',
      'CALCULO_INVALID_INGRESO_BRUTO',
      { ingresoBruto: params.ingresoBruto }
    );
  }

  const tipoPlanilla = String(params.tipoPlanilla || 'ADMINISTRATIVA_QUINCENAL')
    .toUpperCase()
    .trim();

  if (!TABLAS_ISR_MH_SV[tipoPlanilla]) {
    throw AppError.badRequest(
      `El tipo de planilla '${tipoPlanilla}' no es válido para el motor de cálculo legal SV.`,
      'CALCULO_INVALID_TIPO_PLANILLA',
      { tiposPermitidos: Object.keys(TABLAS_ISR_MH_SV) }
    );
  }

  const otrasDeduccionesNum = Number(params.otrasDeducciones ?? 0);
  if (!Number.isFinite(otrasDeduccionesNum) || otrasDeduccionesNum < 0) {
    throw AppError.badRequest(
      'El monto de otrasDeducciones debe ser un número mayor o igual a cero.',
      'CALCULO_INVALID_OTRAS_DEDUCCIONES'
    );
  }

  const aplicarRetencionEventual10 = Boolean(params.aplicarRetencionEventual10);
  // Conforme al Art. 156 del Código Tributario SV, los servicios sin dependencia laboral (10% ISR, Código 11 F-910)
  // no están sujetos a retención laboral de ISSS/AFP salvo que se indique explícitamente lo contrario.
  const exentoCotizacionesCampo =
    params.exentoCotizacionesCampo !== undefined
      ? Boolean(params.exentoCotizacionesCampo)
      : aplicarRetencionEventual10;

  const usarDecretoHistorico95 =
    String(params.decretoIsr || '').toUpperCase().trim() === 'DECRETO_95';
  const tablasIsrActivas = usarDecretoHistorico95
    ? TABLAS_ISR_MH_SV_DECRETO_95
    : TABLAS_ISR_MH_SV;

  const ingresoBruto = round2(ingresoBrutoNum);
  const otrasDeducciones = round2(otrasDeduccionesNum);

  // Determinación del techo de cotización ISSS según periodicidad de la planilla
  let divisorPeriodoIsss = 2; // Quincenal por defecto ($500.00 -> máx $15.00 laboral / $37.50 patronal)
  if (tipoPlanilla === 'CAMPO_SEMANAL') {
    divisorPeriodoIsss = 4; // Semanal ($250.00 -> máx $7.50 laboral / $18.75 patronal)
  } else if (tipoPlanilla === 'MENSUAL') {
    divisorPeriodoIsss = 1; // Mensual ($1,000.00 -> máx $30.00 laboral / $75.00 patronal)
  }

  const techoIsssPeriodo = round2(ISSS_TECHO_MENSUAL / divisorPeriodoIsss);

  // 1. Cálculo de ISSS (3% laboral / 7.5% patronal hasta el tope del periodo) y AFP (7.25% laboral / 8.75% patronal)
  const baseCotizableIsss = exentoCotizacionesCampo
    ? 0
    : round2(Math.min(ingresoBruto, techoIsssPeriodo));

  const descuentoIsss = exentoCotizacionesCampo
    ? 0
    : round2(baseCotizableIsss * ISSS_RATE);

  const descuentoAfp = exentoCotizacionesCampo
    ? 0
    : round2(ingresoBruto * AFP_RATE);

  const isssPatronal = exentoCotizacionesCampo
    ? 0
    : round2(baseCotizableIsss * ISSS_PATRONAL_RATE);

  const afpPatronal = exentoCotizacionesCampo
    ? 0
    : round2(ingresoBruto * AFP_PATRONAL_RATE);

  const totalAportePatronal = round2(isssPatronal + afpPatronal);
  const costoTotalEmpleador = round2(ingresoBruto + totalAportePatronal);

  // 2. Renta Gravada Sujeta a Retención ISR (Ingreso Bruto - ISSS - AFP)
  const rentaGravada = round2(Math.max(0, ingresoBruto - descuentoIsss - descuentoAfp));

  // 3. Cálculo de Impuesto Sobre la Renta (ISR) según tabla oficial del Ministerio de Hacienda SV
  let tramoIsr = 'TRAMO_I';
  let descuentoRenta = 0;

  if (rentaGravada > 0) {
    if (aplicarRetencionEventual10) {
      tramoIsr = 'RETENCION_EVENTUAL_10';
      descuentoRenta = round2(rentaGravada * RETENCION_EVENTUAL_RATE);
    } else {
      const tabla = tablasIsrActivas[tipoPlanilla];
      const tramoEncontrado =
        tabla.find((t) => rentaGravada >= t.desde && rentaGravada <= t.hasta) ||
        tabla[tabla.length - 1];

      tramoIsr = tramoEncontrado.tramo;
      if (tramoEncontrado.porcentaje > 0) {
        const exceso = Math.max(0, rentaGravada - tramoEncontrado.sobreExcesoDe);
        descuentoRenta = round2(exceso * tramoEncontrado.porcentaje + tramoEncontrado.cuotaFija);
      } else {
        descuentoRenta = 0;
      }
    }
  }

  const totalDescuentos = round2(
    descuentoIsss + descuentoAfp + descuentoRenta + otrasDeducciones
  );
  const liquidoPagar = round2(ingresoBruto - totalDescuentos);

  if (liquidoPagar < 0) {
    throw AppError.unprocessable(
      `El total de deducciones ($${toDecimalFixed(totalDescuentos)}) supera el ingreso bruto ($${toDecimalFixed(ingresoBruto)}).`,
      'DEDUCCIONES_EXCEED_INGRESO_BRUTO',
      {
        ingresoBruto,
        descuentoIsss,
        descuentoAfp,
        descuentoRenta,
        otrasDeducciones,
        totalDescuentos,
      }
    );
  }

  return {
    ingresoBruto,
    tipoPlanilla,
    codigoIngresoF910: aplicarRetencionEventual10 ? '11' : '01',
    techoIsssPeriodo,
    baseCotizableIsss,
    descuentoIsss,
    descuentoAfp,
    rentaGravada,
    tramoIsr,
    descuentoRenta,
    otrasDeducciones,
    totalDescuentos,
    liquidoPagar,
    aportesPatronales: {
      isssPatronal,
      afpPatronal,
      totalAportePatronal,
      costoTotalEmpleador,
    },
  };
};

// ============================================================================
// 2. GESTIÓN DE EMPLEADOS (ADMINISTRATIVOS Y PERSONAL DE CAMPO)
// ============================================================================

/**
 * Lista empleados filtrables por `tipoPlanilla`, `modalidadPago`, `proyectoAsignadoId` o `activo`.
 */
const listEmpleados = async (filters = {}) => {
  const { tipoPlanilla, modalidadPago, proyectoAsignadoId, activo } = filters;
  const where = {};

  if (tipoPlanilla) {
    const tipoNorm = String(tipoPlanilla).toUpperCase().trim();
    if (!TIPOS_PLANILLA_VALIDOS.includes(tipoNorm)) {
      throw AppError.badRequest(
        `El tipoPlanilla '${tipoPlanilla}' no es válido. Valores permitidos: ${TIPOS_PLANILLA_VALIDOS.join(', ')}.`,
        'EMPLEADO_INVALID_TIPO_PLANILLA',
        { tiposPermitidos: TIPOS_PLANILLA_VALIDOS }
      );
    }
    where.tipoPlanilla = tipoNorm;
  }

  if (modalidadPago) {
    const modNorm = String(modalidadPago).toUpperCase().trim();
    if (!MODALIDADES_PAGO_VALIDAS.includes(modNorm)) {
      throw AppError.badRequest(
        `La modalidadPago '${modalidadPago}' no es válida. Valores permitidos: ${MODALIDADES_PAGO_VALIDAS.join(', ')}.`,
        'EMPLEADO_INVALID_MODALIDAD_PAGO',
        { modalidadesPermitidas: MODALIDADES_PAGO_VALIDAS }
      );
    }
    where.modalidadPago = modNorm;
  }

  if (proyectoAsignadoId) {
    where.proyectoAsignadoId = String(proyectoAsignadoId).trim();
  }

  if (activo !== undefined && activo !== null && activo !== '') {
    if (typeof activo === 'boolean') {
      where.activo = activo;
    } else {
      const activoStr = String(activo).toLowerCase().trim();
      if (activoStr === 'true' || activoStr === '1') {
        where.activo = true;
      } else if (activoStr === 'false' || activoStr === '0') {
        where.activo = false;
      } else {
        throw AppError.badRequest(
          "El filtro 'activo' debe ser un valor booleano ('true' o 'false').",
          'EMPLEADO_INVALID_ACTIVO_FILTER'
        );
      }
    }
  }

  const empleados = await prisma.empleado.findMany({
    where,
    include: {
      proyectoAsignado: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
          ubicacion: true,
          faseActual: true,
        },
      },
      _count: {
        select: {
          boletasPago: true,
        },
      },
    },
    orderBy: [{ tipoPlanilla: 'asc' }, { codigo: 'asc' }],
  });

  return empleados;
};

/**
 * Registra un nuevo empleado validando las reglas contractuales según su tipo de planilla y modalidad de pago.
 */
const createEmpleado = async (payload = {}) => {
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
    activo = true,
  } = payload;

  if (!codigo || !nombres || !apellidos || !dui || !cargo || !tipoPlanilla || !modalidadPago) {
    throw AppError.badRequest(
      'Los campos codigo, nombres, apellidos, dui, cargo, tipoPlanilla y modalidadPago son obligatorios.',
      'EMPLEADO_REQUIRED_FIELDS_MISSING'
    );
  }

  const codigoNorm = String(codigo).toUpperCase().trim();
  const nombresNorm = String(nombres).trim();
  const apellidosNorm = String(apellidos).trim();
  const cargoNorm = String(cargo).trim();
  const duiNorm = normalizarDuiSV(String(dui));

  const tipoNorm = String(tipoPlanilla).toUpperCase().trim();
  if (!TIPOS_PLANILLA_VALIDOS.includes(tipoNorm)) {
    throw AppError.badRequest(
      `El tipoPlanilla '${tipoPlanilla}' no es válido. Valores permitidos: ${TIPOS_PLANILLA_VALIDOS.join(', ')}.`,
      'EMPLEADO_INVALID_TIPO_PLANILLA',
      { tiposPermitidos: TIPOS_PLANILLA_VALIDOS }
    );
  }

  const modalidadNorm = String(modalidadPago).toUpperCase().trim();
  if (!MODALIDADES_PAGO_VALIDAS.includes(modalidadNorm)) {
    throw AppError.badRequest(
      `La modalidadPago '${modalidadPago}' no es válida. Valores permitidos: ${MODALIDADES_PAGO_VALIDAS.join(', ')}.`,
      'EMPLEADO_INVALID_MODALIDAD_PAGO',
      { modalidadesPermitidas: MODALIDADES_PAGO_VALIDAS }
    );
  }

  // Validaciones de coherencia entre tipoPlanilla y modalidadPago
  let salarioMensualFixed = null;
  let tarifaDiariaFixed = null;
  let tarifaDestajoFixed = null;

  if (tipoNorm === 'ADMINISTRATIVA_QUINCENAL') {
    if (modalidadNorm !== 'SALARIO_MENSUAL') {
      throw AppError.badRequest(
        'Los empleados de planilla ADMINISTRATIVA_QUINCENAL deben tener modalidadPago = SALARIO_MENSUAL.',
        'EMPLEADO_INCOMPATIBLE_MODALIDAD',
        { tipoPlanilla: tipoNorm, modalidadRecibida: modalidadNorm, modalidadRequerida: 'SALARIO_MENSUAL' }
      );
    }

    const salarioNum = Number(salarioBaseMensual);
    if (!Number.isFinite(salarioNum) || salarioNum <= 0) {
      throw AppError.badRequest(
        'Para empleados con modalidad SALARIO_MENSUAL, el campo salarioBaseMensual es obligatorio y debe ser mayor a 0.',
        'EMPLEADO_INVALID_SALARIO_MENSUAL',
        { salarioBaseMensual }
      );
    }
    salarioMensualFixed = toDecimalFixed(salarioNum);
  } else if (tipoNorm === 'CAMPO_SEMANAL') {
    if (modalidadNorm === 'SALARIO_MENSUAL') {
      throw AppError.badRequest(
        'Los empleados de planilla CAMPO_SEMANAL deben registrarse bajo modalidad DIA_TRABAJADO o DESTAJO.',
        'EMPLEADO_INCOMPATIBLE_MODALIDAD',
        { tipoPlanilla: tipoNorm, modalidadRecibida: modalidadNorm, modalidadesPermitidas: ['DIA_TRABAJADO', 'DESTAJO'] }
      );
    }

    if (modalidadNorm === 'DIA_TRABAJADO') {
      const tarifaDiaNum = Number(tarifaDiaria);
      if (!Number.isFinite(tarifaDiaNum) || tarifaDiaNum <= 0) {
        throw AppError.badRequest(
          'Para empleados de campo con modalidad DIA_TRABAJADO, el campo tarifaDiaria es obligatorio y debe ser mayor a 0.',
          'EMPLEADO_INVALID_TARIFA_DIARIA',
          { tarifaDiaria }
        );
      }
      tarifaDiariaFixed = toDecimalFixed(tarifaDiaNum);
    }

    if (modalidadNorm === 'DESTAJO') {
      const tarifaDestajoNum = Number(tarifaUnitariaDestajo);
      if (!Number.isFinite(tarifaDestajoNum) || tarifaDestajoNum <= 0) {
        throw AppError.badRequest(
          'Para empleados de campo con modalidad DESTAJO, el campo tarifaUnitariaDestajo es obligatorio y debe ser mayor a 0.',
          'EMPLEADO_INVALID_TARIFA_DESTAJO',
          { tarifaUnitariaDestajo }
        );
      }
      tarifaDestajoFixed = toDecimalFixed(tarifaDestajoNum);
    }
  }

  return prisma.$transaction(async (tx) => {
    const [existenteCodigo, existenteDui] = await Promise.all([
      tx.empleado.findUnique({ where: { codigo: codigoNorm } }),
      tx.empleado.findUnique({ where: { dui: duiNorm } }),
    ]);

    if (existenteCodigo) {
      throw AppError.conflict(
        `Ya existe un empleado registrado con el código '${codigoNorm}'.`,
        'EMPLEADO_CODIGO_DUPLICATE',
        { codigo: codigoNorm }
      );
    }

    if (existenteDui) {
      throw AppError.conflict(
        `Ya existe un empleado registrado con el número de DUI '${duiNorm}'.`,
        'EMPLEADO_DUI_DUPLICATE',
        { dui: duiNorm }
      );
    }

    if (proyectoAsignadoId) {
      const proyecto = await tx.proyecto.findUnique({
        where: { id: proyectoAsignadoId },
        select: { id: true },
      });
      if (!proyecto) {
        throw AppError.notFound(
          `No se encontró el proyecto asignado con ID '${proyectoAsignadoId}'.`,
          'PROYECTO_NOT_FOUND'
        );
      }
    }

    const nuevoEmpleado = await tx.empleado.create({
      data: {
        codigo: codigoNorm,
        nombres: nombresNorm,
        apellidos: apellidosNorm,
        dui: duiNorm,
        nit: nit ? String(nit).trim() : duiNorm, // Homologación NIT/DUI en El Salvador
        nup: nup ? String(nup).trim() : null,
        numeroIsss: numeroIsss ? String(numeroIsss).trim() : null,
        cargo: cargoNorm,
        tipoPlanilla: tipoNorm,
        modalidadPago: modalidadNorm,
        salarioBaseMensual: salarioMensualFixed,
        tarifaDiaria: tarifaDiariaFixed,
        tarifaUnitariaDestajo: tarifaDestajoFixed,
        proyectoAsignadoId: proyectoAsignadoId || null,
        activo: Boolean(activo),
      },
      include: {
        proyectoAsignado: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            ubicacion: true,
            faseActual: true,
          },
        },
        _count: {
          select: {
            boletasPago: true,
          },
        },
      },
    });

    return nuevoEmpleado;
  });
};

// ============================================================================
// 3. PROCESAMIENTO DE PLANILLA DUAL (QUINCENAL ADMINISTRATIVA Y SEMANAL CAMPO)
// ============================================================================

/**
 * Lista todas las planillas filtrables por `tipo` y `estado`, incluyendo conteo de boletas.
 */
const listPlanillas = async (filters = {}) => {
  const { tipo, estado } = filters;
  const where = {};

  if (tipo) {
    const tipoNorm = String(tipo).toUpperCase().trim();
    if (!TIPOS_PLANILLA_VALIDOS.includes(tipoNorm)) {
      throw AppError.badRequest(
        `El tipo de planilla '${tipo}' no es válido. Valores permitidos: ${TIPOS_PLANILLA_VALIDOS.join(', ')}.`,
        'PLANILLA_INVALID_TIPO',
        { tiposPermitidos: TIPOS_PLANILLA_VALIDOS }
      );
    }
    where.tipo = tipoNorm;
  }

  if (estado) {
    const estadoNorm = String(estado).toUpperCase().trim();
    if (!ESTADOS_PLANILLA_VALIDOS.includes(estadoNorm)) {
      throw AppError.badRequest(
        `El estado de planilla '${estado}' no es válido. Estados permitidos: ${ESTADOS_PLANILLA_VALIDOS.join(', ')}.`,
        'PLANILLA_INVALID_ESTADO',
        { estadosPermitidos: ESTADOS_PLANILLA_VALIDOS }
      );
    }
    where.estado = estadoNorm;
  }

  const planillas = await prisma.planilla.findMany({
    where,
    include: {
      _count: {
        select: {
          boletas: true,
        },
      },
    },
    orderBy: [{ periodoInicio: 'desc' }, { createdAt: 'desc' }],
  });

  return planillas;
};

/**
 * Obtiene una planilla por su ID con todas sus boletas de pago, datos del empleado y su proyecto asignado.
 */
const getPlanillaById = async (id) => {
  if (!id) {
    throw AppError.badRequest(
      'El identificador de la planilla es obligatorio.',
      'PLANILLA_ID_REQUIRED'
    );
  }

  const planilla = await prisma.planilla.findUnique({
    where: { id },
    include: {
      boletas: {
        include: {
          empleado: {
            include: {
              proyectoAsignado: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                  faseActual: true,
                },
              },
            },
          },
        },
        orderBy: {
          empleado: {
            codigo: 'asc',
          },
        },
      },
      _count: {
        select: {
          boletas: true,
        },
      },
    },
  });

  if (!planilla) {
    throw AppError.notFound(
      `No se encontró la planilla con ID '${id}'.`,
      'PLANILLA_NOT_FOUND'
    );
  }

  return planilla;
};

/**
 * Calcula el ingreso bruto de un empleado según su modalidad y novedades del periodo.
 */
const calcularIngresoBrutoEmpleado = (empleado, novedad = {}, exigirDestajo = true) => {
  const { tipoPlanilla, modalidadPago } = empleado;
  let diasTrabajados = null;
  let unidadesDestajo = null;
  let ingresoBruto = 0;

  if (tipoPlanilla === 'ADMINISTRATIVA_QUINCENAL' || modalidadPago === 'SALARIO_MENSUAL') {
    const salarioMensual = Number(empleado.salarioBaseMensual || 0);
    if (salarioMensual <= 0) {
      throw AppError.unprocessable(
        `El empleado '${empleado.codigo}' (${empleado.nombres} ${empleado.apellidos}) no posee un salarioBaseMensual válido.`,
        'EMPLEADO_MISSING_SALARIO_BASE',
        { empleadoId: empleado.id, codigo: empleado.codigo }
      );
    }

    const dias =
      novedad.diasTrabajados !== undefined && novedad.diasTrabajados !== null
        ? Number(novedad.diasTrabajados)
        : 15;

    if (!Number.isInteger(dias) || dias <= 0 || dias > 15) {
      throw AppError.badRequest(
        `Los diasTrabajados para el empleado quincenal '${empleado.codigo}' deben ser un entero entre 1 y 15.`,
        'PLANILLA_INVALID_DIAS_QUINCENA',
        { empleadoId: empleado.id, codigo: empleado.codigo, diasTrabajados: novedad.diasTrabajados }
      );
    }

    diasTrabajados = dias;
    ingresoBruto = round2((salarioMensual / 2) * (diasTrabajados / 15));
  } else if (modalidadPago === 'DIA_TRABAJADO') {
    const tarifaDiaria = Number(empleado.tarifaDiaria || 0);
    if (tarifaDiaria <= 0) {
      throw AppError.unprocessable(
        `El empleado de campo '${empleado.codigo}' no posee una tarifaDiaria válida.`,
        'EMPLEADO_MISSING_TARIFA_DIARIA',
        { empleadoId: empleado.id, codigo: empleado.codigo }
      );
    }

    const dias =
      novedad.diasTrabajados !== undefined && novedad.diasTrabajados !== null
        ? Number(novedad.diasTrabajados)
        : 6;

    if (!Number.isInteger(dias) || dias <= 0 || dias > 7) {
      throw AppError.badRequest(
        `Los diasTrabajados para el empleado de campo '${empleado.codigo}' deben ser un entero mayor a 0 (máximo 7 días por semana).`,
        'PLANILLA_INVALID_DIAS_SEMANA',
        { empleadoId: empleado.id, codigo: empleado.codigo, diasTrabajados: novedad.diasTrabajados }
      );
    }

    diasTrabajados = dias;
    ingresoBruto = round2(tarifaDiaria * diasTrabajados);
  } else if (modalidadPago === 'DESTAJO') {
    const tarifaDestajo = Number(empleado.tarifaUnitariaDestajo || 0);
    if (tarifaDestajo <= 0) {
      throw AppError.unprocessable(
        `El empleado a destajo '${empleado.codigo}' no posee una tarifaUnitariaDestajo válida.`,
        'EMPLEADO_MISSING_TARIFA_DESTAJO',
        { empleadoId: empleado.id, codigo: empleado.codigo }
      );
    }

    const unidades =
      novedad.unidadesDestajo !== undefined && novedad.unidadesDestajo !== null
        ? Number(novedad.unidadesDestajo)
        : 0;

    if (!Number.isFinite(unidades) || unidades <= 0) {
      if (exigirDestajo) {
        throw AppError.badRequest(
          `Para el empleado bajo modalidad DESTAJO '${empleado.codigo}' (${empleado.nombres} ${empleado.apellidos}), debe especificar unidadesDestajo > 0 en las novedades de la planilla.`,
          'PLANILLA_INVALID_UNIDADES_DESTAJO',
          { empleadoId: empleado.id, codigo: empleado.codigo, unidadesDestajo: novedad.unidadesDestajo }
        );
      }
      return null;
    }

    unidadesDestajo = round2(unidades);
    ingresoBruto = round2(tarifaDestajo * unidadesDestajo);
  }

  return {
    diasTrabajados,
    unidadesDestajo,
    ingresoBruto,
  };
};

/**
 * REGLA DE ORO DEL MÓDULO 4:
 * Genera una planilla quincenal (`ADMINISTRATIVA_QUINCENAL`) o semanal (`CAMPO_SEMANAL`)
 * dentro de una transacción ACID (`prisma.$transaction`), calculando ISSS, AFP e ISR (MH El Salvador)
 * y creando simultáneamente todas las boletas de pago y acumulados financieros.
 */
const generarPlanilla = async (payload = {}) => {
  const {
    codigo,
    tipo,
    periodoInicio,
    periodoFin,
    novedades = [],
    soloEmpleadosEnNovedades = false,
  } = payload;

  if (!tipo || !periodoInicio || !periodoFin) {
    throw AppError.badRequest(
      'Los campos tipo, periodoInicio y periodoFin son obligatorios para generar una planilla.',
      'PLANILLA_REQUIRED_FIELDS_MISSING'
    );
  }

  const tipoNorm = String(tipo).toUpperCase().trim();
  if (!TIPOS_PLANILLA_VALIDOS.includes(tipoNorm)) {
    throw AppError.badRequest(
      `El tipo de planilla '${tipo}' no es válido. Valores permitidos: ${TIPOS_PLANILLA_VALIDOS.join(', ')}.`,
      'PLANILLA_INVALID_TIPO',
      { tiposPermitidos: TIPOS_PLANILLA_VALIDOS }
    );
  }

  const fechaInicio = new Date(periodoInicio);
  const fechaFin = new Date(periodoFin);

  if (Number.isNaN(fechaInicio.getTime()) || Number.isNaN(fechaFin.getTime())) {
    throw AppError.badRequest(
      'Las fechas periodoInicio y periodoFin deben tener un formato ISO 8601 válido.',
      'PLANILLA_INVALID_DATES'
    );
  }

  if (fechaFin < fechaInicio) {
    throw AppError.badRequest(
      'La fecha periodoFin no puede ser anterior a periodoInicio.',
      'PLANILLA_INVALID_DATE_RANGE',
      { periodoInicio, periodoFin }
    );
  }

  if (!Array.isArray(novedades)) {
    throw AppError.badRequest(
      'El campo novedades debe ser un arreglo de objetos por empleado.',
      'PLANILLA_INVALID_NOVEDADES'
    );
  }

  // Indexar y validar unicidad de novedades por empleadoId
  const mapaNovedades = new Map();
  for (let i = 0; i < novedades.length; i += 1) {
    const item = novedades[i];
    if (!item || !item.empleadoId) {
      throw AppError.badRequest(
        `La novedad en la posición ${i + 1} no contiene un empleadoId válido.`,
        'PLANILLA_NOVEDAD_EMPLEADO_REQUIRED'
      );
    }
    if (mapaNovedades.has(item.empleadoId)) {
      throw AppError.badRequest(
        `El empleado con ID '${item.empleadoId}' está duplicado en el arreglo de novedades.`,
        'PLANILLA_NOVEDAD_DUPLICATE_EMPLEADO',
        { empleadoId: item.empleadoId }
      );
    }
    mapaNovedades.set(item.empleadoId, item);
  }

  const prefijo = tipoNorm === 'ADMINISTRATIVA_QUINCENAL' ? 'PLN-QUIN' : 'PLN-SEM';
  const codigoPlanilla = codigo
    ? String(codigo).toUpperCase().trim()
    : `${prefijo}-${fechaInicio.toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

  return prisma.$transaction(async (tx) => {
    const planillaExistente = await tx.planilla.findUnique({
      where: { codigo: codigoPlanilla },
    });

    if (planillaExistente) {
      throw AppError.conflict(
        `Ya existe una planilla registrada con el código '${codigoPlanilla}'.`,
        'PLANILLA_CODIGO_DUPLICATE',
        { codigo: codigoPlanilla }
      );
    }

    // Validar que todos los empleados referenciados en novedades existan, estén activos y correspondan al tipo de planilla
    if (mapaNovedades.size > 0) {
      const idsNovedades = Array.from(mapaNovedades.keys());
      const empleadosEnNovedades = await tx.empleado.findMany({
        where: { id: { in: idsNovedades } },
      });

      if (empleadosEnNovedades.length !== idsNovedades.length) {
        const encontradosSet = new Set(empleadosEnNovedades.map((e) => e.id));
        const faltantes = idsNovedades.filter((idEmp) => !encontradosSet.has(idEmp));
        throw AppError.notFound(
          `No se encontraron los siguientes empleados indicados en novedades: ${faltantes.join(', ')}.`,
          'PLANILLA_EMPLEADO_NOT_FOUND',
          { empleadosInexistentes: faltantes }
        );
      }

      for (const emp of empleadosEnNovedades) {
        if (!emp.activo) {
          throw AppError.unprocessable(
            `El empleado '${emp.codigo}' (${emp.nombres} ${emp.apellidos}) se encuentra inactivo y no puede ser incluido en la planilla.`,
            'PLANILLA_EMPLEADO_INACTIVO',
            { empleadoId: emp.id, codigo: emp.codigo }
          );
        }
        if (emp.tipoPlanilla !== tipoNorm) {
          throw AppError.unprocessable(
            `El empleado '${emp.codigo}' pertenece a la nómina '${emp.tipoPlanilla}' y no puede procesarse en una planilla de tipo '${tipoNorm}'.`,
            'PLANILLA_EMPLEADO_TIPO_MISMATCH',
            {
              empleadoId: emp.id,
              codigo: emp.codigo,
              tipoEmpleado: emp.tipoPlanilla,
              tipoPlanilla: tipoNorm,
            }
          );
        }
      }
    }

    // Obtener empleados activos para la planilla
    const whereEmpleados = {
      tipoPlanilla: tipoNorm,
      activo: true,
    };

    if (soloEmpleadosEnNovedades && mapaNovedades.size > 0) {
      whereEmpleados.id = { in: Array.from(mapaNovedades.keys()) };
    }

    const empleadosActivos = await tx.empleado.findMany({
      where: whereEmpleados,
      orderBy: { codigo: 'asc' },
    });

    if (empleadosActivos.length === 0) {
      throw AppError.unprocessable(
        `No existen empleados activos registrados para el tipo de planilla '${tipoNorm}'.`,
        'PLANILLA_NO_ACTIVE_EMPLOYEES',
        { tipo: tipoNorm }
      );
    }

    // Construir boletas de pago y acumular totales de la planilla
    const boletasData = [];
    let totalBruto = 0;
    let totalIsss = 0;
    let totalAfp = 0;
    let totalRenta = 0;
    let totalLiquido = 0;

    for (const empleado of empleadosActivos) {
      const tieneNovedadExplicita = mapaNovedades.has(empleado.id);
      const novedad = mapaNovedades.get(empleado.id) || {};

      // Si es empleado a DESTAJO:
      // - Si viene en novedades o si no se enviaron novedades globales, exigimos unidadesDestajo > 0.
      // - Si se enviaron novedades para otros empleados específicos y este empleado a destajo no fue incluido, se omite.
      const exigirDestajo = tieneNovedadExplicita || mapaNovedades.size === 0;
      const calculoBruto = calcularIngresoBrutoEmpleado(empleado, novedad, exigirDestajo);

      if (!calculoBruto) {
        continue;
      }

      const deducciones = calcularDeduccionesLeySV({
        ingresoBruto: calculoBruto.ingresoBruto,
        tipoPlanilla: tipoNorm,
        otrasDeducciones: novedad.otrasDeducciones ?? 0,
        exentoCotizacionesCampo: novedad.exentoCotizacionesCampo ?? false,
        aplicarRetencionEventual10: novedad.aplicarRetencionEventual10 ?? false,
      });

      totalBruto = round2(totalBruto + deducciones.ingresoBruto);
      totalIsss = round2(totalIsss + deducciones.descuentoIsss);
      totalAfp = round2(totalAfp + deducciones.descuentoAfp);
      totalRenta = round2(totalRenta + deducciones.descuentoRenta);
      totalLiquido = round2(totalLiquido + deducciones.liquidoPagar);

      boletasData.push({
        empleadoId: empleado.id,
        diasTrabajados: calculoBruto.diasTrabajados,
        unidadesDestajo:
          calculoBruto.unidadesDestajo !== null
            ? toDecimalFixed(calculoBruto.unidadesDestajo)
            : null,
        ingresoBruto: toDecimalFixed(deducciones.ingresoBruto),
        descuentoIsss: toDecimalFixed(deducciones.descuentoIsss),
        descuentoAfp: toDecimalFixed(deducciones.descuentoAfp),
        descuentoRenta: toDecimalFixed(deducciones.descuentoRenta),
        otrasDeducciones: toDecimalFixed(deducciones.otrasDeducciones),
        liquidoPagar: toDecimalFixed(deducciones.liquidoPagar),
      });
    }

    if (boletasData.length === 0) {
      throw AppError.unprocessable(
        'No se pudo generar ninguna boleta de pago. Verifique las unidades de destajo o novedades enviadas.',
        'PLANILLA_EMPTY_BOLETAS'
      );
    }

    const planillaCreada = await tx.planilla.create({
      data: {
        codigo: codigoPlanilla,
        tipo: tipoNorm,
        periodoInicio: fechaInicio,
        periodoFin: fechaFin,
        estado: 'BORRADOR',
        totalBruto: toDecimalFixed(totalBruto),
        totalIsss: toDecimalFixed(totalIsss),
        totalAfp: toDecimalFixed(totalAfp),
        totalRenta: toDecimalFixed(totalRenta),
        totalLiquido: toDecimalFixed(totalLiquido),
        boletas: {
          create: boletasData,
        },
      },
      include: {
        boletas: {
          include: {
            empleado: {
              include: {
                proyectoAsignado: {
                  select: {
                    id: true,
                    codigo: true,
                    nombre: true,
                    faseActual: true,
                  },
                },
              },
            },
          },
          orderBy: {
            empleado: {
              codigo: 'asc',
            },
          },
        },
        _count: {
          select: {
            boletas: true,
          },
        },
      },
    });

    return planillaCreada;
  });
};

/**
 * Cambia el estado de una planilla siguiendo el flujo estricto:
 * BORRADOR -> APROBADA -> PAGADA
 */
const cambiarEstadoPlanilla = async (id, payloadOrEstado) => {
  if (!id) {
    throw AppError.badRequest(
      'El identificador de la planilla es obligatorio.',
      'PLANILLA_ID_REQUIRED'
    );
  }

  const estadoRaw =
    typeof payloadOrEstado === 'object' && payloadOrEstado !== null
      ? payloadOrEstado.estado || payloadOrEstado.nuevoEstado
      : payloadOrEstado;

  if (!estadoRaw) {
    throw AppError.badRequest(
      'El nuevo estado de la planilla es obligatorio (APROBADA o PAGADA).',
      'PLANILLA_ESTADO_REQUIRED'
    );
  }

  const nuevoEstado = String(estadoRaw).toUpperCase().trim();
  if (!ESTADOS_PLANILLA_VALIDOS.includes(nuevoEstado)) {
    throw AppError.badRequest(
      `El estado '${estadoRaw}' no es válido. Estados permitidos: ${ESTADOS_PLANILLA_VALIDOS.join(', ')}.`,
      'PLANILLA_INVALID_ESTADO',
      { estadosPermitidos: ESTADOS_PLANILLA_VALIDOS }
    );
  }

  const planilla = await prisma.planilla.findUnique({
    where: { id },
  });

  if (!planilla) {
    throw AppError.notFound(
      `No se encontró la planilla con ID '${id}'.`,
      'PLANILLA_NOT_FOUND'
    );
  }

  if (planilla.estado === 'PAGADA') {
    throw AppError.unprocessable(
      `La planilla '${planilla.codigo}' ya se encuentra en estado PAGADA y es inmutable.`,
      'PLANILLA_ALREADY_PAID',
      { estadoActual: planilla.estado, estadoSolicitado: nuevoEstado }
    );
  }

  if (planilla.estado === 'APROBADA' && nuevoEstado === 'BORRADOR') {
    throw AppError.unprocessable(
      `No se puede revertir la planilla '${planilla.codigo}' de APROBADA a BORRADOR.`,
      'PLANILLA_INVALID_STATE_TRANSITION',
      { estadoActual: planilla.estado, estadoSolicitado: nuevoEstado }
    );
  }

  const actualizada = await prisma.planilla.update({
    where: { id },
    data: { estado: nuevoEstado },
    include: {
      boletas: {
        include: {
          empleado: {
            select: {
              id: true,
              codigo: true,
              nombres: true,
              apellidos: true,
              dui: true,
              cargo: true,
              tipoPlanilla: true,
              modalidadPago: true,
            },
          },
        },
      },
      _count: {
        select: {
          boletas: true,
        },
      },
    },
  });

  return actualizada;
};

/**
 * Simulador de cálculo de boleta de pago salvadoreña sin persistencia en base de datos.
 * Permite simular por `ingresoBruto` directo o a partir de `{ tipoPlanilla, modalidadPago, salarioBaseMensual, tarifaDiaria, diasTrabajados, tarifaUnitariaDestajo, unidadesDestajo }`.
 */
const simularCalculoPlanilla = (payload = {}) => {
  const {
    tipoPlanilla = 'ADMINISTRATIVA_QUINCENAL',
    modalidadPago,
    ingresoBruto: ingresoBrutoDirecto,
    salarioBaseMensual,
    tarifaDiaria,
    tarifaUnitariaDestajo,
    diasTrabajados,
    unidadesDestajo,
    otrasDeducciones = 0,
    exentoCotizacionesCampo = false,
    aplicarRetencionEventual10 = false,
  } = payload;

  const tipoNorm = String(tipoPlanilla).toUpperCase().trim();
  let ingresoBrutoCalculado = ingresoBrutoDirecto;

  if (ingresoBrutoCalculado === undefined || ingresoBrutoCalculado === null || ingresoBrutoCalculado === '') {
    const modNorm = modalidadPago
      ? String(modalidadPago).toUpperCase().trim()
      : tipoNorm === 'ADMINISTRATIVA_QUINCENAL'
        ? 'SALARIO_MENSUAL'
        : 'DIA_TRABAJADO';

    if (modNorm === 'SALARIO_MENSUAL') {
      const sal = Number(salarioBaseMensual);
      if (!Number.isFinite(sal) || sal <= 0) {
        throw AppError.badRequest(
          'Debe proporcionar ingresoBruto o un salarioBaseMensual mayor a 0 para simular la planilla.',
          'SIMULACION_MISSING_INGRESO'
        );
      }
      const dias = diasTrabajados !== undefined && diasTrabajados !== null ? Number(diasTrabajados) : 15;
      ingresoBrutoCalculado = round2((sal / 2) * (dias / 15));
    } else if (modNorm === 'DIA_TRABAJADO') {
      const tarifa = Number(tarifaDiaria);
      if (!Number.isFinite(tarifa) || tarifa <= 0) {
        throw AppError.badRequest(
          'Debe proporcionar ingresoBruto o una tarifaDiaria mayor a 0 para simular la planilla de campo.',
          'SIMULACION_MISSING_TARIFA_DIARIA'
        );
      }
      const dias = diasTrabajados !== undefined && diasTrabajados !== null ? Number(diasTrabajados) : 6;
      ingresoBrutoCalculado = round2(tarifa * dias);
    } else if (modNorm === 'DESTAJO') {
      const tarifa = Number(tarifaUnitariaDestajo);
      const unidades = Number(unidadesDestajo);
      if (!Number.isFinite(tarifa) || tarifa <= 0 || !Number.isFinite(unidades) || unidades <= 0) {
        throw AppError.badRequest(
          'Debe proporcionar tarifaUnitariaDestajo > 0 y unidadesDestajo > 0 para simular el pago a destajo.',
          'SIMULACION_MISSING_DESTAJO_PARAMS'
        );
      }
      ingresoBrutoCalculado = round2(tarifa * unidades);
    } else {
      throw AppError.badRequest(
        `La modalidad de pago '${modNorm}' no es válida.`,
        'SIMULACION_INVALID_MODALIDAD'
      );
    }
  }

  const desglose = calcularDeduccionesLeySV({
    ingresoBruto: ingresoBrutoCalculado,
    tipoPlanilla: tipoNorm,
    otrasDeducciones,
    exentoCotizacionesCampo,
    aplicarRetencionEventual10,
  });

  return {
    ...desglose,
    parametrosLeySV: {
      tasaIsssLaboral: ISSS_RATE,
      techoIsssMensual: ISSS_TECHO_MENSUAL,
      tasaAfpLaboral: AFP_RATE,
    },
  };
};

module.exports = {
  ISSS_RATE,
  ISSS_TECHO_MENSUAL,
  AFP_RATE,
  TABLAS_ISR_MH_SV,
  calcularDeduccionesLeySV,
  simularCalculoPlanilla,
  listEmpleados,
  createEmpleado,
  listPlanillas,
  getPlanillaById,
  generarPlanilla,
  cambiarEstadoPlanilla,
  aprobarPagarPlanilla: cambiarEstadoPlanilla,
};
