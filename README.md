# 🏗️ ERP de Gestión Integral — [GitHub](https://github.com/DiegoVillanuevaDev/erp-constructora-sv-) | [Demo Interactiva en Vivo](https://terracota-erp.netlify.app)

> **Caso de Negocio:** Sistema de Planificación de Recursos Empresariales (ERP) Full-Stack para **Inmobiliaria y Constructora SV** (*TERRACOTA ERP*), diseñado bajo arquitectura de contenedores con **Node.js, Express, PostgreSQL, Prisma ORM, React 18, Vite, Tailwind CSS y Nginx Reverse Proxy**, cumpliendo de forma estricta con el marco regulatorio, laboral y tributario vigente de **El Salvador**.

![Versión](https://img.shields.io/badge/Versi%C3%B3n-v1.0.0-d97706?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-20.x_LTS-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.21_REST_API-000000?style=flat-square&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16_ACID-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Prisma ORM](https://img.shields.io/badge/Prisma_ORM-5.20-2D3748?style=flat-square&logo=prisma&logoColor=white)
![React](https://img.shields.io/badge/React-18.3_SPA-61DAFB?style=flat-square&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose_Multi--Container-2496ED?style=flat-square&logo=docker&logoColor=white)
![Tests](https://img.shields.io/badge/Jest_%2B_Supertest-24%2F24_Passing-16a34a?style=flat-square&logo=jest&logoColor=white)
![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0.3_Swagger_UI-85EA2D?style=flat-square&logo=swagger&logoColor=black)

---

## 📑 Tabla de Contenidos

1. [Descripción Ejecutiva](#-1-descripción-ejecutiva)
2. [Características por Módulo y Matriz RBAC](#-2-características-por-módulo-y-matriz-rbac)
3. [Tecnologías y Stack Técnico](#-3-tecnologías-y-stack-técnico)
4. [Arquitectura de Contenedores y Componentes](#-4-arquitectura-de-contenedores-y-componentes)
5. [Base de Datos — Diagrama Entidad-Relación (ER)](#-5-base-de-datos--diagrama-entidad-relación-er)
6. [Instalación y Despliegue Paso a Paso](#-6-instalación-y-despliegue-paso-a-paso)
7. [Configuración de Variables de Entorno (`.env.example`)](#-7-configuración-de-variables-de-entorno-envexample)
8. [Documentación de la API REST y Endpoints (`Swagger UI`)](#-8-documentación-de-la-api-rest-y-endpoints-swagger-ui)
9. [Evidencia de Funcionamiento, Suite de Pruebas y GitFlow](#-9-evidencia-de-funcionamiento-suite-de-pruebas-y-gitflow)

---

## 📌 1. Descripción Ejecutiva

En el sector de la construcción y el desarrollo inmobiliario en **El Salvador**, las empresas enfrentan pérdidas financieras y contingencias legales cuando operan con hojas de cálculo aisladas:
* Obras que inician movimiento de tierras sin contar con las factibilidades aprobadas por **OPAMSS**, **MARN** y **ANDA**, exponiéndose a multas y clausuras.
* Descuadres de inventario entre la **Bodega Central** y las **Bodegas de Proyecto**, sin trazabilidad entre el porcentaje de avance físico reportado por el ingeniero residente y el consumo real de cemento, acero o agregados.
* Complejidad en el procesamiento de una **nómina dual** (personal administrativo quincenal bajo el **Art. 155 del Código Tributario** y **Decreto Ejecutivo No. 10**, frente a cuadrillas de campo semanales por día trabajado o a destajo bajo el **Art. 156 del Código Tributario**).
* Emisión de contratos de compraventa inmobiliaria con tablas de amortización y documentos fiscales (**Factura de Consumidor Final DTE-01** y **Comprobante de Crédito Fiscal CCF DTE-03** con validación de **NRC**, **Giro**, **IVA 13%** e **Impuesto a la Transferencia de Bienes Raíces ITBR 3%**).

**ERP de Gestión Integral — Inmobiliaria y Constructora SV** unifica los **5 procesos misionales** en una plataforma transaccional ACID respaldada por PostgreSQL y Prisma ORM, protegida con autenticación JWT y Control de Acceso Basado en Roles (**RBAC**).

---

## ⚙️ 2. Características por Módulo y Matriz RBAC

### 2.1 Capacidades Operativas de los 5 Módulos Core

| Módulo | Reglas de Negocio y Normativa Salvadoreña Implementadas |
| :--- | :--- |
| **1. Planificación y Permisología SV** | • Creación transaccional (`prisma.$transaction`) del proyecto junto con su **Bodega de Obra** y sus **3 expedientes regulatorios obligatorios** (`OPAMSS`, `MARN`, `ANDA`).<br>• **Guardia Regulatoria Estricta (`HTTP 422 LEGAL_PERMITS_NOT_APPROVED`):** Bloquea cualquier transición desde `DISENO` hacia fases constructivas (`TERRACERIA`, `OBRA_GRIS`, `ACABADOS`, `FINALIZADO`) si al menos una de las 3 instituciones no tiene estado `APROBADO`. |
| **2. Bodega e Inventario Multi-sitio** | • Control centralizado en **Bodega Central** y existencias independientes por **Bodega de Proyecto**.<br>• Valorización financiera en tiempo real (`cantidadDisponible × costoUnitarioPromedio`) y alertas automáticas de stock mínimo.<br>• **Traslados Transaccionales (`prisma.$transaction`):** Verifica disponibilidad real en origen (`HTTP 422 INSUFFICIENT_WAREHOUSE_STOCK`), descuenta en origen, incrementa en destino (`upsert`) y congela el costo unitario histórico (`costoUnitarioSnap`). |
| **3. Ejecución y Partidas de Obra** | • Definición de **Receta de Materiales (Explosión de Insumos)** por partida constructiva.<br>• **Reporte de Avance Físico Monotónico (`0% → 100%`):** Valida que el porcentaje solo aumente (`HTTP 422 PROGRESS_MUST_INCREASE`), verifica permisos legales del proyecto, calcula el consumo proporcional en centavos enteros (`BigInt`), valida existencias en la bodega de la obra (`HTTP 422 INSUFFICIENT_PROJECT_STOCK`), descuenta el inventario y acumula automáticamente el `costoEjecutado` del proyecto. |
| **4. Recursos Humanos y Nómina Dual SV** | • **Nómina Administrativa Quincenal (Art. 155 CT — Código F-910: `01`):** Descuento de **ISSS Laboral (`3%`)** con techo legal de **\$1,000.00 mensuales** (\$500.00 quincenal → máx. **\$15.00**), **AFP Laboral (`7.25%`)**, y retención progresiva de **ISR sobre Renta Gravada** bajo las tablas oficiales vigentes del **Decreto Ejecutivo No. 10** (Tramo I exento hasta **\$275.00** quincenal / **\$550.00** mensual).<br>• **Nómina de Campo Semanal (`CAMPO_SEMANAL`):** Pago por **Día Trabajado** (tabla semanal con Tramo I exento hasta **\$137.50** y tope ISSS semanal de **\$7.50**) o **Destajo Eventual sin Dependencia Laboral (Art. 156 CT — Código F-910: `11`)** con retención directa del **10% de ISR** sobre el ingreso bruto.<br>• Cálculo automático de **Aportes Patronales** (**ISSS Patronal `7.5%`** con tope de \$75.00/mes y **AFP Patronal `8.75%`**). |
| **5. Ventas CRM y Facturación Fiscal SV** | • Gestión de clientes **Naturales** (validación de formato **DUI `00000000-0`** y homologación NIT/DUI) y **Jurídicos** (**NIT**, **NRC** y **Giro** obligatorios).<br>• **Firma Transaccional de Contratos:** Cambia la unidad inmobiliaria a `VENDIDA` y genera la **Tabla de Amortización Francesa** ajustando la última cuota para garantizar **\$0.00 de descuadre**.<br>• **Guardia Fiscal del Ministerio de Hacienda (`HTTP 422 FISCAL_CCF_REQUIRES_NRC_AND_GIRO`):** Conforme al **Art. 114 del Código Tributario**, bloquea la emisión de **Comprobante de Crédito Fiscal (`CREDITO_FISCAL_CCF` — DTE `03`)** si el cliente carece de `NRC` o `giro`, desglosando el **13% de IVA** y calculando el **Impuesto a la Transferencia de Bienes Raíces (`ITBR 3%` sobre el exceso de \$28,571.43 / ¢250,000 colones)**. |

### 2.2 Matriz de Control de Acceso Basado en Roles (RBAC)

| Rol del Sistema (`RolUsuario`) | Proyectos y Permisos (M1) | Bodegas e Inventario (M2) | Partidas y Avances (M3) | RRHH y Planillas SV (M4) | Ventas CRM y CCF (M5) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`ADMIN`** | Lectura / Escritura Total | Lectura / Escritura Total | Lectura / Escritura Total | Lectura / Escritura Total | Lectura / Escritura Total |
| **`DIRECTOR_PROYECTO`** | Crear Proyecto, Aprobar Permisos, Cambiar Fase | Consulta de Bodegas y Traslados | Crear Partidas, Reportar Avances | Consulta y Aprobación de Planillas | Crear Unidades, Consulta de Contratos y DTE |
| **`INGENIERO_RESIDENTE`** | Consulta y Cambio de Fase Constructiva | Consulta de Stock en Bodegas | **Reportar Avances Físicos de Obra** | Sin acceso (`403`) | Consulta de Unidades |
| **`BODEGUERO`** | Consulta de Proyectos | **Crear Materiales, Entradas y Traslados** | Consulta de Partidas y Recetas | Sin acceso (`403`) | Sin acceso (`403`) |
| **`RRHH`** | Consulta de Proyectos | Sin acceso (`403`) | Sin acceso (`403`) | **Alta de Empleados y Generación de Planillas** | Sin acceso (`403`) |
| **`VENTAS`** | Consulta de Proyectos | Sin acceso (`403`) | Sin acceso (`403`) | Sin acceso (`403`) | **Clientes, Contratos, Cobro de Cuotas y Emisión DTE** |

---

## 🛠️ 3. Tecnologías y Stack Técnico

| Capa | Tecnología | Versión | Propósito en la Arquitectura |
| :--- | :--- | :--- | :--- |
| **Proxy Inverso** | **Nginx** | `1.27-alpine` | Punto de entrada único (`:8080`), enrutando `/api/` hacia Express y `/` hacia React SPA con soporte WebSockets. |
| **Backend API** | **Node.js + Express** | `20-alpine` / `4.21` | Servidor HTTP RESTful modular con arquitectura en 3 capas (`routes → controller → service`), manejo centralizado de errores (`AppError`) y middlewares JWT/RBAC. |
| **Base de Datos** | **PostgreSQL** | `16-alpine` | Motor relacional ACID con tipos numéricos exactos (`DECIMAL(14,2)`) y restricciones compuestas de integridad (`@@unique`). |
| **ORM** | **Prisma ORM** | `5.20.0` | Modelado declarativo del esquema relacional, migraciones deterministas y transacciones interactivas (`prisma.$transaction`). |
| **Frontend SPA** | **React + Vite + Tailwind CSS** | `18.3` / `5.4` / `3.4` | Interfaz empresarial de alta densidad numérica (`tabular-nums`), enrutamiento protegido (`react-router-dom`), cliente `axios` y simuladores financieros en tiempo real. |
| **Seguridad** | **JSON Web Tokens + bcryptjs** | `9.0.2` / `2.4.3` | Hashing criptográfico de contraseñas, firma de tokens Bearer y validación en vivo del estado activo del usuario en base de datos. |
| **Calidad y Docs** | **Jest + Supertest + Swagger UI** | `29.7` / `7.0` / `5.0` | Suite de 24 pruebas automatizadas (unitarias y de integración HTTP) y especificación interactiva **OpenAPI 3.0.3** en `/api/v1/docs`. |

---

## 🏛️ 4. Arquitectura de Contenedores y Componentes

El siguiente diagrama **Mermaid.js** ilustra el flujo de peticiones a través de los 4 contenedores orquestados en la red privada `erp_sv_network`:

```mermaid
flowchart LR
    subgraph Cliente["💻 Navegador Web / Evaluador"]
        UI["React 18 SPA (Vite + Tailwind CSS)\nAuthContext + Conmutador RBAC"]
        SWAGGER["Swagger UI Interactiva\n/api/v1/docs (OpenAPI 3.0.3)"]
    end

    subgraph DockerNetwork["🐳 Red Docker Aislada: erp_sv_network"]
        NGINX["🛡️ Nginx Reverse Proxy\nPuerto Público :8080"]

        subgraph FrontendContainer["Contenedor Frontend (:5173)"]
            VITE["Servidor Vite / Bundle React"]
        end

        subgraph BackendContainer["Contenedor Backend API (:4000)"]
            MW["Middlewares Globales\nCORS + verifyToken (JWT) + authorizeRoles (RBAC)"]
            M1["Módulo 1: Proyectos\nGuardia OPAMSS / MARN / ANDA"]
            M2["Módulo 2: Bodegas\nTraslados Multi-sitio"]
            M3["Módulo 3: Partidas\nExplosión de Insumos y Avance"]
            M4["Módulo 4: Planillas SV\nDecreto No. 10 + Art. 156 CT"]
            M5["Módulo 5: Ventas CRM\nAmortización + CCF IVA 13%"]
            ERR["Interceptor Global\nAppError + Prisma Error Mapper"]
            PRISMA["Cliente Singleton Prisma ORM\nTransacciones ACID ($transaction)"]
        end

        subgraph DBContainer["Contenedor Base de Datos (:5432)"]
            PG[("🐘 PostgreSQL 16\nerp_constructora_sv\nVolumen Persistente")]
        end
    end

    UI -->|"HTTP :8080/api/v1/*"| NGINX
    SWAGGER -->|"HTTP :8080/api/v1/*"| NGINX
    UI -->|"HTTP :8080/*"| NGINX

    NGINX -->|"Proxy /"| VITE
    NGINX -->|"Proxy /api/"| MW

    MW --> M1 & M2 & M3 & M4 & M5
    M1 & M2 & M3 & M4 & M5 --> PRISMA
    M1 & M2 & M3 & M4 & M5 -.->|"try / catch next(err)"| ERR
    PRISMA -->|"TCP :5432 (SSL/ACID)"| PG
```

---

## 🗄️ 5. Base de Datos — Diagrama Entidad-Relación (ER)

El esquema relacional completo definido en [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma) consta de **16 modelos** y **15 enumeraciones estrictas**, utilizando tipos `Decimal` en todas las columnas monetarias y de cantidades de obra:

```mermaid
erDiagram
    USUARIO ||--o{ TRASLADO_BODEGA : "autoriza"
    USUARIO ||--o{ REPORTE_AVANCE_PARTIDA : "reporta"
    USUARIO ||--o{ CONTRATO_VENTA : "formaliza"

    PROYECTO ||--|{ PERMISO_PROYECTO : "requiere (OPAMSS, MARN, ANDA)"
    PROYECTO ||--o| BODEGA : "posee bodega de obra"
    PROYECTO ||--o{ PARTIDA_OBRA : "estructura en"
    PROYECTO ||--o{ EMPLEADO : "asigna personal"
    PROYECTO ||--o{ UNIDAD_INMOBILIARIA : "desarrolla"

    BODEGA ||--o{ INVENTARIO_BODEGA : "almacena"
    MATERIAL ||--o{ INVENTARIO_BODEGA : "registrado en"
    BODEGA ||--o{ TRASLADO_BODEGA : "origen / destino"
    TRASLADO_BODEGA ||--|{ DETALLE_TRASLADO : "contiene lineas"
    MATERIAL ||--o{ DETALLE_TRASLADO : "moviliza"

    PARTIDA_OBRA ||--|{ PARTIDA_MATERIAL : "receta de insumos"
    MATERIAL ||--o{ PARTIDA_MATERIAL : "insumo requerido"
    PARTIDA_OBRA ||--o{ REPORTE_AVANCE_PARTIDA : "registra avances"

    EMPLEADO ||--o{ BOLETA_PAGO : "percibe"
    PLANILLA ||--|{ BOLETA_PAGO : "consolida"

    CLIENTE ||--o{ CONTRATO_VENTA : "suscribe"
    UNIDAD_INMOBILIARIA ||--o| CONTRATO_VENTA : "objeto de venta"
    CONTRATO_VENTA ||--|{ CUOTA_PAGO : "amortiza en"
    CONTRATO_VENTA ||--o{ DOCUMENTO_FISCAL_VENTA : "respalda con DTE"
    CUOTA_PAGO ||--o{ DOCUMENTO_FISCAL_VENTA : "liquida con"

    USUARIO {
        uuid id PK
        string nombre
        string email UK
        string passwordHash
        enum rol "ADMIN | DIRECTOR_PROYECTO | INGENIERO_RESIDENTE | BODEGUERO | RRHH | VENTAS"
        boolean activo
    }

    PROYECTO {
        uuid id PK
        string codigo UK
        string nombre
        string ubicacion
        decimal presupuestoTotal "Decimal(14,2)"
        decimal costoEjecutado "Decimal(14,2)"
        enum faseActual "DISENO | TERRACERIA | OBRA_GRIS | ACABADOS | FINALIZADO"
        datetime fechaInicio
    }

    PERMISO_PROYECTO {
        uuid id PK
        uuid proyectoId FK
        enum institucion "OPAMSS | MARN | ANDA"
        string numeroExpediente
        enum estado "PENDIENTE | EN_TRAMITE | OBSERVADO | APROBADO | RECHAZADO"
        datetime fechaEmision
    }

    BODEGA {
        uuid id PK
        string codigo UK
        string nombre
        enum tipo "CENTRAL | PROYECTO"
        uuid proyectoId FK "UK nullable"
    }

    MATERIAL {
        uuid id PK
        string sku UK
        string nombre
        string unidadMedida
        decimal costoUnitarioPromedio "Decimal(12,2)"
        decimal stockMinimoAlerta "Decimal(12,2)"
    }

    INVENTARIO_BODEGA {
        uuid id PK
        uuid bodegaId FK
        uuid materialId FK
        decimal cantidadDisponible "Decimal(12,2)"
    }

    TRASLADO_BODEGA {
        uuid id PK
        string codigo UK
        uuid bodegaOrigenId FK
        uuid bodegaDestinoId FK
        uuid autorizadoPorId FK
        enum estado "PENDIENTE | COMPLETADO | CANCELADO"
    }

    PARTIDA_OBRA {
        uuid id PK
        uuid proyectoId FK
        string codigo
        string nombre
        enum faseRequerida
        decimal presupuestoAsignado "Decimal(14,2)"
        decimal costoMaterialesAcumulado "Decimal(14,2)"
        decimal porcentajeAvance "Decimal(5,2)"
    }

    PARTIDA_MATERIAL {
        uuid id PK
        uuid partidaId FK
        uuid materialId FK
        decimal cantidadTotalRequerida "Decimal(12,2)"
        decimal cantidadConsumidaAcumulada "Decimal(12,2)"
    }

    REPORTE_AVANCE_PARTIDA {
        uuid id PK
        uuid partidaId FK
        uuid ingenieroId FK
        decimal porcentajeAnterior "Decimal(5,2)"
        decimal porcentajeNuevo "Decimal(5,2)"
        decimal deltaPorcentaje "Decimal(5,2)"
        decimal costoMaterialesDelta "Decimal(14,2)"
    }

    EMPLEADO {
        uuid id PK
        string codigo UK
        string nombres
        string apellidos
        string dui UK "Formato 00000000-0"
        string nit
        enum tipoPlanilla "ADMINISTRATIVA_QUINCENAL | CAMPO_SEMANAL"
        enum modalidadPago "SALARIO_MENSUAL | DIA_TRABAJADO | DESTAJO"
        decimal salarioBaseMensual "Decimal(10,2)"
        decimal tarifaDiaria "Decimal(10,2)"
        decimal tarifaUnitariaDestajo "Decimal(10,2)"
    }

    PLANILLA {
        uuid id PK
        string codigo UK
        enum tipo "ADMINISTRATIVA_QUINCENAL | CAMPO_SEMANAL"
        enum estado "BORRADOR | APROBADA | PAGADA"
        decimal totalBruto "Decimal(14,2)"
        decimal totalIsss "Decimal(14,2)"
        decimal totalAfp "Decimal(14,2)"
        decimal totalRenta "Decimal(14,2)"
        decimal totalLiquido "Decimal(14,2)"
    }

    BOLETA_PAGO {
        uuid id PK
        uuid planillaId FK
        uuid empleadoId FK
        decimal ingresoBruto "Decimal(12,2)"
        decimal descuentoIsss "Decimal(12,2)"
        decimal descuentoAfp "Decimal(12,2)"
        decimal descuentoRenta "Decimal(12,2)"
        decimal liquidoPagar "Decimal(12,2)"
    }

    CLIENTE {
        uuid id PK
        enum tipo "NATURAL | JURIDICO"
        string nombreCompleto
        string dui UK
        string nit UK
        string nrc UK "Requerido para CCF"
        string giro "Requerido para CCF"
    }

    UNIDAD_INMOBILIARIA {
        uuid id PK
        uuid proyectoId FK
        string codigo UK
        enum tipo "CASA | APARTAMENTO | LOTE"
        decimal areaMetrosCuadrados "Decimal(10,2)"
        decimal precioLista "Decimal(14,2)"
        enum estado "DISPONIBLE | RESERVADA | VENDIDA | ESCRITURADA"
    }

    CONTRATO_VENTA {
        uuid id PK
        string codigo UK
        uuid clienteId FK
        uuid unidadId FK "UK"
        decimal precioVentaAcordado "Decimal(14,2)"
        decimal montoPrima "Decimal(14,2)"
        decimal montoFinanciado "Decimal(14,2)"
        int plazoMeses
        decimal tasaInteresAnual "Decimal(5,2)"
        decimal saldoPendiente "Decimal(14,2)"
    }

    CUOTA_PAGO {
        uuid id PK
        uuid contratoId FK
        int numeroCuota
        decimal montoCapital "Decimal(12,2)"
        decimal montoInteres "Decimal(12,2)"
        decimal montoTotalCuota "Decimal(12,2)"
        enum estado "PENDIENTE | PAGADA | MORA"
    }

    DOCUMENTO_FISCAL_VENTA {
        uuid id PK
        string numeroDocumento UK
        uuid contratoId FK
        uuid cuotaId FK
        enum tipoDocumento "RECIBO_ABONO | FACTURA_CONSUMIDOR_FINAL | CREDITO_FISCAL_CCF"
        decimal montoGravado "Decimal(12,2)"
        decimal montoIva "Decimal(12,2) 13% IVA SV"
        decimal montoTotal "Decimal(12,2)"
    }
```

---

## 🚀 6. Instalación y Despliegue Paso a Paso

### Opción A: Despliegue Completo con Docker Compose (Recomendado)

```bash
# 1. Clonar el repositorio oficial
git clone https://github.com/DiegoVillanuevaDev/erp-constructora-sv-.git
cd erp-constructora-sv-

# 2. Crear el archivo de variables de entorno a partir de la plantilla
cp .env.example .env

# 3. Construir y levantar los 4 contenedores (PostgreSQL, Backend, Frontend y Nginx)
docker compose up --build -d

# 4. Aplicar el esquema relacional en PostgreSQL y poblar la semilla inicial (6 roles + 5 módulos)
docker compose exec backend npx prisma db push
docker compose exec backend npm run prisma:seed
```

Una vez levantados los contenedores, accede a:
* **Aplicación Web (vía Nginx Reverse Proxy):** `http://localhost:8080`
* **Documentación Interactiva Swagger UI (OpenAPI 3.0.3):** `http://localhost:8080/api/v1/docs`
* **Especificación OpenAPI en JSON:** `http://localhost:8080/api/v1/docs.json`
* **Healthcheck de la API:** `http://localhost:8080/api/v1/health`

### Opción B: Ejecución en Entorno de Desarrollo Local (Node.js + Vite)

```bash
# 1. Instalar dependencias y ejecutar pruebas del Backend
cd backend
npm install
npm test

# (Si dispones de una instancia PostgreSQL local configurada en DATABASE_URL):
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run dev

# 2. En otra terminal, iniciar el cliente React con Vite
cd ../frontend
npm install
npm run dev
```

### 🔑 Credenciales de Prueba Precargadas en la Semilla (`prisma/seed.js`)

Todas las cuentas de demostración comparten la contraseña: **`ConstructoraSV2026!`**

| Rol Operativo (`RolUsuario`) | Correo Electrónico | Nombre en el Sistema |
| :--- | :--- | :--- |
| **`ADMIN`** | `admin@constructorasv.com` | Administrador General ERP |
| **`DIRECTOR_PROYECTO`** | `director@constructorasv.com` | Ing. Roberto Salazar (Director de Proyectos) |
| **`INGENIERO_RESIDENTE`** | `residente@constructorasv.com` | Ing. Carlos Méndez (Ingeniero Residente) |
| **`BODEGUERO`** | `bodega@constructorasv.com` | Mauricio Quintanilla (Jefe de Bodega) |
| **`RRHH`** | `rrhh@constructorasv.com` | Licda. Claudia Morales (Recursos Humanos) |
| **`VENTAS`** | `ventas@constructorasv.com` | Licda. Sofía Argueta (Ejecutiva de Ventas) |

---

## 🔧 7. Configuración de Variables de Entorno (`.env.example`)

El archivo [`.env.example`](.env.example) en la raíz del proyecto documenta todas las variables requeridas:

```dotenv
# ============================================================================
# ERP DE GESTIÓN INTEGRAL — INMOBILIARIA Y CONSTRUCTORA SV
# Plantilla de Variables de Entorno (.env.example)
# ============================================================================

# --- 1. CONFIGURACIÓN GENERAL DEL ENTORNO ---
NODE_ENV=development
PORT=4000

# --- 2. BASE DE DATOS POSTGRESQL (CONTENEDOR DOCKER / PRISMA ORM) ---
POSTGRES_USER=erp_admin
POSTGRES_PASSWORD=erp_constructora_sv_2026_secure
POSTGRES_DB=erp_constructora_sv
POSTGRES_PORT=5432
DATABASE_URL="postgresql://erp_admin:erp_constructora_sv_2026_secure@postgres:5432/erp_constructora_sv?schema=public"

# --- 3. SEGURIDAD Y AUTENTICACIÓN JWT / RBAC ---
JWT_SECRET=erp_constructora_sv_jwt_secret_key_2026_production_grade
JWT_EXPIRES_IN=8h
BCRYPT_SALT_ROUNDS=10

# --- 4. PARÁMETROS LEGALES Y FISCALES (EL SALVADOR) ---
# Tasa de IVA vigente en El Salvador (13% — Art. 54 Ley de IVA)
SV_IVA_RATE=0.13
# Cotización laboral ISSS (3%) y techo máximo mensual ($1,000.00 -> máx $30.00/mes)
SV_ISSS_EMPLOYEE_RATE=0.03
SV_ISSS_MAX_CEILING_MONTHLY=1000.00
# Cotización laboral AFP (7.25% — Confía / Crecer)
SV_AFP_EMPLOYEE_RATE=0.0725

# --- 5. PROXY INVERSO NGINX Y CLIENTE REACT (VITE) ---
NGINX_PUBLIC_PORT=8080
FRONTEND_PORT=5173
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

---

## 📡 8. Documentación de la API REST y Endpoints (`Swagger UI`)

La documentación interactiva completa bajo el estándar **OpenAPI 3.0.3** se encuentra integrada en **`/api/v1/docs`** ([`backend/src/config/swagger.js`](backend/src/config/swagger.js)). A continuación se presenta la tabla maestra de los **30 endpoints REST** implementados:

| Módulo | Método | Endpoint REST | Roles Permitidos (`RBAC`) | Descripción y Reglas de Negocio |
| :--- | :---: | :--- | :--- | :--- |
| **Sistema** | `GET` | `/api/v1/health` | Público | Verificación de estado operativo de la API. |
| **Sistema** | `GET` | `/api/v1/docs` | Público | Interfaz interactiva **Swagger UI (OpenAPI 3.0.3)**. |
| **Sistema** | `GET` | `/api/v1/docs.json` | Público | Contrato OpenAPI 3.0.3 en formato JSON puro. |
| **Auth** | `POST` | `/api/v1/auth/register` | Público | Registro de usuario con hashing `bcryptjs` y emisión de JWT. |
| **Auth** | `POST` | `/api/v1/auth/login` | Público | Autenticación de credenciales y emisión de Bearer Token JWT. |
| **Auth** | `GET` | `/api/v1/auth/me` | Todos (Autenticado) | Perfil en tiempo real del usuario autenticado. |
| **Auth** | `GET` | `/api/v1/auth/rbac-matrix` | Todos (Autenticado) | Matriz declarativa de permisos del ERP por rol. |
| **Módulo 1** | `GET` | `/api/v1/proyectos` | Todos los roles | Lista proyectos con su `estadoRegulatorio` (`OPAMSS`, `MARN`, `ANDA`). |
| **Módulo 1** | `GET` | `/api/v1/proyectos/:id` | Todos los roles | Detalle de proyecto, permisos, bodega de obra y partidas. |
| **Módulo 1** | `POST` | `/api/v1/proyectos` | `ADMIN`, `DIRECTOR_PROYECTO` | Crea proyecto + 3 permisos en `PENDIENTE` + bodega de obra en transacción ACID. |
| **Módulo 1** | `PATCH` | `/api/v1/proyectos/:id/permisos/:institucion` | `ADMIN`, `DIRECTOR_PROYECTO` | Actualiza estado (`PENDIENTE`, `EN_TRAMITE`, `OBSERVADO`, `APROBADO`) de permiso. |
| **Módulo 1** | `PATCH` | `/api/v1/proyectos/:id/fase` | `ADMIN`, `DIRECTOR_PROYECTO`, `INGENIERO_RESIDENTE` | Avanza fase constructiva. **Bloquea con `422` si OPAMSS, MARN o ANDA no están aprobados**. |
| **Módulo 2** | `GET` | `/api/v1/bodegas` | `ADMIN`, `DIRECTOR_PROYECTO`, `INGENIERO_RESIDENTE`, `BODEGUERO` | Lista bodegas (`CENTRAL` y `PROYECTO`) con inventario valorizado. |
| **Módulo 2** | `GET` | `/api/v1/bodegas/:id` | `ADMIN`, `DIRECTOR_PROYECTO`, `INGENIERO_RESIDENTE`, `BODEGUERO` | Detalle de existencias y alertas de stock mínimo de una bodega. |
| **Módulo 2** | `GET` | `/api/v1/bodegas/materiales` | `ADMIN`, `DIRECTOR_PROYECTO`, `INGENIERO_RESIDENTE`, `BODEGUERO` | Catálogo maestro de materiales con stock consolidado multi-sitio. |
| **Módulo 2** | `POST` | `/api/v1/bodegas/materiales` | `ADMIN`, `BODEGUERO` | Registra un nuevo insumo de construcción en el catálogo. |
| **Módulo 2** | `POST` | `/api/v1/bodegas/entradas` | `ADMIN`, `BODEGUERO` | Abastecimiento de stock en Bodega Central con actualización de costo promedio. |
| **Módulo 2** | `GET` | `/api/v1/bodegas/traslados` | `ADMIN`, `DIRECTOR_PROYECTO`, `INGENIERO_RESIDENTE`, `BODEGUERO` | Historial de traslados multi-sitio con snapshot de costos. |
| **Módulo 2** | `POST` | `/api/v1/bodegas/traslados` | `ADMIN`, `BODEGUERO` | **Traslado transaccional entre bodegas (`422` si el stock en origen es insuficiente)**. |
| **Módulo 3** | `GET` | `/api/v1/partidas` | `ADMIN`, `DIRECTOR_PROYECTO`, `INGENIERO_RESIDENTE`, `BODEGUERO` | Lista partidas de obra con receta de materiales e indicadores EV/AC. |
| **Módulo 3** | `GET` | `/api/v1/partidas/:id` | `ADMIN`, `DIRECTOR_PROYECTO`, `INGENIERO_RESIDENTE`, `BODEGUERO` | Detalle de partida, explosión de insumos y bitácora de avances. |
| **Módulo 3** | `POST` | `/api/v1/partidas` | `ADMIN`, `DIRECTOR_PROYECTO` | Crea partida constructiva junto con su receta de materiales en transacción ACID. |
| **Módulo 3** | `POST` | `/api/v1/partidas/:id/avances` | `ADMIN`, `DIRECTOR_PROYECTO`, `INGENIERO_RESIDENTE` | **Reporta avance físico, descuenta stock proporcional de bodega y suma `costoEjecutado`**. |
| **Módulo 3** | `GET` | `/api/v1/partidas/:id/avances` | `ADMIN`, `DIRECTOR_PROYECTO`, `INGENIERO_RESIDENTE` | Historial de reportes de avance de una partida. |
| **Módulo 4** | `GET` | `/api/v1/planillas/empleados` | `ADMIN`, `DIRECTOR_PROYECTO`, `RRHH` | Padrón de empleados administrativos y de campo. |
| **Módulo 4** | `POST` | `/api/v1/planillas/empleados` | `ADMIN`, `RRHH` | Registra empleado validando DUI (`00000000-0`) y modalidad salarial. |
| **Módulo 4** | `POST` | `/api/v1/planillas/calcular-simulacion` | `ADMIN`, `DIRECTOR_PROYECTO`, `RRHH` | Simulador de boleta salvadoreña (**ISSS, AFP, ISR Decreto No. 10 y Art. 156 CT**). |
| **Módulo 4** | `GET` | `/api/v1/planillas` | `ADMIN`, `DIRECTOR_PROYECTO`, `RRHH` | Lista planillas quincenales y semanales generadas. |
| **Módulo 4** | `GET` | `/api/v1/planillas/:id` | `ADMIN`, `DIRECTOR_PROYECTO`, `RRHH` | Detalle de planilla con todas sus boletas de pago individuales. |
| **Módulo 4** | `POST` | `/api/v1/planillas` | `ADMIN`, `RRHH` | **Procesa planilla dual en transacción ACID generando todas las boletas del periodo**. |
| **Módulo 4** | `PATCH` | `/api/v1/planillas/:id/estado` | `ADMIN`, `DIRECTOR_PROYECTO`, `RRHH` | Transición de estado (`BORRADOR → APROBADA → PAGADA`). |
| **Módulo 5** | `GET` | `/api/v1/ventas/clientes` | `ADMIN`, `DIRECTOR_PROYECTO`, `VENTAS` | Directorio CRM de clientes naturales y jurídicos. |
| **Módulo 5** | `POST` | `/api/v1/ventas/clientes` | `ADMIN`, `VENTAS` | Registra cliente validando DUI/NIT y requisitos fiscales (`NRC` y `giro`). |
| **Módulo 5** | `GET` | `/api/v1/ventas/unidades` | `ADMIN`, `DIRECTOR_PROYECTO`, `INGENIERO_RESIDENTE`, `VENTAS` | Catálogo de unidades inmobiliarias (`CASA`, `APARTAMENTO`, `LOTE`). |
| **Módulo 5** | `POST` | `/api/v1/ventas/unidades` | `ADMIN`, `DIRECTOR_PROYECTO`, `VENTAS` | Registra nueva unidad inmobiliaria vinculada a un proyecto. |
| **Módulo 5** | `POST` | `/api/v1/ventas/simular-financiamiento` | `ADMIN`, `DIRECTOR_PROYECTO`, `VENTAS` | Simulador de tabla de amortización francesa + **IVA 13%** + **ITBR 3%**. |
| **Módulo 5** | `GET` | `/api/v1/ventas/contratos` | `ADMIN`, `DIRECTOR_PROYECTO`, `VENTAS` | Lista contratos de compraventa activos y finalizados. |
| **Módulo 5** | `GET` | `/api/v1/ventas/contratos/:id` | `ADMIN`, `DIRECTOR_PROYECTO`, `VENTAS` | Detalle de contrato con su tabla de amortización y documentos fiscales. |
| **Módulo 5** | `POST` | `/api/v1/ventas/contratos` | `ADMIN`, `VENTAS` | **Firma contrato, marca unidad `VENDIDA` y crea las `N` cuotas de amortización**. |
| **Módulo 5** | `POST` | `/api/v1/ventas/contratos/:id/cuotas/:cuotaId/pagar` | `ADMIN`, `VENTAS` | **Cobra cuota, rebaja saldo y emite DTE (`422` si pide CCF sin `NRC`/`giro`)**. |
| **Módulo 5** | `GET` | `/api/v1/ventas/documentos-fiscales` | `ADMIN`, `DIRECTOR_PROYECTO`, `VENTAS` | Libro de documentos fiscales emitidos (`DTE-01`, `DTE-03 CCF`, `RECIBO_ABONO`). |
| **Módulo 5** | `POST` | `/api/v1/ventas/documentos-fiscales` | `ADMIN`, `VENTAS` | Emisión directa de documento fiscal con desglose de **13% IVA**. |

---

## 🧪 9. Evidencia de Funcionamiento, Suite de Pruebas y GitFlow

### 9.1 Reporte de Ejecución de Pruebas Automatizadas (`Jest + Supertest`: 24/24 Passing)

Al ejecutar `npm test` dentro de [`backend/`](backend/package.json), se corren las **9 pruebas unitarias** de reglas salvadoreñas ([`sv-business-rules.unit.test.js`](backend/tests/unit/sv-business-rules.unit.test.js)) y las **15 pruebas de integración HTTP** ([`erp-api.integration.test.js`](backend/tests/integration/erp-api.integration.test.js)):

```text
> erp-constructora-sv-backend@0.1.0 test
> jest --runInBand --detectOpenHandles

PASS tests/integration/erp-api.integration.test.js
  Suite de Integración HTTP (Supertest) — ERP Inmobiliaria y Constructora SV
    1. Salud y Documentación OpenAPI (/api/v1/health y /api/v1/docs.json)
      √ GET /api/v1/health debe responder 200 OK con el estado operativo del ERP (103 ms)
      √ GET /api/v1/docs.json debe responder 200 OK con la especificación OpenAPI 3.0.3 (29 ms)
    2. Seguridad JWT y Control de Acceso Basado en Roles (RBAC)
      √ Debe rechazar con 401 AUTH_TOKEN_MISSING cualquier petición sin encabezado Authorization Bearer (24 ms)
      √ Debe rechazar con 403 cuando un rol no autorizado (VENTAS) intenta operar un módulo ajeno (74 ms)
    3. Módulo 1: Guardia Regulatoria SV (OPAMSS, MARN, ANDA) en /api/v1/proyectos/:id/fase
      √ Debe bloquear con 422 LEGAL_PERMITS_NOT_APPROVED el paso de DISENO a TERRACERIA cuando MARN o ANDA no están en APROBADO (33 ms)
      √ Debe permitir la transición 200 OK a TERRACERIA cuando OPAMSS, MARN y ANDA están los 3 en APROBADO (18 ms)
    4. Módulo 2: Traslado Multi-bodega Transaccional (/api/v1/bodegas/traslados)
      √ Debe bloquear con 422 INSUFFICIENT_WAREHOUSE_STOCK cuando la Bodega Central no tiene stock suficiente (22 ms)
      √ Debe ejecutar el traslado exitoso 201 Created descontando en Bodega Central y sumando en la Bodega del Proyecto (20 ms)
    5. Módulo 3: Avance de Obra y Explosión de Materiales (/api/v1/partidas/:id/avances)
      √ Debe bloquear con 422 PROGRESS_MUST_INCREASE si el porcentajeNuevo no supera el porcentajeAvance actual (24 ms)
      √ Debe bloquear con 422 INSUFFICIENT_PROJECT_STOCK si falta material en la bodega del proyecto (19 ms)
      √ Debe registrar el avance exitoso 201 Created descontando stock proporcional y acumulando costoEjecutado (19 ms)
    6. Módulo 4: Simulación y Generación de Planilla Dual SV (/api/v1/planillas)
      √ POST /api/v1/planillas/calcular-simulacion debe responder 200 OK con el desglose exacto ISSS, AFP e ISR (23 ms)
      √ POST /api/v1/planillas debe responder 201 Created generando la planilla y sus boletas de pago en transacción ACID (19 ms)
    7. Módulo 5: Guardia Fiscal CCF (Art. 114 Código Tributario SV) en /api/v1/ventas
      √ Debe bloquear con 422 FISCAL_CCF_REQUIRES_NRC_AND_GIRO cuando se intenta emitir un CREDITO_FISCAL_CCF a un cliente natural sin NRC ni giro (35 ms)
      √ Debe permitir la emisión 201 Created de CREDITO_FISCAL_CCF con 13% IVA desglosado cuando el cliente jurídico posee NRC y giro (17 ms)

PASS tests/unit/sv-business-rules.unit.test.js
  Suite Unitaria — Motores de Reglas de Negocio y Legislación de El Salvador
    Módulo 1: Guardia Regulatoria SV (calcularEstadoRegulatorio — OPAMSS, MARN, ANDA) (3 passed)
    Módulo 4: Motor Laboral y Tributario SV (calcularDeduccionesLeySV — Decreto Ejecutivo No. 10 y Art. 156 CT) (3 passed)
    Módulo 5: Motor Financiero de Amortización Francesa y Fiscalidad SV (IVA 13% / ITBR 3%) (3 passed)

Test Suites: 2 passed, 2 total
Tests:       24 passed, 24 total
Snapshots:   0 total
Time:        3.707 s
```

### 9.2 Galería de Evidencias Visuales y Demostración

| Recurso de Evidencia | Ruta / Ubicación | Descripción de la Evidencia |
| :--- | :--- | :--- |
| **1. Login y Conmutador RBAC** | [`frontend/src/pages/LoginPage.jsx`](frontend/src/pages/LoginPage.jsx) | Acceso corporativo con cambio rápido entre los 6 roles operativos del ERP. |
| **2. Dashboard y Semáforo SV** | [`frontend/src/pages/DashboardPage.jsx`](frontend/src/pages/DashboardPage.jsx) | Indicadores de cartera, ejecución presupuestaria y matriz regulatoria `OPAMSS` / `MARN` / `ANDA`. |
| **3. Módulo 1 — Permisología** | [`frontend/src/pages/ProyectosPage.jsx`](frontend/src/pages/ProyectosPage.jsx) | Demostración del bloqueo legal `HTTP 422` y liberación de fase constructiva al aprobar los 3 permisos. |
| **4. Módulo 2 — Bodegas Multi-sitio** | [`frontend/src/pages/BodegasPage.jsx`](frontend/src/pages/BodegasPage.jsx) | Existencias valorizadas en Bodega Central vs. Obra y traslados transaccionales. |
| **5. Módulo 3 — Avances de Obra** | [`frontend/src/pages/PartidasPage.jsx`](frontend/src/pages/PartidasPage.jsx) | Deslizador de avance físico con previsualización del descuento de materiales en bodega y costo imputado. |
| **6. Módulo 4 — Nómina Dual SV** | [`frontend/src/pages/PlanillasPage.jsx`](frontend/src/pages/PlanillasPage.jsx) | Calculadora en vivo bajo **Decreto Ejecutivo No. 10** y **Art. 156 CT (10% eventual)** + emisión de boletas. |
| **7. Módulo 5 — Ventas CRM y CCF** | [`frontend/src/pages/VentasPage.jsx`](frontend/src/pages/VentasPage.jsx) | Tabla de amortización francesa sin descuadre, cobro de cuotas y bloqueo de CCF sin `NRC`/`giro`. |
| **8. Documentación Swagger UI** | `http://localhost:8080/api/v1/docs` | Especificación interactiva OpenAPI 3.0.3 de los 30 endpoints REST. |

### 9.3 Historial de Versiones y Flujo GitFlow (`v0.1.0` → `v1.0.0`)

| Tag de Versión | Rama Integrada (`--no-ff`) | Hito Arquitectónico Entregado |
| :---: | :--- | :--- |
| **`v0.1.0`** | `feature/infra-database-schema` | **Fase 1:** Inicialización del monorepo, `docker-compose.yml`, proxy inverso `nginx.conf` y esquema relacional ER en Prisma (`schema.prisma`). |
| **`v0.2.0`** | `feature/auth-rbac-error-handling` | **Fase 2:** Autenticación JWT, middleware RBAC (`authorizeRoles`), interceptor global `AppError` y semilla inicial. |
| **`v0.3.0`** | `feature/core-business-modules` | **Fase 3:** Desarrollo de los 5 Módulos Core en Express (`proyectos`, `bodegas`, `partidas`, `planillas`, `ventas`) con transacciones ACID. |
| **`v0.4.0`** | `feature/testing-and-swagger-docs` | **Fase 4:** Suite de 24 pruebas automatizadas con Jest/Supertest y documentación interactiva OpenAPI 3.0.3 (`Swagger UI`). |
| **`v0.5.0`** | `feature/react-frontend-spa` | **Fase 5:** Aplicación SPA en React 18, Vite y Tailwind CSS con calculadoras interactivas para los 5 módulos. |
| **`v1.0.0`** | `develop → main` | **Fase 6 (Release de Producción):** Documentación técnica integral (`README.md`) y fusión final a la rama de producción `main`. |

---

## 👨‍💻 Autor

**Diego Villanueva** — [@DiegoVillanuevaDev](https://github.com/DiegoVillanuevaDev)
*Arquitectura de Software Full-Stack — ERP de Gestión Integral para Inmobiliaria y Constructora SV.*
