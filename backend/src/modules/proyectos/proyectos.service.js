const prisma = require('../../config/prisma');
const AppError = require('../../utils/AppError');

const REQUIRED_INSTITUTIONS = ['OPAMSS', 'MARN', 'ANDA'];
const FASES_CONSTRUCCION_BLOQUEADAS = ['TERRACERIA', 'OBRA_GRIS', 'ACABADOS', 'FINALIZADO'];
const ORDEN_FASES = ['DISENO', 'TERRACERIA', 'OBRA_GRIS', 'ACABADOS', 'FINALIZADO'];
const ESTADOS_PERMISO_VALIDOS = ['PENDIENTE', 'EN_TRAMITE', 'OBSERVADO', 'APROBADO', 'RECHAZADO'];

/**
 * Calcula el resumen del estado regulatorio de un proyecto frente a OPAMSS, MARN y ANDA.
 * Un proyecto solo está habilitado para fases constructivas si las 3 instituciones están en APROBADO.
 *
 * @param {Array} permisos - Lista de registros PermisoProyecto del proyecto.
 * @returns {Object} Resumen de auditoría regulatoria.
 */



/* A la hora de hacer un get esta funcion evalua si tiene los 3 permisos
* Si no, tira una lista de los faltantes
*/
const calcularEstadoRegulatorio = (permisos = []) => {
  const mapaPermisos = new Map(
    permisos.map((permiso) => [permiso.institucion, permiso])
  );

  const permisosPendientes = [];
  const detalleBloqueantes = [];
  let aprobados = 0;

  for (const institucion of REQUIRED_INSTITUTIONS) {
    const registro = mapaPermisos.get(institucion);
    const estadoActual = registro ? registro.estado : 'PENDIENTE';

    if (estadoActual === 'APROBADO') {
      aprobados += 1;
    } else {
      permisosPendientes.push(institucion);
      detalleBloqueantes.push({
        institucion,
        estadoActual,
        numeroExpediente: registro?.numeroExpediente || null,
        observaciones: registro?.observaciones || null,
      });
    }
  }

  return {
    habilitadoParaConstruccion: aprobados === REQUIRED_INSTITUTIONS.length,
    aprobados,
    totalRequeridos: REQUIRED_INSTITUTIONS.length,
    permisosPendientes,
    detalleBloqueantes,
  };
};

/**
 * Ordena los permisos de un proyecto según el orden institucional estándar (OPAMSS, MARN, ANDA).
 */
const ordenarPermisosInstitucionales = (permisos = []) => {
  return [...permisos].sort(
    (a, b) =>
      REQUIRED_INSTITUTIONS.indexOf(a.institucion) -
      REQUIRED_INSTITUTIONS.indexOf(b.institucion)
  );
};

/**
 * Lista todos los proyectos con soporte de filtrado por faseActual y búsqueda textual.
 * Incluye permisos regulatorios, bodega asignada, conteos operativos y semáforo regulatorio.
 */
const listProyectos = async (filters = {}) => {
  const { faseActual, search } = filters;
  const where = {};

  if (faseActual) {
    const faseNormalizada = String(faseActual).toUpperCase().trim();
    if (!ORDEN_FASES.includes(faseNormalizada)) {
      throw AppError.badRequest(
        `La fase '${faseActual}' no es válida. Fases permitidas: ${ORDEN_FASES.join(', ')}.`,
        'PROYECTO_INVALID_FASE',
        { fasesPermitidas: ORDEN_FASES }
      );
    }
    where.faseActual = faseNormalizada;
  }

  if (search && String(search).trim() !== '') {
    const term = String(search).trim();
    where.OR = [
      { codigo: { contains: term, mode: 'insensitive' } },
      { nombre: { contains: term, mode: 'insensitive' } },
      { ubicacion: { contains: term, mode: 'insensitive' } },
    ];
  }

  const proyectos = await prisma.proyecto.findMany({
    where,
    include: {
      permisos: true,
      bodega: true,
      _count: {
        select: {
          partidas: true,
          empleadosAsignados: true,
          unidadesInmobiliarias: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return proyectos.map((proyecto) => {
    const permisosOrdenados = ordenarPermisosInstitucionales(proyecto.permisos);
    return {
      ...proyecto,
      permisos: permisosOrdenados,
      estadoRegulatorio: calcularEstadoRegulatorio(permisosOrdenados),
    };
  });
};

/**
 * Obtiene el detalle integral de un proyecto por su UUID.
 */
const getProyectoById = async (id) => {
  if (!id) {
    throw AppError.badRequest('El identificador del proyecto es obligatorio.', 'PROYECTO_ID_REQUIRED');
  }

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    include: {
      permisos: true,
      bodega: {
        include: {
          inventarios: {
            include: {
              material: true,
            },
          },
        },
      },
      partidas: {
        orderBy: {
          codigo: 'asc',
        },
      },
      unidadesInmobiliarias: {
        orderBy: {
          codigo: 'asc',
        },
      },
      _count: {
        select: {
          partidas: true,
          empleadosAsignados: true,
          unidadesInmobiliarias: true,
        },
      },
    },
  });

  if (!proyecto) {
    throw AppError.notFound(
      `No se encontró el proyecto con ID '${id}'.`,
      'PROYECTO_NOT_FOUND'
    );
  }

  const permisosOrdenados = ordenarPermisosInstitucionales(proyecto.permisos);

  return {
    ...proyecto,
    permisos: permisosOrdenados,
    estadoRegulatorio: calcularEstadoRegulatorio(permisosOrdenados),
  };
};

/**
 * Crea un nuevo proyecto inmobiliario/constructivo en una transacción ACID:
 * 1. Crea el registro de Proyecto.
 * 2. Inicializa los 3 permisos regulatorios obligatorios (OPAMSS, MARN, ANDA).
 * 3. Crea automaticamente su Bodega de Obra asociada (tipo PROYECTO).
 */
const createProyecto = async (payload = {}) => {
  const {
    codigo,
    nombre,
    ubicacion,
    presupuestoTotal,
    fechaInicio,
    fechaFinEstimada,
    faseActual = 'DISENO',
    permisos: permisosIniciales = [],
    crearBodega = true,
  } = payload;

  if (!codigo || !nombre || !ubicacion || presupuestoTotal === undefined || presupuestoTotal === null || !fechaInicio) {
    throw AppError.badRequest(
      'Los campos codigo, nombre, ubicacion, presupuestoTotal y fechaInicio son obligatorios.',
      'PROYECTO_VALIDATION_ERROR'
    );
  }

  const presupuestoNum = Number(presupuestoTotal);
  if (Number.isNaN(presupuestoNum) || presupuestoNum <= 0) {
    throw AppError.badRequest(
      'El presupuestoTotal debe ser un monto numérico mayor a cero.',
      'PROYECTO_INVALID_PRESUPUESTO'
    );
  }

  const parsedFechaInicio = new Date(fechaInicio);
  if (Number.isNaN(parsedFechaInicio.getTime())) {
    throw AppError.badRequest(
      'El campo fechaInicio no contiene una fecha válida.',
      'PROYECTO_INVALID_FECHA_INICIO'
    );
  }

  let parsedFechaFin = null;
  if (fechaFinEstimada) {
    parsedFechaFin = new Date(fechaFinEstimada);
    if (Number.isNaN(parsedFechaFin.getTime())) {
      throw AppError.badRequest(
        'El campo fechaFinEstimada no contiene una fecha válida.',
        'PROYECTO_INVALID_FECHA_FIN'
      );
    }
  }

  const faseSolicitada = String(faseActual || 'DISENO').toUpperCase().trim();
  if (!ORDEN_FASES.includes(faseSolicitada)) {
    throw AppError.badRequest(
      `La fase '${faseActual}' no es válida. Fases permitidas: ${ORDEN_FASES.join(', ')}.`,
      'PROYECTO_INVALID_FASE',
      { fasesPermitidas: ORDEN_FASES }
    );
  }

  const normalizedCodigo = String(codigo).toUpperCase().trim();

  // Preparar configuración inicial de los 3 permisos regulatorios (OPAMSS, MARN, ANDA)
  const mapaPermisosInput = new Map();
  if (Array.isArray(permisosIniciales)) {
    for (const item of permisosIniciales) {
      if (item && item.institucion) {
        const inst = String(item.institucion).toUpperCase().trim();
        if (REQUIRED_INSTITUTIONS.includes(inst)) {
          mapaPermisosInput.set(inst, item);
        }
      }
    }
  }

  const registrosPermisosParaCrear = REQUIRED_INSTITUTIONS.map((institucion) => {
    const custom = mapaPermisosInput.get(institucion) || {};
    const estado = custom.estado
      ? String(custom.estado).toUpperCase().trim()
      : 'PENDIENTE';

    if (!ESTADOS_PERMISO_VALIDOS.includes(estado)) {
      throw AppError.badRequest(
        `Estado de permiso '${custom.estado}' inválido para ${institucion}.`,
        'PERMISO_INVALID_ESTADO',
        { estadosPermitidos: ESTADOS_PERMISO_VALIDOS }
      );
    }

    const fechaEmision =
      estado === 'APROBADO'
        ? custom.fechaEmision
          ? new Date(custom.fechaEmision)
          : new Date()
        : custom.fechaEmision
          ? new Date(custom.fechaEmision)
          : null;

    const fechaVencimiento = custom.fechaVencimiento
      ? new Date(custom.fechaVencimiento)
      : null;

    return {
      institucion,
      estado,
      numeroExpediente: custom.numeroExpediente ? String(custom.numeroExpediente).trim() : null,
      fechaEmision,
      fechaVencimiento,
      observaciones: custom.observaciones ? String(custom.observaciones).trim() : null,
    };
  });

  // Si intentan crear el proyecto directamente en una fase constructiva (> DISENO),
  // verificar que los 3 permisos iniciales vengan APROBADOS
  if (FASES_CONSTRUCCION_BLOQUEADAS.includes(faseSolicitada)) {
    const estadoRegInicial = calcularEstadoRegulatorio(registrosPermisosParaCrear);
    if (!estadoRegInicial.habilitadoParaConstruccion) {
      throw AppError.unprocessable(
        `No se puede crear el proyecto directamente en la fase '${faseSolicitada}'. La normativa salvadoreña exige que los permisos de OPAMSS, MARN y ANDA estén en estado APROBADO antes de iniciar fases constructivas.`,
        'LEGAL_PERMITS_NOT_APPROVED',
        {
          faseSolicitada,
          permisosBloqueantes: estadoRegInicial.detalleBloqueantes,
        }
      );
    }
  }

  const existingProyecto = await prisma.proyecto.findUnique({
    where: { codigo: normalizedCodigo },
  });

  if (existingProyecto) {
    throw AppError.conflict(
      `Ya existe un proyecto registrado con el código '${normalizedCodigo}'.`,
      'PROYECTO_CODIGO_DUPLICADO'
    );
  }

  const proyectoCreado = await prisma.$transaction(async (tx) => {
    const nuevoProyecto = await tx.proyecto.create({
      data: {
        codigo: normalizedCodigo,
        nombre: String(nombre).trim(),
        ubicacion: String(ubicacion).trim(),
        presupuestoTotal: presupuestoNum.toFixed(2),
        faseActual: faseSolicitada,
        fechaInicio: parsedFechaInicio,
        fechaFinEstimada: parsedFechaFin,
      },
    });

    await tx.permisoProyecto.createMany({
      data: registrosPermisosParaCrear.map((permiso) => ({
        ...permiso,
        proyectoId: nuevoProyecto.id,
      })),
    });

    if (crearBodega !== false) {
      const codigoBodega = `BOD-${normalizedCodigo}`;
      await tx.bodega.create({
        data: {
          codigo: codigoBodega,
          nombre: `Bodega de Obra — ${String(nombre).trim()}`,
          tipo: 'PROYECTO',
          ubicacion: String(ubicacion).trim(),
          proyectoId: nuevoProyecto.id,
        },
      });
    }

    return tx.proyecto.findUnique({
      where: { id: nuevoProyecto.id },
      include: {
        permisos: true,
        bodega: true,
        _count: {
          select: {
            partidas: true,
            empleadosAsignados: true,
            unidadesInmobiliarias: true,
          },
        },
      },
    });
  });

  const permisosOrdenados = ordenarPermisosInstitucionales(proyectoCreado.permisos);

  return {
    ...proyectoCreado,
    permisos: permisosOrdenados,
    estadoRegulatorio: calcularEstadoRegulatorio(permisosOrdenados),
  };
};

/**
 * Actualiza el estado y metadatos de un permiso regulatorio (OPAMSS, MARN o ANDA) de un proyecto.
 */
const updatePermisoProyecto = async (proyectoId, institucion, payload = {}) => {
  if (!proyectoId) {
    throw AppError.badRequest('El ID del proyecto es obligatorio.', 'PROYECTO_ID_REQUIRED');
  }

  const institucionNorm = String(institucion || '').toUpperCase().trim();
  if (!REQUIRED_INSTITUTIONS.includes(institucionNorm)) {
    throw AppError.badRequest(
      `La institución '${institucion}' no es válida. Instituciones regulatorias permitidas: ${REQUIRED_INSTITUTIONS.join(', ')}.`,
      'PERMISO_INVALID_INSTITUCION',
      { institucionesPermitidas: REQUIRED_INSTITUTIONS }
    );
  }

  const { estado, numeroExpediente, fechaEmision, fechaVencimiento, observaciones } = payload;

  if (!estado) {
    throw AppError.badRequest(
      'El campo estado del permiso es obligatorio.',
      'PERMISO_ESTADO_REQUIRED',
      { estadosPermitidos: ESTADOS_PERMISO_VALIDOS }
    );
  }

  const estadoNorm = String(estado).toUpperCase().trim();
  if (!ESTADOS_PERMISO_VALIDOS.includes(estadoNorm)) {
    throw AppError.badRequest(
      `El estado '${estado}' no es válido. Estados permitidos: ${ESTADOS_PERMISO_VALIDOS.join(', ')}.`,
      'PERMISO_INVALID_ESTADO',
      { estadosPermitidos: ESTADOS_PERMISO_VALIDOS }
    );
  }

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
  });

  if (!proyecto) {
    throw AppError.notFound(
      `No se encontró el proyecto con ID '${proyectoId}'.`,
      'PROYECTO_NOT_FOUND'
    );
  }

  const updateData = {
    estado: estadoNorm,
  };

  if (numeroExpediente !== undefined) {
    updateData.numeroExpediente = numeroExpediente ? String(numeroExpediente).trim() : null;
  }

  if (observaciones !== undefined) {
    updateData.observaciones = observaciones ? String(observaciones).trim() : null;
  }

  if (fechaEmision !== undefined) {
    updateData.fechaEmision = fechaEmision ? new Date(fechaEmision) : null;
  } else if (estadoNorm === 'APROBADO') {
    updateData.fechaEmision = new Date();
  }

  if (fechaVencimiento !== undefined) {
    updateData.fechaVencimiento = fechaVencimiento ? new Date(fechaVencimiento) : null;
  }

  const permisoActualizado = await prisma.permisoProyecto.upsert({
    where: {
      proyectoId_institucion: {
        proyectoId,
        institucion: institucionNorm,
      },
    },
    update: updateData,
    create: {
      proyectoId,
      institucion: institucionNorm,
      estado: estadoNorm,
      numeroExpediente: updateData.numeroExpediente || null,
      fechaEmision: updateData.fechaEmision || (estadoNorm === 'APROBADO' ? new Date() : null),
      fechaVencimiento: updateData.fechaVencimiento || null,
      observaciones: updateData.observaciones || null,
    },
  });

  const todosLosPermisos = await prisma.permisoProyecto.findMany({
    where: { proyectoId },
  });

  const permisosOrdenados = ordenarPermisosInstitucionales(todosLosPermisos);
  const estadoRegulatorio = calcularEstadoRegulatorio(permisosOrdenados);

  return {
    permiso: permisoActualizado,
    permisosProyecto: permisosOrdenados,
    estadoRegulatorio,
  };
};

/**
 * REGLA DE ORO DEL MÓDULO 1 (Guardia Regulatoria SV):
 * Cambia la fase constructiva de un proyecto validando estrictamente que los 3 permisos
 * (OPAMSS, MARN y ANDA) se encuentren en estado APROBADO antes de permitir avanzar a
 * TERRACERIA, OBRA_GRIS, ACABADOS o FINALIZADO.
 */
const cambiarFaseProyecto = async (proyectoId, nuevaFase) => {
  if (!proyectoId) {
    throw AppError.badRequest('El ID del proyecto es obligatorio.', 'PROYECTO_ID_REQUIRED');
  }

  if (!nuevaFase) {
    throw AppError.badRequest(
      'Debe especificar la nuevaFase a la que desea avanzar el proyecto.',
      'PROYECTO_FASE_REQUIRED',
      { fasesPermitidas: ORDEN_FASES }
    );
  }

  const faseObjetivo = String(nuevaFase).toUpperCase().trim();
  if (!ORDEN_FASES.includes(faseObjetivo)) {
    throw AppError.badRequest(
      `La fase '${nuevaFase}' no es válida. Fases permitidas: ${ORDEN_FASES.join(', ')}.`,
      'PROYECTO_INVALID_FASE',
      { fasesPermitidas: ORDEN_FASES }
    );
  }

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    include: {
      permisos: true,
      bodega: true,
    },
  });

  if (!proyecto) {
    throw AppError.notFound(
      `No se encontró el proyecto con ID '${proyectoId}'.`,
      'PROYECTO_NOT_FOUND'
    );
  }

  const estadoRegulatorio = calcularEstadoRegulatorio(proyecto.permisos);

  // Bloqueo Legal Estricto para cualquier fase posterior a DISENO
  if (FASES_CONSTRUCCION_BLOQUEADAS.includes(faseObjetivo)) {
    if (!estadoRegulatorio.habilitadoParaConstruccion) {
      throw AppError.unprocessable(
        `Bloqueo Regulatorio SV: El proyecto '${proyecto.codigo}' (${proyecto.nombre}) no puede avanzar a la fase '${faseObjetivo}' porque no cuenta con los 3 permisos obligatorios (OPAMSS, MARN, ANDA) en estado APROBADO.`,
        'LEGAL_PERMITS_NOT_APPROVED',
        {
          proyectoId: proyecto.id,
          codigoProyecto: proyecto.codigo,
          faseActual: proyecto.faseActual,
          faseSolicitada: faseObjetivo,
          aprobados: estadoRegulatorio.aprobados,
          totalRequeridos: estadoRegulatorio.totalRequeridos,
          permisosBloqueantes: estadoRegulatorio.detalleBloqueantes,
        }
      );
    }
  }

  const proyectoActualizado = await prisma.proyecto.update({
    where: { id: proyectoId },
    data: {
      faseActual: faseObjetivo,
    },
    include: {
      permisos: true,
      bodega: true,
      _count: {
        select: {
          partidas: true,
          empleadosAsignados: true,
          unidadesInmobiliarias: true,
        },
      },
    },
  });

  const permisosOrdenados = ordenarPermisosInstitucionales(proyectoActualizado.permisos);

  return {
    ...proyectoActualizado,
    permisos: permisosOrdenados,
    estadoRegulatorio: calcularEstadoRegulatorio(permisosOrdenados),
  };
};

module.exports = {
  REQUIRED_INSTITUTIONS,
  FASES_CONSTRUCCION_BLOQUEADAS,
  ORDEN_FASES,
  ESTADOS_PERMISO_VALIDOS,
  calcularEstadoRegulatorio,
  listProyectos,
  getProyectoById,
  createProyecto,
  updatePermisoProyecto,
  cambiarFaseProyecto,
};
