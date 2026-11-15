const { PrismaClient, Prisma } = require('@prisma/client');

/**
 * Instancia Singleton de PrismaClient para evitar agotamiento del pool de conexiones
 * durante recargas en caliente (nodemon / desarrollo) y garantizar transacciones ACID en producción.
 */
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__erpConstructoraPrisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__erpConstructoraPrisma = prisma;
}

// Exportación híbrida compatible con CommonJS (require('.../prisma')) y destructuring ({ prisma, Prisma })
prisma.prisma = prisma;
prisma.Prisma = Prisma;
prisma.default = prisma;

module.exports = prisma;

