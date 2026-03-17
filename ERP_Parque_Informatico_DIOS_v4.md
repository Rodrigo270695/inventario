**GUÍA DE DESARROLLO EMPRESARIAL — EDICIÓN DIOS v4.0**

**SISTEMA ERP DE GESTIÓN DE**

**PARQUE INFORMÁTICO Y LOGÍSTICA TI**

Empresa de Telecomunicaciones Corporativa

Arquitectura Enterprise — Edición Dios v4.0 — 2025

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Backend</strong></p>
<p><strong>Laravel 12</strong></p></td>
<td><p><strong>Frontend</strong></p>
<p><strong>React 19 + Inertia 2</strong></p></td>
<td><p><strong>Base de Datos</strong></p>
<p><strong>PostgreSQL 16</strong></p></td>
<td><p><strong>Estilos</strong></p>
<p><strong>Tailwind CSS 4</strong></p></td>
</tr>
<tr class="even">
<td><p><strong>IDs</strong></p>
<p>UUID v4 / v7</p></td>
<td><p><strong>Agente</strong></p>
<p>PS + Python + Linux</p></td>
<td><p><strong>Colas</strong></p>
<p>Horizon + Redis 7</p></td>
<td><p><strong>Seguridad</strong></p>
<p>OWASP + 2FA + CSP</p></td>
</tr>
</tbody>
</table>

15 secciones · 48 tablas de BD · 52 endpoints · Seguridad OWASP · Agente multi-OS

Depreciación contable · Licencias de software · Mantenimiento preventivo · Disaster Recovery · Backup

> **1. ARQUITECTURA COMPLETA DEL SISTEMA**
>
> **1.1 Filosofía y Decisiones de Arquitectura**

El sistema adopta Modular Monolith con Laravel 12 + Inertia.js 2 + React 19. Esta decisión es deliberada y justificada: ofrece velocidad de desarrollo de un monolito con separación de responsabilidades que permite extraer módulos a microservicios cuando el negocio lo requiera. La API REST coexiste para agentes y futuras integraciones móviles.

|                       |                               |                                                                                                                                                                |
|-----------------------|-------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Decisión**          | **Alternativa descartada**    | **Justificación técnica**                                                                                                                                      |
| Modular Monolith      | Microservicios desde inicio   | Los microservicios para \<10 devs agregan overhead operativo sin beneficio real. El monolito modular es extraíble a servicios cuando el tráfico lo justifique. |
| Inertia.js + React 19 | REST API + React SPA separada | Inertia elimina CORS, JWT client-side y duplicación de validaciones. La API REST existe para agentes e integraciones externas, no para el frontend principal.  |
| PostgreSQL 16         | MySQL / MongoDB               | JSONB nativo, particionamiento declarativo, pg_cron, UUID nativo, full-text search en español, transacciones ACID robustas.                                    |
| UUID v4 + v7 híbrido  | BigInt autoincrement          | UUID en entidades expuestas en API (seguridad IDOR). BigInt solo en tablas internas de alta escritura (audit_logs) para eficiencia de B-tree.                  |
| Tailwind CSS 4        | Bootstrap / CSS-in-JS         | Motor Oxide (Rust): builds 10x más rápidos. CSS-first config con @theme: tema corporativo sin JS. Zero runtime overhead.                                       |

> **1.2 Stack Tecnológico — Versión Actualizada 2025**

|                |                        |             |                                                                                             |
|----------------|------------------------|-------------|---------------------------------------------------------------------------------------------|
| **Componente** | **Tecnología**         | **Versión** | **Novedades críticas para el proyecto**                                                     |
| Framework      | Laravel                | 12.x        | Typed properties en modelos, Schedule fluent API, Pulse integrado, mejoras en Horizon       |
| Protocolo UI   | Inertia.js             | 2.x         | SSR nativo, async components, polling automático, deferred props para datos pesados         |
| UI Framework   | React                  | 19.x        | React Compiler (auto-memoización), use() hook, optimistic updates, Actions nativas en forms |
| Estilos        | Tailwind CSS           | 4.x         | Motor Oxide sin config JS, @theme en CSS, @container queries, cascade layers                |
| Autenticación  | Sanctum + Jetstream    | incluido    | httpOnly cookies, 2FA TOTP, device sessions, API token scopes                               |
| BD Principal   | PostgreSQL             | 16.x        | Merge JOIN mejorado, logical replication, pg_cron nativo, vacuuming paralelo                |
| Caché & Colas  | Redis                  | 7.x         | Redis Stack: búsqueda, JSON, series temporales para métricas de alertas                     |
| Jobs & Workers | Laravel Horizon        | 6.x         | Auto-balanceo de workers, métricas en tiempo real, retry strategies por job                 |
| Monitoreo      | Laravel Pulse + Sentry | 1.x         | Queries lentos, excepciones, jobs fallidos, uso de memoria en tiempo real                   |
| PDF            | Spatie Browsershot     | 4.x         | Chromium headless: PDFs pixel-perfect de actas y comprobantes                               |
| OpenAPI        | darkaonline/l5-swagger | 9.x         | Documentación viva generada desde annotations PHP                                           |
| Agente Windows | PowerShell             | 5.1+ / 7.x  | Firmado con certificado corporativo, DPAPI, diff optimizado                                 |
| Agente Linux   | Python                 | 3.10+       | dmidecode + psutil: mismo payload que PowerShell para Linux/Mac                             |
| Testing        | Pest 3 + Paratest      | latest      | Tests paralelos, snapshots, arquitectura testing (forbidden imports)                        |

> **1.3 Diagrama de Arquitectura Completo**
>
> ┌─────────────────────────────────────────────────────────────────────────┐
>
> │ CAPA DE PRESENTACIÓN (React 19 + Inertia 2) │
>
> │ Pages/ │ Components/ │ Tailwind 4 │ shadcn/ui │ Recharts │
>
> │ React Compiler (auto-memo) │ Server Components (SSR) │ use() hook │
>
> └──────────────────────────────────┬──────────────────────────────────────┘
>
> │ Inertia XHR (JSON props) + CSRF Token
>
> ┌──────────────────────────────────▼──────────────────────────────────────┐
>
> │ LARAVEL 12 — APPLICATION + SECURITY LAYER │
>
> │ Controllers │ Form Requests │ Inertia::render() │ API Routes (agent) │
>
> │ Middleware: Auth, ZonalScope, AuditLog, RateLimit, SecurityHeaders │
>
> │ CSP │ HSTS │ X-Frame-Options │ Content-Security-Policy │ CORS strict │
>
> └──────────────────┬──────────────────────────┬────────────────────────── ┘
>
> │ │
>
> ┌──────────────────▼───────────┐ ┌───────────▼──────────────────────────┐
>
> │ SERVICE LAYER │ │ ASYNC / QUEUE LAYER │
>
> │ AssetService │ │ AgentSyncJob + LicenseAuditJob │
>
> │ TransferService │ │ DepreciationJob + AlertEvalJob │
>
> │ AlertService ★ │ │ PreventiveMaintenanceJob ★ │
>
> │ DepreciationService ★ │ │ BackupVerifyJob ★ │
>
> │ LicenseService ★ │ │ SecurityAuditJob ★ │
>
> │ PreventiveMaintService ★ │ └──────────────────────────────────────┘
>
> │ SecurityService ★ │
>
> └──────────────────┬───────────┘
>
> │
>
> ┌──────────────────▼──────────────────────────────────────────────────────┐
>
> │ DATA LAYER │
>
> │ PostgreSQL 16 (primary) │ PostgreSQL 16 (réplica lectura) │
>
> │ PgBouncer (pooling) │ Redis 7 Cluster │ S3/MinIO (archivos) │
>
> └─────────────────────────────────────────────────────────────────────────┘
>
> ▲ HTTPS + TLS 1.3 ▲ Webhook ▲ Event Stream
>
> ┌────────┴────────────┐ ┌──────────┴───────┐ ┌────────┴───────────────┐
>
> │ AGENTE WINDOWS │ │ AGENTE LINUX ★ │ │ INTEGRACIONES ★ │
>
> │ PowerShell 5.1+ │ │ Python 3.10+ │ │ ERP RRHH / SAP │
>
> │ Firmado + DPAPI │ │ psutil+dmidecode│ │ ServiceNow / Teams │
>
> │ Cert pinning │ │ systemd timer │ │ Slack webhooks │
>
> └─────────────────────┘ └──────────────────┘ └────────────────────────┘
>
> **1.4 Plan de Migración a Microservicios (Roadmap)**
>
> ℹ El monolito modular está diseñado para ser descompuesto cuando el negocio lo requiera. Cada módulo tiene su propia carpeta de Services, Repositories y Events — las dependencias entre módulos solo pasan por interfaces, no por llamadas directas a otros Services.

|                 |                                     |                         |                                                                                                                                                   |
|-----------------|-------------------------------------|-------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| **Fase**        | **Cuando migrar**                   | **Módulo a extraer**    | **Estrategia**                                                                                                                                    |
| Fase 0 (actual) | 0–3 años / \<10,000 activos         | Monolito completo       | Modular Monolith. Un deploy, una BD, máxima productividad.                                                                                        |
| Fase 1          | \>5,000 usuarios concurrentes       | Agent Ingestion Service | El agente reporta a un microservicio dedicado con su propia BD de series temporales (TimescaleDB). El monolito consume eventos via Redis Pub/Sub. |
| Fase 2          | Equipo \>15 devs / \>50,000 activos | Reporting Service       | Reportes y analytics a servicio separado con réplica de solo lectura. Elimina carga de queries pesados del OLTP principal.                        |
| Fase 3          | Requerimiento de HA real            | Auth Service            | Autenticación como servicio independiente con Keycloak o Auth0 para SSO corporativo.                                                              |

> **2. BASE DE DATOS — DISEÑO PROFESIONAL COMPLETO**
>
> **2.1 Principios de Diseño de Datos**

|                                             |                                                                                                                                                             |                                                                  |
|---------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------|
| **Principio**                               | **Implementación**                                                                                                                                          | **Impacto**                                                      |
| UUID híbrido                                | UUID v4 en entidades expuestas en API. UUID v7 (time-ordered) en audit_logs y agent_reports para menor fragmentación B-tree en tablas de millones de filas. | Seguridad IDOR en API + performance en tablas de alta escritura  |
| FK explícitas en lugar de polimorfismo puro | warehouse_id, office_id, repair_shop_id nullable + CHECK constraint que garantiza exactamente 1 FK activa según location_type                               | BD garantiza integridad referencial; no depende solo del ORM     |
| CHECK constraints en BD                     | status IN (...), condition IN (...), seats_used \<= seats_total                                                                                             | Integridad garantizada incluso si alguien ejecuta SQL directo    |
| Índices parciales                           | WHERE deleted_at IS NULL — solo filas activas en el índice                                                                                                  | Índices 30-60% más pequeños, queries hasta 5x más rápidos        |
| JSONB para specs variables                  | specs JSONB con índice GIN — permite búsqueda dentro del JSON                                                                                               | Flexible sin tablas EAV + consultable con operadores JSONB       |
| Particionamiento por tiempo                 | audit_logs y agent_reports: PARTITION BY RANGE(created_at) anual                                                                                            | Queries de auditoría solo escanean particiones relevantes        |
| Vistas materializadas                       | mv_inventory_kpi, mv_license_compliance — REFRESH CONCURRENTLY                                                                                              | Dashboard en \<100ms sin impactar el OLTP principal              |
| Soft deletes selectivos                     | Solo en entidades que deben preservar historial. Logs y relaciones históricas son inmutables.                                                               | No acumula datos inútiles; preserva lo que tiene valor auditable |

> **2.2 Diagrama ER — Relaciones Completas**
>
> ═══ ORGANIZACIÓN ════════════════════════════════════════════════════
>
> zonals ──────\< offices
>
> zonals ──────\< warehouses ──────\< warehouse_locations
>
> zonals ──────\< departments
>
> zonals ──────\< users \>──── roles \>──── permissions
>
> ═══ CATÁLOGOS ═══════════════════════════════════════════════════════
>
> asset_brands ──\< asset_models \>── asset_categories ──\< assets
>
> component_types ──\< components
>
> asset_brands ──\< components
>
> software_vendors ──\< software_products ──\< software_licenses
>
> ═══ ACTIVOS Y COMPONENTES ═══════════════════════════════════════════
>
> assets ──1── asset_computers
>
> assets ──────\< asset_assignments \>── users
>
> assets ──────\< asset_photos
>
> assets ──────\< repair_tickets
>
> assets ──────\< asset_disposals ──1── asset_sales
>
> assets ──────\< depreciation_entries
>
> asset_computers ──\< computer_components \>── components
>
> (computer_components es historial: 1 component puede estar en N PCs a lo largo del tiempo)
>
> ═══ COMPRAS Y LOGÍSTICA ═════════════════════════════════════════════
>
> suppliers ──\< purchase_orders ──\< purchase_items
>
> purchase_orders ──\< invoices ──\< stock_entries ──\< stock_entry_items
>
> asset_transfers ──\< transfer_items
>
> (transfer_items usa FK explícitas: asset_id nullable + component_id nullable)
>
> ═══ MANTENIMIENTO ═══════════════════════════════════════════════════
>
> repair_tickets ──\< repair_parts \>── components
>
> repair_tickets ──\< repair_costs
>
> preventive_plans ──\< preventive_tasks \>── assets ★
>
> ═══ LICENCIAS DE SOFTWARE ███████████████████████████████████████████
>
> software_licenses ──\< license_assignments \>── assets
>
> assets ──\< software_installations \>── software_products
>
> ═══ ALERTAS Y NOTIFICACIONES ════════════════════════════════════════
>
> alert_rules ──\< alert_events
>
> users ──\< notifications
>
> ═══ AUDITORÍA Y SEGURIDAD ═══════════════════════════════════════════
>
> users ──\< audit_logs (polimórfico: model_type + model_id)
>
> assets ──\< agent_reports (diff-based desde v3)
>
> login_attempts ──── users ★ (seguridad: rastreo de intentos)
>
> api_key_logs ─────── users ★ (rastreo de uso de tokens)
>
> **2.3 DDL Completo — Todas las Tablas**

**▸ Organización: zonals, offices, warehouses**

> CREATE TABLE zonals (
>
> id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
>
> name VARCHAR(100) NOT NULL,
>
> code VARCHAR(20) NOT NULL UNIQUE,
>
> region VARCHAR(100),
>
> manager_id UUID REFERENCES users(id) ON DELETE SET NULL DEFERRABLE,
>
> address TEXT,
>
> phone VARCHAR(30),
>
> timezone VARCHAR(60) DEFAULT 'America/Lima',
>
> is_active BOOLEAN DEFAULT TRUE,
>
> created_at TIMESTAMPTZ DEFAULT NOW(),
>
> updated_at TIMESTAMPTZ DEFAULT NOW(),
>
> deleted_at TIMESTAMPTZ NULL
>
> );

**▸ Assets — Tabla Central con FK explícitas de ubicación**

> CREATE TABLE assets (
>
> id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
>
> code VARCHAR(60) NOT NULL UNIQUE,
>
> asset_tag VARCHAR(120),
>
> serial_number VARCHAR(200) UNIQUE,
>
> model_id UUID NOT NULL REFERENCES asset_models(id),
>
> category_id UUID NOT NULL REFERENCES asset_categories(id),
>
> zonal_id UUID NOT NULL REFERENCES zonals(id),
>
> purchase_item_id UUID REFERENCES purchase_items(id),
>
> status VARCHAR(30) NOT NULL DEFAULT 'stored'
>
> CHECK (status IN ('active','stored','in_repair','in_transit','disposed','sold')),
>
> condition VARCHAR(30) NOT NULL DEFAULT 'new'
>
> CHECK (condition IN ('new','good','regular','damaged','obsolete')),
>
> -- FK explícitas de ubicación (en lugar de polimorfismo puro)
>
> location_type VARCHAR(30),
>
> warehouse_id UUID REFERENCES warehouses(id) ON DELETE RESTRICT,
>
> office_id UUID REFERENCES offices(id) ON DELETE RESTRICT,
>
> repair_shop_id UUID REFERENCES repair_shops(id) ON DELETE RESTRICT,
>
> -- Garantiza que solo 1 FK de ubicación esté activa a la vez
>
> CONSTRAINT chk_location CHECK (
>
> (location_type='warehouse' AND warehouse_id IS NOT NULL AND office_id IS NULL AND repair_shop_id IS NULL) OR
>
> (location_type='office' AND office_id IS NOT NULL AND warehouse_id IS NULL AND repair_shop_id IS NULL) OR
>
> (location_type='repair_shop' AND repair_shop_id IS NOT NULL AND warehouse_id IS NULL AND office_id IS NULL) OR
>
> (location_type IN ('user','in_transit') AND warehouse_id IS NULL AND office_id IS NULL AND repair_shop_id IS NULL) OR
>
> (location_type IS NULL)
>
> ),
>
> acquisition_value NUMERIC(14,2),
>
> current_value NUMERIC(14,2),
>
> depreciation_rate NUMERIC(5,2) DEFAULT 20.00,
>
> warranty_until DATE,
>
> specs JSONB,
>
> notes TEXT,
>
> created_at TIMESTAMPTZ DEFAULT NOW(),
>
> updated_at TIMESTAMPTZ DEFAULT NOW(),
>
> deleted_at TIMESTAMPTZ NULL
>
> );
>
> CREATE INDEX idx_assets_zonal_status ON assets(zonal_id, status) WHERE deleted_at IS NULL;
>
> CREATE INDEX idx_assets_warranty ON assets(warranty_until) WHERE warranty_until IS NOT NULL AND deleted_at IS NULL;
>
> CREATE INDEX idx_assets_specs_gin ON assets USING GIN(specs);
>
> CREATE INDEX idx_assets_fts ON assets USING GIN(
>
> to_tsvector('spanish', coalesce(code,'') \|\| ' ' \|\| coalesce(serial_number,'')));

**▸ Mantenimiento Preventivo — Tablas nuevas ★**

> CREATE TABLE preventive_plans (
>
> id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
>
> name VARCHAR(200) NOT NULL, -- 'Revisión semestral PCs'
>
> category_id UUID REFERENCES asset_categories(id),
>
> zonal_id UUID REFERENCES zonals(id),
>
> frequency_type VARCHAR(30) NOT NULL
>
> CHECK (frequency_type IN ('monthly','quarterly','biannual','annual')),
>
> description TEXT,
>
> checklist JSONB, -- \[{step: 'Limpiar ventiladores', required: true}\]
>
> assigned_role VARCHAR(60) DEFAULT 'tecnico',
>
> is_active BOOLEAN DEFAULT TRUE,
>
> created_at TIMESTAMPTZ DEFAULT NOW(),
>
> updated_at TIMESTAMPTZ DEFAULT NOW()
>
> );
>
> CREATE TABLE preventive_tasks (
>
> id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
>
> plan_id UUID NOT NULL REFERENCES preventive_plans(id),
>
> asset_id UUID NOT NULL REFERENCES assets(id),
>
> status VARCHAR(30) DEFAULT 'scheduled'
>
> CHECK (status IN ('scheduled','in_progress','completed','skipped','overdue')),
>
> scheduled_date DATE NOT NULL,
>
> completed_date TIMESTAMPTZ,
>
> technician_id UUID REFERENCES users(id),
>
> findings TEXT,
>
> checklist_done JSONB, -- resultados del checklist
>
> cost NUMERIC(10,2),
>
> next_due_date DATE,
>
> created_at TIMESTAMPTZ DEFAULT NOW()
>
> );
>
> CREATE INDEX idx_prev_tasks_due ON preventive_tasks(scheduled_date, status)
>
> WHERE status IN ('scheduled','overdue');

**▸ Seguridad: login_attempts y api_key_logs ★**

> CREATE TABLE login_attempts (
>
> id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
>
> email VARCHAR(255) NOT NULL,
>
> ip_address INET NOT NULL,
>
> user_agent TEXT,
>
> success BOOLEAN NOT NULL,
>
> failure_reason VARCHAR(100), -- 'invalid_password'\|'account_locked'\|'2fa_failed'
>
> created_at TIMESTAMPTZ DEFAULT NOW()
>
> ) PARTITION BY RANGE (created_at);
>
> CREATE INDEX idx_login_ip_time ON login_attempts(ip_address, created_at DESC);
>
> CREATE INDEX idx_login_email ON login_attempts(email, success, created_at DESC);
>
> CREATE TABLE api_key_logs (
>
> id UUID DEFAULT gen_random_uuid(),
>
> token_id UUID NOT NULL REFERENCES agent_tokens(id),
>
> endpoint VARCHAR(200),
>
> ip_address INET,
>
> status_code SMALLINT,
>
> created_at TIMESTAMPTZ DEFAULT NOW()
>
> ) PARTITION BY RANGE (created_at);
>
> **2.4 Tabla Completa — 48 Tablas del Sistema**

|        |                        |                 |                                                                     |
|--------|------------------------|-----------------|---------------------------------------------------------------------|
| **\#** | **Tabla**              | **Módulo**      | **Descripción**                                                     |
| 1      | zonals                 | Org             | Zonales (Lima, Chiclayo, Arequipa, Trujillo)                        |
| 2      | offices                | Org             | Sedes y oficinas por zonal                                          |
| 3      | warehouses             | Org             | Almacenes con capacidad y gestor                                    |
| 4      | warehouse_locations    | Org             | Ubicaciones físicas (estante/fila/columna) — para almacenes grandes |
| 5      | repair_shops           | Org             | Talleres externos registrados con contacto y RUC                    |
| 6      | departments            | Org             | Departamentos/áreas con jerarquía                                   |
| 7      | users                  | Org             | Usuarios del sistema con 2FA                                        |
| 8      | roles                  | Org             | Roles con permisos                                                  |
| 9      | permissions            | Org             | Permisos granulares por acción                                      |
| 10     | asset_categories       | Catálogo        | PC, Monitor, Impresora, Router, Switch                              |
| 11     | asset_brands           | Catálogo        | Marcas: HP, Dell, Cisco, Lenovo, Kingston                           |
| 12     | asset_models           | Catálogo        | Modelos por marca y categoría con specs JSON                        |
| 13     | component_types        | Catálogo        | RAM, SSD, HDD, GPU, PSU, Motherboard                                |
| 14     | suppliers              | Compras         | Proveedores con RUC, contacto y condiciones                         |
| 15     | purchase_orders        | Compras         | Órdenes de compra con niveles de aprobación                         |
| 16     | purchase_items         | Compras         | Ítems de OC con precio y descripción                                |
| 17     | invoices               | Compras         | Facturas con archivo PDF adjunto                                    |
| 18     | stock_entries          | Logística       | Ingresos al almacén vinculados a factura                            |
| 19     | stock_entry_items      | Logística       | Ítems ingresados con condición                                      |
| 20     | assets                 | Activos         | Activo principal con FK explícitas de ubicación                     |
| 21     | asset_computers        | Activos         | Datos de PC/laptop: hostname, IP, MAC, BIOS serial                  |
| 22     | asset_assignments      | Activos         | Historial de asignaciones (retornable con returned_at)              |
| 23     | asset_photos           | Activos         | Fotos del activo (frente, reverso, daño)                            |
| 24     | components             | Componentes     | Componente físico con FK explícitas de ubicación                    |
| 25     | computer_components    | Componentes     | Historial de instalaciones en PCs (con slot y fechas)               |
| 26     | asset_transfers        | Logística       | Traslados con transportista y guía de remisión                      |
| 27     | transfer_items         | Logística       | Ítems del traslado con condición entrada/salida                     |
| 28     | repair_tickets         | Mantenimiento   | Tickets correctivos con diagnóstico y solución                      |
| 29     | repair_parts           | Mantenimiento   | Repuestos usados en reparación                                      |
| 30     | repair_costs           | Mantenimiento   | Costos de mano de obra y repuestos externos                         |
| 31     | preventive_plans       | Mantenimiento ★ | Planes de mantenimiento preventivo por categoría/zonal              |
| 32     | preventive_tasks       | Mantenimiento ★ | Tareas programadas con checklist y resultados                       |
| 33     | asset_disposals        | Baja            | Solicitudes de baja con motivo y aprobación                         |
| 34     | asset_sales            | Baja            | Ventas internas de activos dados de baja                            |
| 35     | inventory_counts       | Inventario      | Conteos físicos con reconciliación                                  |
| 36     | inventory_count_items  | Inventario      | Ítems verificados con diferencias                                   |
| 37     | alert_rules            | Alertas ★       | Reglas configurables con canales y destinatarios                    |
| 38     | alert_events           | Alertas ★       | Alertas disparadas con severidad y resolución                       |
| 39     | notifications          | Alertas ★       | Notificaciones in-app por usuario                                   |
| 40     | depreciation_schedules | Finanzas ★      | Configuración de método y vida útil por categoría                   |
| 41     | depreciation_entries   | Finanzas ★      | Registros mensuales de depreciación por activo                      |
| 42     | software_vendors       | Licencias ★     | Fabricantes de software                                             |
| 43     | software_products      | Licencias ★     | Productos de software rastreables                                   |
| 44     | software_licenses      | Licencias ★     | Licencias con seats, vigencia y costo                               |
| 45     | license_assignments    | Licencias ★     | Asignación licencia → activo (con revocación)                       |
| 46     | software_installations | Licencias ★     | Software detectado por el agente en PCs                             |
| 47     | audit_logs             | Auditoría       | Log completo PARTITION BY RANGE(created_at)                         |
| 48     | agent_reports          | Auditoría       | Snapshots HW con estrategia diff optimizada                         |
| 49     | agent_tokens           | Seguridad       | Tokens de agentes con IP whitelist                                  |
| 50     | login_attempts         | Seguridad ★     | Registro de intentos de login para detección de ataques             |
| 51     | api_key_logs           | Seguridad ★     | Log de uso de tokens de agentes                                     |
| 52     | backup_logs            | Infra ★         | Registro de backups realizados y verificados                        |

> **3. API REST — OPENAPI + ESTRUCTURA COMPLETA**
>
> **3.1 Configuración OpenAPI con l5-swagger**
>
> // Cada controlador tiene anotaciones OpenAPI completas
>
> /\*\*
>
> \* @OA\Post(path="/api/v1/agent/report",
>
> \* summary="Recibe reporte de hardware del agente",
>
> \* tags={"Agent"}, security={{"bearerAuth":{}}},
>
> \* @OA\RequestBody(required=true,
>
> \* @OA\JsonContent(ref="#/components/schemas/AgentReportRequest")),
>
> \* @OA\Response(response=200, description="Sync OK",
>
> \* @OA\JsonContent(ref="#/components/schemas/AgentReportResponse")),
>
> \* @OA\Response(response=429, description="Rate limit: máx 1 reporte cada 2h")
>
> \* )
>
> \*/
>
> // Swagger UI disponible en: /api/documentation
>
> // OpenAPI JSON en: /api/documentation.json (para Postman/Insomnia)
>
> **3.2 Endpoints Completos — 52 Rutas**

|            |                                 |                                            |                    |
|------------|---------------------------------|--------------------------------------------|--------------------|
| **Método** | **Endpoint**                    | **Descripción**                            | **Permiso**        |
| GET        | /assets                         | Listar con filtros + cursor pagination     | asset.viewAny      |
| POST       | /assets                         | Crear activo                               | asset.create       |
| GET        | /assets/{uuid}                  | Ficha completa con includes                | asset.view         |
| PATCH      | /assets/{uuid}                  | Actualizar datos                           | asset.update       |
| DELETE     | /assets/{uuid}                  | Soft delete                                | asset.delete       |
| GET        | /assets/{uuid}/history          | Historial desde audit_logs                 | asset.view         |
| POST       | /assets/{uuid}/assign           | Asignar a usuario/área                     | asset.assign       |
| DELETE     | /assets/{uuid}/assign           | Desasignar                                 | asset.assign       |
| GET        | /assets/{uuid}/components       | Componentes instalados actualmente         | asset.view         |
| GET        | /assets/{uuid}/qr               | QR PNG descargable                         | asset.view         |
| GET        | /assets/{uuid}/depreciation     | Tabla de depreciación del activo           | finance.view       |
| POST       | /assets/import                  | Importación masiva CSV con preview         | asset.create       |
| GET        | /components                     | Listar componentes con filtros             | component.viewAny  |
| POST       | /components                     | Crear componente                           | component.create   |
| GET        | /components/{uuid}              | Detalle con historial                      | component.view     |
| PATCH      | /components/{uuid}              | Actualizar                                 | component.update   |
| POST       | /components/{uuid}/install      | Instalar en PC con slot                    | component.install  |
| POST       | /components/{uuid}/uninstall    | Retirar de PC con motivo                   | component.install  |
| GET        | /transfers                      | Listar traslados                           | transfer.viewAny   |
| POST       | /transfers                      | Crear solicitud                            | transfer.create    |
| GET        | /transfers/{uuid}               | Detalle con ítems y timeline               | transfer.view      |
| POST       | /transfers/{uuid}/approve       | Aprobar                                    | transfer.approve   |
| POST       | /transfers/{uuid}/reject        | Rechazar con motivo                        | transfer.approve   |
| POST       | /transfers/{uuid}/ship          | Marcar despachado + guía                   | transfer.ship      |
| POST       | /transfers/{uuid}/receive       | Confirmar recepción ítem por ítem          | transfer.receive   |
| GET        | /transfers/{uuid}/manifest      | Acta de traslado PDF                       | transfer.view      |
| GET        | /purchase-orders                | Listar OC                                  | purchase.viewAny   |
| POST       | /purchase-orders                | Crear OC con ítems                         | purchase.create    |
| PATCH      | /purchase-orders/{uuid}/approve | Aprobar (nivel 1 ó 2)                      | purchase.approve   |
| POST       | /invoices                       | Registrar factura con PDF                  | purchase.invoice   |
| POST       | /stock-entries                  | Ingresar al almacén                        | warehouse.entry    |
| GET        | /warehouses/{uuid}/stock        | Stock actual del almacén                   | warehouse.view     |
| GET        | /repairs                        | Listar tickets                             | repair.viewAny     |
| POST       | /repairs                        | Abrir ticket con adjuntos                  | repair.create      |
| PATCH      | /repairs/{uuid}                 | Actualizar diagnóstico/estado              | repair.edit        |
| POST       | /repairs/{uuid}/complete        | Cerrar ticket con solución                 | repair.complete    |
| GET        | /disposals                      | Listar bajas                               | disposal.viewAny   |
| POST       | /disposals                      | Solicitar baja                             | disposal.create    |
| POST       | /disposals/{uuid}/approve       | Aprobar baja                               | disposal.approve   |
| POST       | /disposals/{uuid}/sell          | Registrar venta a trabajador               | disposal.sell      |
| GET        | /alerts                         | Alertas activas con filtros                | alert.view         |
| GET        | /alerts/rules                   | Reglas de alerta configuradas              | alert.manage       |
| POST       | /alerts/rules                   | Crear regla                                | alert.manage       |
| PATCH      | /alerts/rules/{uuid}            | Editar regla                               | alert.manage       |
| POST       | /alerts/{uuid}/resolve          | Resolver alerta                            | alert.resolve      |
| GET        | /licenses                       | Listar licencias                           | license.view       |
| POST       | /licenses                       | Registrar licencia                         | license.create     |
| GET        | /licenses/compliance            | Reporte de cumplimiento                    | license.audit      |
| GET        | /licenses/violations            | Instalaciones no autorizadas               | license.audit      |
| GET        | /depreciation/report            | Reporte de depreciación                    | finance.view       |
| POST       | /depreciation/calculate         | Calcular manualmente (dry-run o real)      | finance.manage     |
| GET        | /maintenance/plans              | Listar planes preventivos                  | maintenance.view   |
| POST       | /maintenance/plans              | Crear plan                                 | maintenance.manage |
| GET        | /maintenance/tasks/due          | Tareas vencidas o próximas                 | maintenance.view   |
| POST       | /api/agent/register             | Registro inicial del agente                | api_key_global     |
| POST       | /api/agent/report               | Enviar reporte de hardware (rate-limit 2h) | bearer_token       |
| GET        | /api/agent/config/{bios_serial} | Configuración y actualizaciones            | bearer_token       |

> **3.3 Respuesta Estándar + Manejo de Errores**
>
> // Respuesta exitosa — 200/201
>
> {
>
> "success": true,
>
> "data": { ... },
>
> "meta": { "current_cursor": "eyJpZCI6MTIz", "next_cursor": "eyJpZCI6MTQ4",
>
> "per_page": 25, "total": 1250 }
>
> }
>
> // Error de validación — 422
>
> {
>
> "success": false,
>
> "message": "The given data was invalid.",
>
> "errors": { "serial_number": \["El número de serie ya existe en el sistema."\] },
>
> "code": "VALIDATION_ERROR",
>
> "request_id": "req_01J8..." // trace ID para logs
>
> }
>
> // Error de autorización — 403
>
> {
>
> "success": false,
>
> "message": "No tiene permisos para realizar esta acción en el zonal Chiclayo.",
>
> "code": "FORBIDDEN_ZONAL"
>
> }
>
> **4. FRONTEND: REACT 19 + INERTIA 2 + TAILWIND CSS 4**
>
> **4.1 React 19 — Cambios que Impactan el Proyecto**

|                                 |                                                                                                                |                                                             |
|---------------------------------|----------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------|
| **Feature**                     | **Aplicación concreta en este sistema**                                                                        | **Código de ejemplo**                                       |
| React Compiler                  | Tablas de 10,000 activos sin useMemo/useCallback. El compilador los agrega automáticamente donde se necesitan. | Solo escribir el componente normal — el compilador optimiza |
| use() hook                      | Cargar datos de un activo específico dentro del componente sin useEffect ni useState para el fetch inicial.    | const asset = use(fetchAsset(uuid))                         |
| Actions en formularios          | Formularios de traslado, asignación y reparación con manejo automático de loading/error sin onSubmit manual.   | \<form action={assignAsset}\> — React maneja pending        |
| Optimistic Updates              | Al asignar un activo a un usuario, la UI actualiza instantáneamente antes de que confirme el servidor.         | useOptimistic() en tabla de asignaciones                    |
| Server Components + Inertia SSR | La ficha de activo se renderiza en servidor: primer paint con datos sin esperar al cliente.                    | Inertia::render() con SSR habilitado en Laravel             |

> **4.2 Tailwind CSS 4 — Configuración del Tema Corporativo**
>
> /\* resources/css/app.css — Configuración completa Tailwind 4 \*/
>
> @import "tailwindcss";
>
> @theme {
>
> /\* Paleta corporativa de la empresa \*/
>
> --color-brand-navy: \#0A1628;
>
> --color-brand-blue: \#1A56A0;
>
> --color-brand-light: \#3B82F6;
>
> /\* Estados de activos — semánticos \*/
>
> --color-status-active: \#065F46; /\* verde \*/
>
> --color-status-stored: \#1D4ED8; /\* azul \*/
>
> --color-status-repair: \#92400E; /\* ámbar \*/
>
> --color-status-disposed: \#991B1B; /\* rojo \*/
>
> --color-status-transit: \#5B21B6; /\* púrpura \*/
>
> /\* Severidad de alertas \*/
>
> --color-alert-critical: \#7F1D1D;
>
> --color-alert-high: \#92400E;
>
> --color-alert-medium: \#78350F;
>
> --color-alert-low: \#1E3A5F;
>
> --font-sans: 'Inter Variable', sans-serif;
>
> --font-mono: 'JetBrains Mono', monospace;
>
> }
>
> /\* @container queries para cards de activos en sidebar \*/
>
> @layer components {
>
> .asset-card { @container (min-width: 300px) { grid-cols: 2 } }
>
> }
>
> **4.3 Módulos del Frontend — Completo con Rutas**

|                       |                                     |                                                                                                                                                              |
|-----------------------|-------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Módulo**            | **Páginas Inertia (ruta)**          | **Features Clave**                                                                                                                                           |
| Dashboard             | / (Dashboard/Index)                 | KPIs por zonal, mapa Perú interactivo, alertas críticas top-5, actividad reciente, gráficas Recharts (barras por estado, línea evolución mensual)            |
| Activos               | assets.\*                           | Tabla virtualizada @tanstack/virtual, ficha con tabs: Specs / Historial / Componentes / Fotos / QR / Depreciación. Import CSV con mapeo de columnas.         |
| Componentes           | components.\*                       | CRUD + wizard instalación: buscar componente → seleccionar slot → confirmar. Verificación de compatibilidad por tipo.                                        |
| Traslados             | transfers.\*                        | Wizard 4 pasos: origen → destino → items → confirmación. Timeline de estado visual. Acta PDF descargable. Notificación automática al responsable de destino. |
| Compras               | purchases.\*, invoices.\*, stock.\* | OC con aprobación configurable, facturas con upload PDF, recepción en almacén paso a paso con QR scanner opcional.                                           |
| Reparaciones          | repairs.\*                          | Kanban drag-and-drop (open→diagnosis→repair→done). Registro de repuestos y costos. KPIs: MTTR, tickets por técnico.                                          |
| Mantenimiento Prev. ★ | maintenance.\*                      | Calendario de tareas programadas. Checklist interactivo. Planificación automática por plan y frecuencia.                                                     |
| Bajas y Ventas        | disposals.\*                        | Flujo de aprobación + registro de comprador con DNI. Acta interna PDF.                                                                                       |
| Inventario            | inventory.\*                        | Conteo físico con reconciliación. Escaneo de QR para marcar como verificado. Reporte de diferencias.                                                         |
| Alertas ★             | alerts.\*, alerts.rules.\*          | Panel por severidad. Configuración de reglas. Historial de alertas resueltas con tiempo de resolución.                                                       |
| Licencias ★           | licenses.\*                         | Dashboard seated/installed por producto. Mapa de cumplimiento. Lista de violaciones por equipo.                                                              |
| Depreciación ★        | depreciation.\*                     | Tabla por activo con método, vida útil y valor neto. Configuración de schedules por categoría. Exportación para contabilidad.                                |
| Mant. Preventivo ★    | maintenance.\*                      | Calendario Gantt de tareas. Checklist digital. Asignación a técnicos.                                                                                        |
| Reportes              | reports.\*                          | 10+ reportes predefinidos. Filtros avanzados. Previsualización. Exportación Excel/PDF.                                                                       |
| Auditoría             | audit.\*                            | Timeline con diff visual: old_values vs new_values resaltado. Filtros por usuario/acción/modelo. Exportación.                                                |
| Administración        | admin.\*                            | Usuarios + 2FA. Roles y permisos. Zonales y almacenes. Catálogos. Config del sistema. Seguridad: intentos de login fallidos.                                 |

> **5. ROLES, PERMISOS Y CONTROL DE ACCESO**
>
> **5.1 Roles del Sistema**

|                     |             |                       |                                                                                             |
|---------------------|-------------|-----------------------|---------------------------------------------------------------------------------------------|
| **Rol**             | **Slug**    | **Alcance**           | **Descripción**                                                                             |
| Super Administrador | super_admin | Global                | Control total. Sin restricción de zonal. Gestión de toda la configuración del sistema.      |
| Administrador Zonal | admin_zonal | Su zonal              | Administra usuarios, activos y configuración de su zonal. Aprueba OC de cualquier monto.    |
| Jefe de TI          | jefe_ti     | Su zonal              | Aprueba bajas, traslados y OC menores al umbral. Gestiona alertas y planes preventivos.     |
| Técnico TI          | tecnico     | Su zonal              | Reparaciones, instalación de componentes, asignaciones, tareas de mantenimiento preventivo. |
| Almacenero          | almacenero  | Su almacén            | Ingresos, egresos, inventario físico, ejecución de traslados.                               |
| Contador / Finanzas | contador    | Global (solo lectura) | Ve depreciación, valor de activos y reportes financieros. Sin modificaciones.               |
| Auditor             | auditor     | Global (solo lectura) | Acceso completo a logs de auditoría, reportes y exportaciones. Sin modificaciones.          |
| Agente HW           | agent_hw    | Sin acceso UI         | Token de máquina. Solo puede llamar a POST /api/agent/report. Sin sesión.                   |

> **5.2 Matriz Completa de Permisos**

|                        |           |             |              |             |             |              |             |
|------------------------|-----------|-------------|--------------|-------------|-------------|--------------|-------------|
| **Permiso**            | **super** | **admin_z** | **jefe_ti**  | **tecnico** | **almacen** | **contador** | **auditor** |
| Ver activos            | ✓ global  | ✓ zonal     | ✓ zonal      | ✓ zonal     | ✓ zonal     | ✓ global     | ✓ global    |
| Crear / editar activos | ✓         | ✓           | ✓            | ✗           | ✗           | ✗            | ✗           |
| Asignar activos        | ✓         | ✓           | ✓            | ✓ zonal     | ✗           | ✗            | ✗           |
| Dar de baja activos    | ✓         | ✗           | ✓ zonal      | ✗           | ✗           | ✗            | ✗           |
| Aprobar traslados      | ✓         | ✓ zonal     | ✓ zonal      | ✗           | ✗           | ✗            | ✗           |
| Ejecutar traslados     | ✓         | ✓           | ✓            | ✗           | ✓ zonal     | ✗            | ✗           |
| Gestionar compras      | ✓         | ✓           | ✓ zonal      | ✗           | recepción   | ✗            | ✗           |
| Aprobar compras        | ✓         | ✓ (todos)   | ✓ (\<umbral) | ✗           | ✗           | ✗            | ✗           |
| Reparaciones           | ✓         | ✓           | ✓            | ✓ zonal     | ✗           | ✗            | ✗           |
| Mant. preventivo ★     | ✓         | ✓           | ✓            | ✓ zonal     | ✗           | ✗            | ✗           |
| Gestionar alertas ★    | ✓         | ✓ zonal     | ✓ zonal      | ver         | ✗           | ✗            | ver         |
| Depreciación ★         | ✓         | ver         | ver          | ✗           | ✗           | ✓ global     | ✓ global    |
| Licencias ★            | ✓         | ✓ zonal     | ✓ zonal      | ver         | ✗           | ver          | ver         |
| Ver auditoría          | ✓         | ✓ zonal     | ✓ zonal      | ✗           | ✗           | ✗            | ✓ global    |
| Exportar reportes      | ✓         | ✓ zonal     | ✓ zonal      | ✓ zonal     | ✓ zonal     | ✓ global     | ✓ global    |
| Config. sistema        | ✓         | ✗           | ✗            | ✗           | ✗           | ✗            | ✗           |

> **6. FLUJOS DE NEGOCIO COMPLETOS**
>
> **6.1 Compra con Aprobación Parametrizable**
>
> ℹ OC \< umbral configurable (ej. S/5,000): 1 nivel de aprobación (Jefe TI). OC \>= umbral: 2 niveles (Jefe TI + Admin Zonal). El umbral se configura por zonal desde la pantalla de Administración.

|          |             |                                                                              |                       |
|----------|-------------|------------------------------------------------------------------------------|-----------------------|
| **Paso** | **Actor**   | **Acción**                                                                   | **Estado**            |
| 1        | Jefe TI     | Crea OC con ítems, proveedor, justificación y monto estimado                 | draft                 |
| 2        | Sistema     | Evalúa monto vs. umbral. Determina niveles de aprobación requeridos          | —                     |
| 3        | Jefe TI     | Envía OC. Si es nivel único, aprueba directamente                            | approved / pending_l2 |
| 4        | Admin Zonal | Si requiere nivel 2: aprueba o rechaza con comentario                        | approved              |
| 5        | Almacenero  | Registra factura del proveedor con archivo PDF adjunto                       | —                     |
| 6        | Almacenero  | Crea Stock Entry: recibe ítem por ítem, registra condición de cada uno       | —                     |
| 7        | Sistema     | Genera UUID, código interno (TI-LIM-PC-XXXX), QR para cada activo/componente | stored                |
| 8        | Sistema     | Evalúa alertas de stock: ¿se cubrió el mínimo configurado?                   | —                     |
| 9        | Sistema     | Registra todo en audit_log. Notifica al solicitante.                         | Auditoría: OK         |

> **6.2 Traslado entre Zonales**

|          |                     |                                                                                                          |                  |
|----------|---------------------|----------------------------------------------------------------------------------------------------------|------------------|
| **Paso** | **Actor**           | **Acción**                                                                                               | **Estado**       |
| 1        | TI Lima             | Crea solicitud, agrega activos/componentes, define origen y destino                                      | draft            |
| 2        | TI Lima             | Envía para aprobación. Sistema genera código TRAS-2025-LIM-CHI-0043                                      | pending_approval |
| 3        | Jefe Lima           | Aprueba el traslado                                                                                      | approved         |
| 4        | Almacenero Lima     | Prepara equipos, registra condición de salida ítem por ítem                                              | —                |
| 5        | Almacenero Lima     | Registra transportista, guía de remisión y marca como despachado                                         | in_transit       |
| 6        | Sistema             | Cambia location_type='in_transit' en todos los activos. Programa alerta si en \>5 días no hay recepción. | —                |
| 7        | Almacenero Chiclayo | Recibe equipos, verifica condición. Puede rechazar ítems dañados documentando el daño.                   | —                |
| 8        | Almacenero Chiclayo | Confirma recepción en el sistema ítem por ítem                                                           | received         |
| 9        | Sistema             | Actualiza zonal_id y FK de ubicación. Genera acta PDF. Registra en audit_log.                            | —                |

> **6.3 Mantenimiento Preventivo ★**

|          |           |                                                                                                                      |                  |
|----------|-----------|----------------------------------------------------------------------------------------------------------------------|------------------|
| **Paso** | **Actor** | **Acción**                                                                                                           | **Estado Tarea** |
| 1        | Jefe TI   | Crea plan preventivo: nombre, categoría, frecuencia, checklist (ej. 'Revisión semestral PCs Lima')                   | plan: active     |
| 2        | Sistema   | Job semanal genera preventive_tasks automáticamente para todos los activos de la categoría/zonal según la frecuencia | tasks: scheduled |
| 3        | Técnico   | Ve sus tareas asignadas en el calendario. Accede al checklist digital de cada tarea                                  | —                |
| 4        | Técnico   | Ejecuta el mantenimiento, marca cada ítem del checklist, registra hallazgos y costo                                  | —                |
| 5        | Técnico   | Completa la tarea. Sistema calcula la próxima fecha automáticamente                                                  | completed        |
| 6        | Sistema   | Si se detecta un problema durante el mantenimiento: crea repair_ticket automáticamente                               | ticket: open     |
| 7        | Sistema   | Si una tarea no se completa antes de scheduled_date: cambia a 'overdue' y genera alerta                              | overdue          |

> **6.4 Baja y Venta con Gestión de Licencias**
>
> ⚠ La venta a trabajadores es un registro interno. El comprobante tributario (boleta/factura) debe emitirse por el sistema contable oficial de la empresa.

|          |           |                                                                                                                                  |            |
|----------|-----------|----------------------------------------------------------------------------------------------------------------------------------|------------|
| **Paso** | **Actor** | **Acción**                                                                                                                       | **Estado** |
| 1        | TI        | Crea solicitud de baja con motivo técnico detallado (obsolescencia, daño irreparable, etc.)                                      | requested  |
| 2        | Jefe TI   | Aprueba la baja. Sistema cambia asset.status = 'disposed'                                                                        | approved   |
| 3        | Sistema   | Revoca automáticamente todas las license_assignments del activo. Libera seats de licencias de volumen. Da de baja licencias OEM. | —          |
| 4        | TI / RRHH | Registra la venta: nombre del comprador, DNI, área, monto acordado, método de pago                                               | —          |
| 5        | Sistema   | Registra en asset_sales. Cambia status = 'sold'. Genera acta interna PDF.                                                        | sold       |
| 6        | Sistema   | Soft-delete del activo (preservado para historial y auditoría). Registra en audit_log.                                           | —          |

> **6.5 Sistema de Alertas Automáticas**

|                           |                                                               |                                          |                             |
|---------------------------|---------------------------------------------------------------|------------------------------------------|-----------------------------|
| **Tipo**                  | **Trigger**                                                   | **Canales**                              | **Prioridad**               |
| Garantía por vencer       | Cron diario: warranty_until \<= hoy + 30 días                 | In-app + Email al Jefe TI del zonal      | Media                       |
| PC sin reportar agente    | Cron 6h: last_seen_at \< ahora - 48h en PCs con status=active | In-app + Email + Slack si configurado    | Alta — posible robo o falla |
| Traslado bloqueado        | Cron diario: in_transit con ship_date \< ahora - 5 días       | In-app + Email a Jefes TI origen/destino | Alta                        |
| Stock bajo de componente  | Trigger en egreso: stock \< threshold configurado             | In-app + Email al Almacenero y Jefe TI   | Media                       |
| Discrepancia de HW        | AgentService: componente no registrado o faltante en PC       | In-app + Email Jefe TI (alta prioridad)  | Crítica — posible hurto     |
| Licencia por vencer       | Cron diario: valid_until \<= hoy + 60 días                    | In-app + Email a Jefe TI y Contador      | Media                       |
| Violación de licencia     | Agente detecta software sin licencia asignada                 | In-app + Email Jefe TI                   | Alta                        |
| Mantenimiento vencido     | Cron diario: scheduled_date \< hoy con status=scheduled       | In-app al técnico y Jefe TI              | Media                       |
| Múltiples logins fallidos | 5+ intentos fallidos desde misma IP en 10 min                 | In-app + Email a super_admin             | Crítica — posible ataque    |

> **7. AGENTE RECOLECTOR — WINDOWS Y LINUX**
>
> **7.1 Seguridad del Agente — Nivel Producción**

|                        |                                                                                                                                        |                                                        |
|------------------------|----------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------|
| **Medida**             | **Implementación**                                                                                                                     | **Qué previene**                                       |
| Firma de código        | Compilar como .exe firmado con cert corporativo (signtool.exe /sha1). Verificar firma antes de ejecutar con Get-AuthenticodeSignature. | Ejecución de versiones modificadas del agente          |
| DPAPI para el token    | Token almacenado cifrado con DPAPI: ligado al equipo + cuenta de servicio. No portable.                                                | Robo del token para usarlo desde otra máquina          |
| TLS 1.3 + Cert Pinning | El agente valida el SHA-256 del certificado del servidor. Rechaza si no coincide.                                                      | Ataques MITM en redes internas comprometidas           |
| Rate limiting estricto | API devuelve 429 si el mismo token reporta más de 1 vez en 2 horas. Log en api_key_logs.                                               | Bucles de reportes, DoS desde agentes mal configurados |
| IP whitelist opcional  | Administrador puede restringir IPs autorizadas por token desde la UI.                                                                  | Uso del token desde equipos no esperados               |
| Token rotación         | Los tokens de agente expiran cada 12 meses. El agente solicita renovación automática 30 días antes.                                    | Impacto reducido de tokens comprometidos               |

> **7.2 Agente PowerShell — Windows (Completo)**
>
> \#Requires -Version 5.1
>
> \# TIAgent.ps1 v4.0 — Firmado digitalmente con certificado corporativo
>
> param(
>
> \[string\]\$ApiBase = 'https://erp-ti.empresa.pe/api/v1',
>
> \[string\]\$DataDir = 'C:\ProgramData\TIAgent'
>
> )
>
> function Write-Log(\[string\]\$msg,\[string\]\$level='INFO'){
>
> \$ts=(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
>
> Add-Content "\$DataDir\agent.log" -Value "\[\$ts\]\[\$level\] \$msg"
>
> }
>
> function Get-Token{
>
> \$f="\$DataDir\token.dat"
>
> if(-not(Test-Path \$f)){Write-Log 'Token no encontrado' 'ERROR';exit 1}
>
> \$s=Get-Content \$f\|ConvertTo-SecureString
>
> return \[Runtime.InteropServices.Marshal\]::PtrToStringAuto(
>
> \[Runtime.InteropServices.Marshal\]::SecureStringToBSTR(\$s))
>
> }
>
> function Get-Software{
>
> \# Registry en vez de Win32_Product (no dispara MSI repairs)
>
> \$paths='HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\\',
>
> 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\\'
>
> \$paths\|ForEach{Get-ItemProperty \$\_ -EA SilentlyContinue}\|
>
> Where-Object{\$\_.DisplayName}\|
>
> Select-Object @{N='name';E={\$\_.DisplayName}},
>
> @{N='version';E={\$\_.DisplayVersion}},
>
> @{N='publisher';E={\$\_.Publisher}}\|
>
> Where-Object{\$\_.name -match 'Office\|Windows\|Adobe\|SQL\|Antivirus\|AutoCAD'}
>
> }
>
> function Get-Payload{
>
> \$bios=Get-WmiObject Win32_BIOS
>
> \$cs=Get-WmiObject Win32_ComputerSystem
>
> \$cpu=Get-WmiObject Win32_Processor\|Select -First 1
>
> \$os=Get-WmiObject Win32_OperatingSystem
>
> \$rams=Get-WmiObject Win32_PhysicalMemory
>
> \$disks=Get-WmiObject Win32_DiskDrive
>
> \$gpu=Get-WmiObject Win32_VideoController\|Select -First 1
>
> \$nets=Get-WmiObject Win32_NetworkAdapterConfiguration\|Where{\$\_.IPEnabled}
>
> @{
>
> bios_serial=\$bios.SerialNumber.Trim();hostname=\$env:COMPUTERNAME
>
> manufacturer=\$cs.Manufacturer;model=\$cs.Model;current_user=\$cs.UserName
>
> cpu=@{name=\$cpu.Name.Trim();cores=\$cpu.NumberOfCores;
>
> threads=\$cpu.NumberOfLogicalProcessors;ghz=\[math\]::Round(\$cpu.MaxClockSpeed/1000,2)}
>
> ram_total_gb=\[math\]::Round((\$rams\|Measure -Sum Capacity).Sum/1GB,0)
>
> ram_modules=@(\$rams\|%{@{gb=\[math\]::Round(\$\_.Capacity/1GB,0);
>
> speed=\$\_.Speed;part=\$\_.PartNumber.Trim();serial=\$\_.SerialNumber.Trim()}})
>
> disks=@(\$disks\|%{@{model=\$\_.Model;serial=\$\_.SerialNumber.Trim();
>
> gb=\[math\]::Round(\$\_.Size/1GB,0);type=\$\_.MediaType;iface=\$\_.InterfaceType}})
>
> gpu=\$gpu.Name;gpu_vram_mb=\$gpu.AdapterRAM/1MB
>
> network=@(\$nets\|%{@{mac=\$\_.MACAddress;ip=\$\_.IPAddress\[0\];desc=\$\_.Description}})
>
> os=@{name=\$os.Caption;ver=\$os.Version;build=\$os.BuildNumber;arch=\$os.OSArchitecture}
>
> software=Get-Software
>
> reported_at=(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')
>
> }
>
> }
>
> try{
>
> \$token=Get-Token
>
> \$body=Get-Payload\|ConvertTo-Json -Depth 10 -Compress
>
> \$h=@{'Authorization'="Bearer \$token";'Content-Type'='application/json';'Accept'='application/json'}
>
> \$r=Invoke-RestMethod -Uri "\$ApiBase/agent/report" -Method POST -Headers \$h -Body \$body -UseBasicParsing
>
> Write-Log "OK — Asset: \$(\$r.data.asset_code) — Discrepancias: \$(\$r.data.discrepancies_count)"
>
> }catch{Write-Log \$\_.Exception.Message 'ERROR'}
>
> **7.3 Agente Python — Linux / Mac ★**
>
> ★ Nuevo en v4.0: agente multiplataforma para endpoints Linux (servidores, estaciones de trabajo con Ubuntu/Debian) y Mac.
>
> \#!/usr/bin/env python3
>
> \# ti_agent.py v4.0 — Agente para Linux/Mac
>
> \# Instalar: pip install psutil requests
>
> \# Activar como servicio: systemctl enable --now ti-agent.timer
>
> import psutil, subprocess, json, requests, socket, uuid
>
> import platform, os, re
>
> from pathlib import Path
>
> from datetime import datetime, timezone
>
> API_BASE = 'https://erp-ti.empresa.pe/api/v1'
>
> TOKEN_FILE = Path('/etc/ti-agent/token.dat')
>
> LOG_FILE = Path('/var/log/ti-agent/agent.log')
>
> def get_token() -\> str:
>
> return TOKEN_FILE.read_text().strip()
>
> def get_bios_serial() -\> str:
>
> try:
>
> result = subprocess.run(\['dmidecode','-s','system-serial-number'\],
>
> capture_output=True, text=True, timeout=5)
>
> return result.stdout.strip()
>
> except Exception: return 'UNKNOWN'
>
> def get_disks() -\> list:
>
> disks = \[\]
>
> for disk in psutil.disk_partitions():
>
> if 'loop' in disk.device: continue
>
> try:
>
> usage = psutil.disk_usage(disk.mountpoint)
>
> disks.append({'device': disk.device, 'mountpoint': disk.mountpoint,
>
> 'fstype': disk.fstype, 'gb': round(usage.total/1e9, 0)})
>
> except PermissionError: pass
>
> return disks
>
> def build_payload() -\> dict:
>
> mem = psutil.virtual_memory()
>
> cpu = psutil.cpu_freq()
>
> net = psutil.net_if_addrs()
>
> nets = \[{'iface': iface, 'ip': addrs\[0\].address,
>
> 'mac': next((a.address for a in addrs if a.family.name=='AF_PACKET'),'?')}
>
> for iface, addrs in net.items() if addrs and not iface.startswith('lo')\]
>
> return {
>
> 'bios_serial': get_bios_serial(),
>
> 'hostname': socket.gethostname(),
>
> 'current_user': os.getlogin(),
>
> 'cpu': {'name': platform.processor(), 'cores': psutil.cpu_count(logical=False),
>
> 'threads': psutil.cpu_count(), 'ghz': round((cpu.max if cpu else 0)/1000,2)},
>
> 'ram_total_gb': round(mem.total/1e9, 0),
>
> 'disks': get_disks(),
>
> 'network': nets,
>
> 'os': {'name': platform.system(), 'version': platform.version(),
>
> 'release': platform.release(), 'arch': platform.machine()},
>
> 'reported_at': datetime.now(timezone.utc).isoformat()
>
> }
>
> def main():
>
> token = get_token()
>
> payload = build_payload()
>
> headers = {'Authorization': f'Bearer {token}',
>
> 'Content-Type': 'application/json'}
>
> r = requests.post(f'{API_BASE}/agent/report', json=payload,
>
> headers=headers, timeout=30)
>
> r.raise_for_status()
>
> print(f'\[OK\] {r.json()\["data"\]\["asset_code"\]}')
>
> if \_\_name\_\_ == '\_\_main\_\_': main()
>
> **8. AUDITORÍA Y LOGS DEL SISTEMA**
>
> **8.1 Tres Niveles de Auditoría**

|             |                                       |                                                                                               |                                         |
|-------------|---------------------------------------|-----------------------------------------------------------------------------------------------|-----------------------------------------|
| **Nivel**   | **Mecanismo**                         | **Captura**                                                                                   | **Destino**                             |
| 1 — Modelo  | Eloquent Observer — AuditObserver     | CREATE/UPDATE/DELETE en todos los modelos auditables. old_values + new_values en JSONB.       | audit_logs (particionada por año RANGE) |
| 2 — HTTP    | AuditMiddleware en rutas autenticadas | Cada request: endpoint, método, duración, IP, request_id para trazabilidad.                   | activity_logs                           |
| 3 — Negocio | Events + Listeners en Services        | Operaciones complejas: traslado completado, baja aprobada, licencia violada, discrepancia HW. | audit_logs con action descriptiva       |

> **8.2 AuditObserver — Implementación Completa**
>
> // app/Observers/AuditObserver.php
>
> class AuditObserver {
>
> protected array \$skipFields = \['updated_at','remember_token','password','current_value'\];
>
> public function created(Model \$model): void {
>
> \$this-\>write('created',\$model,\[\],\$model-\>getAttributes());
>
> }
>
> public function updated(Model \$model): void {
>
> \$dirty=collect(\$model-\>getDirty())-\>except(\$this-\>skipFields)-\>all();
>
> if(empty(\$dirty)) return;
>
> \$this-\>write('updated',\$model,
>
> collect(\$model-\>getOriginal())-\>only(array_keys(\$dirty))-\>all(),\$dirty);
>
> }
>
> public function deleted(Model \$model): void {
>
> \$this-\>write(isset(\$model-\>deleted_at)?'soft_deleted':'hard_deleted',
>
> \$model,\$model-\>getAttributes(),\[\]);
>
> }
>
> private function write(string \$action,Model \$m,array \$old,array \$new): void {
>
> AuditLog::create(\[
>
> 'user_id' =\> auth()-\>id(),
>
> 'action' =\> \$action,
>
> 'model_type' =\> get_class(\$m),
>
> 'model_id' =\> \$m-\>getKey(),
>
> 'old_values' =\> \$old ?: null,
>
> 'new_values' =\> \$new ?: null,
>
> 'ip_address' =\> request()?-\>ip(),
>
> 'request_id' =\> request()?-\>header('X-Request-ID'),
>
> \]);
>
> }
>
> }
>
> **8.3 Política de Retención y Archivado**

|                      |                                       |                                               |                                             |
|----------------------|---------------------------------------|-----------------------------------------------|---------------------------------------------|
| **Tipo de Log**      | **Retención en BD**                   | **Archivado en S3**                           | **Eliminación definitiva**                  |
| audit_logs           | 5 años en particiones anuales         | S3 JSONL comprimido al cumplir 2 años         | Nunca — requisito legal de auditoría fiscal |
| login_attempts       | 90 días en partición mensual          | No archivado — datos de seguridad perecederos | Eliminado al cumplir 90 días                |
| api_key_logs         | 60 días                               | No archivado                                  | Eliminado al cumplir 60 días                |
| activity_logs (HTTP) | 90 días                               | S3 al cumplir 90 días — útil para debugging   | Eliminado de BD; S3 por 1 año adicional     |
| agent_reports (full) | 1 año — máximo 1 full por día por PC  | S3 al cumplir 1 año                           | Eliminado de BD; S3 por 2 años              |
| agent_reports (diff) | 90 días — solo registros de solo-diff | No archivados                                 | Eliminados al cumplir 90 días               |
| notifications        | 30 días leídas / 6 meses no leídas    | No archivadas                                 | Eliminadas automáticamente por scheduler    |

> **9. SEGURIDAD — OWASP TOP 10 + HARDENING COMPLETO**
>
> ⛔ La seguridad es el punto más crítico del sistema anterior (6.5/10). Esta sección cubre cada vector de ataque relevante para un sistema ERP con activos físicos de valor.
>
> **9.1 Mitigación OWASP Top 10 — Implementación**

|                                 |                                                 |                                                                                                                                          |
|---------------------------------|-------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|
| **OWASP**                       | **Riesgo**                                      | **Mitigación implementada**                                                                                                              |
| A01 — Broken Access Control     | Un técnico accede a activos de otro zonal       | ZonalScope middleware aplica filtro de zonal en TODAS las queries. Tests de arquitectura verifican que ningún controller omita el scope. |
| A02 — Cryptographic Failures    | Token de agente o clave de licencia expuesta    | Tokens de agente hasheados con bcrypt en BD. Claves de licencia cifradas con AES-256-GCM (Laravel Crypt). TLS 1.3 obligatorio.           |
| A03 — Injection                 | SQL injection en filtros de búsqueda            | Eloquent + Query Builder con bindings. Zero SQL concatenado. Pest Architecture tests prohíben DB::statement() con variables.             |
| A04 — Insecure Design           | IDOR: acceder a /assets/{uuid} de otro zonal    | UUIDs no enumerables + Policy::view() verifica zonal. Rate limit en endpoints de búsqueda por serial.                                    |
| A05 — Security Misconfiguration | Headers HTTP permisivos, debug en producción    | SecurityHeadersMiddleware: CSP, HSTS, X-Frame-Options, X-Content-Type-Options. APP_DEBUG=false verificado en deployment.                 |
| A07 — Auth Failures             | Brute force al login                            | Rate limit: 5 intentos por IP en 10 min → bloqueo 15 min. Todos los intentos registrados en login_attempts. 2FA disponible.              |
| A09 — Logging Failures          | Logs sin información útil para detectar ataques | Audit logs con request_id, IP, user agent. Alertas automáticas en \>5 intentos fallidos por IP. Logs en S3 para forense.                 |

> **9.2 Security Headers Middleware**
>
> // app/Http/Middleware/SecurityHeadersMiddleware.php
>
> class SecurityHeadersMiddleware {
>
> public function handle(Request \$request, Closure \$next): Response {
>
> \$response = \$next(\$request);
>
> \$response-\>headers-\>set('X-Frame-Options', 'DENY');
>
> \$response-\>headers-\>set('X-Content-Type-Options', 'nosniff');
>
> \$response-\>headers-\>set('X-XSS-Protection', '1; mode=block');
>
> \$response-\>headers-\>set('Referrer-Policy', 'strict-origin-when-cross-origin');
>
> \$response-\>headers-\>set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
>
> // HSTS: 1 año, incluir subdominios
>
> \$response-\>headers-\>set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
>
> // CSP estricto para Inertia + React
>
> \$nonce = base64_encode(random_bytes(16));
>
> \$csp = "default-src 'self'; script-src 'self' 'nonce-{\$nonce}'; "
>
> . "style-src 'self' 'nonce-{\$nonce}'; img-src 'self' data: blob:; "
>
> . "connect-src 'self'; font-src 'self'; frame-ancestors 'none'";
>
> \$response-\>headers-\>set('Content-Security-Policy', \$csp);
>
> return \$response;
>
> }
>
> }
>
> **9.3 Protección contra Brute Force**
>
> // app/Http/Controllers/Auth/LoginController.php
>
> public function login(LoginRequest \$request): Response {
>
> // Log del intento (éxito o fallo) — siempre
>
> LoginAttempt::create(\[
>
> 'email' =\> \$request-\>email,
>
> 'ip_address' =\> \$request-\>ip(),
>
> 'user_agent' =\> \$request-\>userAgent(),
>
> 'success' =\> false, // actualizar si tiene éxito
>
> 'failure_reason' =\> null,
>
> \]);
>
> // Rate limit: 5 intentos por IP en 10 minutos
>
> \$attempts = LoginAttempt::where('ip_address', \$request-\>ip())
>
> -\>where('success', false)
>
> -\>where('created_at', '\>=', now()-\>subMinutes(10))
>
> -\>count();
>
> if (\$attempts \>= 5) {
>
> event(new SuspiciousLoginActivity(\$request-\>ip(), \$attempts));
>
> throw new TooManyLoginAttemptsException();
>
> }
>
> }
>
> **10. ÍNDICES, SOFT DELETES Y UUIDS — GUÍA DEFINITIVA**
>
> **10.1 UUID v4 vs UUID v7 — Cuándo usar cada uno**

|                        |                                                                                                                                |                                                                                                                                    |
|------------------------|--------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
| **Tipo**               | **Cuándo usar**                                                                                                                | **Ventaja**                                                                                                                        |
| UUID v4 (aleatorio)    | Entidades expuestas en URLs de API: assets, components, users, transfers. Todo lo que un usuario ve en la barra del navegador. | No enumerable: imposible predecir el siguiente UUID. Previene IDOR.                                                                |
| UUID v7 (time-ordered) | Tablas de alta escritura con millones de filas: audit_logs, agent_reports, login_attempts, api_key_logs.                       | Secuencial en el tiempo: inserciones siempre al final del índice B-tree. Menos fragmentación, mejor performance en INSERT masivos. |
| BigInt autoincrement   | Tablas de relación internas que nunca se exponen en la API: computer_components, transfer_items, stock_entry_items.            | Máxima eficiencia en JOINs internos. Sin overhead de UUID en tablas que no necesitan seguridad en el ID.                           |

> **10.2 Índices Completos del Sistema**
>
> -- ═══════ assets ════════════════════════════════════════════
>
> CREATE INDEX idx_assets_zonal_status ON assets(zonal_id,status) WHERE deleted_at IS NULL;
>
> CREATE INDEX idx_assets_warranty ON assets(warranty_until) WHERE warranty_until IS NOT NULL AND deleted_at IS NULL;
>
> CREATE INDEX idx_assets_serial ON assets(serial_number) WHERE serial_number IS NOT NULL;
>
> CREATE INDEX idx_assets_warehouse ON assets(warehouse_id) WHERE warehouse_id IS NOT NULL AND deleted_at IS NULL;
>
> CREATE INDEX idx_assets_specs_gin ON assets USING GIN(specs);
>
> CREATE INDEX idx_assets_fts ON assets USING GIN(to_tsvector('spanish',
>
> coalesce(code,'') \|\| ' ' \|\| coalesce(serial_number,'')));
>
> -- ═══════ components ════════════════════════════════════════
>
> CREATE INDEX idx_comp_zonal_status ON components(zonal_id,status,type_id) WHERE deleted_at IS NULL;
>
> CREATE INDEX idx_comp_warehouse ON components(warehouse_id) WHERE warehouse_id IS NOT NULL;
>
> -- ═══════ asset_transfers ════════════════════════════════════
>
> CREATE INDEX idx_transfers_pending ON asset_transfers(status,created_at)
>
> WHERE status IN ('pending_approval','in_transit');
>
> -- ═══════ audit_logs (aplicar en cada partición) ════════════
>
> CREATE INDEX idx_audit_model ON audit_logs(model_type,model_id,created_at DESC);
>
> CREATE INDEX idx_audit_user ON audit_logs(user_id,created_at DESC);
>
> -- ═══════ software_licenses ══════════════════════════════════
>
> CREATE INDEX idx_lic_expiring ON software_licenses(valid_until)
>
> WHERE valid_until IS NOT NULL AND valid_until \> CURRENT_DATE;
>
> -- ═══════ preventive_tasks ═══════════════════════════════════
>
> CREATE INDEX idx_prev_tasks_due ON preventive_tasks(scheduled_date,status)
>
> WHERE status IN ('scheduled','overdue');
>
> -- ═══════ login_attempts ════════════════════════════════════
>
> CREATE INDEX idx_login_ip ON login_attempts(ip_address,created_at DESC);
>
> CREATE INDEX idx_login_brute ON login_attempts(ip_address,success,created_at DESC)
>
> WHERE success = FALSE;
>
> **11. CONSULTAS COMPLEJAS Y REPORTES**
>
> **11.1 Vista Materializada — Dashboard KPIs**
>
> CREATE MATERIALIZED VIEW mv_inventory_kpi AS
>
> SELECT z.name AS zonal, ac.name AS category, a.status,
>
> COUNT(\*) AS total, SUM(a.acquisition_value) AS acquisition_value,
>
> SUM(a.current_value) AS current_value,
>
> SUM(a.acquisition_value - COALESCE(a.current_value,a.acquisition_value)) AS depreciation
>
> FROM assets a
>
> JOIN zonals z ON z.id=a.zonal_id
>
> JOIN asset_models am ON am.id=a.model_id
>
> JOIN asset_categories ac ON ac.id=am.category_id
>
> WHERE a.deleted_at IS NULL GROUP BY z.name,ac.name,a.status;
>
> REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inventory_kpi; -- cada 10min
>
> **11.2 Reporte de Depreciación con Aceleración por Daño**
>
> SELECT a.code, a.serial_number, am.name AS model, z.name AS zonal,
>
> a.acquisition_value, a.current_value, a.condition,
>
> CASE a.condition
>
> WHEN 'damaged' THEN a.current_value \* 0.50 -- depreciación acelerada 50%
>
> WHEN 'obsolete' THEN 0
>
> ELSE a.current_value
>
> END AS adjusted_value,
>
> ROUND((1-a.current_value/NULLIF(a.acquisition_value,0))\*100,2) AS pct_depreciated,
>
> ds.useful_life_years,
>
> DATE_PART('year',AGE(NOW(),a.created_at)) AS years_in_use
>
> FROM assets a
>
> JOIN asset_models am ON am.id=a.model_id
>
> JOIN asset_categories ac ON ac.id=am.category_id
>
> LEFT JOIN depreciation_schedules ds ON ds.category_id=ac.id
>
> JOIN zonals z ON z.id=a.zonal_id
>
> WHERE a.deleted_at IS NULL AND a.status NOT IN ('disposed','sold')
>
> ORDER BY pct_depreciated DESC;
>
> **11.3 Reporte de Cumplimiento de Licencias**
>
> SELECT sp.name AS software, sv.name AS vendor,
>
> SUM(sl.seats_total) AS licensed, SUM(sl.seats_used) AS assigned,
>
> COUNT(si.id) AS detected_installs,
>
> COUNT(si.id) - SUM(sl.seats_total) AS gap, -- positivo = violación
>
> CASE WHEN COUNT(si.id) \> SUM(sl.seats_total) THEN 'VIOLACIÓN' ELSE 'OK' END AS status,
>
> MIN(sl.valid_until) AS next_expiry
>
> FROM software_products sp
>
> JOIN software_vendors sv ON sv.id=sp.vendor_id
>
> LEFT JOIN software_licenses sl ON sl.product_id=sp.id
>
> LEFT JOIN software_installations si ON si.product_id=sp.id AND si.is_authorized=FALSE
>
> WHERE sp.is_tracked=TRUE
>
> GROUP BY sp.name,sv.name
>
> ORDER BY gap DESC;
>
> **11.4 Reporte de PCs Silenciosas (Posibles Pérdidas)**
>
> SELECT a.code, a.serial_number, am.name AS model, z.name AS zonal,
>
> ac2.hostname, ac2.last_seen_at,
>
> ROUND(EXTRACT(EPOCH FROM (NOW()-ac2.last_seen_at))/3600,1) AS hours_silent,
>
> u.name AS assigned_to, u.email AS user_email
>
> FROM assets a
>
> JOIN asset_computers ac2 ON ac2.asset_id=a.id
>
> JOIN asset_models am ON am.id=a.model_id
>
> JOIN zonals z ON z.id=a.zonal_id
>
> LEFT JOIN asset_assignments aa ON aa.asset_id=a.id AND aa.returned_at IS NULL
>
> LEFT JOIN users u ON u.id=aa.user_id
>
> WHERE a.status='active' AND a.deleted_at IS NULL
>
> AND ac2.last_seen_at \< NOW() - INTERVAL '48 hours'
>
> ORDER BY hours_silent DESC;
>
> **12. MÓDULO DE DEPRECIACIÓN CONTABLE**
>
> **12.1 Métodos Soportados + Depreciación Acelerada por Daño**

|                                   |                                                                                           |                                                                              |
|-----------------------------------|-------------------------------------------------------------------------------------------|------------------------------------------------------------------------------|
| **Método**                        | **Fórmula**                                                                               | **Aplicación**                                                               |
| Línea Recta                       | (Costo - Residual) / Vida útil                                                            | Computadoras de escritorio, monitores, impresoras                            |
| Doble Saldo Decreciente           | Valor libro × (2 / Vida útil)                                                             | Laptops, equipos de alta obsolescencia tecnológica                           |
| Suma de Dígitos                   | (Años restantes / Suma dígitos) × (Costo - Residual)                                      | Switches, routers con vida útil irregular                                    |
| Depreciación acelerada por daño ★ | current_value × 0.50 si condition='damaged', 0 si condition='obsolete'                    | Ajuste automático cuando el agente o técnico reporta daño físico             |
| Baja anticipada por venta         | El valor de venta se registra como ingreso; el valor libro restante como pérdida contable | Al ejecutar asset_sales, el sistema genera el asiento contable de referencia |

> **12.2 Flujo de Aprobación del Reporte Mensual**

|          |                    |                                                                                      |               |
|----------|--------------------|--------------------------------------------------------------------------------------|---------------|
| **Paso** | **Actor**          | **Acción**                                                                           | **Estado**    |
| 1        | Sistema (Job)      | Calcula depreciation_entries para todos los activos activos el día 1 de cada mes     | draft         |
| 2        | Contador / Jefe TI | Revisa el reporte en la UI: tabla de activos con valor anterior, monto y valor nuevo | draft         |
| 3        | Contador           | Aprueba el reporte. El sistema actualiza current_value en todos los assets           | approved      |
| 4        | Sistema            | Genera exportación Excel del reporte para contabilidad externa                       | exported      |
| 5        | Sistema            | Registra en audit_log: quién aprobó, cuándo, total depreciado en el período          | Auditoría: OK |

> **13. MÓDULO DE LICENCIAS DE SOFTWARE**
>
> **13.1 Tipos de Licencia Soportados**

|                  |                                                         |                                                                         |
|------------------|---------------------------------------------------------|-------------------------------------------------------------------------|
| **Tipo**         | **Descripción**                                         | **Comportamiento al dar de baja**                                       |
| OEM              | Ligada al hardware original (viene instalada con la PC) | Se da de baja junto con el activo. No transferible.                     |
| Retail           | Licencia individual transferible                        | Al dar de baja el activo: libera 1 seat, puede asignarse a otro equipo. |
| Volume MAK / KMS | N activaciones de volumen para la empresa               | Libera 1 seat al desasignar. MAK: tiene límite de activaciones total.   |
| Subscription     | SaaS o suscripción anual (Office 365, Adobe CC)         | Libera 1 seat. Alerta automática al vencer.                             |

> **13.2 LicenseService — Detección y Auditoría**
>
> // app/Services/LicenseService.php
>
> public function auditInstallations(Asset \$asset, array \$detected): void {
>
> foreach (\$detected as \$sw) {
>
> \$product = SoftwareProduct::where('is_tracked', true)
>
> -\>where('name', 'like', "%{\$sw\['name'\]}%")-\>first();
>
> if (!\$product) continue;
>
> \$hasLicense = LicenseAssignment::where('asset_id', \$asset-\>id)
>
> -\>whereHas('license', fn(\$q) =\> \$q-\>where('product_id', \$product-\>id)
>
> -\>where(fn(\$q) =\> \$q-\>whereNull('valid_until')-\>orWhere('valid_until','\>=',today())))
>
> -\>whereNull('revoked_at')-\>exists();
>
> SoftwareInstallation::updateOrCreate(
>
> \['asset_id' =\> \$asset-\>id, 'product_id' =\> \$product-\>id\],
>
> \['version' =\> \$sw\['version'\], 'detected_at' =\> now(), 'is_authorized' =\> \$hasLicense\]
>
> );
>
> if (!\$hasLicense) event(new LicenseViolationDetected(\$asset, \$product));
>
> }
>
> }
>
> **14. MÓDULO DE MANTENIMIENTO PREVENTIVO**
>
> **14.1 Ciclo de Vida de una Tarea Preventiva**
>
> Administrador crea Plan ──────────────────────────────────────────►
>
> Plan: 'Rev. semestral PCs Lima', categoría=PC, frecuencia=biannual
>
> Checklist: \[{step:'Limpiar ventiladores',req:true},{step:'Test RAM',req:true}\]
>
> Job semanal GeneratePreventiveTasksJob ───────────────────────────►
>
> Para cada asset activo de categoría=PC en Lima:
>
> Si no hay tarea programada en los próximos 15 días: crear preventive_task
>
> scheduled_date = last_completed_date + 180 días (o hoy si es primera vez)
>
> Técnico ejecuta tarea ─────────────────────────────────────────── ►
>
> Marca cada ítem del checklist (check/uncheck)
>
> Registra hallazgos: 'Ventilador bloqueado con polvo acumulado'
>
> Si hay falla: \[crear repair_ticket\] automáticamente
>
> Registra costo: S/ 50 (mano de obra + materiales)
>
> Sistema cierra la tarea ──────────────────────────────────────────►
>
> status = 'completed', completed_date = NOW()
>
> next_due_date = completed_date + 180 días
>
> Registra en audit_log y notifica al Jefe TI
>
> **14.2 KPIs del Módulo de Mantenimiento**

|                                   |                                                               |                                                                |
|-----------------------------------|---------------------------------------------------------------|----------------------------------------------------------------|
| **KPI**                           | **Cálculo**                                                   | **Uso**                                                        |
| MTBF (Mean Time Between Failures) | (uptime_total) / número de repair_tickets                     | Identifica activos con alta tasa de fallas — candidatos a baja |
| MTTR (Mean Time To Repair)        | AVG(repair_tickets.completed_at - repair_tickets.created_at)  | Mide eficiencia del equipo técnico                             |
| Cobertura preventiva              | (tasks_completed / tasks_scheduled) × 100 por mes             | Cumplimiento del programa de mantenimiento                     |
| Costo de mantenimiento por activo | SUM(repair_costs.amount + preventive_tasks.cost) por asset_id | Identifica activos con alto costo total de propiedad (TCO)     |
| Efectividad preventiva            | 1 - (repair_tickets después del preventivo / total tickets)   | ¿El mantenimiento preventivo reduce las fallas correctivas?    |

> **15. DISASTER RECOVERY, BACKUP Y ESCALABILIDAD**
>
> **15.1 Estrategia de Backup**

|                                        |                                      |                                                     |                                                                |                |
|----------------------------------------|--------------------------------------|-----------------------------------------------------|----------------------------------------------------------------|----------------|
| **Tipo**                               | **Frecuencia**                       | **Destino**                                         | **Verificación**                                               | **RPO**        |
| Backup completo PostgreSQL (pg_dump)   | Diario 02:00                         | S3 cifrado con AES-256 (bucket privado, versionado) | BackupVerifyJob restaura en BD de prueba y verifica row counts | 24 horas       |
| WAL Archiving (Point-in-Time Recovery) | Continuo — cada segmento WAL (~16MB) | S3 cifrado en región diferente                      | Verificación semanal de PITR completo                          | Minutos (PITR) |
| Backup de Redis                        | Cada 4 horas (RDB snapshot)          | S3 cifrado                                          | Verificación de tamaño y checksum                              | 4 horas        |
| Backup de S3/MinIO (archivos)          | Semanal — sync incremental           | S3 cross-region replication                         | Verificación de integridad por hash                            | 7 días         |
| Código fuente                          | Cada push (Git)                      | GitHub/GitLab con MFA obligatorio                   | CI/CD pipeline verifica build y tests                          | Inmediato      |

> **15.2 Plan de Disaster Recovery**

|                                   |                  |                                                                                                                                                                      |
|-----------------------------------|------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Escenario**                     | **RTO objetivo** | **Procedimiento**                                                                                                                                                    |
| Fallo del servidor de aplicación  | 15 minutos       | Levantar nueva instancia desde AMI/imagen Docker. El servidor es stateless (sesiones en Redis, archivos en S3). Health check de LB detecta la caída automáticamente. |
| Corrupción de datos en PostgreSQL | 1-4 horas        | Restaurar desde WAL Archiving (PITR) al punto anterior a la corrupción. La réplica de lectura permite continuar operando en modo lectura durante la restauración.    |
| Pérdida total del data center     | 4-8 horas        | Restaurar BD desde S3 cross-region. Levantar entorno completo en región alternativa. DNS failover.                                                                   |
| Ransomware / Datos cifrados       | 2-12 horas       | Restaurar desde backup en S3 (el bucket tiene versionado + MFA delete habilitado, inmune a ransomware que usa las credenciales de la app).                           |

> **15.3 Estrategias de Escalabilidad — Completo**

|          |                                                   |                                     |                                                           |
|----------|---------------------------------------------------|-------------------------------------|-----------------------------------------------------------|
| **Capa** | **Estrategia**                                    | **Herramienta**                     | **Ganancia**                                              |
| BD       | Particionamiento audit_logs/agent_reports por año | PostgreSQL RANGE partitioning       | Queries de auditoría 10x más rápidos                      |
| BD       | Vistas materializadas para KPIs                   | MATERIALIZED VIEW CONCURRENTLY      | Dashboard en \<100ms                                      |
| BD       | Réplica de lectura para reportes                  | PostgreSQL streaming replication    | OLTP no degradado por queries analíticos                  |
| BD       | Connection pooling                                | PgBouncer transaction mode          | 500+ conexiones desde un servidor PG                      |
| BD       | UUID v7 en tablas de eventos                      | pg_uuidv7 extension                 | Menos fragmentación B-tree en insert masivo               |
| Backend  | Caché de catálogos                                | Redis Cache::remember() TTL 1h      | Sin queries repetitivos en catálogos estáticos            |
| Backend  | Jobs asíncronos                                   | Laravel Horizon + Redis             | PDF, alertas, depreciación: sin bloquear HTTP             |
| Backend  | Cursor pagination                                 | cursorPaginate() Laravel            | OFFSET 50,000 es O(n); cursor es O(log n)                 |
| Backend  | Strict Mode + Prevent N+1                         | Eloquent::preventLazyLoading()      | Detectar N+1 en staging antes de producción               |
| Frontend | Virtualización de tablas                          | @tanstack/react-virtual             | 50,000 filas sin degradar el render                       |
| Frontend | Code splitting por página                         | React.lazy + Vite                   | Bundle inicial \<150KB; módulos on-demand                 |
| Frontend | React Compiler                                    | auto-memoización                    | Elimina re-renders innecesarios sin useMemo               |
| Infra    | Auto-scaling                                      | Kubernetes HPA o EC2 ASG            | Escala ante picos de reportes de agentes                  |
| Infra    | CDN para assets                                   | Cloudflare / CloudFront             | JS/CSS desde el edge, latencia mínima                     |
| Infra    | Observabilidad completa                           | Laravel Pulse + Sentry + Prometheus | Detectar problemas antes de que los usuarios los reporten |

> **15.4 PostgreSQL — Configuración de Producción**
>
> \# postgresql.conf — Servidor dedicado 16GB RAM, 8 vCPUs
>
> shared_buffers = 4GB \# 25% RAM
>
> effective_cache_size = 12GB \# 75% RAM
>
> work_mem = 64MB \# por operación sort/hash
>
> maintenance_work_mem = 1GB \# para VACUUM, CREATE INDEX
>
> max_connections = 100 \# con PgBouncer delante
>
> max_worker_processes = 8 \# parallelismo = vCPUs
>
> max_parallel_workers_per_gather = 4
>
> wal_buffers = 64MB
>
> checkpoint_completion_target = 0.9
>
> default_statistics_target = 200 \# mejor query planning
>
> log_min_duration_statement = 500 \# loggear queries \>500ms
>
> auto_explain.log_min_duration = 1000 \# EXPLAIN automático \>1s
>
> archive_mode = on \# WAL archiving para PITR
>
> archive_command = 'aws s3 cp %p s3://backup-wal/%f'
>
> **15.5 Checklist de Producción — Pre-Deploy**

1.  Ejecutar EXPLAIN ANALYZE en los 10 queries más frecuentes del sistema. Verificar que todos usen índices.

2.  Activar Eloquent::preventLazyLoading() en staging. Corregir TODOS los N+1 detectados antes de desplegar.

3.  Verificar que APP_DEBUG=false y APP_ENV=production en el servidor.

4.  Confirmar que SecurityHeadersMiddleware está activo en todas las rutas web.

5.  Probar el plan de DR: restaurar backup de ayer en BD de prueba y verificar integridad.

6.  Probar con k6: simular 500 agentes reportando simultáneamente. Verificar que la cola procesa sin saturar la BD.

7.  Verificar que las alertas de Horizon estén configuradas: failed jobs, queue size \> 1000, workers caídos.

8.  Confirmar que los certificados TLS de HTTPS y del agente (cert pinning) están vigentes y con renovación automática.

9.  Ejecutar Pest Architecture Tests: verificar que no hay llamadas directas entre módulos y que todos los controllers tienen su Policy.

10. Verificar que los backups automáticos de ayer fueron exitosos en backup_logs y que el restore de verificación pasó.

**FIN DEL DOCUMENTO TÉCNICO — EDICIÓN DIOS v4.0**

Sistema ERP Gestión de Parque Informático

Laravel 12 · React 19 · Tailwind CSS 4 · PostgreSQL 16 · Redis 7

15 secciones · 52 tablas · 57 endpoints · Seguridad OWASP · DR + Backup · Agente Win+Linux
