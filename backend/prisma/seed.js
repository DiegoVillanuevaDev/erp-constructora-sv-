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

  const usuariosPorRol = {};
  for (const user of usuariosSeed) {
    const usuarioCreado = await prisma.usuario.upsert({
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
    usuariosPorRol[user.rol] = usuarioCreado;
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

  const materialesPorSku = {};
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
    materialesPorSku[item.sku] = material;

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

  // 4. Proyecto inicial de referencia (PROY-SV-001) en fase DISENO con permisos PENDIENTE
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

  // 5. Segundo proyecto de demostración (PROY-SV-002): "Torre Corporativa San Benito"
  // Con los 3 permisos (OPAMSS, MARN, ANDA) en estado APROBADO y en fase OBRA_GRIS
  const proyectoSanBenito = await prisma.proyecto.upsert({
    where: { codigo: 'PROY-SV-002' },
    update: {
      nombre: 'Torre Corporativa San Benito',
      ubicacion: 'Av. La Revolución, Colonia San Benito, San Salvador, El Salvador',
      presupuestoTotal: '4850000.00',
      faseActual: 'OBRA_GRIS',
    },
    create: {
      codigo: 'PROY-SV-002',
      nombre: 'Torre Corporativa San Benito',
      ubicacion: 'Av. La Revolución, Colonia San Benito, San Salvador, El Salvador',
      presupuestoTotal: '4850000.00',
      costoEjecutado: '0.00',
      faseActual: 'OBRA_GRIS',
      fechaInicio: new Date('2025-11-01T00:00:00.000Z'),
      fechaFinEstimada: new Date('2027-08-31T00:00:00.000Z'),
    },
  });

  const permisosAprobadosSanBenito = [
    {
      institucion: 'OPAMSS',
      numeroExpediente: 'OPAMSS-PC-2025-0891',
      observaciones: 'Permiso de construcción y planos estructurales aprobados por OPAMSS.',
    },
    {
      institucion: 'MARN',
      numeroExpediente: 'MARN-NFA-2025-1142',
      observaciones: 'Resolución de Categorización y Permiso Ambiental emitidos por MARN.',
    },
    {
      institucion: 'ANDA',
      numeroExpediente: 'ANDA-FACT-2025-0534',
      observaciones: 'Factibilidad de acueductos y alcantarillados aprobada por ANDA.',
    },
  ];

  for (const perm of permisosAprobadosSanBenito) {
    await prisma.permisoProyecto.upsert({
      where: {
        proyectoId_institucion: {
          proyectoId: proyectoSanBenito.id,
          institucion: perm.institucion,
        },
      },
      update: {
        estado: 'APROBADO',
        numeroExpediente: perm.numeroExpediente,
        fechaEmision: new Date('2025-10-20T00:00:00.000Z'),
        fechaVencimiento: new Date('2027-10-20T00:00:00.000Z'),
        observaciones: perm.observaciones,
      },
      create: {
        proyectoId: proyectoSanBenito.id,
        institucion: perm.institucion,
        estado: 'APROBADO',
        numeroExpediente: perm.numeroExpediente,
        fechaEmision: new Date('2025-10-20T00:00:00.000Z'),
        fechaVencimiento: new Date('2027-10-20T00:00:00.000Z'),
        observaciones: perm.observaciones,
      },
    });
  }

  // Bodega de Obra asociada a Torre Corporativa San Benito y stock trasladado
  const bodegaSanBenito = await prisma.bodega.upsert({
    where: { codigo: 'BOD-PROY-002' },
    update: {
      nombre: 'Bodega de Obra — Torre Corporativa San Benito',
      ubicacion: 'Av. La Revolución, Colonia San Benito, San Salvador',
      proyectoId: proyectoSanBenito.id,
    },
    create: {
      codigo: 'BOD-PROY-002',
      nombre: 'Bodega de Obra — Torre Corporativa San Benito',
      tipo: 'PROYECTO',
      ubicacion: 'Av. La Revolución, Colonia San Benito, San Salvador',
      proyectoId: proyectoSanBenito.id,
    },
  });

  const stockInicialSanBenito = [
    { sku: 'MAT-CEM-001', cantidad: '600.00' },
    { sku: 'MAT-HIE-002', cantidad: '800.00' },
    { sku: 'MAT-ARE-003', cantidad: '90.00' },
    { sku: 'MAT-GRA-004', cantidad: '85.00' },
    { sku: 'MAT-BLO-005', cantidad: '3500.00' },
  ];

  for (const item of stockInicialSanBenito) {
    const material = materialesPorSku[item.sku];
    if (material) {
      await prisma.inventarioBodega.upsert({
        where: {
          bodegaId_materialId: {
            bodegaId: bodegaSanBenito.id,
            materialId: material.id,
          },
        },
        update: {
          cantidadDisponible: item.cantidad,
        },
        create: {
          bodegaId: bodegaSanBenito.id,
          materialId: material.id,
          cantidadDisponible: item.cantidad,
        },
      });
    }
  }

  // Registro de traslado inicial hacia la bodega de obra de Torre Corporativa San Benito
  const usuarioBodeguero = usuariosPorRol.BODEGUERO || usuariosPorRol.ADMIN;
  const trasladoSeed = await prisma.trasladoBodega.upsert({
    where: { codigo: 'TRAS-SEED-SB-001' },
    update: {
      bodegaOrigenId: bodegaCentral.id,
      bodegaDestinoId: bodegaSanBenito.id,
      autorizadoPorId: usuarioBodeguero.id,
      estado: 'COMPLETADO',
      observaciones: 'Abastecimiento inicial de materiales desde Bodega Central hacia Torre Corporativa San Benito.',
    },
    create: {
      codigo: 'TRAS-SEED-SB-001',
      bodegaOrigenId: bodegaCentral.id,
      bodegaDestinoId: bodegaSanBenito.id,
      autorizadoPorId: usuarioBodeguero.id,
      estado: 'COMPLETADO',
      fechaTraslado: new Date('2026-01-10T08:30:00.000Z'),
      observaciones: 'Abastecimiento inicial de materiales desde Bodega Central hacia Torre Corporativa San Benito.',
    },
  });

  for (const item of stockInicialSanBenito) {
    const material = materialesPorSku[item.sku];
    if (material) {
      await prisma.detalleTraslado.upsert({
        where: {
          trasladoId_materialId: {
            trasladoId: trasladoSeed.id,
            materialId: material.id,
          },
        },
        update: {
          cantidad: item.cantidad,
          costoUnitarioSnap: material.costoUnitarioPromedio,
        },
        create: {
          trasladoId: trasladoSeed.id,
          materialId: material.id,
          cantidad: item.cantidad,
          costoUnitarioSnap: material.costoUnitarioPromedio,
        },
      });
    }
  }

  // Partida de obra "Fundición de Losa Nivel 1" (PART-001) en Torre Corporativa San Benito con su receta de materiales
  const partidaLosaNivel1 = await prisma.partidaObra.upsert({
    where: {
      proyectoId_codigo: {
        proyectoId: proyectoSanBenito.id,
        codigo: 'PART-001',
      },
    },
    update: {
      nombre: 'Fundición de Losa Nivel 1',
      faseRequerida: 'OBRA_GRIS',
      presupuestoAsignado: '85000.00',
    },
    create: {
      proyectoId: proyectoSanBenito.id,
      codigo: 'PART-001',
      nombre: 'Fundición de Losa Nivel 1',
      faseRequerida: 'OBRA_GRIS',
      presupuestoAsignado: '85000.00',
      costoMaterialesAcumulado: '0.00',
      porcentajeAvance: '0.00',
    },
  });

  const recetaPartidaLosa = [
    { sku: 'MAT-CEM-001', cantidadTotalRequerida: '300.00' },
    { sku: 'MAT-HIE-002', cantidadTotalRequerida: '450.00' },
    { sku: 'MAT-ARE-003', cantidadTotalRequerida: '40.00' },
    { sku: 'MAT-GRA-004', cantidadTotalRequerida: '45.00' },
  ];

  for (const linea of recetaPartidaLosa) {
    const material = materialesPorSku[linea.sku];
    if (material) {
      await prisma.partidaMaterial.upsert({
        where: {
          partidaId_materialId: {
            partidaId: partidaLosaNivel1.id,
            materialId: material.id,
          },
        },
        update: {
          cantidadTotalRequerida: linea.cantidadTotalRequerida,
        },
        create: {
          partidaId: partidaLosaNivel1.id,
          materialId: material.id,
          cantidadTotalRequerida: linea.cantidadTotalRequerida,
          cantidadConsumidaAcumulada: '0.00',
        },
      });
    }
  }

  // 6. Empleados de demostración para RRHH y Nómina Dual SV (Quincenal Administrativa y Semanal de Campo)
  const empleadosSeed = [
    {
      codigo: 'EMP-ADM-001',
      nombres: 'Héctor Alejandro',
      apellidos: 'Lemus Portillo',
      dui: '04589123-7',
      nit: '04589123-7',
      nup: '281940581920',
      numeroIsss: '109283746',
      cargo: 'Contador General de Proyectos',
      tipoPlanilla: 'ADMINISTRATIVA_QUINCENAL',
      modalidadPago: 'SALARIO_MENSUAL',
      salarioBaseMensual: '1500.00',
      tarifaDiaria: null,
      tarifaUnitariaDestajo: null,
      proyectoAsignadoId: proyectoSanBenito.id,
    },
    {
      codigo: 'EMP-CAM-001',
      nombres: 'José Rigoberto',
      apellidos: 'Hernández Cornejo',
      dui: '02948172-4',
      nit: '02948172-4',
      nup: '391048572911',
      numeroIsss: '204958172',
      cargo: 'Albañil de Obra Gris',
      tipoPlanilla: 'CAMPO_SEMANAL',
      modalidadPago: 'DIA_TRABAJADO',
      salarioBaseMensual: null,
      tarifaDiaria: '25.00',
      tarifaUnitariaDestajo: null,
      proyectoAsignadoId: proyectoSanBenito.id,
    },
    {
      codigo: 'EMP-CAM-002',
      nombres: 'Santos Vladimir',
      apellidos: 'Orellana Mejía',
      dui: '03819204-9',
      nit: '03819204-9',
      nup: '482910495823',
      numeroIsss: '309481726',
      cargo: 'Maestro de Obra (Especialista en Paredes y Repello)',
      tipoPlanilla: 'CAMPO_SEMANAL',
      modalidadPago: 'DESTAJO',
      salarioBaseMensual: null,
      tarifaDiaria: null,
      tarifaUnitariaDestajo: '12.50',
      proyectoAsignadoId: proyectoSanBenito.id,
    },
  ];

  for (const emp of empleadosSeed) {
    await prisma.empleado.upsert({
      where: { codigo: emp.codigo },
      update: {
        nombres: emp.nombres,
        apellidos: emp.apellidos,
        dui: emp.dui,
        nit: emp.nit,
        nup: emp.nup,
        numeroIsss: emp.numeroIsss,
        cargo: emp.cargo,
        tipoPlanilla: emp.tipoPlanilla,
        modalidadPago: emp.modalidadPago,
        salarioBaseMensual: emp.salarioBaseMensual,
        tarifaDiaria: emp.tarifaDiaria,
        tarifaUnitariaDestajo: emp.tarifaUnitariaDestajo,
        proyectoAsignadoId: emp.proyectoAsignadoId,
        activo: true,
      },
      create: {
        codigo: emp.codigo,
        nombres: emp.nombres,
        apellidos: emp.apellidos,
        dui: emp.dui,
        nit: emp.nit,
        nup: emp.nup,
        numeroIsss: emp.numeroIsss,
        cargo: emp.cargo,
        tipoPlanilla: emp.tipoPlanilla,
        modalidadPago: emp.modalidadPago,
        salarioBaseMensual: emp.salarioBaseMensual,
        tarifaDiaria: emp.tarifaDiaria,
        tarifaUnitariaDestajo: emp.tarifaUnitariaDestajo,
        proyectoAsignadoId: emp.proyectoAsignadoId,
        activo: true,
      },
    });
  }

  // 7. Clientes de demostración para Ventas CRM y Facturación Fiscal SV (NATURAL con DUI y JURIDICO con NIT/NRC/Giro)
  await prisma.cliente.upsert({
    where: { dui: '04128934-5' },
    update: {
      tipo: 'NATURAL',
      nombreCompleto: 'Ana Patricia Calderón de Iraheta',
      nit: '04128934-5',
      nrc: null,
      giro: null,
      direccion: 'Colonia Médica, Pje. Dr. Figueroa #14, San Salvador',
      telefono: '+503 7890-4512',
      email: 'pcalderon@correo.com.sv',
    },
    create: {
      tipo: 'NATURAL',
      nombreCompleto: 'Ana Patricia Calderón de Iraheta',
      dui: '04128934-5',
      nit: '04128934-5',
      nrc: null,
      giro: null,
      direccion: 'Colonia Médica, Pje. Dr. Figueroa #14, San Salvador',
      telefono: '+503 7890-4512',
      email: 'pcalderon@correo.com.sv',
    },
  });

  await prisma.cliente.upsert({
    where: { nit: '0614-150812-102-8' },
    update: {
      tipo: 'JURIDICO',
      nombreCompleto: 'Inversiones Cuscatlán S.A. de C.V.',
      nrc: '245890-1',
      giro: 'Desarrollo inmobiliario y arrendamiento de bienes raíces comerciales',
      direccion: 'Av. La Revolución #222, Colonia San Benito, San Salvador',
      telefono: '+503 2248-9000',
      email: 'gerencia@inversionescuscatlan.com.sv',
    },
    create: {
      tipo: 'JURIDICO',
      nombreCompleto: 'Inversiones Cuscatlán S.A. de C.V.',
      dui: null,
      nit: '0614-150812-102-8',
      nrc: '245890-1',
      giro: 'Desarrollo inmobiliario y arrendamiento de bienes raíces comerciales',
      direccion: 'Av. La Revolución #222, Colonia San Benito, San Salvador',
      telefono: '+503 2248-9000',
      email: 'gerencia@inversionescuscatlan.com.sv',
    },
  });

  // 8. Unidades Inmobiliarias de demostración (CASA, APARTAMENTO, LOTE)
  const unidadesSeed = [
    {
      codigo: 'CASA-CE-01',
      proyectoId: proyectoInicial.id,
      tipo: 'CASA',
      areaMetrosCuadrados: '240.00',
      precioLista: '285000.00',
      estado: 'DISPONIBLE',
    },
    {
      codigo: 'APTO-SB-101',
      proyectoId: proyectoSanBenito.id,
      tipo: 'APARTAMENTO',
      areaMetrosCuadrados: '145.50',
      precioLista: '265000.00',
      estado: 'DISPONIBLE',
    },
    {
      codigo: 'LOTE-CE-12',
      proyectoId: proyectoInicial.id,
      tipo: 'LOTE',
      areaMetrosCuadrados: '350.00',
      precioLista: '95000.00',
      estado: 'DISPONIBLE',
    },
  ];

  for (const unidad of unidadesSeed) {
    await prisma.unidadInmobiliaria.upsert({
      where: { codigo: unidad.codigo },
      update: {
        proyectoId: unidad.proyectoId,
        tipo: unidad.tipo,
        areaMetrosCuadrados: unidad.areaMetrosCuadrados,
        precioLista: unidad.precioLista,
      },
      create: {
        codigo: unidad.codigo,
        proyectoId: unidad.proyectoId,
        tipo: unidad.tipo,
        areaMetrosCuadrados: unidad.areaMetrosCuadrados,
        precioLista: unidad.precioLista,
        estado: unidad.estado,
      },
    });
  }

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
