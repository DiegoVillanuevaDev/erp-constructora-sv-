## 📌 Descripción del Pull Request
<!-- Describe brevemente qué cambios introduce este PR y a qué fase/módulo pertenece -->

## 🧩 Módulo Impactado
- [ ] Infraestructura / Docker / Nginx / Prisma Schema
- [ ] Seguridad / Autenticación JWT / RBAC
- [ ] Módulo 1: Planificación y Permisología (OPAMSS, MARN, ANDA)
- [ ] Módulo 2: Bodega e Inventario Multi-sitio
- [ ] Módulo 3: Ejecución y Partidas de Obra
- [ ] Módulo 4: Recursos Humanos y Nómina Dual (ISSS, AFP, Renta)
- [ ] Módulo 5: Ventas e Inmobiliaria CRM (CCF / Facturación 13% IVA)
- [ ] Frontend React + Vite + Tailwind CSS
- [ ] Pruebas (Jest / Supertest) y Documentación (Swagger / README)

## ✅ Lista de Verificación de Calidad (Tech Lead Checklist)
- [ ] Los commits siguen el estándar **Conventional Commits** (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
- [ ] Las operaciones críticas de base de datos utilizan transacciones ACID (`prisma.$transaction`).
- [ ] Las rutas están protegidas por `verifyToken` y `authorizeRoles`.
- [ ] La suite de pruebas automatizadas (`npm test`) pasa satisfactoriamente.
- [ ] La documentación de Swagger (`/api/v1/docs`) refleja los cambios en los endpoints.

