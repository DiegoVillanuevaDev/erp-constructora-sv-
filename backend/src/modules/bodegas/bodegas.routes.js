const express = require('express');
const bodegasController = require('./bodegas.controller');
const { verifyToken, authorizeRoles } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas de bodegas e inventario requieren autenticación JWT
router.use(verifyToken);

// 1. Catálogo de Materiales
router.get(
  '/materiales',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO', 'INGENIERO_RESIDENTE', 'BODEGUERO'),
  bodegasController.listMateriales
);

router.post(
  '/materiales',
  authorizeRoles('ADMIN', 'BODEGUERO'),
  bodegasController.createMaterial
);

// 2. Traslados Multi-sitio entre Bodega Central y Bodegas de Proyecto
router.get(
  '/traslados',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO', 'INGENIERO_RESIDENTE', 'BODEGUERO'),
  bodegasController.listTraslados
);

router.post(
  '/traslados',
  authorizeRoles('ADMIN', 'BODEGUERO'),
  bodegasController.crearTrasladoBodega
);

// 3. Abastecimiento de stock en Bodega Central
router.post(
  '/entradas',
  authorizeRoles('ADMIN', 'BODEGUERO'),
  bodegasController.registrarEntradaBodegaCentral
);

// 4. Consulta de Bodegas e Inventarios por sitio
router.get(
  '/',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO', 'INGENIERO_RESIDENTE', 'BODEGUERO'),
  bodegasController.listBodegas
);

router.get(
  '/:id',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO', 'INGENIERO_RESIDENTE', 'BODEGUERO'),
  bodegasController.getBodegaById
);

module.exports = router;
