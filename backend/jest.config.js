/**
 * Configuración oficial de Jest para la suite de pruebas automatizadas
 * del ERP de Gestión Integral — Inmobiliaria y Constructora SV (Backend API).
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  clearMocks: true,
  verbose: true,
  testTimeout: 15000,
};
