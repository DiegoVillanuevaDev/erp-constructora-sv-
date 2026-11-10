const express = require('express');
const partidasController = require('./partidas.controller');
const { verifyToken, authorizeRoles } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas de partidas de obra requieren autenticación JWT
router.use(verifyToken);

// 1. Consulta de partidas de obra
router.get(
  '/',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO', 'INGENIERO_RESIDENTE', 'BODEGUERO'),
  partidasController.listPartidas
);

router.post(
  '/',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO'),
  partidasController.createPartida
);

// 2. Reportes de avance físico (Regla de Oro del Módulo 3)
router.post(
  '/:id/avances',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO', 'INGENIERO_RESIDENTE'),
  partidasController.reportarAvance
);

router.get(
  '/:id/avances',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO', 'INGENIERO_RESIDENTE'),
  partidasController.listReportesAvance
);

// 3. Detalle de partida
router.get(
  '/:id',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO', 'INGENIERO_RESIDENTE', 'BODEGUERO'),
  partidasController.getPartidaById
);

module.exports = router;
