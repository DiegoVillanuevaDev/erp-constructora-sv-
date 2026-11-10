const { prismaMock } = require('../helpers/prismaMock');

// Aislar cualquier importación de PrismaClient hacia el mock en memoria
jest.mock('../../src/config/prisma', () => prismaMock);

const {
  calcularEstadoRegulatorio,
  REQUIRED_INSTITUTIONS,
} = require('../../src/modules/proyectos/proyectos.service');

const {
  calcularDeduccionesLeySV,
  simularCalculoPlanilla,
} = require('../../src/modules/planillas/planillas.service');

const {
  generarTablaAmortizacionFrancesa,
  calcularDesgloseFiscalSV,
  validarCumplimientoFiscalCCF,
} = require('../../src/modules/ventas/ventas.service');

describe('Suite Unitaria — Motores de Reglas de Negocio y Legislación de El Salvador', () => {
  // ============================================================================
  // 1. MÓDULO 1: SEMÁFORO REGULATORIO (OPAMSS, MARN, ANDA)
  // ============================================================================
  describe('Módulo 1: Guardia Regulatoria SV (calcularEstadoRegulatorio — OPAMSS, MARN, ANDA)', () => {
    test('Debe retornar habilitadoParaConstruccion = false cuando el arreglo de permisos está vacío', () => {
      const estado = calcularEstadoRegulatorio([]);

      expect(REQUIRED_INSTITUTIONS).toEqual(['OPAMSS', 'MARN', 'ANDA']);
      expect(estado.habilitadoParaConstruccion).toBe(false);
      expect(estado.aprobados).toBe(0);
      expect(estado.totalRequeridos).toBe(3);
      expect(estado.permisosPendientes).toEqual(['OPAMSS', 'MARN', 'ANDA']);
      expect(estado.detalleBloqueantes).toHaveLength(3);
    });

    test('Debe retornar habilitadoParaConstruccion = false si falta aprobar MARN o ANDA aunque OPAMSS esté APROBADO', () => {
      const permisosParciales = [
        { institucion: 'OPAMSS', estado: 'APROBADO', numeroExpediente: 'OPAMSS-2026-001' },
        { institucion: 'MARN', estado: 'EN_TRAMITE', numeroExpediente: 'MARN-NFA-2026-089' },
        { institucion: 'ANDA', estado: 'OBSERVADO', observaciones: 'Falta memoria hidráulica' },
      ];

      const estado = calcularEstadoRegulatorio(permisosParciales);

      expect(estado.habilitadoParaConstruccion).toBe(false);
      expect(estado.aprobados).toBe(1);
      expect(estado.permisosPendientes).toEqual(['MARN', 'ANDA']);
      expect(estado.detalleBloqueantes).toEqual([
        {
          institucion: 'MARN',
          estadoActual: 'EN_TRAMITE',
          numeroExpediente: 'MARN-NFA-2026-089',
          observaciones: null,
        },
        {
          institucion: 'ANDA',
          estadoActual: 'OBSERVADO',
          numeroExpediente: null,
          observaciones: 'Falta memoria hidráulica',
        },
      ]);
    });

    test('Debe retornar habilitadoParaConstruccion = true única y exclusivamente cuando OPAMSS, MARN y ANDA están en APROBADO', () => {
      const permisosCompletos = [
        { institucion: 'OPAMSS', estado: 'APROBADO', numeroExpediente: 'OPAMSS-2026-001' },
        { institucion: 'MARN', estado: 'APROBADO', numeroExpediente: 'MARN-2026-002' },
        { institucion: 'ANDA', estado: 'APROBADO', numeroExpediente: 'ANDA-2026-003' },
      ];

      const estado = calcularEstadoRegulatorio(permisosCompletos);

      expect(estado.habilitadoParaConstruccion).toBe(true);
      expect(estado.aprobados).toBe(3);
      expect(estado.totalRequeridos).toBe(3);
      expect(estado.permisosPendientes).toEqual([]);
      expect(estado.detalleBloqueantes).toEqual([]);
    });
  });

  // ============================================================================
  // 2. MÓDULO 4: MOTOR DE DEDUCCIONES DE LEY SALVADOREÑA (ISSS, AFP, ISR)
  // ============================================================================
  describe('Módulo 4: Motor Laboral y Tributario SV (calcularDeduccionesLeySV — Decreto Ejecutivo No. 10 y Art. 156 CT)', () => {
    test('Caso 1 (Quincenal Exento en Tramo I): $300.00 bruto -> Renta Gravada $269.25 (<= $275.00) -> ISR = $0.00', () => {
      const resultado = calcularDeduccionesLeySV({
        ingresoBruto: 300.0,
        tipoPlanilla: 'ADMINISTRATIVA_QUINCENAL',
      });

      // ISSS Laboral (3% sobre $300.00) = $9.00
      // AFP Laboral (7.25% sobre $300.00) = $21.75
      // Renta Gravada = $300.00 - $9.00 - $21.75 = $269.25 (Tramo I exento hasta $275.00 quincenal)
      expect(resultado.ingresoBruto).toBe(300.0);
      expect(resultado.codigoIngresoF910).toBe('01');
      expect(resultado.descuentoIsss).toBe(9.0);
      expect(resultado.descuentoAfp).toBe(21.75);
      expect(resultado.rentaGravada).toBe(269.25);
      expect(resultado.tramoIsr).toBe('TRAMO_I');
      expect(resultado.descuentoRenta).toBe(0.0);
      expect(resultado.totalDescuentos).toBe(30.75);
      expect(resultado.liquidoPagar).toBe(269.25);
    });

    test('Caso 2 (Quincenal en Tramo IV con Tope Legal ISSS): $1,500.00 bruto -> ISSS tope $15.00, AFP $108.75, ISR $251.44, Líquido $1,124.81 y Patronal ISSS $37.50', () => {
      const resultado = calcularDeduccionesLeySV({
        ingresoBruto: 1500.0,
        tipoPlanilla: 'ADMINISTRATIVA_QUINCENAL',
      });

      // Tope Quincenal ISSS = $500.00 -> ISSS Laboral (3%) = $15.00 | ISSS Patronal (7.5%) = $37.50
      // AFP Laboral (7.25% de $1,500.00) = $108.75 | AFP Patronal (8.75% de $1,500.00) = $131.25
      // Renta Gravada = $1,500.00 - $15.00 - $108.75 = $1,376.25 (Tramo IV > $1,019.05)
      // ISR = ($1,376.25 - $1,019.05) * 0.30 + $144.28 = $357.20 * 0.30 + $144.28 = $107.16 + $144.28 = $251.44
      // Líquido = $1,500.00 - ($15.00 + $108.75 + $251.44) = $1,124.81
      expect(resultado.techoIsssPeriodo).toBe(500.0);
      expect(resultado.baseCotizableIsss).toBe(500.0);
      expect(resultado.descuentoIsss).toBe(15.0);
      expect(resultado.descuentoAfp).toBe(108.75);
      expect(resultado.rentaGravada).toBe(1376.25);
      expect(resultado.tramoIsr).toBe('TRAMO_IV');
      expect(resultado.descuentoRenta).toBe(251.44);
      expect(resultado.totalDescuentos).toBe(375.19);
      expect(resultado.liquidoPagar).toBe(1124.81);
      expect(resultado.aportesPatronales.isssPatronal).toBe(37.5);
      expect(resultado.aportesPatronales.afpPatronal).toBe(131.25);
    });

    test('Caso 3 (Campo Semanal por Día Trabajado y Retención Eventual 10% Art. 156 CT SV): Código F-910 = 11, ISSS = $0.00, AFP = $0.00, ISR = 10% directo', () => {
      // 3.1 Campo semanal ordinario por día trabajado (6 días x $30.00 = $180.00 semanales)
      const simulacionSemanalDependencia = simularCalculoPlanilla({
        tipoPlanilla: 'CAMPO_SEMANAL',
        modalidadPago: 'DIA_TRABAJADO',
        tarifaDiaria: 30.0,
        diasTrabajados: 6,
      });

      expect(simulacionSemanalDependencia.ingresoBruto).toBe(180.0);
      expect(simulacionSemanalDependencia.codigoIngresoF910).toBe('01');
      expect(simulacionSemanalDependencia.descuentoIsss).toBe(5.4);
      expect(simulacionSemanalDependencia.descuentoAfp).toBe(13.05);
      expect(simulacionSemanalDependencia.rentaGravada).toBe(161.55); // Tramo II semanal ($137.51 - $223.81)
      expect(simulacionSemanalDependencia.tramoIsr).toBe('TRAMO_II');

      // 3.2 Servicio eventual de obra sin dependencia laboral (Art. 156 Código Tributario SV - 10% ISR)
      const eventualArt156 = calcularDeduccionesLeySV({
        ingresoBruto: 250.0,
        tipoPlanilla: 'CAMPO_SEMANAL',
        aplicarRetencionEventual10: true,
      });

      expect(eventualArt156.codigoIngresoF910).toBe('11');
      expect(eventualArt156.descuentoIsss).toBe(0.0);
      expect(eventualArt156.descuentoAfp).toBe(0.0);
      expect(eventualArt156.rentaGravada).toBe(250.0);
      expect(eventualArt156.tramoIsr).toBe('RETENCION_EVENTUAL_10');
      expect(eventualArt156.descuentoRenta).toBe(25.0);
      expect(eventualArt156.liquidoPagar).toBe(225.0);
      expect(eventualArt156.aportesPatronales.totalAportePatronal).toBe(0.0);
    });
  });

  // ============================================================================
  // 3. MÓDULO 5: AMORTIZACIÓN FRANCESA Y DESGLOSE FISCAL SV (IVA 13% + ITBR 3%)
  // ============================================================================
  describe('Módulo 5: Motor Financiero de Amortización Francesa y Fiscalidad SV (IVA 13% / ITBR 3%)', () => {
    test('La Tabla de Amortización Francesa debe cuadrar al centavo exacto (descuadre === 0 y saldoFinal === 0.00 en la última cuota)', () => {
      const montoFinanciado = 85432.17;
      const tabla = generarTablaAmortizacionFrancesa({
        montoFinanciado,
        plazoMeses: 24,
        tasaInteresAnual: 8.75,
        fechaPrimerPago: '2026-12-01',
      });

      expect(tabla.cuotas).toHaveLength(24);

      const sumaCapitales = Number(
        tabla.cuotas.reduce((acc, c) => acc + c.montoCapital, 0).toFixed(2)
      );
      const descuadre = Number((montoFinanciado - sumaCapitales).toFixed(2));
      const ultimaCuota = tabla.cuotas[tabla.cuotas.length - 1];

      expect(descuadre).toBe(0);
      expect(sumaCapitales).toBe(montoFinanciado);
      expect(tabla.totalCapital).toBe(montoFinanciado);
      expect(ultimaCuota.saldoFinal).toBe(0);
    });

    test('Desglose de IVA 13% en CREDITO_FISCAL_CCF (DTE-03) vs FACTURA_CONSUMIDOR_FINAL (DTE-01) e ITBR 3%', () => {
      // 1. CCF DTE-03 a partir de base gravada ($10,000.00 + 13% IVA = $11,300.00)
      const ccfDesdeBase = calcularDesgloseFiscalSV({
        montoGravado: 10000.0,
        tipoDocumento: 'CREDITO_FISCAL_CCF',
        precioInmueble: 25000.0, // <= $28,571.43 -> Exento de ITBR
      });

      expect(ccfDesdeBase.codigoDteMH).toBe('03');
      expect(ccfDesdeBase.requiereNrcYGiro).toBe(true);
      expect(ccfDesdeBase.montoGravado).toBe(10000.0);
      expect(ccfDesdeBase.montoIva).toBe(1300.0);
      expect(ccfDesdeBase.montoTotal).toBe(11300.0);
      expect(ccfDesdeBase.itbr.exentoItbr).toBe(true);
      expect(ccfDesdeBase.impuestoTransferenciaBienesRaices).toBe(0.0);

      // 2. Factura Consumidor Final DTE-01 con IVA incluido ($113,000.00 -> Base $100,000.00 + IVA $13,000.00)
      // Evaluación ITBR sobre inmueble de $128,571.43: Exceso sobre $28,571.43 = $100,000.00 -> 3% ITBR = $3,000.00
      const fcfConItbrGravado = calcularDesgloseFiscalSV({
        montoTotal: 113000.0,
        tipoDocumento: 'FACTURA_CONSUMIDOR_FINAL',
        precioInmueble: 128571.43,
      });

      expect(fcfConItbrGravado.codigoDteMH).toBe('01');
      expect(fcfConItbrGravado.requiereNrcYGiro).toBe(false);
      expect(fcfConItbrGravado.montoGravado).toBe(100000.0);
      expect(fcfConItbrGravado.montoIva).toBe(13000.0);
      expect(fcfConItbrGravado.montoTotal).toBe(113000.0);
      expect(fcfConItbrGravado.itbr.exentoItbr).toBe(false);
      expect(fcfConItbrGravado.itbr.baseGravableExceso).toBe(100000.0);
      expect(fcfConItbrGravado.impuestoTransferenciaBienesRaices).toBe(3000.0);
    });

    test('validarCumplimientoFiscalCCF debe lanzar 422 FISCAL_CCF_REQUIRES_NRC_AND_GIRO si falta NRC o Giro en CCF', () => {
      const clienteNaturalSinNrc = {
        id: 'cli-001',
        nombreCompleto: 'Juan Pérez',
        tipo: 'NATURAL',
        dui: '01234567-8',
        nrc: null,
        giro: null,
      };

      expect(() =>
        validarCumplimientoFiscalCCF(clienteNaturalSinNrc, 'CREDITO_FISCAL_CCF')
      ).toThrow(
        expect.objectContaining({
          statusCode: 422,
          errorCode: 'FISCAL_CCF_REQUIRES_NRC_AND_GIRO',
        })
      );
    });
  });
});
