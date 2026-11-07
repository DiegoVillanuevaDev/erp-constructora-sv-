const express = require('express');
const cors = require('cors');
const authRoutes = require('./modules/auth/auth.routes');
const proyectosRoutes = require('./modules/proyectos/proyectos.routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const app = express();

// Middlewares globales de seguridad y parseo
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Endpoint de verificación de salud y estado operativo de la API
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'ERP de Gestión Integral — Inmobiliaria y Constructora SV',
    version: '1.0.0',
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// Registro de módulos de rutas REST v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/proyectos', proyectosRoutes);

// Manejo de rutas inexistentes (404) y manejador centralizado de errores
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
