# ERP — Gestión de Parque Informático y Logística TI

Sistema de gestión de activos tecnológicos, compras, logística, mantenimiento, inventario, depreciación y alertas para entornos corporativos multi-zonales (Perú).

**Empresa:** Telecomunicaciones Corporativa — Multi-zonal  
**Documento de referencia:** [ERP_Tablas_Campos_BD.md](./ERP_Tablas_Campos_BD.md) (esquema completo de tablas y campos).

---

## Stack tecnológico

| Capa        | Tecnología |
|------------|------------|
| Backend    | PHP 8.2+, Laravel 12 |
| Frontend   | React 19, Inertia.js 2, TypeScript, Vite |
| Estilos    | Tailwind CSS 4 |
| Base de datos | PostgreSQL 16 |
| Auth / permisos | Laravel Fortify, Spatie Laravel Permission |
| Otros      | DomPDF, Maatwebsite Excel, picqer/php-barcode-generator |

- **IDs:** UUID v4 en entidades principales.
- **Soft deletes** en activos, componentes, usuarios, zonales, proveedores, modelos, tickets de reparación, bajas.

---

## Requisitos

- PHP 8.2 o superior
- Composer
- Node.js 18+ y npm/pnpm
- PostgreSQL 16 (o compatible)
- Extensiones PHP: `pdo_pgsql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `fileinfo`

---

## Instalación

```bash
# Clonar (o abrir el proyecto)
cd inventario

# Dependencias PHP
composer install

# Dependencias frontend
npm install

# Copiar entorno y configurar
cp .env.example .env
php artisan key:generate
```

Configurar en `.env`:

- `DB_CONNECTION=pgsql`
- `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
- `APP_URL` y el resto de variables que use el proyecto

```bash
# Migraciones (orden recomendado en ERP_Tablas_Orden_Creacion.md)
php artisan migrate

# Seeders (permisos, roles, datos iniciales)
php artisan db:seed

# Compilar frontend
npm run build
# o en desarrollo
npm run dev
```

Servidor:

```bash
php artisan serve
```

Acceder a `APP_URL` (por defecto `http://localhost:8000`).

---

## Tareas programadas (Cron)

Para alertas de servicios, depreciación y resolución de alertas, el scheduler debe ejecutarse cada minuto:

```bash
* * * * * cd /ruta/al/proyecto && php artisan schedule:run >> /dev/null 2>&1
```

Comandos relevantes:

| Comando | Descripción | Programación sugerida |
|--------|-------------|------------------------|
| `app:check-service-alerts` | Actualiza estado de servicios (activo / por vencer / vencido) y crea alertas y notificaciones | Diario (ej. 01:00) |
| `app:check-depreciation-alerts` | Crea/resuelve alertas por depreciaciones en borrador sin aprobar | Diario (ej. 02:00) |
| `app:run-depreciation` | Genera movimientos de depreciación mensuales (entradas en borrador) | Mensual (ej. día 1 a las 00:30) |

Detalle en `routes/console.php`.

---

## Módulos principales (según ERP)

Resumen alineado a [ERP_Tablas_Campos_BD.md](./ERP_Tablas_Campos_BD.md):

1. **Organización** — Zonales, oficinas, almacenes, ubicaciones, talleres, departamentos, usuarios, roles y permisos (Spatie).
2. **Catálogo** — Plan de cuentas (PCGE), categorías SUNAT, subcategorías, marcas, modelos, tipos de componente.
3. **Compras** — Proveedores, órdenes de compra, ítems, cotizaciones, facturas.
4. **Logística** — Ingresos a almacén (`stock_entries`), ítems de ingreso, traslados entre almacenes.
5. **Activos tecnológicos** — Activos, datos de PC, asignaciones, fotos.
6. **Componentes** — Componentes físicos, instalaciones en PCs (historial).
7. **Mantenimiento** — Tickets de reparación, repuestos, costos, planes preventivos, tareas preventivas, logs de estado, documentos.
8. **Bajas** — Solicitudes de baja, ventas a trabajadores.
9. **Inventario** — Conteos físicos e ítems de conteo.
10. **Servicios** — Servicios contratados (VPS, hosting, alquiler, etc.) con vigencia y renovación.
11. **Alertas** — Reglas, eventos de alerta y notificaciones in-app.
12. **Depreciación** — Reglas por categoría SUNAT y movimientos mensuales por activo (aprobación).
13. **Licencias de software** — (Esquema en documento ERP: fabricantes, productos, licencias, asignaciones, instalaciones.)
14. **Auditoría y seguridad** — (Esquema en documento ERP: audit_logs, agent_reports, agent_tokens, login_attempts, api_key_logs, backup_logs.)

Total aproximado: **54 tablas** (más tablas pivote de Spatie). Orden sugerido de creación en [ERP_Tablas_Orden_Creacion.md](./ERP_Tablas_Orden_Creacion.md).

---

## Contabilidad (PCGE) y categorías

- **Plan de cuentas:** tabla `gl_accounts`; categorías de activo referencian cuenta contable por FK.
- **Depreciación:** configuración por categoría en `depreciation_schedules`; movimientos en `depreciation_entries` (mensuales, estado draft/approved).

---

## Documentación de referencia

| Archivo | Contenido |
|---------|-----------|
| [ERP_Tablas_Campos_BD.md](./ERP_Tablas_Campos_BD.md) | Todas las tablas, campos, tipos, FKs y notas del ERP. |
| [ERP_Tablas_Orden_Creacion.md](./ERP_Tablas_Orden_Creacion.md) | Orden recomendado para crear tablas respetando FKs. |

---

## Comandos útiles

```bash
# Desarrollo
npm run dev
php artisan serve

# Producción
npm run build
# Servir con Apache/Nginx apuntando al public/

# Migraciones
php artisan migrate
php artisan migrate:rollback

# Seeders
php artisan db:seed
php artisan db:seed --class=PermissionSeeder

# Depreciación (manual)
php artisan app:run-depreciation
php artisan app:run-depreciation --period=2026-03

# Alertas (manual)
php artisan app:check-service-alerts
php artisan app:check-depreciation-alerts

# Scheduler (ejecutar una vez para probar)
php artisan schedule:run
```

---

## Licencia

MIT (o la que corresponda al proyecto base).

---

*ERP de Gestión de Parque Informático y Logística TI — Documentación alineada a ERP_Tablas_Campos_BD.md (Dios v4.0 + M16 Activos Fijos).*
