const ventasService = require('./ventas.service');

/**
 * Lista el directorio de clientes CRM (personas naturales y jurídicas).
 */
const listClientes = async (req, res, next) => {
  try {
    const clientes = await ventasService.listClientes(req.query);
    return res.status(200).json({
      success: true,
      count: clientes.length,
      data: clientes,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Registra un nuevo cliente en el CRM inmobiliario validando DUI/NIT/NRC/Giro según normativa salvadoreña.
 */
const createCliente = async (req, res, next) => {
  try {
    const cliente = await ventasService.createCliente(req.body);
    return res.status(201).json({
      success: true,
      message: `Cliente '${cliente.nombreCompleto}' (${cliente.tipo}) registrado exitosamente.`,
      data: cliente,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Lista el catálogo de unidades inmobiliarias (casas, apartamentos, lotes) filtrables por proyecto, tipo y estado.
 */
const listUnidades = async (req, res, next) => {
  try {
    const unidades = await ventasService.listUnidades(req.query);
    return res.status(200).json({
      success: true,
      count: unidades.length,
      data: unidades,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Crea una nueva unidad inmobiliaria dentro de un proyecto.
 */
const createUnidad = async (req, res, next) => {
  try {
    const unidad = await ventasService.createUnidad(req.body);
    return res.status(201).json({
      success: true,
      message: `Unidad inmobiliaria '${unidad.codigo}' (${unidad.tipo}) creada exitosamente en estado '${unidad.estado}'.`,
      data: unidad,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Actualiza el estado comercial/legal de una unidad inmobiliaria (DISPONIBLE, RESERVADA, VENDIDA, ESCRITURADA).
 */
const cambiarEstadoUnidad = async (req, res, next) => {
  try {
    const unidad = await ventasService.cambiarEstadoUnidad(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: `El estado de la unidad '${unidad.codigo}' ha sido actualizado a '${unidad.estado}'.`,
      data: unidad,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Simula una tabla de amortización francesa y calcula el desglose fiscal salvadoreño (IVA 13% e ITBR 3%).
 */
const simularFinanciamiento = async (req, res, next) => {
  try {
    const simulacion = ventasService.simularFinanciamiento(req.body);
    return res.status(200).json({
      success: true,
      message: 'Simulación financiera de amortización y desglose tributario SV (IVA 13% / ITBR 3%) generada exitosamente.',
      data: simulacion,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Lista los contratos de venta registrados.
 */
const listContratos = async (req, res, next) => {
  try {
    const contratos = await ventasService.listContratos(req.query);
    return res.status(200).json({
      success: true,
      count: contratos.length,
      data: contratos,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Obtiene el detalle de un contrato de venta incluyendo su tabla de amortización y documentos fiscales.
 */
const getContratoById = async (req, res, next) => {
  try {
    const contrato = await ventasService.getContratoById(req.params.id);
    return res.status(200).json({
      success: true,
      data: contrato,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Formaliza un nuevo contrato de venta en una transacción ACID, marca la unidad como VENDIDA
 * y genera automáticamente su tabla de amortización en CuotaPago.
 */
const crearContratoVenta = async (req, res, next) => {
  try {
    const contrato = await ventasService.crearContratoVenta(req.body, req.user?.id);
    return res.status(201).json({
      success: true,
      message: `Contrato de venta '${contrato.codigo}' formalizado exitosamente con ${contrato.cuotas.length} cuota(s) de amortización.`,
      data: contrato,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Registra el pago de una cuota de amortización, actualiza el saldo insoluto del contrato
 * y emite el documento fiscal correspondiente (FCF, CCF o Recibo de Abono).
 */
const registrarPagoCuota = async (req, res, next) => {
  try {
    const resultado = await ventasService.registrarPagoCuota(
      req.params.id,
      req.params.cuotaId,
      req.body
    );
    return res.status(201).json({
      success: true,
      message: `Pago de cuota #${resultado.cuota.numeroCuota} procesado exitosamente. Documento fiscal '${resultado.documentoFiscal.numeroDocumento}' (${resultado.documentoFiscal.tipoDocumento}) emitido.`,
      data: resultado,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Lista los documentos fiscales emitidos (Facturas Consumidor Final DTE-01, Créditos Fiscales CCF DTE-03 y Recibos).
 */
const listDocumentosFiscales = async (req, res, next) => {
  try {
    const documentos = await ventasService.listDocumentosFiscales(req.query);
    return res.status(200).json({
      success: true,
      count: documentos.length,
      data: documentos,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Emite un documento fiscal vinculado a un contrato de venta validando los requisitos tributarios salvadoreños.
 */
const emitirDocumentoFiscal = async (req, res, next) => {
  try {
    const documento = await ventasService.emitirDocumentoFiscal(req.body);
    return res.status(201).json({
      success: true,
      message: `Documento fiscal '${documento.numeroDocumento}' (${documento.tipoDocumento}) emitido exitosamente.`,
      data: documento,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listClientes,
  createCliente,
  listUnidades,
  createUnidad,
  cambiarEstadoUnidad,
  simularFinanciamiento,
  listContratos,
  getContratoById,
  crearContratoVenta,
  registrarPagoCuota,
  listDocumentosFiscales,
  emitirDocumentoFiscal,
};
