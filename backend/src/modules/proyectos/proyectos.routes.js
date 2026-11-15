const express = require('express');
const proyectosController = require('./proyectos.controller');
const { verifyToken, authorizeRoles } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas de proyectos requieren autenticación JWT
router.use(verifyToken);

// Lectura transversal de proyectos para contexto operativo de todos los módulos
router.get(
  '/',
  authorizeRoles(
    'ADMIN',
    'DIRECTOR_PROYECTO',
    'INGENIERO_RESIDENTE',
    'BODEGUERO',
    'RRHH',
    'VENTAS'
  ),
  proyectosController.listProyectos
);

router.get(
  '/:id',
  authorizeRoles(
    'ADMIN',
    'DIRECTOR_PROYECTO',
    'INGENIERO_RESIDENTE',
    'BODEGUERO',
    'RRHH',
    'VENTAS'
  ),
  proyectosController.getProyectoById
);

// Creación transaccional de proyecto + 3 permisos (OPAMSS, MARN, ANDA) + bodega de obra
router.post(
  '/',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO'),
  proyectosController.createProyecto
);

// Actualización de estado de permiso regulatorio (OPAMSS | MARN | ANDA)
router.patch(
  '/:id/permisos/:institucion',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO'),
  proyectosController.updatePermisoProyecto
);

// Cambio de fase constructiva (sujeto a bloqueo legal si OPAMSS, MARN y ANDA no están APROBADOS)
router.patch(
  '/:id/fase',
  authorizeRoles('ADMIN', 'DIRECTOR_PROYECTO', 'INGENIERO_RESIDENTE'),
  proyectosController.cambiarFaseProyecto
);

module.exports = router;
