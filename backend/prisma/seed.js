require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/config/prisma');

const DEFAULT_PASSWORD = 'ConstructoraSV2026!';

async function main() {
  // eslint-disable-next-line no-console
  console.log('Iniciando seed de base de datos para ERP Constructora SV...');

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // 1. Usuarios iniciales por cada rol del sistema RBAC
  const usuariosSeed = [
    {
      nombre: 'Administrador General ERP',
      email: 'admin@constructorasv.com',
      rol: 'ADMIN',
    },
    {
      nombre: 'Ing. Roberto Salazar (Director de Proyectos)',
      email: 'director@constructorasv.com',
      rol: 'DIRECTOR_PROYECTO',
    },
    {
      nombre: 'Ing. Carlos Méndez (Ingeniero Residente)',
      email: 'residente@constructorasv.com',
      rol: 'INGENIERO_RESIDENTE',
    },
    {
      nombre: 'Mauricio Quintanilla (Jefe de Bodega)',
      email: 'bodega@constructorasv.com',
      rol: 'BODEGUERO',
    },
    {
      nombre: 'Licda. Claudia Morales (Recursos Humanos)',
      email: 'rrhh@constructorasv.com',
      rol: 'RRHH',
    },
    {
      nombre: 'Licda. Sofía Argueta (Ejecutiva de Ventas)',
      email: 'ventas@constructorasv.com',
      rol: 'VENTAS',
    },
  ];

  for (const user of usuariosSeed) {
    await prisma.usuario.upsert({
      where: { email: user.email },
      update: {
        nombre: user.nombre,
        rol: user.rol,
        activo: true,
      },
      create: {
        nombre: user.nombre,
        email: user.email,
        passwordHash,
        rol: user.rol,
        activo: true,
      },
    });
  }

  // 2. Bodega Central San Salvador
  const bodegaCentral = await prisma.bodega.upsert({
    where: { codigo: 'BOD-CENTRAL-SS' },
    update: {
      nombre: 'Bodega Central San Salvador',
      ubicacion: 'Blvd. del Ejército Nacional Km 5.5, Soyapango, San Salvador',
    },
    create: {
      codigo: 'BOD-CENTRAL-SS',
      nombre: 'Bodega Central San Salvador',
      tipo: 'CENTRAL',
      ubicacion: 'Blvd. del Ejército Nacional Km 5.5, Soyapango, San Salvador',
    },
  });

  // 3. Catálogo de materiales de construcción e inventario inicial en Bodega Central
  const materialesSeed = [
    {
      sku: 'MAT-CEM-001',
      nombre: 'Cemento Portland Tipo I (Bolsa 42.5 kg)',
      unidadMedida: 'BOLSA',
      costoUnitarioPromedio: '9.85',
      stockMinimoAlerta: '200.00',
      stockInicialCentral: '2500.00',
    },
    {
      sku: 'MAT-HIE-002',
      nombre: 'Hierro Corrugado 3/8" Grado 40 (Varilla 6m)',
      unidadMedida: 'VARILLA',
      costoUnitarioPromedio: '6.40',
      stockMinimoAlerta: '300.00',
      stockInicialCentral: '4000.00',
    },
    {
      sku: 'MAT-ARE-003',
      nombre: 'Arena de Río Lavada',
      unidadMedida: 'M3',
      costoUnitarioPromedio: '24.50',
      stockMinimoAlerta: '50.00',
      stockInicialCentral: '500.00',
    },
    {
      sku: 'MAT-GRA-004',
      nombre: 'Grava Triturada 3/4"',
      unidadMedida: 'M3',
      costoUnitarioPromedio: '28.00',
      stockMinimoAlerta: '50.00',
      stockInicialCentral: '450.00',
    },
    {
      sku: 'MAT-BLO-005',
      nombre: 'Bloque de Concreto Estructural 15x20x40 cm',
      unidadMedida: 'UNIDAD',
      costoUnitarioPromedio: '0.78',
      stockMinimoAlerta: '1000.00',
      stockInicialCentral: '15000.00',
    },
  ];

  for (const item of materialesSeed) {
    const material = await prisma.material.upsert({
      where: { sku: item.sku },
      update: {
        nombre: item.nombre,
        unidadMedida: item.unidadMedida,
        costoUnitarioPromedio: item.costoUnitarioPromedio,
        stockMinimoAlerta: item.stockMinimoAlerta,
      },
      create: {
        sku: item.sku,
        nombre: item.nombre,
        unidadMedida: item.unidadMedida,
        costoUnitarioPromedio: item.costoUnitarioPromedio,
        stockMinimoAlerta: item.stockMinimoAlerta,
      },
    });

    await prisma.inventarioBodega.upsert({
      where: {
        bodegaId_materialId: {
          bodegaId: bodegaCentral.id,
          materialId: material.id,
        },
      },
      update: {
        cantidadDisponible: item.stockInicialCentral,
      },
      create: {
        bodegaId: bodegaCentral.id,
        materialId: material.id,
        cantidadDisponible: item.stockInicialCentral,
      },
    });
  }

  // 4. Proyecto inicial de referencia con sus 3 permisos regulatorios salvadoreños
  const proyectoInicial = await prisma.proyecto.upsert({
    where: { codigo: 'PROY-SV-001' },
    update: {
      nombre: 'Residencial Cumbres de Escalón',
      ubicacion: 'Colonia Escalón Norte, San Salvador, El Salvador',
      presupuestoTotal: '2450000.00',
    },
    create: {
      codigo: 'PROY-SV-001',
      nombre: 'Residencial Cumbres de Escalón',
      ubicacion: 'Colonia Escalón Norte, San Salvador, El Salvador',
      presupuestoTotal: '2450000.00',
      costoEjecutado: '0.00',
      faseActual: 'DISENO',
      fechaInicio: new Date('2026-01-15T00:00:00.000Z'),
      fechaFinEstimada: new Date('2027-06-30T00:00:00.000Z'),
    },
  });

  const instituciones = ['OPAMSS', 'MARN', 'ANDA'];
  for (const institucion of instituciones) {
    await prisma.permisoProyecto.upsert({
      where: {
        proyectoId_institucion: {
          proyectoId: proyectoInicial.id,
          institucion,
        },
      },
      update: {},
      create: {
        proyectoId: proyectoInicial.id,
        institucion,
        estado: 'PENDIENTE',
        observaciones: `Trámite inicial de factibilidad ante ${institucion}`,
      },
    });
  }

  // Bodega asociada al proyecto inicial
  await prisma.bodega.upsert({
    where: { codigo: 'BOD-PROY-001' },
    update: {
      proyectoId: proyectoInicial.id,
    },
    create: {
      codigo: 'BOD-PROY-001',
      nombre: 'Bodega de Obra — Residencial Cumbres de Escalón',
      tipo: 'PROYECTO',
      ubicacion: 'Colonia Escalón Norte, San Salvador',
      proyectoId: proyectoInicial.id,
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed completado exitosamente.');
}

if (require.main === module) {
  main()
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error('Error ejecutando seed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { main };
