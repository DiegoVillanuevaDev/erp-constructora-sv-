const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const AppError = require('../../utils/AppError');
const { JWT_SECRET } = require('../../middlewares/auth.middleware');

const VALID_ROLES = [
  'ADMIN',
  'DIRECTOR_PROYECTO',
  'INGENIERO_RESIDENTE',
  'BODEGUERO',
  'RRHH',
  'VENTAS',
];

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

/**
 * Genera un token JWT firmado con la identidad y rol del usuario.
 */
const generateJwtToken = (usuario) => {
  return jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Registra un nuevo usuario en el sistema ERP validando unicidad de correo y rol válido.
 */
const registerUser = async ({ nombre, email, password, rol = 'INGENIERO_RESIDENTE' }) => {
  if (!nombre || !email || !password) {
    throw AppError.badRequest(
      'Los campos nombre, email y password son obligatorios.',
      'AUTH_VALIDATION_ERROR'
    );
  }

  if (password.length < 6) {
    throw AppError.badRequest(
      'La contraseña debe tener al menos 6 caracteres.',
      'AUTH_WEAK_PASSWORD'
    );
  }

  const normalizedRole = String(rol).toUpperCase().trim();
  if (!VALID_ROLES.includes(normalizedRole)) {
    throw AppError.badRequest(
      `El rol '${rol}' no es válido. Roles permitidos: ${VALID_ROLES.join(', ')}.`,
      'AUTH_INVALID_ROLE',
      { validRoles: VALID_ROLES }
    );
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  const existingUser = await prisma.usuario.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw AppError.conflict(
      `El correo electrónico '${normalizedEmail}' ya está registrado en el sistema.`,
      'AUTH_EMAIL_ALREADY_EXISTS'
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const nuevoUsuario = await prisma.usuario.create({
    data: {
      nombre: String(nombre).trim(),
      email: normalizedEmail,
      passwordHash,
      rol: normalizedRole,
      activo: true,
    },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      createdAt: true,
    },
  });

  const token = generateJwtToken(nuevoUsuario);

  return {
    user: nuevoUsuario,
    token,
  };
};

/**
 * Autentica un usuario existente por email y contraseña.
 */
const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw AppError.badRequest(
      'Debe proporcionar correo electrónico y contraseña.',
      'AUTH_CREDENTIALS_REQUIRED'
    );
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  const usuario = await prisma.usuario.findUnique({
    where: { email: normalizedEmail },
  });

  if (!usuario) {
    throw AppError.unauthorized(
      'Credenciales inválidas. Verifique su correo y contraseña.',
      'AUTH_INVALID_CREDENTIALS'
    );
  }

  if (!usuario.activo) {
    throw AppError.forbidden(
      'Esta cuenta de usuario ha sido deshabilitada.',
      'AUTH_ACCOUNT_DISABLED'
    );
  }

  const passwordMatch = await bcrypt.compare(password, usuario.passwordHash);
  if (!passwordMatch) {
    throw AppError.unauthorized(
      'Credenciales inválidas. Verifique su correo y contraseña.',
      'AUTH_INVALID_CREDENTIALS'
    );
  }

  const userProfile = {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    activo: usuario.activo,
  };

  const token = generateJwtToken(userProfile);

  return {
    user: userProfile,
    token,
  };
};

/**
 * Obtiene el perfil actualizado del usuario autenticado.
 */
const getProfile = async (userId) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!usuario) {
    throw AppError.notFound('Usuario no encontrado.', 'USER_NOT_FOUND');
  }

  return usuario;
};

/**
 * Matriz declarativa de permisos RBAC por rol en el ERP Constructora SV.
 */
const getRbacMatrix = () => {
  return {
    ADMIN: {
      descripcion: 'Control total del ERP, configuración global, usuarios y auditoría.',
      modulosPermitidos: ['PROYECTOS', 'PERMISOS', 'BODEGAS', 'PARTIDAS_OBRA', 'RRHH_PLANILLAS', 'VENTAS_CRM'],
    },
    DIRECTOR_PROYECTO: {
      descripcion: 'Dirección técnica, presupuestos, cambios de fase y gestión de permisos OPAMSS/MARN/ANDA.',
      modulosPermitidos: ['PROYECTOS', 'PERMISOS', 'PARTIDAS_OBRA'],
    },
    INGENIERO_RESIDENTE: {
      descripcion: 'Ejecución de obra en campo, creación de partidas y reportes de avance físico con descarga de materiales.',
      modulosPermitidos: ['PROYECTOS_LECTURA', 'PARTIDAS_OBRA', 'BODEGAS_LECTURA'],
    },
    BODEGUERO: {
      descripcion: 'Control de inventarios multi-sitio, ingresos a bodega central y traslados transaccionales a proyectos.',
      modulosPermitidos: ['BODEGAS', 'MATERIALES', 'TRASLADOS'],
    },
    RRHH: {
      descripcion: 'Gestión de personal administrativo y de obra, cálculo de planillas quincenales/semanales (ISSS, AFP, ISR).',
      modulosPermitidos: ['EMPLEADOS', 'PLANILLAS', 'BOLETAS_PAGO'],
    },
    VENTAS: {
      descripcion: 'Gestión comercial inmobiliaria, clientes, contratos con amortización francesa y facturación fiscal SV (13% IVA).',
      modulosPermitidos: ['CLIENTES', 'UNIDADES_INMOBILIARIAS', 'CONTRATOS_VENTA', 'FACTURACION_FISCAL'],
    },
  };
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  getRbacMatrix,
  VALID_ROLES,
};
