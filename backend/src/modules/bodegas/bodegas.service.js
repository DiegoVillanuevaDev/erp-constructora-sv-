const prisma = require('../../config/prisma');
const AppError = require('../../utils/AppError');

const TIPOS_BODEGA_VALIDOS = ['CENTRAL', 'PROYECTO'];
const ESTADOS_TRASLADO_VALIDOS = ['PENDIENTE', 'COMPLETADO', 'CANCELADO'];

/**
 * Redondea un número a 2 decimales exactos para operaciones monetarias y de stock.
 */
const round2 = (value) => {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
};

/**
 * 1.1 Lista todos los materiales del catálogo con su stock consolidado total
 * en todas las bodegas, su desglose por bodega y alerta de stock mínimo en Bodega Central.
 */
const listMateriales = async (filters = {}) => {
  const { search, soloAlertas } = filters;
  const where = {};

  if (search && String(search).trim() !== '') {
    const term = String(search).trim();
    where.OR = [
      { sku: { contains: term, mode: 'insensitive' } },
      { nombre: { contains: term, mode: 'insensitive' } },
      { unidadMedida: { contains: term, mode: 'insensitive' } },
    ];
  }

  const materiales = await prisma.material.findMany({
    where,
    include: {
      inventarios: {
        include: {
          bodega: {
            include: {
              proyecto: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                  faseActual: true,
                },
              },
            },
          },
        },
        orderBy: {
          bodega: {
            tipo: 'asc',
          },
        },
      },
    },
    orderBy: {
      nombre: 'asc',
    },
  });

  const procesados = materiales.map((material) => {
    const costoUnitario = Number(material.costoUnitarioPromedio);
    const stockMinimo = Number(material.stockMinimoAlerta);

    let stockTotalConsolidado = 0;
    let stockBodegaCentral = 0;
    let stockBodegasProyecto = 0;

    for (const inv of material.inventarios) {
      const cantidad = Number(inv.cantidadDisponible);
      stockTotalConsolidado += cantidad;

      if (inv.bodega?.tipo === 'CENTRAL') {
        stockBodegaCentral += cantidad;
      } else {
        stockBodegasProyecto += cantidad;
      }
    }

    stockTotalConsolidado = round2(stockTotalConsolidado);
    stockBodegaCentral = round2(stockBodegaCentral);
    stockBodegasProyecto = round2(stockBodegasProyecto);

    const valorTotalConsolidado = round2(stockTotalConsolidado * costoUnitario);
    const alertaStockMinimo = stockBodegaCentral <= stockMinimo;

    return {
      ...material,
      stockTotalConsolidado,
      stockBodegaCentral,
      stockBodegasProyecto,
      valorTotalConsolidado,
      alertaStockMinimo,
    };
  });

  if (soloAlertas === 'true' || soloAlertas === true) {
    return procesados.filter((m) => m.alertaStockMinimo);
  }

  return procesados;
};

/**
 * 1.2 Crea un nuevo material en el catálogo.
 * Si se provee `stockInicialCentral > 0`, busca la Bodega Central e inicializa
 * su registro en `InventarioBodega` dentro de una transacción ACID.
 */
const createMaterial = async (payload = {}) => {
  const {
    sku,
    nombre,
    unidadMedida,
    costoUnitarioPromedio,
    stockMinimoAlerta = 0,
    stockInicialCentral = 0,
  } = payload;

  if (!sku || !nombre || !unidadMedida || costoUnitarioPromedio === undefined || costoUnitarioPromedio === null) {
    throw AppError.badRequest(
      'Los campos sku, nombre, unidadMedida y costoUnitarioPromedio son obligatorios.',
      'MATERIAL_VALIDATION_ERROR'
    );
  }

  const costoNum = Number(costoUnitarioPromedio);
  if (Number.isNaN(costoNum) || costoNum < 0) {
    throw AppError.badRequest(
      'El costoUnitarioPromedio debe ser un número mayor o igual a cero.',
      'MATERIAL_INVALID_COST'
    );
  }

  const stockMinNum = Number(stockMinimoAlerta ?? 0);
  if (Number.isNaN(stockMinNum) || stockMinNum < 0) {
    throw AppError.badRequest(
      'El stockMinimoAlerta debe ser un número mayor o igual a cero.',
      'MATERIAL_INVALID_MIN_STOCK'
    );
  }

  const stockInicialNum = Number(stockInicialCentral ?? 0);
  if (Number.isNaN(stockInicialNum) || stockInicialNum < 0) {
    throw AppError.badRequest(
      'El stockInicialCentral debe ser un número mayor o igual a cero.',
      'MATERIAL_INVALID_INITIAL_STOCK'
    );
  }

  const normalizedSku = String(sku).toUpperCase().trim();

  const existingSku = await prisma.material.findUnique({
    where: { sku: normalizedSku },
  });

  if (existingSku) {
    throw AppError.conflict(
      `Ya existe un material registrado con el SKU '${normalizedSku}'.`,
      'MATERIAL_SKU_DUPLICADO'
    );
  }

  const materialCreado = await prisma.$transaction(async (tx) => {
    const nuevoMaterial = await tx.material.create({
      data: {
        sku: normalizedSku,
        nombre: String(nombre).trim(),
        unidadMedida: String(unidadMedida).toUpperCase().trim(),
        costoUnitarioPromedio: round2(costoNum).toFixed(2),
        stockMinimoAlerta: round2(stockMinNum).toFixed(2),
      },
    });

    if (stockInicialNum > 0) {
      let bodegaCentral = await tx.bodega.findFirst({
        where: { tipo: 'CENTRAL' },
      });

      if (!bodegaCentral) {
        bodegaCentral = await tx.bodega.create({
          data: {
            codigo: 'BOD-CENTRAL-SV',
            nombre: 'Bodega Central Corporativa — San Salvador',
            tipo: 'CENTRAL',
            ubicacion: 'San Salvador, El Salvador',
          },
        });
      }

      await tx.inventarioBodega.upsert({
        where: {
          bodegaId_materialId: {
            bodegaId: bodegaCentral.id,
            materialId: nuevoMaterial.id,
          },
        },
        update: {
          cantidadDisponible: {
            increment: round2(stockInicialNum),
          },
        },
        create: {
          bodegaId: bodegaCentral.id,
          materialId: nuevoMaterial.id,
          cantidadDisponible: round2(stockInicialNum).toFixed(2),
        },
      });
    }

    return tx.material.findUnique({
      where: { id: nuevoMaterial.id },
      include: {
        inventarios: {
          include: {
            bodega: true,
          },
        },
      },
    });
  });

  const stockBodegaCentral = round2(
    materialCreado.inventarios
      .filter((inv) => inv.bodega?.tipo === 'CENTRAL')
      .reduce((acc, inv) => acc + Number(inv.cantidadDisponible), 0)
  );

  return {
    ...materialCreado,
    stockTotalConsolidado: stockBodegaCentral,
    stockBodegaCentral,
    stockBodegasProyecto: 0,
    valorTotalConsolidado: round2(stockBodegaCentral * Number(materialCreado.costoUnitarioPromedio)),
    alertaStockMinimo: stockBodegaCentral <= Number(materialCreado.stockMinimoAlerta),
  };
};

/**
 * 2.1 Lista todas las bodegas (CENTRAL y PROYECTO), incluyendo datos del proyecto asociado,
 * conteo de ítems y valorización total del inventario en USD.
 */
const listBodegas = async (filters = {}) => {
  const { tipo, proyectoId, search } = filters;
  const where = {};

  if (tipo) {
    const tipoNorm = String(tipo).toUpperCase().trim();
    if (!TIPOS_BODEGA_VALIDOS.includes(tipoNorm)) {
      throw AppError.badRequest(
        `El tipo de bodega '${tipo}' no es válido. Tipos permitidos: ${TIPOS_BODEGA_VALIDOS.join(', ')}.`,
        'BODEGA_INVALID_TIPO',
        { tiposPermitidos: TIPOS_BODEGA_VALIDOS }
      );
    }
    where.tipo = tipoNorm;
  }

  if (proyectoId) {
    where.proyectoId = proyectoId;
  }

  if (search && String(search).trim() !== '') {
    const term = String(search).trim();
    where.OR = [
      { codigo: { contains: term, mode: 'insensitive' } },
      { nombre: { contains: term, mode: 'insensitive' } },
      { ubicacion: { contains: term, mode: 'insensitive' } },
    ];
  }

  const bodegas = await prisma.bodega.findMany({
    where,
    include: {
      proyecto: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
          ubicacion: true,
          faseActual: true,
        },
      },
      inventarios: {
        include: {
          material: true,
        },
        orderBy: {
          material: {
            nombre: 'asc',
          },
        },
      },
      _count: {
        select: {
          inventarios: true,
          trasladosOrigen: true,
          trasladosDestino: true,
        },
      },
    },
    orderBy: [
      { tipo: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  return bodegas.map((bodega) => {
    let valorTotalInventario = 0;
    let totalUnidadesFisicas = 0;
    let alertasStockBajo = 0;

    const inventariosValorizados = bodega.inventarios.map((inv) => {
      const cantidad = Number(inv.cantidadDisponible);
      const costoUnitario = Number(inv.material?.costoUnitarioPromedio || 0);
      const stockMinimo = Number(inv.material?.stockMinimoAlerta || 0);
      const subtotalValorizado = round2(cantidad * costoUnitario);
      const alertaStockMinimo = cantidad <= stockMinimo;

      valorTotalInventario += subtotalValorizado;
      totalUnidadesFisicas += cantidad;
      if (alertaStockMinimo) {
        alertasStockBajo += 1;
      }

      return {
        ...inv,
        subtotalValorizado,
        alertaStockMinimo,
      };
    });

    return {
      ...bodega,
      inventarios: inventariosValorizados,
      totalItemsCatalogo: bodega.inventarios.length,
      totalUnidadesFisicas: round2(totalUnidadesFisicas),
      valorTotalInventario: round2(valorTotalInventario),
      alertasStockBajo,
    };
  });
};

/**
 * 2.2 Obtiene el detalle completo de una bodega con sus inventarios (incluyendo material),
 * valorización por línea (`subtotalValorizado`) y alertas de stock mínimo.
 */
const getBodegaById = async (id) => {
  if (!id) {
    throw AppError.badRequest('El identificador de la bodega es obligatorio.', 'BODEGA_ID_REQUIRED');
  }

  const bodega = await prisma.bodega.findUnique({
    where: { id },
    include: {
      proyecto: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
          ubicacion: true,
          faseActual: true,
          presupuestoTotal: true,
          costoEjecutado: true,
        },
      },
      inventarios: {
        include: {
          material: true,
        },
        orderBy: {
          material: {
            nombre: 'asc',
          },
        },
      },
      _count: {
        select: {
          inventarios: true,
          trasladosOrigen: true,
          trasladosDestino: true,
        },
      },
    },
  });

  if (!bodega) {
    throw AppError.notFound(
      `No se encontró la bodega con ID '${id}'.`,
      'BODEGA_NOT_FOUND'
    );
  }

  let valorTotalInventario = 0;
  let totalUnidadesFisicas = 0;
  let alertasStockBajo = 0;

  const inventariosValorizados = bodega.inventarios.map((inv) => {
    const cantidad = Number(inv.cantidadDisponible);
    const costoUnitario = Number(inv.material?.costoUnitarioPromedio || 0);
    const stockMinimo = Number(inv.material?.stockMinimoAlerta || 0);
    const subtotalValorizado = round2(cantidad * costoUnitario);
    const alertaStockMinimo = cantidad <= stockMinimo;

    valorTotalInventario += subtotalValorizado;
    totalUnidadesFisicas += cantidad;
    if (alertaStockMinimo) {
      alertasStockBajo += 1;
    }

    return {
      ...inv,
      subtotalValorizado,
      alertaStockMinimo,
    };
  });

  return {
    ...bodega,
    inventarios: inventariosValorizados,
    totalItemsCatalogo: bodega.inventarios.length,
    totalUnidadesFisicas: round2(totalUnidadesFisicas),
    valorTotalInventario: round2(valorTotalInventario),
    alertasStockBajo,
  };
};

/**
 * 2.3 Permite abastecer/comprar stock hacia una bodega (por defecto la bodega CENTRAL o `bodegaId` indicada).
 * Recibe `{ bodegaId?, materialId, cantidad, nuevoCostoUnitario? }`, valida que `cantidad > 0`,
 * y en `prisma.$transaction` hace `upsert` en `InventarioBodega` incrementando `cantidadDisponible`
 * y opcionalmente actualiza `costoUnitarioPromedio`.
 */
const registrarEntradaBodegaCentral = async (payload = {}) => {
  const { bodegaId, materialId, cantidad, nuevoCostoUnitario } = payload;

  if (!materialId) {
    throw AppError.badRequest(
      'El campo materialId es obligatorio para registrar una entrada de inventario.',
      'ENTRADA_MATERIAL_ID_REQUIRED'
    );
  }

  const cantidadNum = Number(cantidad);
  if (cantidad === undefined || cantidad === null || Number.isNaN(cantidadNum) || cantidadNum <= 0) {
    throw AppError.badRequest(
      'La cantidad a ingresar debe ser un número mayor a cero.',
      'ENTRADA_INVALID_CANTIDAD'
    );
  }

  let nuevoCostoNum = null;
  if (nuevoCostoUnitario !== undefined && nuevoCostoUnitario !== null && nuevoCostoUnitario !== '') {
    nuevoCostoNum = Number(nuevoCostoUnitario);
    if (Number.isNaN(nuevoCostoNum) || nuevoCostoNum < 0) {
      throw AppError.badRequest(
        'El nuevoCostoUnitario debe ser un monto numérico mayor o igual a cero.',
        'ENTRADA_INVALID_COSTO'
      );
    }
  }

  const cantidadRedondeada = round2(cantidadNum);

  const resultado = await prisma.$transaction(async (tx) => {
    const material = await tx.material.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      throw AppError.notFound(
        `No se encontró el material con ID '${materialId}'.`,
        'MATERIAL_NOT_FOUND'
      );
    }

    let bodegaDestino = null;
    if (bodegaId) {
      bodegaDestino = await tx.bodega.findUnique({
        where: { id: bodegaId },
      });

      if (!bodegaDestino) {
        throw AppError.notFound(
          `No se encontró la bodega especificada con ID '${bodegaId}'.`,
          'BODEGA_NOT_FOUND'
        );
      }
    } else {
      bodegaDestino = await tx.bodega.findFirst({
        where: { tipo: 'CENTRAL' },
      });

      if (!bodegaDestino) {
        bodegaDestino = await tx.bodega.create({
          data: {
            codigo: 'BOD-CENTRAL-SV',
            nombre: 'Bodega Central Corporativa — San Salvador',
            tipo: 'CENTRAL',
            ubicacion: 'San Salvador, El Salvador',
          },
        });
      }
    }

    if (nuevoCostoNum !== null) {
      await tx.material.update({
        where: { id: material.id },
        data: {
          costoUnitarioPromedio: round2(nuevoCostoNum).toFixed(2),
        },
      });
    }

    const inventarioActualizado = await tx.inventarioBodega.upsert({
      where: {
        bodegaId_materialId: {
          bodegaId: bodegaDestino.id,
          materialId: material.id,
        },
      },
      update: {
        cantidadDisponible: {
          increment: cantidadRedondeada,
        },
      },
      create: {
        bodegaId: bodegaDestino.id,
        materialId: material.id,
        cantidadDisponible: cantidadRedondeada.toFixed(2),
      },
      include: {
        bodega: true,
        material: true,
      },
    });

    const cantidadDisponibleFinal = Number(inventarioActualizado.cantidadDisponible);
    const costoUnitarioFinal = Number(inventarioActualizado.material.costoUnitarioPromedio);

    return {
      bodega: inventarioActualizado.bodega,
      material: inventarioActualizado.material,
      cantidadIngresada: cantidadRedondeada,
      cantidadDisponibleActual: cantidadDisponibleFinal,
      subtotalValorizado: round2(cantidadDisponibleFinal * costoUnitarioFinal),
      inventario: inventarioActualizado,
    };
  });

  return resultado;
};

/**
 * 3.1 Lista el historial de traslados (`TrasladoBodega`) filtrable por `bodegaOrigenId`,
 * `bodegaDestinoId` o `estado`, incluyendo `bodegaOrigen`, `bodegaDestino`,
 * `autorizadoPor` (id, nombre, email, rol) y `detalles` (con `material`).
 */
const listTraslados = async (filters = {}) => {
  const { bodegaOrigenId, bodegaDestinoId, estado } = filters;
  const where = {};

  if (bodegaOrigenId) {
    where.bodegaOrigenId = bodegaOrigenId;
  }

  if (bodegaDestinoId) {
    where.bodegaDestinoId = bodegaDestinoId;
  }

  if (estado) {
    const estadoNorm = String(estado).toUpperCase().trim();
    if (!ESTADOS_TRASLADO_VALIDOS.includes(estadoNorm)) {
      throw AppError.badRequest(
        `El estado de traslado '${estado}' no es válido. Estados permitidos: ${ESTADOS_TRASLADO_VALIDOS.join(', ')}.`,
        'TRASLADO_INVALID_ESTADO',
        { estadosPermitidos: ESTADOS_TRASLADO_VALIDOS }
      );
    }
    where.estado = estadoNorm;
  }

  const traslados = await prisma.trasladoBodega.findMany({
    where,
    include: {
      bodegaOrigen: {
        include: {
          proyecto: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
            },
          },
        },
      },
      bodegaDestino: {
        include: {
          proyecto: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
            },
          },
        },
      },
      autorizadoPor: {
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true,
        },
      },
      detalles: {
        include: {
          material: true,
        },
      },
    },
    orderBy: {
      fechaTraslado: 'desc',
    },
  });

  return traslados.map((traslado) => {
    let valorTotalTraslado = 0;

    const detallesEnriquecidos = traslado.detalles.map((det) => {
      const cantidad = Number(det.cantidad);
      const costoSnap = Number(det.costoUnitarioSnap || det.material?.costoUnitarioPromedio || 0);
      const subtotalLinea = round2(cantidad * costoSnap);
      valorTotalTraslado += subtotalLinea;

      return {
        ...det,
        cantidadEnviada: det.cantidad,
        subtotalLinea,
      };
    });

    return {
      ...traslado,
      detalles: detallesEnriquecidos,
      valorTotalTraslado: round2(valorTotalTraslado),
    };
  });
};

/**
 * 3.2 REGLA DE ORO TRANSACCIONAL DEL MÓDULO 2:
 * Ejecuta un traslado multi-sitio entre Bodega Origen y Bodega Destino en una transacción ACID (`prisma.$transaction`).
 * Verifica disponibilidad de stock por material en la bodega origen; si es insuficiente lanza HTTP 422 (`INSUFFICIENT_WAREHOUSE_STOCK`)
 * y revierte toda la operación.
 */
const crearTrasladoBodega = async (payload = {}, usuarioId) => {
  const {
    codigo,
    bodegaOrigenId,
    bodegaDestinoId,
    observaciones,
    items,
  } = payload;

  if (!usuarioId) {
    throw AppError.unauthorized(
      'Se requiere un usuario autenticado para autorizar el traslado entre bodegas.',
      'TRASLADO_USER_REQUIRED'
    );
  }

  if (!bodegaOrigenId || !bodegaDestinoId) {
    throw AppError.badRequest(
      'Los campos bodegaOrigenId y bodegaDestinoId son obligatorios.',
      'TRASLADO_BODEGAS_REQUIRED'
    );
  }

  if (bodegaOrigenId === bodegaDestinoId) {
    throw AppError.badRequest(
      'La bodega de origen y la bodega de destino no pueden ser la misma.',
      'TRASLADO_SAME_WAREHOUSE'
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw AppError.badRequest(
      'El traslado debe incluir un arreglo no vacío de items a trasladar.',
      'TRASLADO_ITEMS_REQUIRED'
    );
  }

  const materialesVistos = new Set();
  const itemsNormalizados = items.map((item, idx) => {
    if (!item || !item.materialId) {
      throw AppError.badRequest(
        `El ítem en la posición ${idx + 1} no contiene un materialId válido.`,
        'TRASLADO_ITEM_MATERIAL_REQUIRED'
      );
    }

    const cantRaw = item.cantidad !== undefined ? item.cantidad : item.cantidadEnviada;
    const cantNum = Number(cantRaw);

    if (cantRaw === undefined || cantRaw === null || Number.isNaN(cantNum) || cantNum <= 0) {
      throw AppError.badRequest(
        `La cantidad solicitada para el material '${item.materialId}' debe ser un número mayor a cero.`,
        'TRASLADO_ITEM_INVALID_QUANTITY'
      );
    }

    if (materialesVistos.has(item.materialId)) {
      throw AppError.badRequest(
        `El material con ID '${item.materialId}' está duplicado en la lista de ítems del traslado.`,
        'TRASLADO_DUPLICATE_MATERIAL_ITEM',
        { materialId: item.materialId }
      );
    }

    materialesVistos.add(item.materialId);

    return {
      materialId: item.materialId,
      cantidad: round2(cantNum),
    };
  });

  const codigoGenerado = codigo
    ? String(codigo).toUpperCase().trim()
    : `TRAS-SV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  const resultadoTransaccion = await prisma.$transaction(async (tx) => {
    // 1. Verificar que ambas bodegas existan
    const [bodegaOrigen, bodegaDestino] = await Promise.all([
      tx.bodega.findUnique({ where: { id: bodegaOrigenId } }),
      tx.bodega.findUnique({ where: { id: bodegaDestinoId } }),
    ]);

    if (!bodegaOrigen) {
      throw AppError.notFound(
        `No se encontró la bodega de origen con ID '${bodegaOrigenId}'.`,
        'BODEGA_ORIGEN_NOT_FOUND'
      );
    }

    if (!bodegaDestino) {
      throw AppError.notFound(
        `No se encontró la bodega de destino con ID '${bodegaDestinoId}'.`,
        'BODEGA_DESTINO_NOT_FOUND'
      );
    }

    const saldosActualizados = [];
    const lineasDetalleParaCrear = [];

    // 2 & 3. Validar estrictamente stock en bodegaOrigen y preparar descuentos/incrementos
    for (const item of itemsNormalizados) {
      const material = await tx.material.findUnique({
        where: { id: item.materialId },
      });

      if (!material) {
        throw AppError.notFound(
          `No se encontró el material con ID '${item.materialId}' en el catálogo.`,
          'MATERIAL_NOT_FOUND'
        );
      }

      const inventarioOrigen = await tx.inventarioBodega.findUnique({
        where: {
          bodegaId_materialId: {
            bodegaId: bodegaOrigenId,
            materialId: item.materialId,
          },
        },
      });

      const stockActualOrigen = inventarioOrigen
        ? Number(inventarioOrigen.cantidadDisponible)
        : 0;

      if (!inventarioOrigen || stockActualOrigen < item.cantidad) {
        throw AppError.unprocessable(
          `Stock insuficiente en '${bodegaOrigen.nombre}' (${bodegaOrigen.codigo}) para el material [${material.sku}] ${material.nombre}. Disponible: ${stockActualOrigen.toFixed(2)} ${material.unidadMedida}, Solicitado: ${item.cantidad.toFixed(2)} ${material.unidadMedida}.`,
          'INSUFFICIENT_WAREHOUSE_STOCK',
          {
            bodegaOrigenId: bodegaOrigen.id,
            bodegaOrigenCodigo: bodegaOrigen.codigo,
            bodegaOrigenNombre: bodegaOrigen.nombre,
            materialId: material.id,
            sku: material.sku,
            nombre: material.nombre,
            unidadMedida: material.unidadMedida,
            stockDisponible: stockActualOrigen,
            cantidadSolicitada: item.cantidad,
            faltante: round2(item.cantidad - stockActualOrigen),
          }
        );
      }

      // 4. Descontar la cantidad en bodegaOrigenId
      const nuevoSaldoOrigen = round2(stockActualOrigen - item.cantidad);
      const invOrigenActualizado = await tx.inventarioBodega.update({
        where: {
          bodegaId_materialId: {
            bodegaId: bodegaOrigenId,
            materialId: item.materialId,
          },
        },
        data: {
          cantidadDisponible: nuevoSaldoOrigen.toFixed(2),
        },
      });

      // 5. Incrementar (mediante upsert) la cantidad en bodegaDestinoId
      const invDestinoActualizado = await tx.inventarioBodega.upsert({
        where: {
          bodegaId_materialId: {
            bodegaId: bodegaDestinoId,
            materialId: item.materialId,
          },
        },
        update: {
          cantidadDisponible: {
            increment: item.cantidad,
          },
        },
        create: {
          bodegaId: bodegaDestinoId,
          materialId: item.materialId,
          cantidadDisponible: item.cantidad.toFixed(2),
        },
      });

      const costoSnapshot = Number(material.costoUnitarioPromedio);

      lineasDetalleParaCrear.push({
        materialId: material.id,
        cantidad: item.cantidad.toFixed(2),
        costoUnitarioSnap: round2(costoSnapshot).toFixed(2),
      });

      saldosActualizados.push({
        materialId: material.id,
        sku: material.sku,
        nombre: material.nombre,
        unidadMedida: material.unidadMedida,
        cantidadTrasladada: item.cantidad,
        saldoBodegaOrigen: Number(invOrigenActualizado.cantidadDisponible),
        saldoBodegaDestino: Number(invDestinoActualizado.cantidadDisponible),
      });
    }

    // 6. Crear el registro de auditoría en TrasladoBodega con estado COMPLETADO y sus líneas en DetalleTraslado
    const nuevoTraslado = await tx.trasladoBodega.create({
      data: {
        codigo: codigoGenerado,
        bodegaOrigenId,
        bodegaDestinoId,
        autorizadoPorId: usuarioId,
        estado: 'COMPLETADO',
        observaciones: observaciones ? String(observaciones).trim() : null,
        detalles: {
          create: lineasDetalleParaCrear,
        },
      },
      include: {
        bodegaOrigen: {
          include: {
            proyecto: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
              },
            },
          },
        },
        bodegaDestino: {
          include: {
            proyecto: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
              },
            },
          },
        },
        autorizadoPor: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
          },
        },
        detalles: {
          include: {
            material: true,
          },
        },
      },
    });

    let valorTotalTraslado = 0;
    const detallesEnriquecidos = nuevoTraslado.detalles.map((det) => {
      const cantidad = Number(det.cantidad);
      const costoSnap = Number(det.costoUnitarioSnap || det.material?.costoUnitarioPromedio || 0);
      const subtotalLinea = round2(cantidad * costoSnap);
      valorTotalTraslado += subtotalLinea;

      return {
        ...det,
        cantidadEnviada: det.cantidad,
        subtotalLinea,
      };
    });

    return {
      ...nuevoTraslado,
      detalles: detallesEnriquecidos,
      valorTotalTraslado: round2(valorTotalTraslado),
      saldosActualizados,
    };
  });

  return resultadoTransaccion;
};

module.exports = {
  TIPOS_BODEGA_VALIDOS,
  ESTADOS_TRASLADO_VALIDOS,
  listMateriales,
  createMaterial,
  listBodegas,
  getBodegaById,
  registrarEntradaBodegaCentral,
  listTraslados,
  crearTrasladoBodega,
};
