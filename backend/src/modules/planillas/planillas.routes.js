const express = require('express');
const planillasController = require('./planillas.controller');
const { verifyToken, authorizeRoles } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas del Módulo 4 (RRHH y Nómina Dual SV) requieren autenticación JWT
router.use(verifyToken);

// 1. Gestión de Empleados (Administrativos Quincenales y Personal de Campo Semanal)
router.get(
  '/empleados',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO', 'RRHH'),
  planillasController.listEmpleados
);

router.post(
  '/empleados',
  authorizeRoles('ADMIN', 'RRHH'),
  planillasController.createEmpleado
);

// 2. Calculadora / Simulador en vivo de deducciones legales SV (ISSS, AFP, ISR MH)
router.post(
  '/calcular-simulacion',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO', 'RRHH'),
  planillasController.simularCalculoPlanilla
);

// 3. Procesamiento y Consulta de Planilla Dual y Boletas de Pago
router.get(
  '/',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO', 'RRHH'),
  planillasController.listPlanillas
);

router.get(
  '/:id',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO', 'RRHH'),
  planillasController.getPlanillaById
);

router.post(
  '/',
  authorizeRoles('ADMIN', 'RRHH'),
  planillasController.generarPlanilla
);

router.patch(
  '/:id/estado',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO', 'RRHH'),
  planillasController.cambiarEstadoPlanilla
);

module.exports = router;
