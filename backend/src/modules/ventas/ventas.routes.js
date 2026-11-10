const express = require('express');
const ventasController = require('./ventas.controller');
const { verifyToken, authorizeRoles } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas del Módulo 5 (Ventas e Inmobiliaria CRM y Facturación Fiscal SV) requieren autenticación JWT
router.use(verifyToken);

// 1. Directorio de Clientes CRM (Personas Naturales y Jurídicas)
router.get(
  '/clientes',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO', 'VENTAS'),
  ventasController.listClientes
);

router.post(
  '/clientes',
  authorizeRoles('ADMIN', 'VENTAS'),
  ventasController.createCliente
);

// 2. Catálogo de Unidades Inmobiliarias (Casas, Apartamentos, Lotes)
router.get(
  '/unidades',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO', 'INGENIERO_RESIDENTE', 'VENTAS'),
  ventasController.listUnidades
);

router.post(
  '/unidades',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO', 'VENTAS'),
  ventasController.createUnidad
);

router.patch(
  '/unidades/:id/estado',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO', 'VENTAS'),
  ventasController.cambiarEstadoUnidad
);

// 3. Simulador Financiero y Tributario Salvadoreño (Tabla de Amortización + IVA 13% + ITBR 3%)
router.post(
  '/simular-financiamiento',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO', 'VENTAS'),
  ventasController.simularFinanciamiento
);

// 4. Contratos de Venta y Tabla de Amortización Transaccional
router.get(
  '/contratos',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO', 'VENTAS'),
  ventasController.listContratos
);

router.get(
  '/contratos/:id',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO', 'VENTAS'),
  ventasController.getContratoById
);

router.post(
  '/contratos',
  authorizeRoles('ADMIN', 'VENTAS'),
  ventasController.crearContratoVenta
);

// 5. Pago de Cuotas y Emisión de Documentos Fiscales (FCF DTE-01, CCF DTE-03, Recibos)
router.post(
  '/contratos/:id/cuotas/:cuotaId/pagar',
  authorizeRoles('ADMIN', 'VENTAS'),
  ventasController.registrarPagoCuota
);

router.get(
  '/documentos-fiscales',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO', 'VENTAS'),
  ventasController.listDocumentosFiscales
);

router.post(
  '/documentos-fiscales',
  authorizeRoles('ADMIN', 'VENTAS'),
  ventasController.emitirDocumentoFiscal
);

module.exports = router;
