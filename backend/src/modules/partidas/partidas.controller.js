const partidasService = require('./partidas.service');

/**
 * Lista las partidas de obra (filtros: proyectoId, faseRequerida) con indicadores presupuestarios.
 */
const listPartidas = async (req, res, next) => {
  try {
    const partidas = await partidasService.listPartidas(req.query);
    return res.status(200).json({
      success: true,
      count: partidas.length,
      data: partidas,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Obtiene el detalle de una partida de obra con receta, últimos reportes e indicadores.
 */
const getPartidaById = async (req, res, next) => {
  try {
    const partida = await partidasService.getPartidaById(req.params.id);
    return res.status(200).json({
      success: true,
      data: partida,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Crea una partida de obra con su receta de materiales.
 */
const createPartida = async (req, res, next) => {
  try {
    const partida = await partidasService.createPartida(req.body);
    return res.status(201).json({
      success: true,
      message: `Partida '${partida.codigo}' registrada exitosamente con ${partida.recetaMateriales.length} material(es) en su receta.`,
      data: partida,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Registra un avance físico de partida con descarga de materiales desde la bodega de obra.
 */
const reportarAvance = async (req, res, next) => {
  try {
    const resultado = await partidasService.reportarAvance(req.params.id, req.body, req.user?.id);
    return res.status(201).json({
      success: true,
      message: `Avance de la partida '${resultado.partida.codigo}' registrado: ${Number(resultado.reporte.porcentajeAnterior).toFixed(2)}% → ${Number(resultado.reporte.porcentajeNuevo).toFixed(2)}%.`,
      data: resultado,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Lista el historial de reportes de avance de una partida.
 */
const listReportesAvance = async (req, res, next) => {
  try {
    const reportes = await partidasService.listReportesAvance(req.params.id);
    return res.status(200).json({
      success: true,
      count: reportes.length,
      data: reportes,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listPartidas,
  getPartidaById,
  createPartida,
  reportarAvance,
  listReportesAvance,
};
