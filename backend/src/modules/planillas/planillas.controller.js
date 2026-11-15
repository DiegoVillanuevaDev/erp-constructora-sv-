const planillasService = require('./planillas.service');

/**
 * Lista el padrón de empleados (administrativos quincenales y personal de campo semanal).
 */
const listEmpleados = async (req, res, next) => {
  try {
    const empleados = await planillasService.listEmpleados(req.query);
    return res.status(200).json({
      success: true,
      count: empleados.length,
      data: empleados,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Registra un nuevo empleado validando DUI salvadoreño, tipo de planilla y modalidad de pago.
 */
const createEmpleado = async (req, res, next) => {
  try {
    const empleado = await planillasService.createEmpleado(req.body);
    return res.status(201).json({
      success: true,
      message: `Empleado '${empleado.codigo}' (${empleado.nombres} ${empleado.apellidos}) registrado exitosamente en nómina ${empleado.tipoPlanilla}.`,
      data: empleado,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Simula en tiempo real el cálculo de deducciones de ley salvadoreña (ISSS, AFP, ISR) sin persistir en BD.
 */
const simularCalculoPlanilla = async (req, res, next) => {
  try {
    const resultado = planillasService.simularCalculoPlanilla(req.body);
    return res.status(200).json({
      success: true,
      message: 'Simulación de cálculo legal salvadoreño (ISSS, AFP, ISR) completada.',
      data: resultado,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Lista las planillas procesadas (filtrables por tipo y estado).
 */
const listPlanillas = async (req, res, next) => {
  try {
    const planillas = await planillasService.listPlanillas(req.query);
    return res.status(200).json({
      success: true,
      count: planillas.length,
      data: planillas,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Obtiene el detalle completo de una planilla incluyendo todas sus boletas de pago e información de empleados.
 */
const getPlanillaById = async (req, res, next) => {
  try {
    const planilla = await planillasService.getPlanillaById(req.params.id);
    return res.status(200).json({
      success: true,
      data: planilla,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Genera una nueva planilla (ADMINISTRATIVA_QUINCENAL o CAMPO_SEMANAL) y todas sus boletas en una transacción ACID.
 */
const generarPlanilla = async (req, res, next) => {
  try {
    const planilla = await planillasService.generarPlanilla(req.body);
    return res.status(201).json({
      success: true,
      message: `Planilla '${planilla.codigo}' (${planilla.tipo}) generada exitosamente con ${planilla.boletas.length} boleta(s) de pago.`,
      data: planilla,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Actualiza el estado de una planilla (BORRADOR -> APROBADA -> PAGADA).
 */
const cambiarEstadoPlanilla = async (req, res, next) => {
  try {
    const planilla = await planillasService.cambiarEstadoPlanilla(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: `El estado de la planilla '${planilla.codigo}' ha sido actualizado a '${planilla.estado}'.`,
      data: planilla,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listEmpleados,
  createEmpleado,
  simularCalculoPlanilla,
  listPlanillas,
  getPlanillaById,
  generarPlanilla,
  cambiarEstadoPlanilla,
};
