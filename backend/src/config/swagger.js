/**
 * Especificación Interactiva OpenAPI 3.0.3 (Swagger)
 * ERP de Gestión Integral — Inmobiliaria y Constructora SV (API REST v1)
 */

const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ERP de Gestión Integral — Inmobiliaria y Constructora SV (API REST v1)',
    version: '1.0.0',
    description: [
      '### Arquitectura Empresarial y Cumplimiento Legal Salvadoreño',
      'API RESTful transaccional diseñada para la gestión integral de proyectos inmobiliarios y constructivos en la República de El Salvador, construida sobre **Node.js, Express, Prisma ORM y PostgreSQL 15** con garantías **ACID (`prisma.$transaction`)**.',
      '',
      '#### Matriz de Control de Acceso Basado en Roles (RBAC — 6 Roles)',
      '- **`ADMIN`**: Control total del ERP, configuración global, usuarios y auditoría transversal.',
      '- **`DIRECTOR_PROYECTO`**: Dirección técnica, presupuestos, cambios de fase constructiva y gestión de permisos regulatorios (OPAMSS, MARN, ANDA).',
      '- **`INGENIERO_RESIDENTE`**: Ejecución de obra en campo, consulta de inventarios y reportes de avance físico de partidas con descarga automática de materiales.',
      '- **`BODEGUERO`**: Administración de Bodega Central y Bodegas de Obra, catálogo de materiales, entradas de stock y traslados multi-sitio transaccionales.',
      '- **`RRHH`**: Gestión de personal administrativo y de campo, simulador legal y procesamiento de nómina dual (Quincenal Administrativa y Semanal de Obra).',
      '- **`VENTAS`**: Gestión comercial CRM inmobiliario, catálogo de unidades, simulador financiero francés y facturación fiscal salvadoreña (DTE-01 FCF, DTE-03 CCF y Recibos).',
      '',
      '#### Marco Regulatorio, Laboral y Tributario de El Salvador Implementado',
      '1. **Módulo 1 (Permisología y Guardia Regulatoria)**: Bloqueo legal estricto (`HTTP 422 LEGAL_PERMITS_NOT_APPROVED`) que impide avanzar de `DISENO` a fases constructivas (`TERRACERIA`, `OBRA_GRIS`, `ACABADOS`, `FINALIZADO`) si los 3 permisos obligatorios (**OPAMSS**, **MARN**, **ANDA**) no están en estado `APROBADO`.',
      '2. **Módulo 2 (Bodegas e Inventario Multi-sitio)**: Control transaccional entre `CENTRAL` y `PROYECTO` con bloqueo por stock insuficiente (`HTTP 422 INSUFFICIENT_WAREHOUSE_STOCK`).',
      '3. **Módulo 3 (Partidas de Obra y Recetas)**: Reportes de avance monotónicos con descarga proporcional de materiales desde la Bodega de Obra del proyecto (`HTTP 422 INSUFFICIENT_PROJECT_STOCK`) y cálculo de Valor Ganado (*Earned Value*).',
      '4. **Módulo 4 (RRHH y Nómina Dual SV)**:',
      '   - **ISSS**: 3.00% laboral / 7.50% patronal con techo mensual de **$1,000.00** ($500.00 quincenal -> máx. $15.00 laboral; $250.00 semanal -> máx. $7.50 laboral).',
      '   - **AFP (Confía / Crecer)**: 7.25% laboral / 8.75% patronal.',
      '   - **ISR (Ministerio de Hacienda SV)**: Tablas progresivas vigentes según **Decreto Ejecutivo No. 10** (Base exenta mensual $550.00 / quincenal $275.00 / semanal $137.50) sobre Renta Gravada (`Ingreso Bruto - ISSS - AFP`), más modalidad eventual del **10% de retención ISR (Art. 156 Código Tributario, Código F-910: 11)**.',
      '5. **Módulo 5 (Ventas CRM, Amortización Francesa y Facturación Fiscal MH SV)**:',
      '   - **IVA 13%** (Art. 54 Ley de IVA): Desglose exacto en Factura de Consumidor Final (`DTE-01`) y Comprobante de Crédito Fiscal (`DTE-03`).',
      '   - **Bloqueo Fiscal CCF (Art. 107 y Art. 114 Código Tributario SV)**: Rechazo automático (`HTTP 422 FISCAL_CCF_REQUIRES_NRC_AND_GIRO`) al intentar emitir un `CREDITO_FISCAL_CCF` a un cliente sin **NRC** o **Giro**.',
      '   - **ITBR (Impuesto a la Transferencia de Bienes Raíces)**: Exento hasta **$28,571.43 USD** (equivalente a ¢250,000 colones) y **3.00%** sobre el exceso.',
    ].join('\n'),
    contact: {
      name: 'Arquitectura de Precisión — ERP Constructora SV',
      email: 'admin@constructorasv.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:8080',
      description: 'Gateway Principal — Nginx Reverse Proxy (Docker Compose)',
    },
    {
      url: 'http://localhost:4000',
      description: 'Servidor Backend Directo — Node.js / Express',
    },
  ],
  tags: [
    {
      name: 'Health',
      description: 'Verificación de estado operativo y disponibilidad del servicio',
    },
    {
      name: 'Auth & RBAC',
      description: 'Autenticación JWT, registro de usuarios y matriz de control de acceso basado en roles (6 roles)',
    },
    {
      name: 'Módulo 1 — Proyectos y Permisología SV',
      description: 'Gestión de proyectos constructivos y guardia regulatoria ante OPAMSS, MARN y ANDA',
    },
    {
      name: 'Módulo 2 — Bodegas e Inventario Multi-sitio',
      description: 'Catálogo de materiales, abastecimiento en Bodega Central y traslados ACID hacia Bodegas de Obra',
    },
    {
      name: 'Módulo 3 — Ejecución y Partidas de Obra',
      description: 'Presupuesto por partidas, recetas de materiales y reportes de avance físico con descarga automática de stock',
    },
    {
      name: 'Módulo 4 — RRHH y Nómina Dual SV',
      description: 'Padrón de empleados, simulador y procesamiento de planilla quincenal/semanal conforme a ISSS, AFP e ISR MH El Salvador',
    },
    {
      name: 'Módulo 5 — Ventas CRM y Facturación Fiscal SV',
      description: 'Clientes naturales/jurídicos, unidades inmobiliarias, contratos con amortización francesa, pagos de cuotas y emisión DTE (IVA 13% / CCF / ITBR 3%)',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Ingrese el token JWT obtenido en `/api/v1/auth/login` o `/api/v1/auth/register`.',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        required: ['success', 'status', 'message', 'errorCode'],
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          status: {
            type: 'string',
            enum: ['fail', 'error'],
            example: 'fail',
          },
          message: {
            type: 'string',
            example: "Bloqueo Regulatorio SV: El proyecto 'PROY-SV-001' no puede avanzar a la fase 'TERRACERIA' porque no cuenta con los 3 permisos obligatorios (OPAMSS, MARN, ANDA) en estado APROBADO.",
          },
          errorCode: {
            type: 'string',
            example: 'LEGAL_PERMITS_NOT_APPROVED',
          },
          details: {
            type: 'object',
            nullable: true,
            example: {
              faseSolicitada: 'TERRACERIA',
              aprobados: 1,
              totalRequeridos: 3,
              permisosBloqueantes: [
                { institucion: 'MARN', estadoActual: 'PENDIENTE' },
                { institucion: 'ANDA', estadoActual: 'EN_TRAMITE' },
              ],
            },
          },
        },
        example: {
          success: false,
          status: 'fail',
          message: "Bloqueo Regulatorio SV: El proyecto 'PROY-SV-001' no puede avanzar a la fase 'TERRACERIA' porque no cuenta con los 3 permisos obligatorios (OPAMSS, MARN, ANDA) en estado APROBADO.",
          errorCode: 'LEGAL_PERMITS_NOT_APPROVED',
          details: {
            faseSolicitada: 'TERRACERIA',
            aprobados: 1,
            totalRequeridos: 3,
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'Correo electrónico corporativo registrado en el ERP.',
            example: 'admin@constructorasv.com',
          },
          password: {
            type: 'string',
            format: 'password',
            description: 'Contraseña del usuario (mínimo 6 caracteres).',
            example: 'ConstructoraSV2026!',
          },
        },
        example: {
          email: 'admin@constructorasv.com',
          password: 'ConstructoraSV2026!',
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['nombre', 'email', 'password'],
        properties: {
          nombre: {
            type: 'string',
            description: 'Nombre completo y cargo del usuario.',
            example: 'Ing. Gabriela Rivas (Residente de Obra)',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Correo electrónico único.',
            example: 'grivas@constructorasv.com',
          },
          password: {
            type: 'string',
            format: 'password',
            minLength: 6,
            description: 'Contraseña de acceso (mínimo 6 caracteres).',
            example: 'ConstructoraSV2026!',
          },
          rol: {
            type: 'string',
            enum: [
              'ADMIN',
              'DIRECTOR_PROYECTO',
              'INGENIERO_RESIDENTE',
              'BODEGUERO',
              'RRHH',
              'VENTAS',
            ],
            default: 'INGENIERO_RESIDENTE',
            description: 'Rol RBAC asignado dentro de la constructora.',
            example: 'INGENIERO_RESIDENTE',
          },
        },
        example: {
          nombre: 'Ing. Gabriela Rivas (Residente de Obra)',
          email: 'grivas@constructorasv.com',
          password: 'ConstructoraSV2026!',
          rol: 'INGENIERO_RESIDENTE',
        },
      },
      ProyectoCreateRequest: {
        type: 'object',
        required: ['codigo', 'nombre', 'ubicacion', 'presupuestoTotal', 'fechaInicio'],
        properties: {
          codigo: {
            type: 'string',
            description: 'Código único identificador del proyecto constructivo.',
            example: 'PROY-SV-003',
          },
          nombre: {
            type: 'string',
            description: 'Nombre comercial del desarrollo inmobiliario o proyecto.',
            example: 'Condominio Alturas de Santa Elena',
          },
          ubicacion: {
            type: 'string',
            description: 'Dirección física en El Salvador (Municipio / Distrito / Departamento).',
            example: 'Blvd. Orden de Malta, Antiguo Cuscatlán, La Libertad',
          },
          presupuestoTotal: {
            type: 'number',
            format: 'double',
            minimum: 0.01,
            description: 'Presupuesto maestro asignado al proyecto en USD.',
            example: 3850000.00,
          },
          faseActual: {
            type: 'string',
            enum: ['DISENO', 'TERRACERIA', 'OBRA_GRIS', 'ACABADOS', 'FINALIZADO'],
            default: 'DISENO',
            description: 'Fase inicial del proyecto (si es posterior a DISENO exige los 3 permisos APROBADOS).',
            example: 'DISENO',
          },
          fechaInicio: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de inicio del proyecto en formato ISO 8601.',
            example: '2026-03-01T00:00:00.000Z',
          },
          fechaFinEstimada: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Fecha estimada de finalización de la obra.',
            example: '2027-11-30T00:00:00.000Z',
          },
          crearBodega: {
            type: 'boolean',
            default: true,
            description: 'Indica si se debe crear automáticamente la Bodega de Obra del proyecto.',
            example: true,
          },
          permisos: {
            type: 'array',
            description: 'Configuración opcional del estado inicial de los permisos OPAMSS, MARN y ANDA.',
            items: {
              type: 'object',
              properties: {
                institucion: {
                  type: 'string',
                  enum: ['OPAMSS', 'MARN', 'ANDA'],
                },
                estado: {
                  type: 'string',
                  enum: ['PENDIENTE', 'EN_TRAMITE', 'OBSERVADO', 'APROBADO', 'RECHAZADO'],
                },
                numeroExpediente: {
                  type: 'string',
                },
                observaciones: {
                  type: 'string',
                },
              },
            },
          },
        },
        example: {
          codigo: 'PROY-SV-003',
          nombre: 'Condominio Alturas de Santa Elena',
          ubicacion: 'Blvd. Orden de Malta, Antiguo Cuscatlán, La Libertad',
          presupuestoTotal: 3850000.00,
          faseActual: 'DISENO',
          fechaInicio: '2026-03-01T00:00:00.000Z',
          fechaFinEstimada: '2027-11-30T00:00:00.000Z',
          crearBodega: true,
        },
      },
      PermisoUpdateRequest: {
        type: 'object',
        required: ['estado'],
        properties: {
          estado: {
            type: 'string',
            enum: ['PENDIENTE', 'EN_TRAMITE', 'OBSERVADO', 'APROBADO', 'RECHAZADO'],
            description: 'Nuevo estado regulatorio del permiso ante la institución salvadoreña.',
            example: 'APROBADO',
          },
          numeroExpediente: {
            type: 'string',
            nullable: true,
            description: 'Número oficial de expediente o resolución (OPAMSS / MARN / ANDA).',
            example: 'OPAMSS-2026-0412',
          },
          fechaEmision: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Fecha de emisión o aprobación de la resolución.',
            example: '2026-02-15T00:00:00.000Z',
          },
          fechaVencimiento: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Fecha de vencimiento de la vigencia del permiso.',
            example: '2028-02-15T00:00:00.000Z',
          },
          observaciones: {
            type: 'string',
            nullable: true,
            description: 'Detalle técnico de la resolución o subsanación de observaciones.',
            example: 'Permiso de construcción y línea de construcción aprobados por OPAMSS.',
          },
        },
        example: {
          estado: 'APROBADO',
          numeroExpediente: 'OPAMSS-2026-0412',
          fechaEmision: '2026-02-15T00:00:00.000Z',
          fechaVencimiento: '2028-02-15T00:00:00.000Z',
          observaciones: 'Permiso de construcción y línea de construcción aprobados por OPAMSS.',
        },
      },
      CambioFaseRequest: {
        type: 'object',
        required: ['nuevaFase'],
        properties: {
          nuevaFase: {
            type: 'string',
            enum: ['DISENO', 'TERRACERIA', 'OBRA_GRIS', 'ACABADOS', 'FINALIZADO'],
            description: 'Fase constructiva objetivo (exige OPAMSS, MARN y ANDA en estado APROBADO si es posterior a DISENO).',
            example: 'TERRACERIA',
          },
        },
        example: {
          nuevaFase: 'TERRACERIA',
        },
      },
      MaterialCreateRequest: {
        type: 'object',
        required: ['sku', 'nombre', 'unidadMedida', 'costoUnitarioPromedio'],
        properties: {
          sku: {
            type: 'string',
            description: 'Código SKU único del material en el catálogo corporativo.',
            example: 'MAT-TUB-006',
          },
          nombre: {
            type: 'string',
            description: 'Descripción técnica del insumo o material de construcción.',
            example: 'Tubería PVC Hidráulica 4" SDR-26 (Lance 6m)',
          },
          unidadMedida: {
            type: 'string',
            description: 'Unidad de medida física (BOLSA, VARILLA, M3, UNIDAD, QUINTAL, LANCE).',
            example: 'UNIDAD',
          },
          costoUnitarioPromedio: {
            type: 'number',
            format: 'double',
            minimum: 0,
            description: 'Costo unitario promedio ponderado en USD.',
            example: 32.50,
          },
          stockMinimoAlerta: {
            type: 'number',
            format: 'double',
            minimum: 0,
            default: 0,
            description: 'Umbral mínimo en Bodega Central para activar alerta de reabastecimiento.',
            example: 80.00,
          },
          stockInicialCentral: {
            type: 'number',
            format: 'double',
            minimum: 0,
            default: 0,
            description: 'Stock inicial a cargar automáticamente en la Bodega Central.',
            example: 400.00,
          },
        },
        example: {
          sku: 'MAT-TUB-006',
          nombre: 'Tubería PVC Hidráulica 4" SDR-26 (Lance 6m)',
          unidadMedida: 'UNIDAD',
          costoUnitarioPromedio: 32.50,
          stockMinimoAlerta: 80.00,
          stockInicialCentral: 400.00,
        },
      },
      EntradaBodegaRequest: {
        type: 'object',
        required: ['materialId', 'cantidad'],
        properties: {
          bodegaId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'UUID de la bodega receptora (si se omite, ingresa por defecto a la Bodega Central).',
            example: '550e8400-e29b-41d4-a716-446655440000',
          },
          materialId: {
            type: 'string',
            format: 'uuid',
            description: 'UUID del material a abastecer.',
            example: '660e8400-e29b-41d4-a716-446655440001',
          },
          cantidad: {
            type: 'number',
            format: 'double',
            minimum: 0.01,
            description: 'Cantidad de unidades físicas a ingresar al inventario.',
            example: 500.00,
          },
          nuevoCostoUnitario: {
            type: 'number',
            format: 'double',
            nullable: true,
            description: 'Nuevo costo unitario de compra para actualizar el catálogo (opcional).',
            example: 9.95,
          },
        },
        example: {
          materialId: '660e8400-e29b-41d4-a716-446655440001',
          cantidad: 500.00,
          nuevoCostoUnitario: 9.95,
        },
      },
      TrasladoBodegaRequest: {
        type: 'object',
        required: ['bodegaOrigenId', 'bodegaDestinoId', 'items'],
        properties: {
          codigo: {
            type: 'string',
            nullable: true,
            description: 'Código opcional del traslado (se autogenera si se omite).',
            example: 'TRAS-SV-2026-0010',
          },
          bodegaOrigenId: {
            type: 'string',
            format: 'uuid',
            description: 'UUID de la bodega de origen (ej. Bodega Central San Salvador).',
            example: '11111111-2222-3333-4444-555555555555',
          },
          bodegaDestinoId: {
            type: 'string',
            format: 'uuid',
            description: 'UUID de la bodega de destino (ej. Bodega de Obra del proyecto).',
            example: '22222222-3333-4444-5555-666666666666',
          },
          observaciones: {
            type: 'string',
            nullable: true,
            description: 'Justificación logística o referencia de requisición de obra.',
            example: 'Despacho de cemento y hierro para fundición de losa en Torre San Benito.',
          },
          items: {
            type: 'array',
            minItems: 1,
            description: 'Lista de materiales y cantidades a trasladar en la transacción ACID.',
            items: {
              type: 'object',
              required: ['materialId', 'cantidad'],
              properties: {
                materialId: {
                  type: 'string',
                  format: 'uuid',
                  example: '33333333-4444-5555-6666-777777777777',
                },
                cantidad: {
                  type: 'number',
                  format: 'double',
                  minimum: 0.01,
                  example: 250.00,
                },
              },
            },
          },
        },
        example: {
          codigo: 'TRAS-SV-2026-0010',
          bodegaOrigenId: '11111111-2222-3333-4444-555555555555',
          bodegaDestinoId: '22222222-3333-4444-5555-666666666666',
          observaciones: 'Despacho de cemento y hierro para fundición de losa en Torre San Benito.',
          items: [
            {
              materialId: '33333333-4444-5555-6666-777777777777',
              cantidad: 250.00,
            },
          ],
        },
      },
      PartidaCreateRequest: {
        type: 'object',
        required: ['proyectoId', 'codigo', 'nombre', 'faseRequerida', 'presupuestoAsignado'],
        properties: {
          proyectoId: {
            type: 'string',
            format: 'uuid',
            description: 'UUID del proyecto al que pertenece la partida constructiva.',
            example: '44444444-5555-6666-7777-888888888888',
          },
          codigo: {
            type: 'string',
            description: 'Código único de la partida dentro del proyecto.',
            example: 'PART-002',
          },
          nombre: {
            type: 'string',
            description: 'Nombre descriptivo de la partida de obra.',
            example: 'Levantamiento de Paredes de Bloque Nivel 2',
          },
          faseRequerida: {
            type: 'string',
            enum: ['DISENO', 'TERRACERIA', 'OBRA_GRIS', 'ACABADOS', 'FINALIZADO'],
            description: 'Fase constructiva requerida para ejecutar la partida.',
            example: 'OBRA_GRIS',
          },
          presupuestoAsignado: {
            type: 'number',
            format: 'double',
            minimum: 0.01,
            description: 'Presupuesto asignado a la partida en USD.',
            example: 45000.00,
          },
          recetaMateriales: {
            type: 'array',
            description: 'Receta técnica de materiales que se descargarán proporcionalmente según el avance físico.',
            items: {
              type: 'object',
              required: ['materialId', 'cantidadTotalRequerida'],
              properties: {
                materialId: {
                  type: 'string',
                  format: 'uuid',
                  example: '33333333-4444-5555-6666-777777777777',
                },
                cantidadTotalRequerida: {
                  type: 'number',
                  format: 'double',
                  minimum: 0.01,
                  example: 400.00,
                },
              },
            },
          },
        },
        example: {
          proyectoId: '44444444-5555-6666-7777-888888888888',
          codigo: 'PART-002',
          nombre: 'Levantamiento de Paredes de Bloque Nivel 2',
          faseRequerida: 'OBRA_GRIS',
          presupuestoAsignado: 45000.00,
          recetaMateriales: [
            {
              materialId: '33333333-4444-5555-6666-777777777777',
              cantidadTotalRequerida: 400.00,
            },
          ],
        },
      },
      ReporteAvanceRequest: {
        type: 'object',
        required: ['porcentajeNuevo'],
        properties: {
          porcentajeNuevo: {
            type: 'number',
            format: 'double',
            minimum: 0.01,
            maximum: 100.00,
            description: 'Nuevo porcentaje acumulado de avance físico de la partida (debe ser estrictamente mayor al avance actual).',
            example: 50.00,
          },
          observaciones: {
            type: 'string',
            nullable: true,
            description: 'Bitácora técnica del ingeniero residente sobre el avance reportado.',
            example: 'Colado de concreto completado al 50% del área de losa nivel 1 sin contratiempos.',
          },
        },
        example: {
          porcentajeNuevo: 50.00,
          observaciones: 'Colado de concreto completado al 50% del área de losa nivel 1 sin contratiempos.',
        },
      },
      EmpleadoCreateRequest: {
        type: 'object',
        required: [
          'codigo',
          'nombres',
          'apellidos',
          'dui',
          'cargo',
          'tipoPlanilla',
          'modalidadPago',
        ],
        properties: {
          codigo: {
            type: 'string',
            description: 'Código único del empleado en el padrón de RRHH.',
            example: 'EMP-ADM-001',
          },
          nombres: {
            type: 'string',
            example: 'Héctor Alejandro',
          },
          apellidos: {
            type: 'string',
            example: 'Lemus Portillo',
          },
          dui: {
            type: 'string',
            description: 'Documento Único de Identidad de El Salvador (formato 00000000-0).',
            example: '04589123-7',
          },
          nit: {
            type: 'string',
            nullable: true,
            description: 'NIT o DUI homologado según reforma tributaria salvadoreña.',
            example: '04589123-7',
          },
          nup: {
            type: 'string',
            nullable: true,
            description: 'Número Único Previsional (AFP Confía o AFP Crecer).',
            example: '281940581920',
          },
          numeroIsss: {
            type: 'string',
            nullable: true,
            description: 'Número de afiliación al Instituto Salvadoreño del Seguro Social (ISSS).',
            example: '109283746',
          },
          cargo: {
            type: 'string',
            example: 'Contador General de Proyectos',
          },
          tipoPlanilla: {
            type: 'string',
            enum: ['ADMINISTRATIVA_QUINCENAL', 'CAMPO_SEMANAL'],
            description: 'Periodicidad y régimen de nómina del trabajador.',
            example: 'ADMINISTRATIVA_QUINCENAL',
          },
          modalidadPago: {
            type: 'string',
            enum: ['SALARIO_MENSUAL', 'DIA_TRABAJADO', 'DESTAJO'],
            description: 'Modalidad salarial (SALARIO_MENSUAL para quincenal; DIA_TRABAJADO o DESTAJO para campo semanal).',
            example: 'SALARIO_MENSUAL',
          },
          salarioBaseMensual: {
            type: 'number',
            format: 'double',
            nullable: true,
            description: 'Sueldo mensual en USD (obligatorio cuando modalidadPago = SALARIO_MENSUAL).',
            example: 1500.00,
          },
          tarifaDiaria: {
            type: 'number',
            format: 'double',
            nullable: true,
            description: 'Salario por día trabajado en USD (obligatorio cuando modalidadPago = DIA_TRABAJADO).',
            example: null,
          },
          tarifaUnitariaDestajo: {
            type: 'number',
            format: 'double',
            nullable: true,
            description: 'Tarifa por unidad de obra o m² en USD (obligatorio cuando modalidadPago = DESTAJO).',
            example: null,
          },
          proyectoAsignadoId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'UUID del proyecto constructivo al cual está asignado el trabajador.',
            example: '44444444-5555-6666-7777-888888888888',
          },
        },
        example: {
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
          salarioBaseMensual: 1500.00,
        },
      },
      PlanillaGenerateRequest: {
        type: 'object',
        required: ['tipo', 'periodoInicio', 'periodoFin'],
        properties: {
          codigo: {
            type: 'string',
            nullable: true,
            description: 'Código único de la planilla (se autogenera si se omite).',
            example: 'PLN-QUIN-20260301',
          },
          tipo: {
            type: 'string',
            enum: ['ADMINISTRATIVA_QUINCENAL', 'CAMPO_SEMANAL'],
            description: 'Tipo de planilla a procesar.',
            example: 'ADMINISTRATIVA_QUINCENAL',
          },
          periodoInicio: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de inicio del periodo de pago.',
            example: '2026-03-01T00:00:00.000Z',
          },
          periodoFin: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de cierre del periodo de pago.',
            example: '2026-03-15T23:59:59.000Z',
          },
          soloEmpleadosEnNovedades: {
            type: 'boolean',
            default: false,
            description: 'Si es true, procesa únicamente los empleados incluidos en el arreglo de novedades.',
            example: false,
          },
          novedades: {
            type: 'array',
            description: 'Parámetros variables por empleado (días trabajados, unidades de destajo, deducciones adicionales o retención eventual 10% ISR Art. 156 CT).',
            items: {
              type: 'object',
              required: ['empleadoId'],
              properties: {
                empleadoId: {
                  type: 'string',
                  format: 'uuid',
                  example: '77777777-8888-9999-aaaa-bbbbbbbbbbbb',
                },
                diasTrabajados: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 15,
                  example: 15,
                },
                unidadesDestajo: {
                  type: 'number',
                  format: 'double',
                  nullable: true,
                  example: 24.50,
                },
                otrasDeducciones: {
                  type: 'number',
                  format: 'double',
                  default: 0,
                  example: 0.00,
                },
                exentoCotizacionesCampo: {
                  type: 'boolean',
                  default: false,
                },
                aplicarRetencionEventual10: {
                  type: 'boolean',
                  default: false,
                },
              },
            },
          },
        },
        example: {
          codigo: 'PLN-QUIN-20260301',
          tipo: 'ADMINISTRATIVA_QUINCENAL',
          periodoInicio: '2026-03-01T00:00:00.000Z',
          periodoFin: '2026-03-15T23:59:59.000Z',
          soloEmpleadosEnNovedades: false,
          novedades: [],
        },
      },
      SimulacionPlanillaRequest: {
        type: 'object',
        properties: {
          tipoPlanilla: {
            type: 'string',
            enum: ['ADMINISTRATIVA_QUINCENAL', 'CAMPO_SEMANAL', 'MENSUAL'],
            default: 'ADMINISTRATIVA_QUINCENAL',
            description: 'Periodicidad para aplicar topes de ISSS y tablas de ISR del Ministerio de Hacienda SV.',
            example: 'ADMINISTRATIVA_QUINCENAL',
          },
          modalidadPago: {
            type: 'string',
            enum: ['SALARIO_MENSUAL', 'DIA_TRABAJADO', 'DESTAJO'],
            nullable: true,
            example: 'SALARIO_MENSUAL',
          },
          ingresoBruto: {
            type: 'number',
            format: 'double',
            nullable: true,
            description: 'Ingreso bruto directo del periodo en USD (si se envía, tiene prioridad sobre salarioBaseMensual/tarifaDiaria).',
            example: 750.00,
          },
          salarioBaseMensual: {
            type: 'number',
            format: 'double',
            nullable: true,
            example: 1500.00,
          },
          tarifaDiaria: {
            type: 'number',
            format: 'double',
            nullable: true,
            example: 25.00,
          },
          tarifaUnitariaDestajo: {
            type: 'number',
            format: 'double',
            nullable: true,
            example: 12.50,
          },
          diasTrabajados: {
            type: 'integer',
            nullable: true,
            example: 15,
          },
          unidadesDestajo: {
            type: 'number',
            format: 'double',
            nullable: true,
            example: null,
          },
          otrasDeducciones: {
            type: 'number',
            format: 'double',
            default: 0,
            example: 0.00,
          },
          exentoCotizacionesCampo: {
            type: 'boolean',
            default: false,
            example: false,
          },
          aplicarRetencionEventual10: {
            type: 'boolean',
            default: false,
            description: 'Aplica 10% de retención fija de ISR conforme al Art. 156 del Código Tributario SV (servicios eventuales sin dependencia laboral).',
            example: false,
          },
        },
        example: {
          tipoPlanilla: 'ADMINISTRATIVA_QUINCENAL',
          modalidadPago: 'SALARIO_MENSUAL',
          salarioBaseMensual: 1500.00,
          diasTrabajados: 15,
          otrasDeducciones: 0.00,
          aplicarRetencionEventual10: false,
        },
      },
      ClienteCreateRequest: {
        type: 'object',
        required: ['tipo', 'nombreCompleto', 'direccion', 'telefono', 'email'],
        properties: {
          tipo: {
            type: 'string',
            enum: ['NATURAL', 'JURIDICO'],
            description: 'Persona NATURAL (exige DUI) o persona JURIDICO (exige NIT, NRC y Giro para Crédito Fiscal CCF).',
            example: 'JURIDICO',
          },
          nombreCompleto: {
            type: 'string',
            description: 'Nombre completo o razón social de la sociedad.',
            example: 'Inversiones Cuscatlán S.A. de C.V.',
          },
          dui: {
            type: 'string',
            nullable: true,
            description: 'DUI salvadoreño (formato 00000000-0). Obligatorio para clientes de tipo NATURAL.',
            example: null,
          },
          nit: {
            type: 'string',
            nullable: true,
            description: 'Número de Identificación Tributaria (NIT). Obligatorio para clientes de tipo JURIDICO.',
            example: '0614-150812-102-8',
          },
          nrc: {
            type: 'string',
            nullable: true,
            description: 'Número de Registro de Contribuyente de IVA (obligatorio para emitir Comprobante de Crédito Fiscal DTE-03).',
            example: '245890-1',
          },
          giro: {
            type: 'string',
            nullable: true,
            description: 'Actividad económica registrada ante el Ministerio de Hacienda SV (obligatorio para CCF DTE-03).',
            example: 'Desarrollo inmobiliario y arrendamiento de bienes raíces comerciales',
          },
          direccion: {
            type: 'string',
            example: 'Av. La Revolución #222, Colonia San Benito, San Salvador',
          },
          telefono: {
            type: 'string',
            example: '+503 2248-9000',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'gerencia@inversionescuscatlan.com.sv',
          },
        },
        example: {
          tipo: 'JURIDICO',
          nombreCompleto: 'Inversiones Cuscatlán S.A. de C.V.',
          nit: '0614-150812-102-8',
          nrc: '245890-1',
          giro: 'Desarrollo inmobiliario y arrendamiento de bienes raíces comerciales',
          direccion: 'Av. La Revolución #222, Colonia San Benito, San Salvador',
          telefono: '+503 2248-9000',
          email: 'gerencia@inversionescuscatlan.com.sv',
        },
      },
      UnidadCreateRequest: {
        type: 'object',
        required: ['proyectoId', 'codigo', 'tipo', 'areaMetrosCuadrados', 'precioLista'],
        properties: {
          proyectoId: {
            type: 'string',
            format: 'uuid',
            description: 'UUID del proyecto inmobiliario al que pertenece la unidad.',
            example: '44444444-5555-6666-7777-888888888888',
          },
          codigo: {
            type: 'string',
            description: 'Código único de la unidad (ej. CASA-A01, APTO-502, LOTE-B14).',
            example: 'APTO-502',
          },
          tipo: {
            type: 'string',
            enum: ['CASA', 'APARTAMENTO', 'LOTE'],
            description: 'Tipología del inmueble.',
            example: 'APARTAMENTO',
          },
          areaMetrosCuadrados: {
            type: 'number',
            format: 'double',
            minimum: 0.01,
            description: 'Área total en metros cuadrados (m²).',
            example: 145.50,
          },
          precioLista: {
            type: 'number',
            format: 'double',
            minimum: 0.01,
            description: 'Precio oficial de lista en USD.',
            example: 265000.00,
          },
          estado: {
            type: 'string',
            enum: ['DISPONIBLE', 'RESERVADA', 'VENDIDA', 'ESCRITURADA'],
            default: 'DISPONIBLE',
            example: 'DISPONIBLE',
          },
        },
        example: {
          proyectoId: '44444444-5555-6666-7777-888888888888',
          codigo: 'APTO-502',
          tipo: 'APARTAMENTO',
          areaMetrosCuadrados: 145.50,
          precioLista: 265000.00,
          estado: 'DISPONIBLE',
        },
      },
      ContratoCreateRequest: {
        type: 'object',
        required: ['clienteId', 'unidadId', 'precioVentaAcordado'],
        properties: {
          codigo: {
            type: 'string',
            nullable: true,
            description: 'Código del contrato (se autogenera si se omite).',
            example: 'CV-APTO-502-001',
          },
          clienteId: {
            type: 'string',
            format: 'uuid',
            description: 'UUID del cliente comprador.',
            example: '88888888-9999-aaaa-bbbb-cccccccccccc',
          },
          unidadId: {
            type: 'string',
            format: 'uuid',
            description: 'UUID de la unidad inmobiliaria (debe estar en estado DISPONIBLE o RESERVADA).',
            example: '99999999-aaaa-bbbb-cccc-dddddddddddd',
          },
          vendedorId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'UUID del ejecutivo de ventas (si se omite se toma automáticamente del token JWT).',
            example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          },
          precioVentaAcordado: {
            type: 'number',
            format: 'double',
            minimum: 0.01,
            description: 'Precio final pactado de compraventa en USD.',
            example: 260000.00,
          },
          montoPrima: {
            type: 'number',
            format: 'double',
            minimum: 0,
            default: 0,
            description: 'Monto de prima inicial abonada a la firma del contrato en USD.',
            example: 26000.00,
          },
          plazoMeses: {
            type: 'integer',
            minimum: 1,
            maximum: 600,
            default: 12,
            description: 'Plazo en meses para generar la tabla de amortización francesa.',
            example: 24,
          },
          tasaInteresAnual: {
            type: 'number',
            format: 'double',
            minimum: 0,
            maximum: 100,
            default: 0,
            description: 'Tasa de interés nominal anual (%).',
            example: 8.50,
          },
          fechaPrimerPago: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Fecha de vencimiento de la cuota #1.',
            example: '2026-04-01T12:00:00.000Z',
          },
          emitirDocumentoPrima: {
            type: 'boolean',
            default: true,
            description: 'Indica si debe emitirse automáticamente el documento fiscal por la prima en la misma transacción.',
            example: true,
          },
          tipoDocumentoPrima: {
            type: 'string',
            enum: ['RECIBO_ABONO', 'FACTURA_CONSUMIDOR_FINAL', 'CREDITO_FISCAL_CCF'],
            nullable: true,
            description: 'Tipo de DTE a emitir por el pago de la prima (si elige CREDITO_FISCAL_CCF exige NRC y Giro en el cliente).',
            example: 'CREDITO_FISCAL_CCF',
          },
        },
        example: {
          codigo: 'CV-APTO-502-001',
          clienteId: '88888888-9999-aaaa-bbbb-cccccccccccc',
          unidadId: '99999999-aaaa-bbbb-cccc-dddddddddddd',
          precioVentaAcordado: 260000.00,
          montoPrima: 26000.00,
          plazoMeses: 24,
          tasaInteresAnual: 8.50,
          fechaPrimerPago: '2026-04-01T12:00:00.000Z',
          emitirDocumentoPrima: true,
          tipoDocumentoPrima: 'CREDITO_FISCAL_CCF',
        },
      },
      PagoCuotaRequest: {
        type: 'object',
        properties: {
          tipoDocumento: {
            type: 'string',
            enum: ['RECIBO_ABONO', 'FACTURA_CONSUMIDOR_FINAL', 'CREDITO_FISCAL_CCF'],
            default: 'FACTURA_CONSUMIDOR_FINAL',
            description: 'Tipo de Documento Tributario Electrónico (DTE) a emitir al registrar el pago de la cuota.',
            example: 'CREDITO_FISCAL_CCF',
          },
          numeroDocumento: {
            type: 'string',
            nullable: true,
            description: 'Número de documento fiscal opcional (se autogenera si se omite).',
            example: 'DTE-03-CCF-2026-0001',
          },
          concepto: {
            type: 'string',
            nullable: true,
            description: 'Concepto personalizado en el documento fiscal.',
            example: 'Pago de Cuota #1/24 — Contrato CV-APTO-502-001',
          },
          fechaPago: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            example: '2026-04-01T14:30:00.000Z',
          },
        },
        example: {
          tipoDocumento: 'CREDITO_FISCAL_CCF',
          numeroDocumento: 'DTE-03-CCF-2026-0001',
          concepto: 'Pago de Cuota #1/24 — Contrato CV-APTO-502-001',
        },
      },
      DocumentoFiscalRequest: {
        type: 'object',
        required: ['contratoId', 'tipoDocumento', 'concepto'],
        properties: {
          contratoId: {
            type: 'string',
            format: 'uuid',
            description: 'UUID del contrato de venta asociado.',
            example: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
          },
          cuotaId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'UUID opcional de la cuota asociada.',
            example: null,
          },
          numeroDocumento: {
            type: 'string',
            nullable: true,
            description: 'Correlativo DTE opcional (se autogenera si se omite).',
            example: 'DTE-03-CCF-2026-0099',
          },
          tipoDocumento: {
            type: 'string',
            enum: ['RECIBO_ABONO', 'FACTURA_CONSUMIDOR_FINAL', 'CREDITO_FISCAL_CCF'],
            description: 'Tipo de documento fiscal (CREDITO_FISCAL_CCF valida estrictamente NRC y Giro del cliente conforme al Art. 114 CT SV).',
            example: 'CREDITO_FISCAL_CCF',
          },
          montoTotal: {
            type: 'number',
            format: 'double',
            nullable: true,
            description: 'Monto total con IVA 13% incluido en USD.',
            example: 11300.00,
          },
          montoGravado: {
            type: 'number',
            format: 'double',
            nullable: true,
            description: 'Base imponible neta antes de IVA 13% en USD.',
            example: 10000.00,
          },
          concepto: {
            type: 'string',
            description: 'Descripción del hecho generador facturado.',
            example: 'Abono extraordinario a capital y acabados personalizados de unidad inmobiliaria.',
          },
        },
        example: {
          contratoId: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
          tipoDocumento: 'CREDITO_FISCAL_CCF',
          montoTotal: 11300.00,
          concepto: 'Abono extraordinario a capital y acabados personalizados de unidad inmobiliaria.',
        },
      },
    },
  },
  paths: {
    '/api/v1/health': {
      get: {
        tags: ['Health'],
        summary: 'Verificación de salud y disponibilidad operativa de la API REST v1',
        description: 'Endpoint público utilizado por Docker healthchecks, balanceadores Nginx y monitoreo.',
        responses: {
          200: {
            description: 'Servicio operativo.',
            content: {
              'application/json': {
                example: {
                  success: true,
                  service: 'ERP de Gestión Integral — Inmobiliaria y Constructora SV',
                  version: '1.0.0',
                  status: 'OK',
                  timestamp: '2026-03-10T12:00:00.000Z',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Auth & RBAC'],
        summary: 'Registrar un nuevo usuario en el ERP con rol RBAC y retorno de token JWT',
        description: 'Ruta pública para creación de cuentas con hash bcrypt y emisión inmediata de token JWT.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Usuario registrado exitosamente.',
          },
          400: {
            description: 'Datos obligatorios faltantes, contraseña débil o rol inválido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          409: {
            description: 'El correo electrónico ya está registrado en el sistema.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth & RBAC'],
        summary: 'Autenticar usuario existente y emitir token JWT Bearer',
        description: 'Verifica credenciales con bcrypt y devuelve el perfil del usuario junto con su token JWT firmado.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Autenticación exitosa.',
          },
          400: {
            description: 'Faltan credenciales de correo o contraseña.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'Credenciales inválidas.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Cuenta de usuario deshabilitada.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Auth & RBAC'],
        summary: 'Obtener el perfil del usuario autenticado actual',
        description: 'Requiere token JWT válido en el encabezado `Authorization: Bearer <token>`. Roles permitidos: todos los usuarios autenticados.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Perfil del usuario autenticado.',
          },
          401: {
            description: 'Token ausente, inválido o expirado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Usuario no encontrado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/rbac-matrix': {
      get: {
        tags: ['Auth & RBAC'],
        summary: 'Consultar la matriz declarativa de permisos RBAC de los 6 roles del sistema',
        description: 'Devuelve los permisos asignados al rol del usuario actual y la matriz completa de los 6 roles (`ADMIN`, `DIRECTOR_PROYECTO`, `INGENIERO_RESIDENTE`, `BODEGUERO`, `RRHH`, `VENTAS`).',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Matriz RBAC retornada exitosamente.',
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/proyectos': {
      get: {
        tags: ['Módulo 1 — Proyectos y Permisología SV'],
        summary: 'Listar proyectos constructivos con semáforo regulatorio (OPAMSS, MARN, ANDA)',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `INGENIERO_RESIDENTE`, `BODEGUERO`, `RRHH`, `VENTAS`.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'faseActual',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['DISENO', 'TERRACERIA', 'OBRA_GRIS', 'ACABADOS', 'FINALIZADO'],
            },
            description: 'Filtrar proyectos por su fase constructiva actual.',
          },
          {
            name: 'search',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Búsqueda por código, nombre o ubicación.',
          },
        ],
        responses: {
          200: {
            description: 'Lista de proyectos con sus permisos y estado regulatorio.',
          },
          400: {
            description: 'Filtro de fase inválido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol sin permisos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Módulo 1 — Proyectos y Permisología SV'],
        summary: 'Crear proyecto constructivo + 3 permisos (OPAMSS, MARN, ANDA) + Bodega de Obra en transacción ACID',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`. Si se intenta crear directamente en una fase posterior a `DISENO` sin los 3 permisos en `APROBADO`, lanza `422 LEGAL_PERMITS_NOT_APPROVED`.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProyectoCreateRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Proyecto, permisos regulatorios y bodega de obra creados exitosamente.',
          },
          400: {
            description: 'Error de validación en los campos del proyecto.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado (solo ADMIN o DIRECTOR_PROYECTO).',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          409: {
            description: 'Código de proyecto duplicado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          422: {
            description: 'Bloqueo regulatorio salvadoreño al intentar iniciar en fase constructiva sin OPAMSS, MARN y ANDA aprobados.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/proyectos/{id}': {
      get: {
        tags: ['Módulo 1 — Proyectos y Permisología SV'],
        summary: 'Obtener detalle integral de un proyecto por su UUID',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `INGENIERO_RESIDENTE`, `BODEGUERO`, `RRHH`, `VENTAS`. Incluye permisos, bodega con inventario, partidas y unidades inmobiliarias.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'UUID del proyecto.',
          },
        ],
        responses: {
          200: {
            description: 'Detalle completo del proyecto.',
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Proyecto no encontrado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/proyectos/{id}/permisos/{institucion}': {
      patch: {
        tags: ['Módulo 1 — Proyectos y Permisología SV'],
        summary: 'Actualizar el estado de un permiso regulatorio (OPAMSS, MARN o ANDA)',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`. Recalcula inmediatamente el semáforo de habilitación constructiva del proyecto.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'UUID del proyecto.',
          },
          {
            name: 'institucion',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              enum: ['OPAMSS', 'MARN', 'ANDA'],
            },
            description: 'Institución regulatoria salvadoreña.',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PermisoUpdateRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Permiso actualizado y semáforo regulatorio recalculado.',
          },
          400: {
            description: 'Institución o estado de permiso inválido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado (solo ADMIN o DIRECTOR_PROYECTO).',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Proyecto no encontrado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/proyectos/{id}/fase': {
      patch: {
        tags: ['Módulo 1 — Proyectos y Permisología SV'],
        summary: 'Avanzar o cambiar la fase constructiva del proyecto (Guardia Regulatoria SV)',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `INGENIERO_RESIDENTE`. **Regla de Oro del Módulo 1**: Bloquea con `HTTP 422 LEGAL_PERMITS_NOT_APPROVED` cualquier intento de avanzar a `TERRACERIA`, `OBRA_GRIS`, `ACABADOS` o `FINALIZADO` si alguno de los 3 permisos (`OPAMSS`, `MARN`, `ANDA`) no está en estado `APROBADO`.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'UUID del proyecto.',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CambioFaseRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Fase constructiva del proyecto actualizada exitosamente.',
          },
          400: {
            description: 'Fase solicitada inválida.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Proyecto no encontrado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          422: {
            description: 'Bloqueo Regulatorio SV (`LEGAL_PERMITS_NOT_APPROVED`): faltan permisos OPAMSS, MARN o ANDA por aprobar.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/bodegas': {
      get: {
        tags: ['Módulo 2 — Bodegas e Inventario Multi-sitio'],
        summary: 'Listar todas las bodegas (CENTRAL y PROYECTO) con inventario valorizado en USD',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `INGENIERO_RESIDENTE`, `BODEGUERO`.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'tipo',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['CENTRAL', 'PROYECTO'] },
            description: 'Filtrar por tipo de bodega.',
          },
          {
            name: 'proyectoId',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
            description: 'Filtrar por UUID del proyecto asociado.',
          },
          {
            name: 'search',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Búsqueda por código, nombre o ubicación.',
          },
        ],
        responses: {
          200: {
            description: 'Listado de bodegas e inventarios valorizados.',
          },
          400: {
            description: 'Tipo de bodega inválido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/bodegas/{id}': {
      get: {
        tags: ['Módulo 2 — Bodegas e Inventario Multi-sitio'],
        summary: 'Obtener detalle de una bodega por UUID con existencias y alertas de stock',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `INGENIERO_RESIDENTE`, `BODEGUERO`.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'UUID de la bodega.',
          },
        ],
        responses: {
          200: {
            description: 'Detalle de bodega e inventario.',
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Bodega no encontrada.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/bodegas/materiales': {
      get: {
        tags: ['Módulo 2 — Bodegas e Inventario Multi-sitio'],
        summary: 'Listar catálogo corporativo de materiales con stock consolidado y alertas en Bodega Central',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `INGENIERO_RESIDENTE`, `BODEGUERO`.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'search',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Buscar por SKU, nombre o unidad de medida.',
          },
          {
            name: 'soloAlertas',
            in: 'query',
            required: false,
            schema: { type: 'boolean' },
            description: 'Si es `true`, filtra únicamente materiales con stock crítico en Bodega Central.',
          },
        ],
        responses: {
          200: {
            description: 'Catálogo de materiales con existencias consolidadas.',
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Módulo 2 — Bodegas e Inventario Multi-sitio'],
        summary: 'Registrar un nuevo material en el catálogo e inicializar stock en Bodega Central',
        description: 'Roles permitidos: `ADMIN`, `BODEGUERO`.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MaterialCreateRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Material creado exitosamente.',
          },
          400: {
            description: 'Error de validación en los datos del material.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado (solo ADMIN o BODEGUERO).',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          409: {
            description: 'SKU de material duplicado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/bodegas/entradas': {
      post: {
        tags: ['Módulo 2 — Bodegas e Inventario Multi-sitio'],
        summary: 'Abastecer / registrar entrada de compra de inventario en Bodega Central (o bodega indicada)',
        description: 'Roles permitidos: `ADMIN`, `BODEGUERO`. Incrementa el stock disponible y opcionalmente actualiza el costo unitario promedio en una transacción ACID.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EntradaBodegaRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Entrada de inventario registrada exitosamente.',
          },
          400: {
            description: 'Cantidad o costo inválido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado (solo ADMIN o BODEGUERO).',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Material o bodega no encontrada.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/bodegas/traslados': {
      get: {
        tags: ['Módulo 2 — Bodegas e Inventario Multi-sitio'],
        summary: 'Listar historial de traslados multi-sitio entre Bodega Central y Bodegas de Obra',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `INGENIERO_RESIDENTE`, `BODEGUERO`.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'bodegaOrigenId',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'bodegaDestinoId',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'estado',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['PENDIENTE', 'COMPLETADO', 'CANCELADO'] },
          },
        ],
        responses: {
          200: {
            description: 'Lista de traslados con detalles valorizados.',
          },
          400: {
            description: 'Filtro de estado inválido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Módulo 2 — Bodegas e Inventario Multi-sitio'],
        summary: 'Ejecutar traslado transaccional de materiales entre bodegas (Regla de Oro Módulo 2)',
        description: 'Roles permitidos: `ADMIN`, `BODEGUERO`. Verifica existencias en la bodega de origen dentro de `prisma.$transaction`; si algún material no tiene stock suficiente, lanza `HTTP 422 INSUFFICIENT_WAREHOUSE_STOCK` y revierte toda la operación.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TrasladoBodegaRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Traslado ejecutado y completado en transacción ACID.',
          },
          400: {
            description: 'Parámetros de traslado inválidos o bodegas iguales.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado (solo ADMIN o BODEGUERO).',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Bodega o material no encontrado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          409: {
            description: 'Código de traslado duplicado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          422: {
            description: 'Stock insuficiente en la bodega de origen (`INSUFFICIENT_WAREHOUSE_STOCK`).',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/partidas': {
      get: {
        tags: ['Módulo 3 — Ejecución y Partidas de Obra'],
        summary: 'Listar partidas de obra con receta de materiales e indicadores de Valor Ganado',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `INGENIERO_RESIDENTE`, `BODEGUERO`.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'proyectoId',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
            description: 'Filtrar partidas por UUID del proyecto.',
          },
          {
            name: 'faseRequerida',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['DISENO', 'TERRACERIA', 'OBRA_GRIS', 'ACABADOS', 'FINALIZADO'],
            },
            description: 'Filtrar por fase constructiva requerida.',
          },
        ],
        responses: {
          200: {
            description: 'Lista de partidas de obra e indicadores presupuestarios.',
          },
          400: {
            description: 'Fase requerida inválida.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Módulo 3 — Ejecución y Partidas de Obra'],
        summary: 'Crear una partida de obra con su receta de materiales en transacción ACID',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PartidaCreateRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Partida de obra y receta registradas exitosamente.',
          },
          400: {
            description: 'Datos de partida o receta inválidos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado (solo ADMIN o DIRECTOR_PROYECTO).',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Proyecto o material de la receta no encontrado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          409: {
            description: 'Código de partida duplicado dentro del proyecto.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/partidas/{id}': {
      get: {
        tags: ['Módulo 3 — Ejecución y Partidas de Obra'],
        summary: 'Obtener detalle de una partida de obra con receta, historial de avances e indicadores',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `INGENIERO_RESIDENTE`, `BODEGUERO`.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'UUID de la partida de obra.',
          },
        ],
        responses: {
          200: {
            description: 'Detalle completo de la partida.',
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Partida no encontrada.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/partidas/{id}/avances': {
      get: {
        tags: ['Módulo 3 — Ejecución y Partidas de Obra'],
        summary: 'Listar el historial de reportes de avance físico de una partida',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `INGENIERO_RESIDENTE`.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'UUID de la partida de obra.',
          },
        ],
        responses: {
          200: {
            description: 'Historial de reportes de avance.',
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Partida no encontrada.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Módulo 3 — Ejecución y Partidas de Obra'],
        summary: 'Reportar avance físico de partida con descarga proporcional de materiales desde la Bodega de Obra (Regla de Oro Módulo 3)',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `INGENIERO_RESIDENTE`. Valida en transacción ACID: (1) incremento monotónico del porcentaje, (2) proyecto fuera de fase `DISENO` con los 3 permisos `OPAMSS`, `MARN` y `ANDA` aprobados, y (3) stock suficiente en la Bodega del Proyecto (`HTTP 422 INSUFFICIENT_PROJECT_STOCK` si falta algún material).',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'UUID de la partida de obra.',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReporteAvanceRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Avance físico registrado, materiales descargados de la bodega del proyecto y costo ejecutado actualizado.',
          },
          400: {
            description: 'Porcentaje fuera de rango (debe ser > 0 y <= 100).',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado (solo ADMIN, DIRECTOR_PROYECTO o INGENIERO_RESIDENTE).',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Partida no encontrada.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          409: {
            description: 'Conflicto de concurrencia al actualizar avance o stock.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          422: {
            description: 'Violación de regla de negocio (`PROGRESS_MUST_INCREASE`, `PROJECT_PHASE_NOT_ENABLED`, `LEGAL_PERMITS_NOT_APPROVED` o `INSUFFICIENT_PROJECT_STOCK`).',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/planillas': {
      get: {
        tags: ['Módulo 4 — RRHH y Nómina Dual SV'],
        summary: 'Listar planillas procesadas (Quincenales Administrativas y Semanales de Campo)',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `RRHH`.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'tipo',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['ADMINISTRATIVA_QUINCENAL', 'CAMPO_SEMANAL'],
            },
          },
          {
            name: 'estado',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['BORRADOR', 'APROBADA', 'PAGADA'],
            },
          },
        ],
        responses: {
          200: {
            description: 'Listado de planillas.',
          },
          400: {
            description: 'Filtro inválido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Módulo 4 — RRHH y Nómina Dual SV'],
        summary: 'Generar planilla dual y boletas de pago en transacción ACID con cálculos legales SV (ISSS, AFP, ISR MH)',
        description: 'Roles permitidos: `ADMIN`, `RRHH`. Aplica techo ISSS ($1,000 mensual / $500 quincenal / $250 semanal), AFP 7.25% laboral y tablas de retención ISR del Ministerio de Hacienda de El Salvador (Decreto Ejecutivo No. 10).',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PlanillaGenerateRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Planilla y boletas de pago generadas exitosamente.',
          },
          400: {
            description: 'Fechas, tipo de planilla o novedades inválidas.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado (solo ADMIN o RRHH).',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Empleado en novedades no encontrado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          409: {
            description: 'Código de planilla duplicado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          422: {
            description: 'Sin empleados activos o incompatibilidad de régimen laboral.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/planillas/{id}': {
      get: {
        tags: ['Módulo 4 — RRHH y Nómina Dual SV'],
        summary: 'Obtener detalle de una planilla por UUID con todas sus boletas de pago',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `RRHH`.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'UUID de la planilla.',
          },
        ],
        responses: {
          200: {
            description: 'Detalle completo de la planilla y boletas.',
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Planilla no encontrada.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/planillas/{id}/estado': {
      patch: {
        tags: ['Módulo 4 — RRHH y Nómina Dual SV'],
        summary: 'Cambiar el estado de una planilla (BORRADOR -> APROBADA -> PAGADA)',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `RRHH`. Una vez en estado `PAGADA`, la planilla es inmutable (`HTTP 422 PLANILLA_ALREADY_PAID`).',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'UUID de la planilla.',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['estado'],
                properties: {
                  estado: {
                    type: 'string',
                    enum: ['BORRADOR', 'APROBADA', 'PAGADA'],
                    example: 'APROBADA',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Estado de la planilla actualizado.',
          },
          400: {
            description: 'Estado inválido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Planilla no encontrada.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          422: {
            description: 'Transición de estado inválida o planilla ya pagada.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/planillas/empleados': {
      get: {
        tags: ['Módulo 4 — RRHH y Nómina Dual SV'],
        summary: 'Listar padrón de empleados (administrativos quincenales y personal de campo semanal)',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `RRHH`.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'tipoPlanilla',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['ADMINISTRATIVA_QUINCENAL', 'CAMPO_SEMANAL'],
            },
          },
          {
            name: 'modalidadPago',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['SALARIO_MENSUAL', 'DIA_TRABAJADO', 'DESTAJO'],
            },
          },
          {
            name: 'proyectoAsignadoId',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'activo',
            in: 'query',
            required: false,
            schema: { type: 'boolean' },
          },
        ],
        responses: {
          200: {
            description: 'Padrón de empleados.',
          },
          400: {
            description: 'Filtro inválido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Módulo 4 — RRHH y Nómina Dual SV'],
        summary: 'Registrar un nuevo empleado validando formato oficial de DUI salvadoreño (00000000-0)',
        description: 'Roles permitidos: `ADMIN`, `RRHH`. Valida coherencia entre `tipoPlanilla` y `modalidadPago`.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EmpleadoCreateRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Empleado registrado exitosamente.',
          },
          400: {
            description: 'DUI inválido o incompatibilidad entre tipo de planilla y modalidad de pago.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado (solo ADMIN o RRHH).',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Proyecto asignado no encontrado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          409: {
            description: 'Código o DUI de empleado duplicado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/planillas/calcular-simulacion': {
      post: {
        tags: ['Módulo 4 — RRHH y Nómina Dual SV'],
        summary: 'Simular en vivo el cálculo de deducciones legales salvadoreñas (ISSS, AFP, ISR MH y aportes patronales)',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `RRHH`. No persiste datos en la base de datos.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SimulacionPlanillaRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Resultado detallado de la simulación laboral y previsional SV.',
          },
          400: {
            description: 'Parámetros de entrada inválidos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          422: {
            description: 'Las deducciones superan el ingreso bruto.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/ventas/clientes': {
      get: {
        tags: ['Módulo 5 — Ventas CRM y Facturación Fiscal SV'],
        summary: 'Listar directorio de clientes CRM (personas naturales y jurídicas)',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `VENTAS`.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'tipo',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['NATURAL', 'JURIDICO'] },
          },
          {
            name: 'search',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Buscar por nombre, DUI, NIT, NRC o correo.',
          },
        ],
        responses: {
          200: {
            description: 'Directorio de clientes.',
          },
          400: {
            description: 'Filtro de tipo inválido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Módulo 5 — Ventas CRM y Facturación Fiscal SV'],
        summary: 'Registrar un nuevo cliente validando requisitos fiscales del Ministerio de Hacienda SV (DUI / NIT / NRC / Giro)',
        description: 'Roles permitidos: `ADMIN`, `VENTAS`. Si `tipo = NATURAL` exige `dui` salvadoreño válido; si `tipo = JURIDICO` exige `nit`, `nrc` y `giro`.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ClienteCreateRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Cliente registrado exitosamente.',
          },
          400: {
            description: 'Faltan campos obligatorios o formato de DUI inválido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado (solo ADMIN o VENTAS).',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          409: {
            description: 'DUI, NIT o NRC duplicado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/ventas/unidades': {
      get: {
        tags: ['Módulo 5 — Ventas CRM y Facturación Fiscal SV'],
        summary: 'Listar catálogo de unidades inmobiliarias (Casas, Apartamentos y Lotes)',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `INGENIERO_RESIDENTE`, `VENTAS`.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'proyectoId',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'tipo',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['CASA', 'APARTAMENTO', 'LOTE'] },
          },
          {
            name: 'estado',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['DISPONIBLE', 'RESERVADA', 'VENDIDA', 'ESCRITURADA'],
            },
          },
        ],
        responses: {
          200: {
            description: 'Catálogo de unidades inmobiliarias.',
          },
          400: {
            description: 'Filtro inválido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Módulo 5 — Ventas CRM y Facturación Fiscal SV'],
        summary: 'Crear una nueva unidad inmobiliaria vinculada a un proyecto',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `VENTAS`.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UnidadCreateRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Unidad inmobiliaria creada exitosamente.',
          },
          400: {
            description: 'Error de validación en los campos de la unidad.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Proyecto no encontrado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          409: {
            description: 'Código de unidad duplicado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/ventas/unidades/{id}/estado': {
      patch: {
        tags: ['Módulo 5 — Ventas CRM y Facturación Fiscal SV'],
        summary: 'Actualizar estado comercial o legal de una unidad inmobiliaria',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `VENTAS`. Impide regresar a `DISPONIBLE` o `RESERVADA` si posee un contrato activo (`HTTP 422 UNIT_HAS_ACTIVE_CONTRACT`).',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'UUID de la unidad inmobiliaria.',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['estado'],
                properties: {
                  estado: {
                    type: 'string',
                    enum: ['DISPONIBLE', 'RESERVADA', 'VENDIDA', 'ESCRITURADA'],
                    example: 'RESERVADA',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Estado de la unidad actualizado.',
          },
          400: {
            description: 'Estado inválido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Unidad no encontrada.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          422: {
            description: 'La unidad posee un contrato de venta activo.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/ventas/simular-financiamiento': {
      post: {
        tags: ['Módulo 5 — Ventas CRM y Facturación Fiscal SV'],
        summary: 'Simular tabla de amortización francesa y desglose tributario SV (IVA 13% + ITBR 3%)',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `VENTAS`. Calcula cuotas niveladas con cuadratura exacta de centavos al cierre e Impuesto a la Transferencia de Bienes Raíces (exento hasta $28,571.43 USD, 3% sobre el exceso).',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['precioVentaAcordado'],
                properties: {
                  precioVentaAcordado: {
                    type: 'number',
                    format: 'double',
                    example: 185000.00,
                  },
                  montoPrima: {
                    type: 'number',
                    format: 'double',
                    default: 0,
                    example: 18500.00,
                  },
                  plazoMeses: {
                    type: 'integer',
                    default: 12,
                    example: 24,
                  },
                  tasaInteresAnual: {
                    type: 'number',
                    format: 'double',
                    default: 0,
                    example: 8.50,
                  },
                  tipoDocumento: {
                    type: 'string',
                    enum: ['RECIBO_ABONO', 'FACTURA_CONSUMIDOR_FINAL', 'CREDITO_FISCAL_CCF'],
                    default: 'FACTURA_CONSUMIDOR_FINAL',
                    example: 'FACTURA_CONSUMIDOR_FINAL',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Simulación financiera y fiscal generada exitosamente.',
          },
          400: {
            description: 'Parámetros financieros inválidos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/ventas/contratos': {
      get: {
        tags: ['Módulo 5 — Ventas CRM y Facturación Fiscal SV'],
        summary: 'Listar contratos de compraventa inmobiliaria',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `VENTAS`.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'estado',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['ACTIVO', 'CANCELADO', 'FINALIZADO'] },
          },
          {
            name: 'clienteId',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'proyectoId',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Listado de contratos de venta.',
          },
          400: {
            description: 'Filtro inválido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Módulo 5 — Ventas CRM y Facturación Fiscal SV'],
        summary: 'Formalizar contrato de venta + tabla de amortización francesa + documento fiscal de prima en transacción ACID (Regla de Oro 1 Módulo 5)',
        description: 'Roles permitidos: `ADMIN`, `VENTAS`. Marca la unidad como `VENDIDA`, crea las `N` cuotas en `CuotaPago` y, si corresponde, emite el DTE de la prima validando cumplimiento fiscal CCF.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ContratoCreateRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Contrato de venta formalizado exitosamente con su tabla de amortización.',
          },
          400: {
            description: 'Parámetros de contrato inválidos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado (solo ADMIN o VENTAS).',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Cliente, unidad o vendedor no encontrado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          409: {
            description: 'Código de contrato duplicado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          422: {
            description: 'Unidad no disponible (`UNIT_NOT_AVAILABLE`) o cliente sin NRC/Giro al solicitar CCF (`FISCAL_CCF_REQUIRES_NRC_AND_GIRO`).',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/ventas/contratos/{id}': {
      get: {
        tags: ['Módulo 5 — Ventas CRM y Facturación Fiscal SV'],
        summary: 'Obtener detalle de un contrato de venta con su tabla de amortización y documentos fiscales',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `VENTAS`.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'UUID del contrato de venta.',
          },
        ],
        responses: {
          200: {
            description: 'Detalle del contrato, cuotas y resumen financiero.',
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Contrato no encontrado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/ventas/contratos/{id}/cuotas/{cuotaId}/pagar': {
      post: {
        tags: ['Módulo 5 — Ventas CRM y Facturación Fiscal SV'],
        summary: 'Registrar pago de cuota de amortización y emitir DTE con desglose de IVA 13% (Regla de Oro 2 Módulo 5)',
        description: 'Roles permitidos: `ADMIN`, `VENTAS`. En una transacción ACID: marca la cuota como `PAGADA`, reduce el `saldoPendiente` del contrato (y lo pasa a `FINALIZADO` si llega a 0.00) y emite el documento fiscal (`FACTURA_CONSUMIDOR_FINAL`, `CREDITO_FISCAL_CCF` o `RECIBO_ABONO`).',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'UUID del contrato de venta.',
          },
          {
            name: 'cuotaId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'UUID de la cuota a pagar.',
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PagoCuotaRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Pago de cuota procesado y documento fiscal emitido.',
          },
          400: {
            description: 'Tipo de documento o fecha inválida.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado (solo ADMIN o VENTAS).',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Contrato o cuota no encontrada.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          409: {
            description: 'Número de documento fiscal duplicado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          422: {
            description: 'Cuota ya pagada (`INSTALLMENT_ALREADY_PAID`) o bloqueo fiscal por falta de NRC/Giro para CCF (`FISCAL_CCF_REQUIRES_NRC_AND_GIRO`).',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/ventas/documentos-fiscales': {
      get: {
        tags: ['Módulo 5 — Ventas CRM y Facturación Fiscal SV'],
        summary: 'Listar documentos fiscales emitidos (FCF DTE-01, CCF DTE-03 y Recibos de Abono)',
        description: 'Roles permitidos: `ADMIN`, `DIRECTOR_PROYECTO`, `VENTAS`.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'contratoId',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'tipoDocumento',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['RECIBO_ABONO', 'FACTURA_CONSUMIDOR_FINAL', 'CREDITO_FISCAL_CCF'],
            },
          },
        ],
        responses: {
          200: {
            description: 'Listado de documentos fiscales.',
          },
          400: {
            description: 'Filtro inválido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Módulo 5 — Ventas CRM y Facturación Fiscal SV'],
        summary: 'Emitir un Documento Fiscal de Venta validando IVA 13% y requisitos de Crédito Fiscal (CCF DTE-03)',
        description: 'Roles permitidos: `ADMIN`, `VENTAS`. Si `tipoDocumento = CREDITO_FISCAL_CCF` y el cliente no posee `nrc` y `giro`, lanza `HTTP 422 FISCAL_CCF_REQUIRES_NRC_AND_GIRO` conforme al Art. 114 del Código Tributario de El Salvador.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DocumentoFiscalRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Documento fiscal emitido exitosamente.',
          },
          400: {
            description: 'Datos fiscales faltantes o inválidos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'No autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Rol no autorizado (solo ADMIN o VENTAS).',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Contrato o cuota no encontrada.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          409: {
            description: 'Número de documento fiscal duplicado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          422: {
            description: 'Bloqueo Fiscal Ministerio de Hacienda SV (`FISCAL_CCF_REQUIRES_NRC_AND_GIRO`).',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
  },
};

Object.defineProperty(swaggerSpec, 'swaggerSpec', {
  value: swaggerSpec,
  enumerable: false,
});

module.exports = swaggerSpec;
