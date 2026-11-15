const express = require('express');
const cors = require('cors');
const { swaggerSpec } = require('./config/swagger');
const authRoutes = require('./modules/auth/auth.routes');
const proyectosRoutes = require('./modules/proyectos/proyectos.routes');
const bodegasRoutes = require('./modules/bodegas/bodegas.routes');
const partidasRoutes = require('./modules/partidas/partidas.routes');
const planillasRoutes = require('./modules/planillas/planillas.routes');
const ventasRoutes = require('./modules/ventas/ventas.routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

let swaggerUi = null;
try {
  // eslint-disable-next-line global-require
  swaggerUi = require('swagger-ui-express');
} catch (_err) {
  swaggerUi = null;
}

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

// Especificación OpenAPI 3.0.3 en formato JSON puro
app.get('/api/v1/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(swaggerSpec);
});

// Interfaz interactiva Swagger UI (/api/v1/docs) con fallback CDN resiliente
if (swaggerUi && typeof swaggerUi.serve !== 'undefined' && typeof swaggerUi.setup === 'function') {
  app.use(
    '/api/v1/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'ERP Constructora SV — OpenAPI Docs',
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
      },
    })
  );
} else {
  app.get('/api/v1/docs', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(`<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ERP Constructora SV — OpenAPI Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = function () {
        SwaggerUIBundle({
          url: '/api/v1/docs.json',
          dom_id: '#swagger-ui',
          persistAuthorization: true,
        });
      };
    </script>
  </body>
</html>`);
  });
}

// Registro de módulos de rutas REST v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/proyectos', proyectosRoutes);
app.use('/api/v1/bodegas', bodegasRoutes);
app.use('/api/v1/partidas', partidasRoutes);
app.use('/api/v1/planillas', planillasRoutes);
app.use('/api/v1/ventas', ventasRoutes);

// Manejo de rutas inexistentes (404) y manejador centralizado de errores
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
