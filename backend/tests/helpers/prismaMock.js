const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../src/middlewares/auth.middleware');

/**
 * Usuarios semilla en memoria para los 6 roles oficiales del ERP Constructora SV.
 */
const MOCK_USERS_BY_ROLE = {
  ADMIN: {
    id: 'usr-admin-001',
    nombre: 'Ing. Roberto Salazar (Admin)',
    email: 'admin@constructora-sv.com',
    rol: 'ADMIN',
    activo: true,
  },
  DIRECTOR_PROYECTO: {
    id: 'usr-director-001',
    nombre: 'Arq. Claudia Mendoza (Directora)',
    email: 'director@constructora-sv.com',
    rol: 'DIRECTOR_PROYECTO',
    activo: true,
  },
  INGENIERO_RESIDENTE: {
    id: 'usr-residente-001',
    nombre: 'Ing. Carlos Rivas (Residente)',
    email: 'residente@constructora-sv.com',
    rol: 'INGENIERO_RESIDENTE',
    activo: true,
  },
  BODEGUERO: {
    id: 'usr-bodega-001',
    nombre: 'Sr. Mauricio Hernández (Bodega)',
    email: 'bodega@constructora-sv.com',
    rol: 'BODEGUERO',
    activo: true,
  },
  RRHH: {
    id: 'usr-rrhh-001',
    nombre: 'Licda. Sofía Villalta (RRHH)',
    email: 'rrhh@constructora-sv.com',
    rol: 'RRHH',
    activo: true,
  },
  VENTAS: {
    id: 'usr-ventas-001',
    nombre: 'Lic. Fernando Cáceres (Ventas)',
    email: 'ventas@constructora-sv.com',
    rol: 'VENTAS',
    activo: true,
  },
};

/**
 * Genera un token JWT firmado válido para pruebas de integración Supertest según el rol solicitado.
 *
 * @param {'ADMIN'|'DIRECTOR_PROYECTO'|'INGENIERO_RESIDENTE'|'BODEGUERO'|'RRHH'|'VENTAS'} rol
 * @param {object} [overrides]
 * @returns {string} Token JWT firmado
 */
const generateTestToken = (rol = 'ADMIN', overrides = {}) => {
  const baseUser = MOCK_USERS_BY_ROLE[rol] || MOCK_USERS_BY_ROLE.ADMIN;
  const payload = {
    id: baseUser.id,
    nombre: baseUser.nombre,
    email: baseUser.email,
    rol: baseUser.rol,
    ...overrides,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
};

/**
 * Crea un delegado mock de modelo Prisma con todas las operaciones CRUD estándar.
 */
const createModelMock = () => ({
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  createMany: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
});

/**
 * Instancia Mock transaccional en memoria de PrismaClient.
 * Soporta `prisma.$transaction(fn, options)` pasando el mismo `prismaMock` como cliente transaccional `tx`
 * o resolviendo arreglos de promesas, garantizando 0 dependencia de un motor PostgreSQL externo.
 */
const prismaMock = {
  usuario: createModelMock(),
  proyecto: createModelMock(),
  permisoProyecto: createModelMock(),
  material: createModelMock(),
  bodega: createModelMock(),
  inventarioBodega: createModelMock(),
  trasladoBodega: createModelMock(),
  detalleTraslado: createModelMock(),
  partidaObra: createModelMock(),
  partidaMaterial: createModelMock(),
  reporteAvancePartida: createModelMock(),
  empleado: createModelMock(),
  planilla: createModelMock(),
  boletaPago: createModelMock(),
  cliente: createModelMock(),
  unidadInmobiliaria: createModelMock(),
  contratoVenta: createModelMock(),
  cuotaPago: createModelMock(),
  documentoFiscalVenta: createModelMock(),
  $transaction: jest.fn(async (arg) => {
    if (typeof arg === 'function') {
      return arg(prismaMock);
    }
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return arg;
  }),
  $connect: jest.fn(async () => undefined),
  $disconnect: jest.fn(async () => undefined),
};

// Compatibilidad híbrida con destructuring ({ prisma }) o import default
prismaMock.prisma = prismaMock;
prismaMock.default = prismaMock;

/**
 * Restaura las implementaciones por defecto de autenticación y transacciones antes de cada test.
 */
const resetPrismaMock = () => {
  prismaMock.$transaction.mockImplementation(async (arg) => {
    if (typeof arg === 'function') {
      return arg(prismaMock);
    }
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return arg;
  });

  // Por defecto, resolver cualquier usuario de los 6 roles oficiales en verifyToken
  prismaMock.usuario.findUnique.mockImplementation(async ({ where }) => {
    if (!where) return null;
    const allUsers = Object.values(MOCK_USERS_BY_ROLE);
    if (where.id) {
      return allUsers.find((u) => u.id === where.id) || null;
    }
    if (where.email) {
      return allUsers.find((u) => u.email === where.email) || null;
    }
    return null;
  });
};

// Inicializar comportamiento base al cargar el módulo
resetPrismaMock();

module.exports = {
  prismaMock,
  MOCK_USERS_BY_ROLE,
  generateTestToken,
  resetPrismaMock,
};
