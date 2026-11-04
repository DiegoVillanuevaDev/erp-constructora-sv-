const authService = require('./auth.service');

/**
 * Controlador de registro de nuevo usuario.
 */
const register = async (req, res, next) => {
  try {
    const result = await authService.registerUser(req.body);
    return res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Controlador de inicio de sesión con emisión de JWT.
 */
const login = async (req, res, next) => {
  try {
    const result = await authService.loginUser(req.body);
    return res.status(200).json({
      success: true,
      message: 'Autenticación exitosa.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Controlador para consultar el perfil del usuario autenticado actual.
 */
const me = async (req, res, next) => {
  try {
    const userProfile = await authService.getProfile(req.user.id);
    return res.status(200).json({
      success: true,
      data: userProfile,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Controlador para consultar la matriz de control de acceso basado en roles (RBAC).
 */
const rbacMatrix = async (req, res, next) => {
  try {
    const matrix = authService.getRbacMatrix();
    return res.status(200).json({
      success: true,
      data: {
        currentUserRole: req.user.rol,
        permissionsForCurrentUser: matrix[req.user.rol] || null,
        fullMatrix: matrix,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
  me,
  rbacMatrix,
};
