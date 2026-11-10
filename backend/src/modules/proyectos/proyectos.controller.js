const proyectosService = require('./proyectos.service');

/**
 * Lista todos los proyectos con filtros opcionales (?faseActual=DISENO&search=...).
 */
const listProyectos = async (req, res, next) => {
  try {
    const proyectos = await proyectosService.listProyectos(req.query);
    return res.status(200).json({
      success: true,
      count: proyectos.length,
      data: proyectos,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Obtiene el detalle integral de un proyecto por su ID, incluyendo permisos, bodega y partidas.
 */
const getProyectoById = async (req, res, next) => {
  try {
    const proyecto = await proyectosService.getProyectoById(req.params.id);
    return res.status(200).json({
      success: true,
      data: proyecto,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Crea un nuevo proyecto junto con sus 3 permisos regulatorios (OPAMSS, MARN, ANDA)
 * y su bodega de obra en una transacción ACID.
 */
const createProyecto = async (req, res, next) => {
  try {
    const nuevoProyecto = await proyectosService.createProyecto(req.body);
    return res.status(201).json({
      success: true,
      message: 'Proyecto creado exitosamente con sus registros regulatorios (OPAMSS, MARN, ANDA) y bodega de obra.',
      data: nuevoProyecto,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Actualiza el estado de un permiso regulatorio específico (:institucion = OPAMSS | MARN | ANDA).
 */
const updatePermisoProyecto = async (req, res, next) => {
  try {
    const { id, institucion } = req.params;
    const resultado = await proyectosService.updatePermisoProyecto(id, institucion, req.body);
    return res.status(200).json({
      success: true,
      message: `Permiso regulatorio de ${String(institucion).toUpperCase()} actualizado exitosamente.`,
      data: resultado,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Avanza o cambia la fase del proyecto verificando la Guardia Regulatoria SV (OPAMSS, MARN, ANDA).
 */
const cambiarFaseProyecto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nuevaFase, faseActual } = req.body;
    const faseObjetivo = nuevaFase || faseActual;
    const proyectoActualizado = await proyectosService.cambiarFaseProyecto(id, faseObjetivo);
    return res.status(200).json({
      success: true,
      message: `El proyecto avanzó exitosamente a la fase '${proyectoActualizado.faseActual}'.`,
      data: proyectoActualizado,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listProyectos,
  getProyectoById,
  createProyecto,
  updatePermisoProyecto,
  cambiarFaseProyecto,
};
