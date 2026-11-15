const express = require('express');
const authController = require('./auth.controller');
const { verifyToken } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Rutas públicas de autenticación
router.post('/register', authController.register);
router.post('/login', authController.login);

// Rutas protegidas (requieren Bearer Token válido)
router.get('/me', verifyToken, authController.me);
router.get('/rbac-matrix', verifyToken, authController.rbacMatrix);

module.exports = router;
