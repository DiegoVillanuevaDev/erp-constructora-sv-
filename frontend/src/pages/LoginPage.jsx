import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HardHat,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Building2,
  FileCode2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_SEED_PASSWORD } from '../services/api';

const LoginPage = () => {
  const { login, seedUsers, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@constructorasv.com');
  const [password, setPassword] = useState(DEFAULT_SEED_PASSWORD);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        'Error al autenticar las credenciales. Verifique su correo y contraseña.';
      setErrorMsg(msg);
    }
  };

  const handleQuickSelectAccount = async (account) => {
    setEmail(account.email);
    setPassword(DEFAULT_SEED_PASSWORD);
    setErrorMsg(null);
    try {
      await login(account.email, DEFAULT_SEED_PASSWORD);
      navigate('/');
    } catch (error) {
      setErrorMsg(
        error.response?.data?.message || 'No se pudo iniciar sesión con la cuenta seleccionada.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row">
      {/* Panel Izquierdo: Ficha Técnica de Arquitectura y Normativa Salvadoreña */}
      <div className="lg:w-7/12 bg-slate-900 text-slate-200 p-8 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
        <div>
          {/* Encabezado Corporativo */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-md bg-amber-600 flex items-center justify-center text-white">
                <HardHat className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold tracking-tight text-white">TERRACOTA</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                    ERP v1.0 SV
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Sistema de Gestión Integral — Inmobiliaria y Constructora de El Salvador
                </p>
              </div>
            </div>
            <a
              href="/api/v1/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-amber-400 border border-slate-700 transition-colors"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              OpenAPI 3.0 Docs
            </a>
          </div>

          {/* Título Principal */}
          <div className="mt-8">
            <span className="font-mono text-xs uppercase tracking-widest text-amber-400">
              ARQUITECTURA TRANSACCIONAL ACID · NORMATIVA SALVADOREÑA
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
              Control de Obra Civil, Inventario Multi-sitio, Nómina Dual y Facturación DTE
            </h1>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed max-w-2xl">
              Plataforma empresarial diseñada con reglas de bloqueo regulatorio estricto para
              operaciones constructivas e inmobiliarias bajo legislación vigente de la República de
              El Salvador.
            </p>
          </div>

          {/* Especificaciones Técnicas de los 5 Módulos */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-md bg-slate-950/60 border border-slate-800 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs font-semibold text-amber-400">
                  MÓDULO 01 · PERMISOLOGÍA SV
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  HTTP 422 GUARD
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Guardia Regulatoria OPAMSS, MARN y ANDA
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Bloqueo automático de transición a fases de Terracería y Obra Gris si las 3
                factibilidades institucionales no se encuentran en estado APROBADO.
              </p>
            </div>

            <div className="p-4 rounded-md bg-slate-950/60 border border-slate-800 border-l-4 border-l-sky-500">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs font-semibold text-sky-400">
                  MÓDULO 02 &amp; 03 · BODEGAS Y OBRA
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  ACID STOCK
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Trazabilidad de Materiales y Recetas de Partida
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Traslados atómicos desde Bodega Central a Bodegas de Proyecto y descarga
                proporcional de materiales según delta de avance físico.
              </p>
            </div>

            <div className="p-4 rounded-md bg-slate-950/60 border border-slate-800 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs font-semibold text-emerald-400">
                  MÓDULO 04 · NÓMINA DUAL SV
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 tabular-nums">
                  ISSS 3% · AFP 7.25%
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Planilla Quincenal Administrativa y Semanal de Campo
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Tope legal ISSS de $1,000.00 mensuales ($500.00 quincenal / $250.00 semanal) y
                tablas progresivas de Renta (ISR Tramos I al IV — Decreto Ejecutivo No. 10).
              </p>
            </div>

            <div className="p-4 rounded-md bg-slate-950/60 border border-slate-800 border-l-4 border-l-teal-500">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs font-semibold text-teal-400">
                  MÓDULO 05 · INMOBILIARIA &amp; DTE
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 tabular-nums">
                  IVA 13% · ITBR 3%
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Amortización Francesa y Cumplimiento Art. 114 CT
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Emisión de Factura Consumidor Final (DTE-01) y Crédito Fiscal (DTE-03) con
                validación obligatoria de NRC y Giro Económico.
              </p>
            </div>
          </div>
        </div>

        {/* Pie Técnico */}
        <div className="mt-8 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            SAN SALVADOR, EL SALVADOR · MONEDA OFICIAL: USD ($)
          </span>
          <span>POSTGRESQL + PRISMA DECIMAL + JWT RBAC</span>
        </div>
      </div>

      {/* Panel Derecho: Formulario de Autenticación y Selector de Cuentas Semilla */}
      <div className="lg:w-5/12 bg-white p-8 lg:p-12 flex flex-col justify-center">
        <div className="max-w-md w-full mx-auto">
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              CONTROL DE ACCESO BASADO EN ROLES (RBAC)
            </div>
            <h2 className="text-xl font-bold text-slate-900">Iniciar Sesión Corporativa</h2>
            <p className="text-xs text-slate-500 mt-1">
              Ingrese sus credenciales o seleccione un perfil operativo de demostración para
              auditar permisos.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-md bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error de Autenticación</p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Correo Electrónico Institucional
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:bg-white focus:border-slate-900"
                  placeholder="usuario@constructorasv.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Contraseña de Acceso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:bg-white focus:border-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-md bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
            >
              <span>{loading ? 'Verificando Credenciales...' : 'Acceder a Plataforma ERP'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Selector Rápido de las 6 Cuentas Semilla de seed.js */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Perfiles Operativos de Demostración (1 Clic)
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                Clave: {DEFAULT_SEED_PASSWORD}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {seedUsers.map((account) => {
                const isSelected = email === account.email;
                return (
                  <button
                    key={account.rol}
                    type="button"
                    onClick={() => handleQuickSelectAccount(account)}
                    className={`w-full text-left p-2.5 rounded-md border transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-amber-50/70 border-amber-500 text-slate-900'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-amber-400">
                          {account.rol}
                        </span>
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {account.nombre}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5 truncate">
                        {account.email}
                      </p>
                    </div>
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? 'text-amber-600' : 'text-slate-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
