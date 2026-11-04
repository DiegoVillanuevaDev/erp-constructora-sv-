const AppError = require('../utils/AppError');

/**
 * Middleware para capturar rutas no registradas en la API y delegar un error 404 estandarizado.
 */
const notFoundHandler = (req, res, next) => {
  next(
    AppError.notFound(
      `Ruta no encontrada: [${req.method}] ${req.originalUrl}`,
      'ROUTE_NOT_FOUND'
    )
  );
};

/**
 * Traduce errores nativos de Prisma ORM y JWT en instancias operacionales de AppError.
 */
const normalizeError = (err) => {
  if (err instanceof AppError) {
    return err;
  }

  // Errores conocidos de Prisma Client (Unique Constraint, Foreign Key, Not Found)
  if (err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target)
      ? err.meta.target.join(', ')
      : err.meta?.target || 'campo único';
    return AppError.conflict(
      `Ya existe un registro con el mismo valor en: ${target}.`,
      'PRISMA_UNIQUE_CONSTRAINT',
      { target }
    );
  }

  if (err.code === 'P2025') {
    return AppError.notFound(
      err.meta?.cause || 'El registro solicitado para actualizar o eliminar no existe.',
      'PRISMA_RECORD_NOT_FOUND'
    );
  }

  if (err.code === 'P2003') {
    const fieldName = err.meta?.field_name || 'referencia foránea';
    return AppError.badRequest(
      `Violación de integridad referencial en el campo: ${fieldName}.`,
      'PRISMA_FOREIGN_KEY_CONSTRAINT',
      { fieldName }
    );
  }

  // Errores de autenticación JWT
  if (err.name === 'JsonWebTokenError') {
    return AppError.unauthorized(
      'Token de autenticación inválido o malformado.',
      'JWT_INVALID'
    );
  }

  if (err.name === 'TokenExpiredError') {
    return AppError.unauthorized(
      'Su sesión ha expirado. Por favor inicie sesión nuevamente.',
      'JWT_EXPIRED'
    );
  }

  // Error de sintaxis en body JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return AppError.badRequest(
      'El cuerpo de la petición contiene un formato JSON inválido.',
      'INVALID_JSON_PAYLOAD'
    );
  }

  return new AppError(
    err.message || 'Error interno del servidor.',
    err.statusCode || 500,
    err.errorCode || 'INTERNAL_SERVER_ERROR',
    err.details || null
  );
};

/**
 * Middleware global de manejo centralizado de errores.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const normalizedError = normalizeError(err);
  const statusCode = normalizedError.statusCode || 500;

  const responsePayload = {
    success: false,
    status: normalizedError.status || 'error',
    message: normalizedError.message,
    errorCode: normalizedError.errorCode || 'INTERNAL_SERVER_ERROR',
    details: normalizedError.details || null,
  };

  if (process.env.NODE_ENV === 'development') {
    responsePayload.stack = err.stack;
  }

  return res.status(statusCode).json(responsePayload);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
