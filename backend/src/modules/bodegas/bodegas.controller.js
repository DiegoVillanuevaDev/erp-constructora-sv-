const bodegasService = require('./bodegas.service');

/**
 * Lista el catálogo de materiales con stock consolidado y alertas en Bodega Central.
 */
const listMateriales = async (req, res, next) => {
  try {
    const materiales = await bodegasService.listMateriales(req.query);
    return res.status(200).json({
      success: true,
      count: materiales.length,
      data: materiales,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Crea un nuevo material en el catálogo e inicializa opcionalmente su stock en Bodega Central.
 */
const createMaterial = async (req, res, next) => {
  try {
    const nuevoMaterial = await bodegasService.createMaterial(req.body);
    return res.status(201).json({
      success: true,
      message: 'Material registrado exitosamente en el catálogo corporativo.',
      data: nuevoMaterial,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Lista todas las bodegas (CENTRAL y PROYECTO) con valorización total de inventario.
 */
const listBodegas = async (req, res, next) => {
  try {
    const bodegas = await bodegasService.listBodegas(req.query);
    return res.status(200).json({
      success: true,
      count: bodegas.length,
      data: bodegas,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Obtiene el detalle de una bodega por su ID con inventarios valorizados y alertas de stock.
 */
const getBodegaById = async (req, res, next) => {
  try {
    const bodega = await bodegasService.getBodegaById(req.params.id);
    return res.status(200).json({
      success: true,
      data: bodega,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Registra una entrada/compra de inventario en Bodega Central (o bodega indicada).
 */
const registrarEntradaBodegaCentral = async (req, res, next) => {
  try {
    const resultado = await bodegasService.registrarEntradaBodegaCentral(req.body);
    return res.status(200).json({
      success: true,
      message: 'Entrada de inventario registrada exitosamente.',
      data: resultado,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Lista el historial de traslados multi-sitio entre bodegas.
 */
const listTraslados = async (req, res, next) => {
  try {
    const traslados = await bodegasService.listTraslados(req.query);
    return res.status(200).json({
      success: true,
      count: traslados.length,
      data: traslados,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Ejecuta un traslado transaccional de materiales entre Bodega Origen y Bodega Destino.
 */
const crearTrasladoBodega = async (req, res, next) => {
  try {
    const traslado = await bodegasService.crearTrasladoBodega(req.body, req.user?.id);
    return res.status(201).json({
      success: true,
      message: `Traslado '${traslado.codigo}' ejecutado y completado exitosamente.`,
      data: traslado,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listMateriales,
  createMaterial,
  listBodegas,
  getBodegaById,
  registrarEntradaBodegaCentral,
  listTraslados,
  crearTrasladoBodega,
};
