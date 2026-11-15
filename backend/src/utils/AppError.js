/**
 * Clase de error operacional estandarizada para la arquitectura de la API REST.
 * Permite lanzar excepciones semánticas con códigos HTTP, códigos internos y metadatos de auditoría.
 */
class AppError extends Error {
  /**
   * @param {string} message - Mensaje descriptivo del error para el cliente.
   * @param {number} [statusCode=500] - Código de estado HTTP.
   * @param {string} [errorCode='INTERNAL_ERROR'] - Identificador semántico del error.
   * @param {any} [details=null] - Detalles adicionales de validación o contexto.
   */
  constructor(
    message,
    statusCode = 500,
    errorCode = 'INTERNAL_ERROR',
    details = null
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, errorCode = 'BAD_REQUEST', details = null) {
    return new AppError(message, 400, errorCode, details);
  }

  static unauthorized(message = 'No autorizado. Credenciales o token inválido.', errorCode = 'UNAUTHORIZED', details = null) {
    return new AppError(message, 401, errorCode, details);
  }

  static forbidden(message = 'Acceso denegado. No posee permisos suficientes para esta operación.', errorCode = 'FORBIDDEN', details = null) {
    return new AppError(message, 403, errorCode, details);
  }

  static notFound(message = 'El recurso solicitado no fue encontrado.', errorCode = 'NOT_FOUND', details = null) {
    return new AppError(message, 404, errorCode, details);
  }

  static conflict(message = 'Conflicto de estado o duplicidad de datos con el recurso actual.', errorCode = 'CONFLICT', details = null) {
    return new AppError(message, 409, errorCode, details);
  }

  static unprocessable(message = 'Violación de regla de negocio o entidad no procesable.', errorCode = 'UNPROCESSABLE_ENTITY', details = null) {
    return new AppError(message, 422, errorCode, details);
  }
}

module.exports = AppError;
module.exports.AppError = AppError;
