const prisma = require('../../config/prisma');
const AppError = require('../../utils/AppError');
const {
  ORDEN_FASES,
  FASES_CONSTRUCCION_BLOQUEADAS,
  calcularEstadoRegulatorio,
} = require('../proyectos/proyectos.service');

const FASES_PARTIDA_VALIDAS = ORDEN_FASES; // DISENO, TERRACERIA, OBRA_GRIS, ACABADOS, FINALIZADO
const MAX_REPORTES_DETALLE = 20;
const PORCENTAJE_REGEX = /^\d{1,3}(\.\d{1,2})?$/;

// Opciones de la transacción interactiva para recetas con muchos materiales
const TX_OPTIONS = { maxWait: 10000, timeout: 20000 };

/**
 * Redondea un número a 2 decimales exactos para operaciones monetarias y de stock.
 */
const round2 = (value) => {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
};

/**
 * Convierte un valor (Prisma.Decimal, string o number) a centésimas enteras exactas (BigInt).
 * Los campos del schema son Decimal(p, 2), por lo que `toFixed(2)` es exacto.
 */
const toCents = (value) => {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) {
    return 0n;
  }
  return BigInt(num.toFixed(2).replace('.', ''));
};

/**
 * División entera BigInt con redondeo HALF-UP (simétrico respecto a cero).
 */
const divRoundHalfUp = (numerator, denominator) => {
  const negative = (numerator < 0n) !== (denominator < 0n);
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const result = (2n * n + d) / (2n * d);
  return negative ? -result : result;
};

/**
 * Convierte centésimas BigInt a número JS con 2 decimales (para respuestas JSON).
 */
const centsToNumber = (cents) => round2(Number(cents) / 100);

/**
 * Convierte centésimas BigInt a string decimal con 2 posiciones (para escritura Prisma Decimal).
 */
const centsToFixed = (cents) => {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const entero = abs / 100n;
  const fraccion = (abs % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${entero.toString()}.${fraccion}`;
};

const minBigInt = (a, b) => (a < b ? a : b);

// ============================================================================
// HELPERS DE NEGOCIO
// ============================================================================

/**
 * Calcula los indicadores financieros/físicos de una partida de obra.
 * desviacionPresupuestaria = costoMaterialesAcumulado - (presupuestoAsignado * porcentajeAvance / 100)
 * Un valor positivo indica sobrecosto respecto al valor ganado (earned value) de la partida.
 */

const calcularIndicadoresPartida = (partida) => {
  const avanceCents = toCents(partida.porcentajeAvance);
  const presupuestoCents = toCents(partida.presupuestoAsignado);
  const costoCents = toCents(partida.costoMaterialesAcumulado);

  const valorGanadoCents = divRoundHalfUp(presupuestoCents * avanceCents, 10000n);
  const desviacionCents = costoCents - valorGanadoCents;

  return {
    porcentajeAvance: centsToNumber(avanceCents),
    presupuestoAsignado: centsToNumber(presupuestoCents),
    costoMaterialesAcumulado: centsToNumber(costoCents),
    valorGanado: centsToNumber(valorGanadoCents),
    desviacionPresupuestaria: centsToNumber(desviacionCents),
    sobrecosto: desviacionCents > 0n,
    presupuestoExcedido: costoCents > presupuestoCents,
  };
};

/**
 * Enriquece cada línea de la receta con `cantidadPendiente = total - consumida`.
 */
const enriquecerReceta = (recetaMateriales = []) => {
  return recetaMateriales.map((linea) => {
    const totalCents = toCents(linea.cantidadTotalRequerida);
    const consumidaCents = toCents(linea.cantidadConsumidaAcumulada);
    const pendienteCents = totalCents - consumidaCents;
    return {
      ...linea,
      cantidadPendiente: centsToNumber(pendienteCents > 0n ? pendienteCents : 0n),
    };
  });
};

/**
 * Valida y normaliza un porcentaje (0 < p <= 100, máximo 2 decimales). Devuelve centésimas BigInt.
 */
const parsePorcentajeNuevo = (value) => {
  if (value === undefined || value === null || value === '') {
    throw AppError.badRequest(
      'El campo porcentajeNuevo es obligatorio.',
      'AVANCE_PORCENTAJE_REQUIRED'
    );
  }

  if (typeof value !== 'number' && typeof value !== 'string') {
    throw AppError.badRequest(
      'El campo porcentajeNuevo debe ser numérico.',
      'AVANCE_INVALID_PORCENTAJE'
    );
  }

  const raw = typeof value === 'number' ? String(value) : value.trim();
  const num = Number(raw);

  if (!PORCENTAJE_REGEX.test(raw) || Number.isNaN(num) || num <= 0 || num > 100) {
    throw AppError.badRequest(
      'El porcentajeNuevo debe ser un número mayor a 0 y menor o igual a 100, con un máximo de 2 decimales.',
      'AVANCE_INVALID_PORCENTAJE',
      { valorRecibido: value, minimoExclusivo: 0, maximo: 100, decimalesMaximos: 2 }
    );
  }

  return toCents(num);
};

const INCLUDE_RECETA_MATERIAL = {
  include: {
    material: true,
  },
  orderBy: {
    material: {
      nombre: 'asc',
    },
  },
};

// ============================================================================
// SERVICIOS
// ============================================================================

/**
 * 1. Lista las partidas de obra filtrables por `proyectoId` y/o `faseRequerida`,
 * incluyendo receta de materiales, conteo de reportes e indicadores presupuestarios.
 */
const listPartidas = async (filters = {}) => {
  const { proyectoId, faseRequerida } = filters;
  const where = {};

  if (proyectoId) {
    where.proyectoId = String(proyectoId).trim();
  }

  if (faseRequerida) {
    const faseNorm = String(faseRequerida).toUpperCase().trim();
    if (!FASES_PARTIDA_VALIDAS.includes(faseNorm)) {
      throw AppError.badRequest(
        `La fase '${faseRequerida}' no es válida. Fases permitidas: ${FASES_PARTIDA_VALIDAS.join(', ')}.`,
        'PARTIDA_INVALID_FASE',
        { fasesPermitidas: FASES_PARTIDA_VALIDAS }
      );
    }
    where.faseRequerida = faseNorm;
  }

  const partidas = await prisma.partidaObra.findMany({
    where,
    include: {
      proyecto: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
          faseActual: true,
        },
      },
      recetaMateriales: INCLUDE_RECETA_MATERIAL,
      _count: {
        select: {
          reportesAvance: true,
        },
      },
    },
    orderBy: [
      { proyectoId: 'asc' },
      { codigo: 'asc' },
    ],
  });

  return partidas.map((partida) => ({
    ...partida,
    recetaMateriales: enriquecerReceta(partida.recetaMateriales),
    indicadores: calcularIndicadoresPartida(partida),
  }));
};

/**
 * 2. Obtiene el detalle de una partida: proyecto, receta con pendientes, últimos reportes e indicadores.
 */
const getPartidaById = async (id) => {
  if (!id) {
    throw AppError.badRequest('El identificador de la partida es obligatorio.', 'PARTIDA_ID_REQUIRED');
  }

  const partida = await prisma.partidaObra.findUnique({
    where: { id },
    include: {
      proyecto: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
          faseActual: true,
        },
      },
      recetaMateriales: INCLUDE_RECETA_MATERIAL,
      reportesAvance: {
        include: {
          ingeniero: {
            select: {
              id: true,
              nombre: true,
              email: true,
            },
          },
        },
        orderBy: {
          fechaReporte: 'desc',
        },
        take: MAX_REPORTES_DETALLE,
      },
      _count: {
        select: {
          reportesAvance: true,
        },
      },
    },
  });

  if (!partida) {
    throw AppError.notFound(
      `No se encontró la partida de obra con ID '${id}'.`,
      'PARTIDA_NOT_FOUND'
    );
  }

  return {
    ...partida,
    recetaMateriales: enriquecerReceta(partida.recetaMateriales),
    indicadores: calcularIndicadoresPartida(partida),
  };
};

/**
 * 3. Crea una partida de obra con su receta de materiales en una transacción ACID.
 */
const createPartida = async (payload = {}) => {
  const {
    proyectoId,
    codigo,
    nombre,
    faseRequerida,
    presupuestoAsignado,
    recetaMateriales = [],
  } = payload;

  if (!proyectoId || !codigo || !nombre || !faseRequerida || presupuestoAsignado === undefined || presupuestoAsignado === null || presupuestoAsignado === '') {
    throw AppError.badRequest(
      'Los campos proyectoId, codigo, nombre, faseRequerida y presupuestoAsignado son obligatorios.',
      'PARTIDA_VALIDATION_ERROR'
    );
  }

  const presupuestoNum = Number(presupuestoAsignado);
  if (Number.isNaN(presupuestoNum) || !Number.isFinite(presupuestoNum) || presupuestoNum <= 0) {
    throw AppError.badRequest(
      'El presupuestoAsignado debe ser un monto numérico mayor a cero.',
      'PARTIDA_INVALID_PRESUPUESTO'
    );
  }
  const presupuestoCents = toCents(presupuestoNum);
  if (presupuestoCents <= 0n) {
    throw AppError.badRequest(
      'El presupuestoAsignado debe ser de al menos $0.01.',
      'PARTIDA_INVALID_PRESUPUESTO'
    );
  }

  const faseNorm = String(faseRequerida).toUpperCase().trim();
  if (!FASES_PARTIDA_VALIDAS.includes(faseNorm)) {
    throw AppError.badRequest(
      `La fase '${faseRequerida}' no es válida. Fases permitidas: ${FASES_PARTIDA_VALIDAS.join(', ')}.`,
      'PARTIDA_INVALID_FASE',
      { fasesPermitidas: FASES_PARTIDA_VALIDAS }
    );
  }

  if (!Array.isArray(recetaMateriales)) {
    throw AppError.badRequest(
      'El campo recetaMateriales debe ser un arreglo de { materialId, cantidadTotalRequerida }.',
      'PARTIDA_INVALID_RECETA'
    );
  }

  const materialesVistos = new Set();
  const recetaNormalizada = recetaMateriales.map((item, idx) => {
    if (!item || !item.materialId) {
      throw AppError.badRequest(
        `La línea de receta en la posición ${idx + 1} no contiene un materialId válido.`,
        'PARTIDA_RECETA_MATERIAL_REQUIRED'
      );
    }

    const cantNum = Number(item.cantidadTotalRequerida);
    if (
      item.cantidadTotalRequerida === undefined ||
      item.cantidadTotalRequerida === null ||
      item.cantidadTotalRequerida === '' ||
      Number.isNaN(cantNum) ||
      !Number.isFinite(cantNum) ||
      toCents(cantNum) <= 0n
    ) {
      throw AppError.badRequest(
        `La cantidadTotalRequerida para el material '${item.materialId}' debe ser un número mayor a cero (mínimo 0.01).`,
        'PARTIDA_RECETA_INVALID_QUANTITY',
        { materialId: item.materialId }
      );
    }

    if (materialesVistos.has(item.materialId)) {
      throw AppError.badRequest(
        `El material con ID '${item.materialId}' está duplicado en la receta de la partida.`,
        'PARTIDA_RECETA_DUPLICATE_MATERIAL',
        { materialId: item.materialId }
      );
    }
    materialesVistos.add(item.materialId);

    return {
      materialId: item.materialId,
      cantidadTotalRequerida: centsToFixed(toCents(cantNum)),
    };
  });

  const normalizedCodigo = String(codigo).toUpperCase().trim();

  const partidaCreada = await prisma.$transaction(async (tx) => {
    const proyecto = await tx.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, codigo: true, nombre: true },
    });

    if (!proyecto) {
      throw AppError.notFound(
        `No se encontró el proyecto con ID '${proyectoId}'.`,
        'PROYECTO_NOT_FOUND'
      );
    }

    const existente = await tx.partidaObra.findUnique({
      where: {
        proyectoId_codigo: {
          proyectoId,
          codigo: normalizedCodigo,
        },
      },
    });

    if (existente) {
      throw AppError.conflict(
        `Ya existe una partida con el código '${normalizedCodigo}' en el proyecto '${proyecto.codigo}'.`,
        'PARTIDA_CODIGO_DUPLICADO',
        { proyectoId, codigo: normalizedCodigo }
      );
    }

    if (recetaNormalizada.length > 0) {
      const ids = recetaNormalizada.map((r) => r.materialId);
      const materialesEncontrados = await tx.material.findMany({
        where: { id: { in: ids } },
        select: { id: true },
      });
      const encontrados = new Set(materialesEncontrados.map((m) => m.id));
      const inexistentes = ids.filter((matId) => !encontrados.has(matId));

      if (inexistentes.length > 0) {
        throw AppError.notFound(
          `No se encontraron en el catálogo los siguientes materiales: ${inexistentes.join(', ')}.`,
          'MATERIAL_NOT_FOUND',
          { materialesInexistentes: inexistentes }
        );
      }
    }

    const nuevaPartida = await tx.partidaObra.create({
      data: {
        proyectoId,
        codigo: normalizedCodigo,
        nombre: String(nombre).trim(),
        faseRequerida: faseNorm,
        presupuestoAsignado: centsToFixed(presupuestoCents),
        recetaMateriales: {
          create: recetaNormalizada,
        },
      },
    });

    return tx.partidaObra.findUnique({
      where: { id: nuevaPartida.id },
      include: {
        proyecto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            faseActual: true,
          },
        },
        recetaMateriales: INCLUDE_RECETA_MATERIAL,
        _count: {
          select: {
            reportesAvance: true,
          },
        },
      },
    });
  });

  return {
    ...partidaCreada,
    recetaMateriales: enriquecerReceta(partidaCreada.recetaMateriales),
    indicadores: calcularIndicadoresPartida(partidaCreada),
  };
};

/**
 * 4. REGLA DE ORO DEL MÓDULO 3:
 * Registra un avance físico de partida en una transacción ACID (`prisma.$transaction`):
 *  - Avance monotónico (porcentajeNuevo > porcentajeAvance actual).
 *  - Guardia regulatoria/fase (DISENO y permisos OPAMSS/MARN/ANDA).
 *  - Consumo proporcional de la receta desde la Bodega de Obra del proyecto, con validación
 *    de stock que reporta TODOS los faltantes (HTTP 422 INSUFFICIENT_PROJECT_STOCK).
 *  - Actualización de costos de partida y del costoEjecutado del proyecto.
 */

const reportarAvance = async (partidaId, payload = {}, usuarioId) => {
  if (!partidaId) {
    throw AppError.badRequest('El identificador de la partida es obligatorio.', 'PARTIDA_ID_REQUIRED');
  }

  if (!usuarioId) {
    throw AppError.unauthorized(
      'Se requiere un usuario autenticado para reportar avances de obra.',
      'AVANCE_USER_REQUIRED'
    );
  }

  const { porcentajeNuevo, observaciones } = payload || {};
  const nuevoCents = parsePorcentajeNuevo(porcentajeNuevo);
  const CIEN_CENTS = 10000n; // 100.00 %

  const resultado = await prisma.$transaction(async (tx) => {
    // 1. Cargar partida con proyecto (permisos + bodega) y receta (con material)
    const partida = await tx.partidaObra.findUnique({
      where: { id: partidaId },
      include: {
        proyecto: {
          include: {
            permisos: true,
            bodega: true,
          },
        },
        recetaMateriales: {
          include: {
            material: true,
          },
        },
      },
    });

    if (!partida) {
      throw AppError.notFound(
        `No se encontró la partida de obra con ID '${partidaId}'.`,
        'PARTIDA_NOT_FOUND'
      );
    }

    const { proyecto } = partida;
    const anteriorCents = toCents(partida.porcentajeAvance);

    // 2. Avance monotónico
    if (nuevoCents <= anteriorCents) {
      throw AppError.unprocessable(
        `El nuevo porcentaje de avance (${centsToFixed(nuevoCents)}%) debe ser mayor al avance actual de la partida '${partida.codigo}' (${centsToFixed(anteriorCents)}%).`,
        'PROGRESS_MUST_INCREASE',
        {
          partidaId: partida.id,
          codigoPartida: partida.codigo,
          porcentajeAvanceActual: centsToNumber(anteriorCents),
          porcentajeSolicitado: centsToNumber(nuevoCents),
        }
      );
    }

    // 3. Guardia de fase: no se reporta obra física si el proyecto sigue legalmente en DISENO
    if (proyecto.faseActual === 'DISENO' && partida.faseRequerida !== 'DISENO') {
      throw AppError.unprocessable(
        `El proyecto '${proyecto.codigo}' se encuentra en fase DISENO. No se puede reportar avance de la partida '${partida.codigo}' (fase ${partida.faseRequerida}) hasta que el proyecto avance legalmente a una fase constructiva.`,
        'PROJECT_PHASE_NOT_ENABLED',
        {
          proyectoId: proyecto.id,
          codigoProyecto: proyecto.codigo,
          faseActualProyecto: proyecto.faseActual,
          faseRequeridaPartida: partida.faseRequerida,
        }
      );
    }

    // 4. Guardia regulatoria SV: partidas constructivas exigen OPAMSS, MARN y ANDA en APROBADO
    if (FASES_CONSTRUCCION_BLOQUEADAS.includes(partida.faseRequerida)) {
      const estadoRegulatorio = calcularEstadoRegulatorio(proyecto.permisos);
      if (!estadoRegulatorio.habilitadoParaConstruccion) {
        throw AppError.unprocessable(
          `Bloqueo Regulatorio SV: No se puede reportar avance de la partida constructiva '${partida.codigo}' porque el proyecto '${proyecto.codigo}' no cuenta con los 3 permisos obligatorios (OPAMSS, MARN, ANDA) en estado APROBADO.`,
          'LEGAL_PERMITS_NOT_APPROVED',
          {
            proyectoId: proyecto.id,
            codigoProyecto: proyecto.codigo,
            faseRequeridaPartida: partida.faseRequerida,
            aprobados: estadoRegulatorio.aprobados,
            totalRequeridos: estadoRegulatorio.totalRequeridos,
            permisosBloqueantes: estadoRegulatorio.detalleBloqueantes,
          }
        );
      }
    }

    // 5. Bodega de obra del proyecto
    const bodegaProyecto = proyecto.bodega;
    if (!bodegaProyecto) {
      throw AppError.unprocessable(
        `El proyecto '${proyecto.codigo}' no tiene una Bodega de Obra asociada. No es posible descargar materiales para el avance.`,
        'PROJECT_WAREHOUSE_NOT_FOUND',
        { proyectoId: proyecto.id, codigoProyecto: proyecto.codigo }
      );
    }

    const deltaCents = nuevoCents - anteriorCents;
    const cierraPartida = nuevoCents === CIEN_CENTS;

    // 6. Calcular consumo proporcional por material de la receta
    const lineasConsumo = partida.recetaMateriales.map((linea) => {
      const totalCents = toCents(linea.cantidadTotalRequerida);
      const consumidaCents = toCents(linea.cantidadConsumidaAcumulada);
      const remanenteCents = totalCents - consumidaCents > 0n ? totalCents - consumidaCents : 0n;

      let consumoCents;
      if (cierraPartida) {
        // Al 100% se consume exactamente el remanente: cierre sin residuos de redondeo
        consumoCents = remanenteCents;
      } else {
        // consumoDelta = round2(cantidadTotalRequerida * delta / 100)
        consumoCents = divRoundHalfUp(totalCents * deltaCents, CIEN_CENTS);
        // Nunca consumir más de lo pendiente por acumulación de redondeos
        consumoCents = minBigInt(consumoCents, remanenteCents);
      }

      return {
        linea,
        material: linea.material,
        consumoCents,
        consumidaCents,
      };
    });

    // 7. VALIDACIÓN DE STOCK EN BODEGA DEL PROYECTO: recolectar TODOS los faltantes primero
    const lineasConConsumo = lineasConsumo.filter((l) => l.consumoCents > 0n);
    const inventarios = lineasConConsumo.length > 0
      ? await tx.inventarioBodega.findMany({
        where: {
          bodegaId: bodegaProyecto.id,
          materialId: { in: lineasConConsumo.map((l) => l.material.id) },
        },
      })
      : [];
    const mapaInventario = new Map(inventarios.map((inv) => [inv.materialId, inv]));

    const faltantes = [];
    for (const l of lineasConConsumo) {
      const inv = mapaInventario.get(l.material.id);
      const disponibleCents = inv ? toCents(inv.cantidadDisponible) : 0n;
      l.disponibleCents = disponibleCents;

      if (disponibleCents < l.consumoCents) {
        faltantes.push({
          materialId: l.material.id,
          sku: l.material.sku,
          nombre: l.material.nombre,
          unidadMedida: l.material.unidadMedida,
          requerido: centsToNumber(l.consumoCents),
          disponible: centsToNumber(disponibleCents),
          faltante: centsToNumber(l.consumoCents - disponibleCents),
        });
      }
    }

    if (faltantes.length > 0) {
      throw AppError.unprocessable(
        `Stock insuficiente en la bodega de obra '${bodegaProyecto.nombre}' (${bodegaProyecto.codigo}) para reportar el avance de la partida '${partida.codigo}'. Solicite un traslado desde Bodega Central para los ${faltantes.length} material(es) faltante(s).`,
        'INSUFFICIENT_PROJECT_STOCK',
        {
          partidaId: partida.id,
          codigoPartida: partida.codigo,
          bodegaProyectoId: bodegaProyecto.id,
          bodegaProyectoCodigo: bodegaProyecto.codigo,
          bodegaProyectoNombre: bodegaProyecto.nombre,
          porcentajeAnterior: centsToNumber(anteriorCents),
          porcentajeNuevo: centsToNumber(nuevoCents),
          faltantes,
        }
      );
    }

    // 8. Descontar inventario de la bodega del proyecto e incrementar consumo acumulado de la receta
    const consumoMateriales = [];
    let costoRawDiezMilesimas = 0n; // Σ consumo(centésimas) * costo(centésimas) => escala 1/10000

    for (const l of lineasConsumo) {
      const costoUnitarioCents = toCents(l.material.costoUnitarioPromedio);
      const subtotalRaw = l.consumoCents * costoUnitarioCents;
      costoRawDiezMilesimas += subtotalRaw;

      let stockRestanteCents = l.disponibleCents !== undefined ? l.disponibleCents : null;

      if (l.consumoCents > 0n) {
        // Decremento condicional (guardia anti-concurrencia): solo si el stock sigue alcanzando
        const decremento = await tx.inventarioBodega.updateMany({
          where: {
            bodegaId: bodegaProyecto.id,
            materialId: l.material.id,
            cantidadDisponible: { gte: centsToFixed(l.consumoCents) },
          },
          data: {
            cantidadDisponible: { decrement: centsToFixed(l.consumoCents) },
          },
        });

        if (decremento.count !== 1) {
          throw AppError.conflict(
            `El stock del material [${l.material.sku}] ${l.material.nombre} en la bodega '${bodegaProyecto.codigo}' cambió durante la operación. Intente nuevamente.`,
            'PROJECT_STOCK_CONCURRENT_UPDATE',
            { materialId: l.material.id, sku: l.material.sku }
          );
        }

        await tx.partidaMaterial.update({
          where: { id: l.linea.id },
          data: {
            cantidadConsumidaAcumulada: centsToFixed(l.consumidaCents + l.consumoCents),
          },
        });

        stockRestanteCents = l.disponibleCents - l.consumoCents;
      } else if (stockRestanteCents === null) {
        const inv = await tx.inventarioBodega.findUnique({
          where: {
            bodegaId_materialId: {
              bodegaId: bodegaProyecto.id,
              materialId: l.material.id,
            },
          },
        });
        stockRestanteCents = inv ? toCents(inv.cantidadDisponible) : 0n;
      }

      consumoMateriales.push({
        materialId: l.material.id,
        sku: l.material.sku,
        nombre: l.material.nombre,
        unidadMedida: l.material.unidadMedida,
        consumoDelta: centsToNumber(l.consumoCents),
        costoUnitario: centsToNumber(costoUnitarioCents),
        subtotal: centsToNumber(divRoundHalfUp(subtotalRaw, 100n)),
        consumidoAcumulado: centsToNumber(l.consumidaCents + l.consumoCents),
        cantidadTotalRequerida: centsToNumber(toCents(l.linea.cantidadTotalRequerida)),
        stockRestanteBodegaProyecto: centsToNumber(stockRestanteCents),
      });
    }

    // costoMaterialesDelta = round2(Σ consumoDelta * costoUnitarioPromedio)
    const costoDeltaCents = divRoundHalfUp(costoRawDiezMilesimas, 100n);

    // 9. Actualizar partida con bloqueo optimista sobre el avance leído (evita doble reporte concurrente)
    const actualizacionPartida = await tx.partidaObra.updateMany({
      where: {
        id: partida.id,
        porcentajeAvance: centsToFixed(anteriorCents),
      },
      data: {
        porcentajeAvance: centsToFixed(nuevoCents),
        costoMaterialesAcumulado: { increment: centsToFixed(costoDeltaCents) },
      },
    });

    if (actualizacionPartida.count !== 1) {
      throw AppError.conflict(
        `El avance de la partida '${partida.codigo}' fue modificado por otro reporte simultáneo. Recargue e intente nuevamente.`,
        'PARTIDA_CONCURRENT_UPDATE',
        { partidaId: partida.id }
      );
    }

    // 10. Actualizar costo ejecutado del proyecto
    const proyectoActualizado = await tx.proyecto.update({
      where: { id: proyecto.id },
      data: {
        costoEjecutado: { increment: centsToFixed(costoDeltaCents) },
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        faseActual: true,
        presupuestoTotal: true,
        costoEjecutado: true,
      },
    });

    // 11. Registrar reporte de avance (auditoría)
    const reporte = await tx.reporteAvancePartida.create({
      data: {
        partidaId: partida.id,
        ingenieroId: usuarioId,
        porcentajeAnterior: centsToFixed(anteriorCents),
        porcentajeNuevo: centsToFixed(nuevoCents),
        deltaPorcentaje: centsToFixed(deltaCents),
        costoMaterialesDelta: centsToFixed(costoDeltaCents),
        observaciones: observaciones ? String(observaciones).trim() : null,
      },
      include: {
        ingeniero: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
          },
        },
      },
    });

    const partidaActualizada = await tx.partidaObra.findUnique({
      where: { id: partida.id },
      include: {
        proyecto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            faseActual: true,
          },
        },
        recetaMateriales: INCLUDE_RECETA_MATERIAL,
        _count: {
          select: {
            reportesAvance: true,
          },
        },
      },
    });

    const indicadores = calcularIndicadoresPartida(partidaActualizada);

    // 12. Alertas financieras
    const alertas = [];
    const presupuestoProyectoCents = toCents(proyectoActualizado.presupuestoTotal);
    const costoEjecutadoCents = toCents(proyectoActualizado.costoEjecutado);

    if (costoEjecutadoCents > presupuestoProyectoCents) {
      alertas.push({
        tipo: 'PROJECT_BUDGET_EXCEEDED',
        mensaje: `El costo ejecutado del proyecto '${proyectoActualizado.codigo}' ($${centsToFixed(costoEjecutadoCents)}) supera su presupuesto total ($${centsToFixed(presupuestoProyectoCents)}).`,
        presupuestoTotal: centsToNumber(presupuestoProyectoCents),
        costoEjecutado: centsToNumber(costoEjecutadoCents),
        exceso: centsToNumber(costoEjecutadoCents - presupuestoProyectoCents),
      });
    }

    if (indicadores.sobrecosto) {
      alertas.push({
        tipo: 'PARTIDA_COST_OVERRUN',
        mensaje: `La partida '${partidaActualizada.codigo}' presenta sobrecosto: costo de materiales $${indicadores.costoMaterialesAcumulado.toFixed(2)} vs. valor ganado $${indicadores.valorGanado.toFixed(2)} al ${indicadores.porcentajeAvance.toFixed(2)}% de avance.`,
        desviacionPresupuestaria: indicadores.desviacionPresupuestaria,
      });
    }

    if (indicadores.presupuestoExcedido) {
      alertas.push({
        tipo: 'PARTIDA_BUDGET_EXCEEDED',
        mensaje: `El costo acumulado de materiales de la partida '${partidaActualizada.codigo}' ($${indicadores.costoMaterialesAcumulado.toFixed(2)}) supera su presupuesto asignado ($${indicadores.presupuestoAsignado.toFixed(2)}).`,
        exceso: round2(indicadores.costoMaterialesAcumulado - indicadores.presupuestoAsignado),
      });
    }

    return {
      reporte,
      partida: {
        ...partidaActualizada,
        recetaMateriales: enriquecerReceta(partidaActualizada.recetaMateriales),
        indicadores,
      },
      consumoMateriales,
      costoMaterialesDelta: centsToNumber(costoDeltaCents),
      costoEjecutadoProyecto: centsToNumber(costoEjecutadoCents),
      presupuestoTotalProyecto: centsToNumber(presupuestoProyectoCents),
      alertas,
    };
  }, TX_OPTIONS);

  return resultado;
};

/**
 * 5. Historial de reportes de avance de una partida (más reciente primero).
 */
const listReportesAvance = async (partidaId) => {
  if (!partidaId) {
    throw AppError.badRequest('El identificador de la partida es obligatorio.', 'PARTIDA_ID_REQUIRED');
  }

  const partida = await prisma.partidaObra.findUnique({
    where: { id: partidaId },
    select: { id: true },
  });

  if (!partida) {
    throw AppError.notFound(
      `No se encontró la partida de obra con ID '${partidaId}'.`,
      'PARTIDA_NOT_FOUND'
    );
  }

  return prisma.reporteAvancePartida.findMany({
    where: { partidaId },
    include: {
      ingeniero: {
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true,
        },
      },
    },
    orderBy: {
      fechaReporte: 'desc',
    },
  });
};

module.exports = {
  FASES_PARTIDA_VALIDAS,
  calcularIndicadoresPartida,
  listPartidas,
  getPartidaById,
  createPartida,
  reportarAvance,
  listReportesAvance,
};
