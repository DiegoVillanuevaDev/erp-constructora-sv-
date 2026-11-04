const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');

const JWT_SECRET = process.env.JWT_SECRET || 'erp_constructora_sv_jwt_secret_key_2026_production_grade';

/**
 * Middleware de autenticación JWT.
 * Extrae y valida el token Bearer, verifica que el usuario exista y esté activo en base de datos,
 * e inyecta el contexto de identidad en `req.user`.
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized(
        'Acceso no autorizado. Se requiere un token de autenticación en el encabezado Authorization (Bearer <token>).',
        'AUTH_TOKEN_MISSING'
      );
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw AppError.unauthorized(
        'Formato de token Bearer inválido.',
        'AUTH_TOKEN_MALFORMED'
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
      },
    });

    if (!usuario) {
      throw AppError.unauthorized(
        'El usuario asociado a este token ya no existe en el sistema.',
        'AUTH_USER_NOT_FOUND'
      );
    }

    if (!usuario.activo) {
      throw AppError.forbidden(
        'La cuenta de usuario se encuentra desactivada. Contacte al Administrador del ERP.',
        'AUTH_USER_INACTIVE'
      );
    }

    req.user = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Middleware de fábrica para Control de Acceso Basado en Roles (RBAC).
 * Restringe el acceso a un endpoint únicamente a los roles especificados en `allowedRoles`.
 *
 * @param  {...string} allowedRoles - Lista de roles permitidos del enum RolUsuario.
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.rol) {
        throw AppError.unauthorized(
          'No se encontró contexto de usuario autenticado para validar permisos RBAC.',
          'RBAC_USER_CONTEXT_MISSING'
        );
      }

      if (!allowedRoles.includes(req.user.rol)) {
        throw AppError.forbidden(
          `Acceso denegado para el rol '${req.user.rol}'. Esta operación requiere uno de los siguientes roles: [${allowedRoles.join(', ')}].`,
          'RBAC_INSUFFICIENT_ROLE',
          {
            currentRole: req.user.rol,
            allowedRoles,
          }
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

module.exports = {
  verifyToken,
  authorizeRoles,
  JWT_SECRET,
};
