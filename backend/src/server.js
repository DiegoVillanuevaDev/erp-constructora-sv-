require('dotenv').config();
const app = require('./app');
const prisma = require('./config/prisma');

const PORT = Number(process.env.PORT) || 4000;

let server;

const startServer = async () => {
  try {
    server = app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(
        `[ERP Constructora SV] Servidor API REST ejecutándose en el puerto ${PORT} (${process.env.NODE_ENV || 'development'})`
      );
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[ERP Constructora SV] Error fatal al iniciar el servidor:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
