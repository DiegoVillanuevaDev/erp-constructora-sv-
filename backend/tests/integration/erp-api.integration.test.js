const request = require('supertest');
const {
  prismaMock,
  generateTestToken,
  resetPrismaMock,
} = require('../helpers/prismaMock');

// Interceptar PrismaClient antes de cargar la aplicación Express
jest.mock('../../src/config/prisma', () => require('../helpers/prismaMock').prismaMock);

const app = require('../../src/app');

describe('Suite de Integración HTTP (Supertest) — ERP Inmobiliaria y Constructora SV', () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  // ============================================================================
  // 1. SALUD DEL SISTEMA Y DOCUMENTACIÓN OPENAPI 3.0.3
  // ============================================================================
  describe('1. Salud y Documentación OpenAPI (/api/v1/health y /api/v1/docs.json)', () => {
    test('GET /api/v1/health debe responder 200 OK con el estado operativo del ERP', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('OK');
      expect(res.body.service).toContain('ERP');
    });

    test('GET /api/v1/docs.json debe responder 200 OK con la especificación OpenAPI 3.0.3', async () => {
      const res = await request(app).get('/api/v1/docs.json');

      expect(res.statusCode).toBe(200);
      expect(res.body.openapi).toBe('3.0.3');
      expect(res.body.info).toBeDefined();
      expect(res.body.paths).toBeDefined();
    });
  });

  // ============================================================================
  // 2. SEGURIDAD JWT Y MATRIZ RBAC (6 ROLES)
  // ============================================================================
  describe('2. Seguridad JWT y Control de Acceso Basado en Roles (RBAC)', () => {
    test('Debe rechazar con 401 AUTH_TOKEN_MISSING cualquier petición sin encabezado Authorization Bearer', async () => {
      const res = await request(app).get('/api/v1/proyectos');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('AUTH_TOKEN_MISSING');
    });

    test('Debe rechazar con 403 cuando un rol no autorizado (VENTAS) intenta operar un módulo ajeno (traslados de bodega o creación de proyectos)', async () => {
      const tokenVentas = generateTestToken('VENTAS');

      // Intento 1: VENTAS intentando ejecutar un traslado de bodega (restringido a ADMIN y BODEGUERO)
      const resTraslado = await request(app)
        .post('/api/v1/bodegas/traslados')
        .set('Authorization', `Bearer ${tokenVentas}`)
        .send({
          bodegaOrigenId: 'bod-central-001',
          bodegaDestinoId: 'bod-proy-001',
          items: [{ materialId: 'mat-001', cantidad: 10 }],
        });

      expect(resTraslado.statusCode).toBe(403);
      expect(resTraslado.body.success).toBe(false);
      expect(resTraslado.body.errorCode).toMatch(/^RBAC_INSUFFICIENT_(ROLE|PERMISSIONS)$/);
      expect(resTraslado.body.details.currentRole).toBe('VENTAS');

      // Intento 2: VENTAS intentando crear un proyecto (restringido a ADMIN y DIRECTOR_PROYECTO)
      const resProyecto = await request(app)
        .post('/api/v1/proyectos')
        .set('Authorization', `Bearer ${tokenVentas}`)
        .send({
          codigo: 'PROY-NO-AUTH',
          nombre: 'Proyecto No Autorizado',
          ubicacion: 'San Salvador',
          presupuestoTotal: 500000,
          fechaInicio: '2026-11-15',
        });

      expect(resProyecto.statusCode).toBe(403);
      expect(resProyecto.body.success).toBe(false);
      expect(resProyecto.body.errorCode).toMatch(/^RBAC_INSUFFICIENT_(ROLE|PERMISSIONS)$/);
    });
  });

  // ============================================================================
  // 3. MÓDULO 1: GUARDIA REGULATORIA SV EN /api/v1/proyectos/:id/fase
  // ============================================================================
  describe('3. Módulo 1: Guardia Regulatoria SV (OPAMSS, MARN, ANDA) en /api/v1/proyectos/:id/fase', () => {
    const tokenDirector = generateTestToken('DIRECTOR_PROYECTO');
    const proyectoId = 'proy-sv-001';

    test('Debe bloquear con 422 LEGAL_PERMITS_NOT_APPROVED el paso de DISENO a TERRACERIA cuando MARN o ANDA no están en APROBADO', async () => {
      prismaMock.proyecto.findUnique.mockResolvedValueOnce({
        id: proyectoId,
        codigo: 'TORRE-ESCALON-01',
        nombre: 'Torre Corporativa Escalón',
        ubicacion: 'Colonia Escalón, San Salvador',
        faseActual: 'DISENO',
        permisos: [
          { institucion: 'OPAMSS', estado: 'APROBADO', numeroExpediente: 'OPAMSS-2026-101' },
          { institucion: 'MARN', estado: 'EN_TRAMITE', numeroExpediente: 'MARN-2026-202' },
          { institucion: 'ANDA', estado: 'PENDIENTE', numeroExpediente: null },
        ],
        bodega: { id: 'bod-proy-001', codigo: 'BOD-TORRE-ESCALON-01', tipo: 'PROYECTO' },
      });

      const res = await request(app)
        .patch(`/api/v1/proyectos/${proyectoId}/fase`)
        .set('Authorization', `Bearer ${tokenDirector}`)
        .send({ nuevaFase: 'TERRACERIA' });

      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('LEGAL_PERMITS_NOT_APPROVED');
      expect(res.body.details.aprobados).toBe(1);
      expect(res.body.details.totalRequeridos).toBe(3);
      expect(res.body.details.permisosBloqueantes).toHaveLength(2);
      expect(prismaMock.proyecto.update).not.toHaveBeenCalled();
    });

    test('Debe permitir la transición 200 OK a TERRACERIA cuando OPAMSS, MARN y ANDA están los 3 en APROBADO', async () => {
      const permisosAprobados = [
        { institucion: 'OPAMSS', estado: 'APROBADO', numeroExpediente: 'OPAMSS-2026-101' },
        { institucion: 'MARN', estado: 'APROBADO', numeroExpediente: 'MARN-2026-202' },
        { institucion: 'ANDA', estado: 'APROBADO', numeroExpediente: 'ANDA-2026-303' },
      ];

      prismaMock.proyecto.findUnique.mockResolvedValueOnce({
        id: proyectoId,
        codigo: 'TORRE-ESCALON-01',
        nombre: 'Torre Corporativa Escalón',
        ubicacion: 'Colonia Escalón, San Salvador',
        faseActual: 'DISENO',
        permisos: permisosAprobados,
        bodega: { id: 'bod-proy-001', codigo: 'BOD-TORRE-ESCALON-01', tipo: 'PROYECTO' },
      });

      prismaMock.proyecto.update.mockResolvedValueOnce({
        id: proyectoId,
        codigo: 'TORRE-ESCALON-01',
        nombre: 'Torre Corporativa Escalón',
        ubicacion: 'Colonia Escalón, San Salvador',
        faseActual: 'TERRACERIA',
        permisos: permisosAprobados,
        bodega: { id: 'bod-proy-001', codigo: 'BOD-TORRE-ESCALON-01', tipo: 'PROYECTO' },
        _count: { partidas: 3, empleadosAsignados: 12, unidadesInmobiliarias: 20 },
      });

      const res = await request(app)
        .patch(`/api/v1/proyectos/${proyectoId}/fase`)
        .set('Authorization', `Bearer ${tokenDirector}`)
        .send({ nuevaFase: 'TERRACERIA' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.faseActual).toBe('TERRACERIA');
      expect(res.body.data.estadoRegulatorio.habilitadoParaConstruccion).toBe(true);
      expect(res.body.data.estadoRegulatorio.aprobados).toBe(3);
    });
  });

  // ============================================================================
  // 4. MÓDULO 2: TRASLADO MULTI-BODEGA TRANSACCIONAL EN /api/v1/bodegas/traslados
  // ============================================================================
  describe('4. Módulo 2: Traslado Multi-bodega Transaccional (/api/v1/bodegas/traslados)', () => {
    const tokenBodeguero = generateTestToken('BODEGUERO');

    const bodegaCentral = {
      id: 'bod-central-sv',
      codigo: 'BOD-CENTRAL-SV',
      nombre: 'Bodega Central Corporativa — San Salvador',
      tipo: 'CENTRAL',
    };

    const bodegaProyecto = {
      id: 'bod-proy-001',
      codigo: 'BOD-TORRE-ESCALON-01',
      nombre: 'Bodega de Obra — Torre Escalón',
      tipo: 'PROYECTO',
      proyectoId: 'proy-sv-001',
    };

    const materialCemento = {
      id: 'mat-cemento-001',
      sku: 'CEM-PORTLAND-42.5KG',
      nombre: 'Cemento Portland Tipo I (Bolsa 42.5 kg)',
      unidadMedida: 'BOLSA',
      costoUnitarioPromedio: '9.50',
      stockMinimoAlerta: '100.00',
    };

    test('Debe bloquear con 422 INSUFFICIENT_WAREHOUSE_STOCK cuando la Bodega Central no tiene stock suficiente', async () => {
      prismaMock.bodega.findUnique
        .mockResolvedValueOnce(bodegaCentral)
        .mockResolvedValueOnce(bodegaProyecto);

      prismaMock.material.findUnique.mockResolvedValueOnce(materialCemento);

      // Solo hay 40 bolsas disponibles en Bodega Central y se solicitan 150
      prismaMock.inventarioBodega.findUnique.mockResolvedValueOnce({
        id: 'inv-orig-001',
        bodegaId: bodegaCentral.id,
        materialId: materialCemento.id,
        cantidadDisponible: '40.00',
      });

      const res = await request(app)
        .post('/api/v1/bodegas/traslados')
        .set('Authorization', `Bearer ${tokenBodeguero}`)
        .send({
          bodegaOrigenId: bodegaCentral.id,
          bodegaDestinoId: bodegaProyecto.id,
          observaciones: 'Intento de traslado excediendo stock central',
          items: [{ materialId: materialCemento.id, cantidad: 150 }],
        });

      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('INSUFFICIENT_WAREHOUSE_STOCK');
      expect(res.body.details.stockDisponible).toBe(40);
      expect(res.body.details.cantidadSolicitada).toBe(150);
      expect(res.body.details.faltante).toBe(110);
      expect(prismaMock.trasladoBodega.create).not.toHaveBeenCalled();
    });

    test('Debe ejecutar el traslado exitoso 201 Created descontando en Bodega Central y sumando en la Bodega del Proyecto', async () => {
      prismaMock.bodega.findUnique
        .mockResolvedValueOnce(bodegaCentral)
        .mockResolvedValueOnce(bodegaProyecto);

      prismaMock.material.findUnique.mockResolvedValueOnce(materialCemento);

      // Stock inicial en Bodega Central: 500 bolsas; se trasladan 200 bolsas -> quedan 300
      prismaMock.inventarioBodega.findUnique.mockResolvedValueOnce({
        id: 'inv-orig-001',
        bodegaId: bodegaCentral.id,
        materialId: materialCemento.id,
        cantidadDisponible: '500.00',
      });

      prismaMock.inventarioBodega.update.mockResolvedValueOnce({
        id: 'inv-orig-001',
        bodegaId: bodegaCentral.id,
        materialId: materialCemento.id,
        cantidadDisponible: '300.00',
      });

      prismaMock.inventarioBodega.upsert.mockResolvedValueOnce({
        id: 'inv-dest-001',
        bodegaId: bodegaProyecto.id,
        materialId: materialCemento.id,
        cantidadDisponible: '200.00',
      });

      prismaMock.trasladoBodega.create.mockResolvedValueOnce({
        id: 'tras-001',
        codigo: 'TRAS-SV-2026-001',
        bodegaOrigenId: bodegaCentral.id,
        bodegaDestinoId: bodegaProyecto.id,
        autorizadoPorId: 'usr-bodega-001',
        estado: 'COMPLETADO',
        fechaTraslado: new Date().toISOString(),
        observaciones: 'Abastecimiento de cemento para cimentación',
        bodegaOrigen: bodegaCentral,
        bodegaDestino: bodegaProyecto,
        autorizadoPor: {
          id: 'usr-bodega-001',
          nombre: 'Sr. Mauricio Hernández (Bodega)',
          email: 'bodega@constructora-sv.com',
          rol: 'BODEGUERO',
        },
        detalles: [
          {
            id: 'det-tras-001',
            materialId: materialCemento.id,
            cantidad: '200.00',
            costoUnitarioSnap: '9.50',
            material: materialCemento,
          },
        ],
      });

      const res = await request(app)
        .post('/api/v1/bodegas/traslados')
        .set('Authorization', `Bearer ${tokenBodeguero}`)
        .send({
          codigo: 'TRAS-SV-2026-001',
          bodegaOrigenId: bodegaCentral.id,
          bodegaDestinoId: bodegaProyecto.id,
          observaciones: 'Abastecimiento de cemento para cimentación',
          items: [{ materialId: materialCemento.id, cantidad: 200 }],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.estado).toBe('COMPLETADO');
      expect(res.body.data.valorTotalTraslado).toBe(1900.0); // 200 * $9.50
      expect(res.body.data.saldosActualizados).toEqual([
        expect.objectContaining({
          materialId: materialCemento.id,
          cantidadTrasladada: 200,
          saldoBodegaOrigen: 300,
          saldoBodegaDestino: 200,
        }),
      ]);
    });
  });

  // ============================================================================
  // 5. MÓDULO 3: AVANCE DE OBRA Y EXPLOSIÓN DE MATERIALES (/api/v1/partidas/:id/avances)
  // ============================================================================
  describe('5. Módulo 3: Avance de Obra y Explosión de Materiales (/api/v1/partidas/:id/avances)', () => {
    const tokenResidente = generateTestToken('INGENIERO_RESIDENTE');
    const partidaId = 'part-fundaciones-001';

    const basePartidaActiva = {
      id: partidaId,
      proyectoId: 'proy-sv-001',
      codigo: 'PART-OBG-01',
      nombre: 'Cimentación y Zapatas Corridas',
      faseRequerida: 'OBRA_GRIS',
      presupuestoAsignado: '10000.00',
      porcentajeAvance: '20.00',
      costoMaterialesAcumulado: '380.00',
      proyecto: {
        id: 'proy-sv-001',
        codigo: 'TORRE-ESCALON-01',
        nombre: 'Torre Corporativa Escalón',
        faseActual: 'OBRA_GRIS',
        presupuestoTotal: '500000.00',
        costoEjecutado: '15000.00',
        permisos: [
          { institucion: 'OPAMSS', estado: 'APROBADO' },
          { institucion: 'MARN', estado: 'APROBADO' },
          { institucion: 'ANDA', estado: 'APROBADO' },
        ],
        bodega: {
          id: 'bod-proy-001',
          codigo: 'BOD-TORRE-ESCALON-01',
          nombre: 'Bodega de Obra — Torre Escalón',
          tipo: 'PROYECTO',
        },
      },
      recetaMateriales: [
        {
          id: 'rec-linea-001',
          partidaId,
          materialId: 'mat-cemento-001',
          cantidadTotalRequerida: '200.00',
          cantidadConsumidaAcumulada: '40.00',
          material: {
            id: 'mat-cemento-001',
            sku: 'CEM-PORTLAND-42.5KG',
            nombre: 'Cemento Portland Tipo I',
            unidadMedida: 'BOLSA',
            costoUnitarioPromedio: '9.50',
          },
        },
      ],
    };

    test('Debe bloquear con 422 PROGRESS_MUST_INCREASE si el porcentajeNuevo no supera el porcentajeAvance actual', async () => {
      prismaMock.partidaObra.findUnique.mockResolvedValueOnce(basePartidaActiva);

      const res = await request(app)
        .post(`/api/v1/partidas/${partidaId}/avances`)
        .set('Authorization', `Bearer ${tokenResidente}`)
        .send({
          porcentajeNuevo: 15, // Menor al 20.00% actual
          observaciones: 'Intento de retroceso inválido',
        });

      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('PROGRESS_MUST_INCREASE');
      expect(res.body.details.porcentajeAvanceActual).toBe(20);
      expect(res.body.details.porcentajeSolicitado).toBe(15);
    });

    test('Debe bloquear con 422 INSUFFICIENT_PROJECT_STOCK si falta material en la bodega del proyecto para cubrir el delta de avance', async () => {
      prismaMock.partidaObra.findUnique.mockResolvedValueOnce(basePartidaActiva);

      // Pasar de 20% a 50% (delta = 30%) sobre receta de 200 bolsas requiere 60 bolsas.
      // Simulamos que la bodega del proyecto solo tiene 25 bolsas disponibles.
      prismaMock.inventarioBodega.findMany.mockResolvedValueOnce([
        {
          id: 'inv-proy-001',
          bodegaId: 'bod-proy-001',
          materialId: 'mat-cemento-001',
          cantidadDisponible: '25.00',
        },
      ]);

      const res = await request(app)
        .post(`/api/v1/partidas/${partidaId}/avances`)
        .set('Authorization', `Bearer ${tokenResidente}`)
        .send({
          porcentajeNuevo: 50,
          observaciones: 'Avance al 50% sin stock suficiente en obra',
        });

      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('INSUFFICIENT_PROJECT_STOCK');
      expect(res.body.details.faltantes).toEqual([
        expect.objectContaining({
          materialId: 'mat-cemento-001',
          requerido: 60,
          disponible: 25,
          faltante: 35,
        }),
      ]);
    });

    test('Debe registrar el avance exitoso 201 Created descontando stock proporcional y acumulando costoEjecutado en el proyecto', async () => {
      prismaMock.partidaObra.findUnique
        .mockResolvedValueOnce(basePartidaActiva) // Lectura inicial de la partida en la transacción
        .mockResolvedValueOnce({
          // Lectura final enriquecida tras actualizar
          ...basePartidaActiva,
          porcentajeAvance: '50.00',
          costoMaterialesAcumulado: '950.00', // $380.00 + $570.00 (60 bolsas * $9.50)
          recetaMateriales: [
            {
              ...basePartidaActiva.recetaMateriales[0],
              cantidadConsumidaAcumulada: '100.00',
            },
          ],
          _count: { reportesAvance: 2 },
        });

      // Hay 150 bolsas en la bodega de obra; se consumen 60 bolsas -> restan 90 bolsas
      prismaMock.inventarioBodega.findMany.mockResolvedValueOnce([
        {
          id: 'inv-proy-001',
          bodegaId: 'bod-proy-001',
          materialId: 'mat-cemento-001',
          cantidadDisponible: '150.00',
        },
      ]);

      prismaMock.inventarioBodega.updateMany.mockResolvedValueOnce({ count: 1 });
      prismaMock.partidaMaterial.update.mockResolvedValueOnce({
        id: 'rec-linea-001',
        cantidadConsumidaAcumulada: '100.00',
      });
      prismaMock.partidaObra.updateMany.mockResolvedValueOnce({ count: 1 });

      // Proyecto incrementa su costoEjecutado en $570.00 ($15,000.00 -> $15,570.00)
      prismaMock.proyecto.update.mockResolvedValueOnce({
        id: 'proy-sv-001',
        codigo: 'TORRE-ESCALON-01',
        nombre: 'Torre Corporativa Escalón',
        faseActual: 'OBRA_GRIS',
        presupuestoTotal: '500000.00',
        costoEjecutado: '15570.00',
      });

      prismaMock.reporteAvancePartida.create.mockResolvedValueOnce({
        id: 'rep-av-002',
        partidaId,
        ingenieroId: 'usr-residente-001',
        porcentajeAnterior: '20.00',
        porcentajeNuevo: '50.00',
        deltaPorcentaje: '30.00',
        costoMaterialesDelta: '570.00',
        observaciones: 'Colado de zapatas ejes A-D completado al 50%',
        fechaReporte: new Date().toISOString(),
        ingeniero: {
          id: 'usr-residente-001',
          nombre: 'Ing. Carlos Rivas (Residente)',
          email: 'residente@constructora-sv.com',
          rol: 'INGENIERO_RESIDENTE',
        },
      });

      const res = await request(app)
        .post(`/api/v1/partidas/${partidaId}/avances`)
        .set('Authorization', `Bearer ${tokenResidente}`)
        .send({
          porcentajeNuevo: 50,
          observaciones: 'Colado de zapatas ejes A-D completado al 50%',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.costoMaterialesDelta).toBe(570.0);
      expect(res.body.data.costoEjecutadoProyecto).toBe(15570.0);
      expect(res.body.data.consumoMateriales).toEqual([
        expect.objectContaining({
          materialId: 'mat-cemento-001',
          consumoDelta: 60,
          subtotal: 570.0,
          consumidoAcumulado: 100,
          stockRestanteBodegaProyecto: 90,
        }),
      ]);
    });
  });

  // ============================================================================
  // 6. MÓDULO 4: SIMULACIÓN Y GENERACIÓN DE PLANILLA DUAL SV (/api/v1/planillas)
  // ============================================================================
  describe('6. Módulo 4: Simulación y Generación de Planilla Dual SV (/api/v1/planillas)', () => {
    const tokenRrhh = generateTestToken('RRHH');

    test('POST /api/v1/planillas/calcular-simulacion debe responder 200 OK con el desglose exacto ISSS, AFP e ISR', async () => {
      const res = await request(app)
        .post('/api/v1/planillas/calcular-simulacion')
        .set('Authorization', `Bearer ${tokenRrhh}`)
        .send({
          ingresoBruto: 1500.0,
          tipoPlanilla: 'ADMINISTRATIVA_QUINCENAL',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.descuentoIsss).toBe(15.0);
      expect(res.body.data.descuentoAfp).toBe(108.75);
      expect(res.body.data.rentaGravada).toBe(1376.25);
      expect(res.body.data.descuentoRenta).toBe(251.44);
      expect(res.body.data.liquidoPagar).toBe(1124.81);
    });

    test('POST /api/v1/planillas debe responder 201 Created generando la planilla y sus boletas de pago en transacción ACID', async () => {
      prismaMock.planilla.findUnique.mockResolvedValueOnce(null);

      prismaMock.empleado.findMany.mockResolvedValueOnce([
        {
          id: 'emp-admin-001',
          codigo: 'EMP-ADM-001',
          nombres: 'Ana Gabriela',
          apellidos: 'Martínez',
          dui: '04567890-1',
          cargo: 'Gerente Financiera',
          tipoPlanilla: 'ADMINISTRATIVA_QUINCENAL',
          modalidadPago: 'SALARIO_MENSUAL',
          salarioBaseMensual: '3000.00', // $1,500.00 quincenal
          activo: true,
        },
      ]);

      prismaMock.planilla.create.mockImplementationOnce(async ({ data }) => ({
        id: 'pln-quin-001',
        codigo: data.codigo,
        tipo: data.tipo,
        periodoInicio: data.periodoInicio,
        periodoFin: data.periodoFin,
        estado: data.estado,
        totalBruto: data.totalBruto,
        totalIsss: data.totalIsss,
        totalAfp: data.totalAfp,
        totalRenta: data.totalRenta,
        totalLiquido: data.totalLiquido,
        boletas: data.boletas.create.map((b, idx) => ({
          id: `bol-00${idx + 1}`,
          ...b,
        })),
        _count: { boletas: data.boletas.create.length },
      }));

      const res = await request(app)
        .post('/api/v1/planillas')
        .set('Authorization', `Bearer ${tokenRrhh}`)
        .send({
          codigo: 'PLN-QUIN-202611-01',
          tipo: 'ADMINISTRATIVA_QUINCENAL',
          periodoInicio: '2026-11-01',
          periodoFin: '2026-11-15',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.codigo).toBe('PLN-QUIN-202611-01');
      expect(res.body.data.totalBruto).toBe('1500.00');
      expect(res.body.data.totalIsss).toBe('15.00');
      expect(res.body.data.totalAfp).toBe('108.75');
      expect(res.body.data.totalRenta).toBe('251.44');
      expect(res.body.data.totalLiquido).toBe('1124.81');
      expect(res.body.data.boletas).toHaveLength(1);
    });
  });

  // ============================================================================
  // 7. MÓDULO 5: GUARDIA FISCAL CCF EN /api/v1/ventas
  // ============================================================================
  describe('7. Módulo 5: Guardia Fiscal CCF (Art. 114 Código Tributario SV) en /api/v1/ventas', () => {
    const tokenVentas = generateTestToken('VENTAS');

    test('Debe bloquear con 422 FISCAL_CCF_REQUIRES_NRC_AND_GIRO cuando se intenta emitir un CREDITO_FISCAL_CCF a un cliente natural sin NRC ni giro', async () => {
      prismaMock.contratoVenta.findUnique.mockResolvedValueOnce({
        id: 'cont-venta-001',
        codigo: 'CV-APTO-301',
        precioVentaAcordado: '125000.00',
        estado: 'ACTIVO',
        cliente: {
          id: 'cli-natural-001',
          tipo: 'NATURAL',
          nombreCompleto: 'Jorge Alberto Ramírez',
          dui: '02345678-9',
          nit: '02345678-9',
          nrc: null,
          giro: null,
        },
        unidad: {
          id: 'uni-301',
          codigo: 'APTO-301',
          tipo: 'APARTAMENTO',
        },
      });

      const res = await request(app)
        .post('/api/v1/ventas/documentos-fiscales')
        .set('Authorization', `Bearer ${tokenVentas}`)
        .send({
          contratoId: 'cont-venta-001',
          tipoDocumento: 'CREDITO_FISCAL_CCF',
          montoTotal: 11300.0,
          concepto: 'Prima de Apartamento 301',
        });

      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('FISCAL_CCF_REQUIRES_NRC_AND_GIRO');
      expect(res.body.details.camposFaltantes).toEqual(['nrc', 'giro']);
      expect(prismaMock.documentoFiscalVenta.create).not.toHaveBeenCalled();
    });

    test('Debe permitir la emisión 201 Created de CREDITO_FISCAL_CCF con 13% IVA desglosado cuando el cliente jurídico posee NRC y giro', async () => {
      const contratoJuridico = {
        id: 'cont-venta-002',
        codigo: 'CV-LOCAL-101',
        precioVentaAcordado: '226000.00',
        estado: 'ACTIVO',
        cliente: {
          id: 'cli-juridico-001',
          tipo: 'JURIDICO',
          nombreCompleto: 'Inversiones Cuscatlán S.A. de C.V.',
          dui: null,
          nit: '0614-150518-102-3',
          nrc: '245678-9',
          giro: 'Actividades Inmobiliarias y Arrendamiento Empresarial',
        },
        unidad: {
          id: 'uni-101',
          codigo: 'LOCAL-101',
          tipo: 'APARTAMENTO',
        },
      };

      prismaMock.contratoVenta.findUnique.mockResolvedValueOnce(contratoJuridico);
      prismaMock.documentoFiscalVenta.findUnique.mockResolvedValueOnce(null);

      prismaMock.documentoFiscalVenta.create.mockImplementationOnce(async ({ data }) => ({
        id: 'doc-ccf-001',
        ...data,
        fechaEmision: new Date().toISOString(),
        contrato: contratoJuridico,
        cuota: null,
      }));

      // Monto Total $11,300.00 -> Base Gravada $10,000.00 + IVA (13%) $1,300.00
      const res = await request(app)
        .post('/api/v1/ventas/documentos-fiscales')
        .set('Authorization', `Bearer ${tokenVentas}`)
        .send({
          contratoId: 'cont-venta-002',
          numeroDocumento: 'DTE-03-CCF-0001001',
          tipoDocumento: 'CREDITO_FISCAL_CCF',
          montoTotal: 11300.0,
          concepto: 'Pago de Prima Comercial — Local 101',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tipoDocumento).toBe('CREDITO_FISCAL_CCF');
      expect(res.body.data.numeroDocumento).toBe('DTE-03-CCF-0001001');
      expect(res.body.data.montoGravado).toBe('10000.00');
      expect(res.body.data.montoIva).toBe('1300.00');
      expect(res.body.data.montoTotal).toBe('11300.00');
      expect(res.body.data.desgloseFiscalSV.codigoDteMH).toBe('03');
      expect(res.body.data.desgloseFiscalSV.montoGravado).toBe(10000.0);
      expect(res.body.data.desgloseFiscalSV.montoIva).toBe(1300.0);
    });
  });
});
