# ERP — Todas las tablas y sus campos

═══════════════════════════════════════════════════════════════════════════  
**PROYECTO:** ERP de Gestión de Parque Informático y Logística TI  
**EMPRESA:** Telecomunicaciones Corporativa — Multi-zonal — Perú  
**VERSIÓN DEL PROMPT:** Dios v4.0  
═══════════════════════════════════════════════════════════════════════════  

- **Stack:** Laravel 12, Inertia.js 2, React 19, Tailwind CSS 4, PostgreSQL 16, Redis 7, Horizon, Sanctum + Jetstream (2FA), Spatie Laravel Permission.
- **IDs:** UUID v4 en entidades expuestas en API; UUID v7 en tablas de alta escritura (audit_logs, agent_reports).
- **Ubicación:** FK explícitas `warehouse_id`, `office_id`, `repair_shop_id` (nullable) + `location_type`; CHECK en BD para una sola FK activa.
- **Soft deletes** en: assets, components, users, zonals, suppliers, asset_models, repair_tickets, asset_disposals. No en tablas históricas (asset_assignments, computer_components, audit_logs, agent_reports).
- **Particionamiento:** audit_logs, agent_reports, login_attempts, api_key_logs → PARTITION BY RANGE(created_at) anual.

Documento generado a partir de: **ERP_Resumen_Tablas_BD.md**, **ERP_Parque_Informatico_DIOS_v4.md**.  
**Total: 54 tablas** (categorías SUNAT unificadas en asset_categories; subcategorías TI en asset_subcategories; activos tecnológicos y no tecnológicos unificados en **assets**; **plan de cuentas en gl_accounts** con FK en categorías).

---

## Tema contable (PCGE) y categorías de activo fijo

**Solución adoptada:** Tabla de cuentas contables **`gl_accounts`** (plan de cuentas PCGE registrable) y en **`asset_categories`** una FK **`gl_account_id`** → gl_accounts(id). Así la categoría no guarda un código suelto sino una referencia a una cuenta del catálogo: se valida en BD, se reutiliza en otros módulos y se alinea con el PCGE (catálogo oficial obligatorio en Perú, Consejo Normativo de Contabilidad / MEF; SUNAT lo usa a efectos tributarios).

**Plan Contable General Empresarial (PCGE):** El activo fijo se clasifica en la cuenta **33 – Inmuebles, maquinaria y equipo**. Subcuentas típicas (se cargan en `gl_accounts`):

| Código | Descripción |
|--------|-------------|
| 331 | Terrenos |
| 332 | Edificaciones |
| 333 | Maquinarias y equipos de explotación |
| 334 | Unidades de transporte |
| 335 | Muebles y enseres (3351 Muebles, 3352 Enseres) |
| 336 | Equipos diversos (**3361** = Equipo para procesamiento de información: PCs, laptops, impresoras) |

La depreciación acumulada va en la **cuenta 39**. En `asset_categories` existe además **`gl_depreciation_account_id`** (FK → gl_accounts) opcional para parametrizar la cuenta de depreciación por categoría.

---

## 1. Organización — 9 tablas

### zonals
Zonales (Lima, Chiclayo, Arequipa, Trujillo).

| Campo         | Tipo         | Nulo | Default        | Notas                          |
|---------------|--------------|------|----------------|--------------------------------|
| id            | UUID         | NO   | gen_random_uuid() | PK                             |
| name          | VARCHAR(100) | NO   | —              |                                |
| code          | VARCHAR(20)  | NO   | —              | UNIQUE                         |
| region        | VARCHAR(100) | SÍ   | —              |                                |
| manager_id    | UUID         | SÍ   | —              | FK → users(id) ON DELETE SET NULL |
| timezone      | VARCHAR(60)  | SÍ   | 'America/Lima' |                                |
| is_active     | BOOLEAN      | SÍ   | TRUE           |                                |
| created_at    | TIMESTAMPTZ  | SÍ   | NOW()          |                                |
| updated_at    | TIMESTAMPTZ  | SÍ   | NOW()          |                                |
| deleted_at    | TIMESTAMPTZ  | SÍ   | NULL           |                                |

--- 

### offices
Sedes y oficinas por zonal.

| Campo      | Tipo          | Nulo | Default | Notas        |
|------------|---------------|------|---------|--------------|
| id         | UUID          | NO   | gen_random_uuid() | PK     |
| zonal_id   | UUID          | NO   | —       | FK → zonals(id) |
| name       | VARCHAR(150)  | NO   | —       |              |
| code       | VARCHAR(30)   | SÍ   | —       |              |
| address    | TEXT          | SÍ   | —       |              |
| is_active  | BOOLEAN       | SÍ   | TRUE    |              | 
| created_at | TIMESTAMPTZ   | SÍ   | NOW()   |              |
| updated_at | TIMESTAMPTZ   | SÍ   | NOW()   |              |
| deleted_at | TIMESTAMPTZ   | SÍ   | NULL    |              |

---

### warehouses
Almacenes con capacidad y gestor.

| Campo      | Tipo          | Nulo | Default | Notas              |
|------------|---------------|------|---------|--------------------|
| id         | UUID          | NO   | gen_random_uuid() | PK         |
| office_id   | UUID          | NO   | —       | FK → offices(id)    |
| name       | VARCHAR(150)  | NO   | —       |                    |
| code       | VARCHAR(30)   | SÍ   | —       |                    |
| capacity   | INTEGER       | SÍ   | —       |                    |
| manager_id | UUID          | SÍ   | —       | FK → users(id)     |
| is_active  | BOOLEAN       | SÍ   | TRUE    |                    |
| created_at | TIMESTAMPTZ   | SÍ   | NOW()   |                    |
| updated_at | TIMESTAMPTZ   | SÍ   | NOW()   |                    |
| deleted_at | TIMESTAMPTZ   | SÍ   | NULL    |                    |

---

### warehouse_locations
Ubicaciones físicas (estante, fila, columna).

| Campo        | Tipo         | Nulo | Default | Notas            |
|--------------|--------------|------|---------|------------------|
| id           | UUID         | NO   | gen_random_uuid() | PK       |
| warehouse_id | UUID         | NO   | —       | FK → warehouses(id) |
| code         | VARCHAR(60)  | NO   | —       |                  |
| aisle        | VARCHAR(30)  | SÍ   | —       |                  |
| row          | VARCHAR(30)  | SÍ   | —       |                  |
| bin          | VARCHAR(30)  | SÍ   | —       |                  |
| is_active    | BOOLEAN      | SÍ   | TRUE    |                  |
| created_at   | TIMESTAMPTZ  | SÍ   | NOW()   |                  |
| updated_at   | TIMESTAMPTZ  | SÍ   | NOW()   |                  |

---

### repair_shops
Talleres externos (contacto, RUC).

| Campo      | Tipo          | Nulo | Default | Notas              |
|------------|---------------|------|---------|--------------------|
| id         | UUID          | NO   | gen_random_uuid() | PK         |
| name       | VARCHAR(200)  | NO   | —       |                    |
| ruc        | VARCHAR(20)   | SÍ   | —       |                    |
| contact_name | VARCHAR(150) | SÍ   | —       |                    |
| phone      | VARCHAR(30)   | SÍ   | —       |                    |
| address    | TEXT          | SÍ   | —       |                    |
| zonal_id   | UUID          | SÍ   | —       | FK → zonals(id)    |
| is_active  | BOOLEAN       | SÍ   | TRUE    |                    |
| created_at | TIMESTAMPTZ   | SÍ   | NOW()   |                    |
| updated_at | TIMESTAMPTZ   | SÍ   | NOW()   |                    |
| deleted_at | TIMESTAMPTZ   | SÍ   | NULL    |                    |

---

### departments
Departamentos/áreas con jerarquía por zonal.

| Campo      | Tipo          | Nulo | Default | Notas                |
|------------|---------------|------|---------|----------------------|
| id         | UUID          | NO   | gen_random_uuid() | PK           |
| zonal_id   | UUID          | NO   | —       | FK → zonals(id)      |
| name       | VARCHAR(150)  | NO   | —       |                      |
| code       | VARCHAR(30)   | SÍ   | —       |                      |
| parent_id  | UUID          | SÍ   | —       | FK → departments(id) |
| is_active  | BOOLEAN       | SÍ   | TRUE    |                      |
| created_at | TIMESTAMPTZ   | SÍ   | NOW()   |                      |
| updated_at | TIMESTAMPTZ   | SÍ   | NOW()   |                      |
| deleted_at | TIMESTAMPTZ   | SÍ   | NULL    |                      |

---

### users
Usuarios del sistema (2FA, Jetstream + Spatie).

| Campo                        | Tipo          | Nulo | Default | Notas     |
|------------------------------|---------------|------|---------|-----------|
| id                           | UUID          | NO   | gen_random_uuid() | PK  |
| name                         | VARCHAR(255)  | NO   | —       |           |
| email                        | VARCHAR(255)  | NO   | —       | UNIQUE     |
| email_verified_at            | TIMESTAMPTZ   | SÍ   | —       |           |
| password                     | VARCHAR(255)  | NO   | —       |           |
| two_factor_secret            | TEXT          | SÍ   | —       |           |
| two_factor_recovery_codes    | TEXT          | SÍ   | —       |           |
| two_factor_confirmed_at      | TIMESTAMPTZ   | SÍ   | —       |           |
| remember_token               | VARCHAR(100) | SÍ   | —       |           |
| current_team_id              | BIGINT        | SÍ   | —       |           |
| profile_photo_path            | VARCHAR(2048) | SÍ   | —       |           |
| created_at                   | TIMESTAMPTZ   | SÍ   | NOW()   |           |
| updated_at                   | TIMESTAMPTZ   | SÍ   | NOW()   |           |
| deleted_at                   | TIMESTAMPTZ   | SÍ   | NULL    |           |

---

### roles
Roles (Spatie laravel-permission).

| Campo      | Tipo          | Nulo | Default | Notas   |
|------------|---------------|------|---------|---------|
| id         | BIGINT        | NO   | serial  | PK      |
| name       | VARCHAR(255)  | NO   | —       |         |
| guard_name | VARCHAR(255)  | NO   | —       |         |
| created_at | TIMESTAMPTZ   | SÍ   | —       |         |
| updated_at | TIMESTAMPTZ   | SÍ   | —       |         |

---

### permissions
Permisos granulares (Spatie).

| Campo      | Tipo          | Nulo | Default | Notas   |
|------------|---------------|------|---------|---------|
| id         | BIGINT        | NO   | serial  | PK      |
| name       | VARCHAR(255)  | NO   | —       |         |
| guard_name | VARCHAR(255)  | NO   | —       |         |
| created_at | TIMESTAMPTZ   | SÍ   | —       |         |
| updated_at | TIMESTAMPTZ   | SÍ   | —       |         |

---

## 2. Catálogo — 6 tablas

**Categorías alineadas a SUNAT:** Una sola tabla de “tipo tributario” (`asset_categories`). La subclasificación operativa TI vive en `asset_subcategories`. La **cuenta contable** es una FK a **`gl_accounts`** (plan de cuentas PCGE). Ver sección **Tema contable** al inicio.

### gl_accounts
Plan de cuentas (PCGE). Catálogo de cuentas contables registrable; categorías y otros módulos referencian por FK.

| Campo            | Tipo          | Nulo | Default | Notas                                          |
|------------------|---------------|------|---------|------------------------------------------------|
| id               | UUID          | NO   | gen_random_uuid() | PK                                   |
| code             | VARCHAR(20)   | NO   | —       | UNIQUE (ej. 3361, 334, 332, 3921)              |
| name             | VARCHAR(200)  | NO   | —       | Nombre de la cuenta                            |
| account_type     | VARCHAR(30)   | SÍ   | —       | asset, depreciation, expense, income, etc.     |
| parent_id        | UUID          | SÍ   | —       | FK → gl_accounts(id) (cuenta padre; jerarquía PCGE) |
| is_active        | BOOLEAN       | SÍ   | TRUE    |                                                |
| created_at       | TIMESTAMPTZ   | SÍ   | NOW()   |                                                |
| updated_at       | TIMESTAMPTZ   | SÍ   | NOW()   |                                                |

---

### asset_categories
Categorías tributarias SUNAT (equipos de cómputo, vehículos, mobiliario, edificios, maquinaria, otros). Vida útil, método, tasas y **cuenta contable** vía FK a `gl_accounts`.

| Campo                         | Tipo          | Nulo | Default        | Notas                                          |
|-------------------------------|---------------|------|----------------|------------------------------------------------|
| id                            | UUID          | NO   | gen_random_uuid() | PK                                      |
| name                          | VARCHAR(150)  | NO   | —              |                                                |
| code                          | VARCHAR(30)   | NO   | —              | UNIQUE, alineable a SUNAT                       |
| type                          | VARCHAR(30)   | NO   | —              | technology, vehicle, furniture, building, machinery, other |
| gl_account_id                 | UUID          | SÍ   | —              | FK → gl_accounts(id) (cuenta del activo, ej. 33xx) |
| gl_depreciation_account_id   | UUID          | SÍ   | —              | FK → gl_accounts(id) (cuenta depreciación, ej. 39xx) |
| default_useful_life_years     | INTEGER       | SÍ   | 10             |                                                |
| default_depreciation_method   | VARCHAR(30)   | SÍ   | 'straight_line'| CHECK (straight_line, sum_of_years)             |
| default_residual_value_pct    | NUMERIC(5,2)  | SÍ   | 10.00          |                                                |
| requires_insurance            | BOOLEAN       | SÍ   | FALSE          |                                                |
| requires_soat                 | BOOLEAN       | SÍ   | FALSE          |                                                |
| icon                          | VARCHAR(50)   | SÍ   | —              |                                                |
| is_active                     | BOOLEAN       | SÍ   | TRUE           |                                                |
| created_at                    | TIMESTAMPTZ   | SÍ   | NOW()          |                                                |
| updated_at                    | TIMESTAMPTZ   | SÍ   | NOW()          |                                                |

---

### asset_subcategories
Subcategorías por categoría: tecnología (Laptop, PC, Monitor, etc.), mobiliario (Silla, Cortina, Escritorio, etc.). Cada subcategoría pertenece a una categoría (asset_category_id). Permite modelos por tipo y, en tecnología, planes preventivos por equipo.

| Campo            | Tipo         | Nulo | Default | Notas                           |
|------------------|--------------|------|---------|---------------------------------|
| id               | UUID         | NO   | gen_random_uuid() | PK                    |
| asset_category_id| UUID         | NO   | —       | FK → asset_categories(id)        |
| name             | VARCHAR(100) | NO   | —       |                                 |
| code             | VARCHAR(30)  | SÍ   | —       |                                 |
| is_active        | BOOLEAN      | SÍ   | TRUE    |                                 |
| created_at       | TIMESTAMPTZ  | SÍ   | NOW()   |                                 |
| updated_at       | TIMESTAMPTZ  | SÍ   | NOW()   |                                 |

---

### asset_brands
Marcas: HP, Dell, Cisco, Lenovo, Kingston.

| Campo      | Tipo         | Nulo | Default | Notas |
|------------|--------------|------|---------|-------|
| id         | UUID         | NO   | gen_random_uuid() | PK |
| name       | VARCHAR(100) | NO   | —       |       |
| created_at | TIMESTAMPTZ  | SÍ   | NOW()   |       |
| updated_at | TIMESTAMPTZ  | SÍ   | NOW()   |       |

---

### asset_models
Modelos por marca y subcategoría TI (specs JSON). Solo activos tecnológicos.

| Campo            | Tipo          | Nulo | Default | Notas                           |
|------------------|---------------|------|---------|---------------------------------|
| id               | UUID          | NO   | gen_random_uuid() | PK                    |
| brand_id         | UUID          | NO   | —       | FK → asset_brands(id)           |
| subcategory_id   | UUID          | NO   | —       | FK → asset_subcategories(id)    |
| name             | VARCHAR(200)  | NO   | —       |                                 |
| specs            | JSONB         | SÍ   | —       |                                 |
| is_active        | BOOLEAN       | SÍ   | TRUE    |                                 |
| created_at       | TIMESTAMPTZ   | SÍ   | NOW()   |                                 |
| updated_at       | TIMESTAMPTZ   | SÍ   | NOW()   |                                 |
| deleted_at       | TIMESTAMPTZ   | SÍ   | NULL    |                                 |

---

### component_types
Tipos: RAM, SSD, HDD, GPU, PSU, Motherboard.

| Campo      | Tipo         | Nulo | Default | Notas |
|------------|--------------|------|---------|-------|
| id         | UUID         | NO   | gen_random_uuid() | PK |
| name       | VARCHAR(100) | NO   | —       |       |
| code       | VARCHAR(30)  | SÍ   | —       |       |
| created_at | TIMESTAMPTZ  | SÍ   | NOW()   |       |
| updated_at | TIMESTAMPTZ  | SÍ   | NOW()   |       |

---

## 3. Compras — 4 tablas

### suppliers
Proveedores (RUC, contacto, condiciones).

| Campo             | Tipo          | Nulo | Default | Notas |
|-------------------|---------------|------|---------|-------|
| id                | UUID          | NO   | gen_random_uuid() | PK |
| name              | VARCHAR(200)  | NO   | —       |       |
| ruc               | VARCHAR(20)   | SÍ   | —       |       |
| contact_name      | VARCHAR(150)  | SÍ   | —       |       |
| contact_email     | VARCHAR(255)  | SÍ   | —       |       |
| contact_phone     | VARCHAR(30)   | SÍ   | —       |       |
| address           | TEXT          | SÍ   | —       |       |
| payment_conditions| TEXT          | SÍ   | —       |       |
| is_active         | BOOLEAN       | SÍ   | TRUE    |       |
| created_at        | TIMESTAMPTZ   | SÍ   | NOW()   |       |
| updated_at        | TIMESTAMPTZ   | SÍ   | NOW()   |       |
| deleted_at        | TIMESTAMPTZ   | SÍ   | NULL    |       |

---

### purchase_orders
Órdenes de compra (aprobación simple con un solo aprobador, con posibilidad de observaciones y cotizaciones en PDF).

| Campo            | Tipo           | Nulo | Default   | Notas                                                                 |
|------------------|----------------|------|-----------|-----------------------------------------------------------------------|
| id               | UUID           | NO   | gen_random_uuid() | PK                                                           |
| supplier_id      | UUID           | NO   | —         | FK → suppliers(id)                                                    |
| code             | VARCHAR(60)    | SÍ   | —         |                                                                       |
| status           | VARCHAR(30)    | NO   | 'pending' | CHECK (pending, observed, approved, rejected)                         |
| requested_by     | UUID           | SÍ   | —         | FK → users(id)                                                        |
| approved_by      | UUID           | SÍ   | —         | FK → users(id) (único aprobador)                                      |
| approved_at      | TIMESTAMPTZ    | SÍ   | —         |                                                                       |
| rejected_by      | UUID           | SÍ   | —         | FK → users(id)                                                        |
| rejected_at      | TIMESTAMPTZ    | SÍ   | —         |                                                                       |
| observed_by      | UUID           | SÍ   | —         | FK → users(id). Quién puso la OC en estado observado.                 |
| observed_at      | TIMESTAMPTZ    | SÍ   | —         | Cuándo se observó la OC.                                              |
| observation_notes| TEXT           | SÍ   | —         | Motivo / comentarios de la observación visibles para el solicitante. |
| total_amount     | NUMERIC(14,2)  | SÍ   | —         |                                                                       |
| office_id        | UUID           | NO   | —         | FK → offices(id) (oficina de destino, no almacén)                     |
| selected_quote_id| UUID           | SÍ   | —         | FK → purchase_quotes(id). Cotización PDF elegida por la cabeza.      |
| notes            | TEXT           | SÍ   | —         | Notas generales de la OC.                                             |
| created_at       | TIMESTAMPTZ    | SÍ   | NOW()     |                                                                       |
| updated_at       | TIMESTAMPTZ    | SÍ   | NOW()     |                                                                       |

---

### purchase_items
Ítems de OC (precio, descripción; opcional asset_category_id para activo fijo / SUNAT y, si es tecnología, detalle TI vía subcategoría y marca).

| Campo                | Tipo           | Nulo | Default | Notas                                                              |
|----------------------|----------------|------|---------|--------------------------------------------------------------------|
| id                   | UUID           | NO   | gen_random_uuid() | PK                                                        |
| purchase_order_id    | UUID           | NO   | —       | FK → purchase_orders(id)                                           |
| description          | TEXT           | NO   | —       |                                                                    |
| quantity             | INTEGER        | NO   | —       |                                                                    |
| unit_price           | NUMERIC(14,2)  | SÍ   | —       |                                                                    |
| total_price          | NUMERIC(14,2)  | SÍ   | —       |                                                                    |
| asset_category_id    | UUID           | SÍ   | —       | FK → asset_categories(id) (SUNAT / M16). Si la categoría es de tecnología, se habilitan selects adicionales. |
| asset_subcategory_id | UUID           | SÍ   | —       | FK → asset_subcategories(id). Solo cuando la categoría es tecnológica (type=technology). |
| asset_brand_id       | UUID           | SÍ   | —       | FK → asset_brands(id). Opcional; lista de marcas definidas en el catálogo. |
| created_at           | TIMESTAMPTZ    | SÍ   | NOW()   |                                                                    |
| updated_at           | TIMESTAMPTZ    | SÍ   | NOW()   |                                                                    |

---

### purchase_quotes
Cotizaciones asociadas a una OC (solo PDF). La cabeza revisa estas cotizaciones y elige una.

| Campo             | Tipo           | Nulo | Default | Notas                                                           |
|-------------------|----------------|------|---------|-----------------------------------------------------------------|
| id                | UUID           | NO   | gen_random_uuid() | PK                                                     |
| purchase_order_id | UUID           | NO   | —       | FK → purchase_orders(id)                                        |
| pdf_path          | TEXT           | NO   | —       | Ruta al archivo PDF de la cotización (disco/S3, etc.).         |
| description       | TEXT           | SÍ   | —       | Breve descripción opcional (ej. “Proveedor X”, “Opción 1”).    |
| is_selected       | BOOLEAN        | SÍ   | FALSE   | TRUE si es la cotización elegida; debe haber como máximo una.  |
| created_at        | TIMESTAMPTZ    | SÍ   | NOW()   |                                                                 |
| updated_at        | TIMESTAMPTZ    | SÍ   | NOW()   |                                                                 |

---

### invoices
Facturas (número, fecha, PDF, monto).

| Campo              | Tipo           | Nulo | Default | Notas                   |
|--------------------|----------------|------|---------|-------------------------|
| id                 | UUID           | NO   | gen_random_uuid() | PK            |
| purchase_order_id  | UUID           | NO   | —       | FK → purchase_orders(id)|
| invoice_number     | VARCHAR(100)   | NO   | —       |                         |
| invoice_date       | DATE           | SÍ   | —       |                         |
| pdf_path           | TEXT           | SÍ   | —       |                         |
| amount             | NUMERIC(14,2)  | SÍ   | —       |                         |
| remission_guide    | VARCHAR(100)   | SÍ   | —       | Guía de remisión        |
| created_at         | TIMESTAMPTZ    | SÍ   | NOW()   |                         |
| updated_at         | TIMESTAMPTZ    | SÍ   | NOW()   |                         |

---

## 4. Logística — 4 tablas

**Ingreso a almacén vs carga de inventario:** Los **ingresos** (`stock_entries`) son solo para **activos nuevos** que llegan por compra (con factura/OC). Registrar lo que **ya existe** en cada almacén (carga de existencias) es un proceso distinto y se trata en el módulo de Inventario (§9).

---

### stock_entries
Ingresos al almacén (vinculados a factura). Solo para activos **nuevos** que entran por compra.

| Campo        | Tipo         | Nulo | Default | Notas                 |
|--------------|--------------|------|---------|-----------------------|
| id           | UUID         | NO   | gen_random_uuid() | PK          |
| invoice_id   | UUID         | SÍ   | —       | FK → invoices(id)     |
| warehouse_id | UUID         | NO   | —       | FK → warehouses(id)   |
| entry_date   | DATE         | NO   | —       |                       |
| status       | VARCHAR(30)  | NO   | 'draft' |                       |
| received_by  | UUID         | SÍ   | —       | FK → users(id)        |
| notes        | TEXT         | SÍ   | —       |                       |
| created_at   | TIMESTAMPTZ  | SÍ   | NOW()   |                       |
| updated_at   | TIMESTAMPTZ  | SÍ   | NOW()   |                       |

---

### stock_entry_items
Ítems ingresados (activo o componente; condición).

| Campo            | Tipo          | Nulo | Default | Notas                           |
|------------------|---------------|------|---------|---------------------------------|
| id               | BIGINT        | NO   | serial  | PK                              |
| stock_entry_id   | UUID          | NO   | —       | FK → stock_entries(id)          |
| purchase_item_id | UUID          | SÍ   | —       | FK → purchase_items(id)         |
| asset_id         | UUID          | SÍ   | —       | FK → assets(id)                 |
| component_id     | UUID          | SÍ   | —       | FK → components(id)             |
| condition        | VARCHAR(30)   | NO   | 'new'   | CHECK (new, good, regular, damaged, obsolete) |
| quantity         | INTEGER       | NO   | 1       |                                 |
| created_at       | TIMESTAMPTZ   | SÍ   | NOW()   |                                 |
| updated_at       | TIMESTAMPTZ   | SÍ   | NOW()   |                                 |

---

### asset_transfers
Traslado real de activos/componentes desde un almacén origen hacia un almacén destino, con responsables operativos y sustento documental.

| Campo | Tipo | Nulo | Default | Notas |
|-------|------|------|---------|-------|
| id | UUID | NO | gen_random_uuid() | PK |
| code | VARCHAR(60) | NO | — | Código interno del traslado |
| origin_warehouse_id | UUID | NO | — | FK → warehouses(id) |
| destination_warehouse_id | UUID | NO | — | FK → warehouses(id) |
| status | VARCHAR(30) | NO | 'pending_approval' | CHECK (pending_approval, approved, in_transit, received, cancelled) |
| sent_by | UUID | SÍ | — | FK → users(id); quien despacha desde origen |
| received_by | UUID | SÍ | — | FK → users(id); quien recibe en destino |
| approved_by | UUID | SÍ | — | FK → users(id); quien aprueba el traslado |
| approved_at | TIMESTAMPTZ | SÍ | — | Fecha/hora de aprobación |
| ship_date | TIMESTAMPTZ | SÍ | — | Fecha/hora real de salida |
| received_at | TIMESTAMPTZ | SÍ | — | Fecha/hora real de recepción |
| carrier_name | VARCHAR(200) | SÍ | — | Nombre del courier o transporte |
| tracking_number | VARCHAR(100) | SÍ | — | Número de seguimiento |
| carrier_reference | VARCHAR(150) | SÍ | — | Referencia adicional del courier |
| company_guide_number | VARCHAR(100) | SÍ | — | Número de guía emitida por la empresa |
| company_guide_path | VARCHAR(500) | SÍ | — | Ruta del PDF/archivo de la guía de la empresa |
| carrier_voucher_number | VARCHAR(100) | SÍ | — | Número del voucher/comprobante del courier |
| carrier_voucher_path | VARCHAR(500) | SÍ | — | Ruta del PDF/imagen del voucher del courier |
| dispatch_notes | TEXT | SÍ | — | Observaciones al despachar |
| receipt_notes | TEXT | SÍ | — | Observaciones al recibir |
| cancelled_by | UUID | SÍ | — | FK → users(id) |
| cancelled_at | TIMESTAMPTZ | SÍ | — | Fecha/hora de cancelación |
| cancellation_reason | TEXT | SÍ | — | Motivo de cancelación/rechazo |
| created_at | TIMESTAMPTZ | SÍ | NOW() | |
| updated_at | TIMESTAMPTZ | SÍ | NOW() | |

Reglas recomendadas:
- `origin_warehouse_id <> destination_warehouse_id`
- si `status = 'approved'`, entonces `approved_by` y `approved_at` deberían existir
- si `status = 'in_transit'`, entonces `sent_by` y `ship_date` deberían existir
- si `status = 'received'`, entonces `received_by` y `received_at` deberían existir

---

### transfer_items
Ítems del traslado (asset o component; condición salida/llegada).

| Campo             | Tipo          | Nulo | Default | Notas                                    |
|-------------------|---------------|------|---------|------------------------------------------|
| id                | BIGINT        | NO   | serial  | PK                                       |
| asset_transfer_id | UUID          | NO   | —       | FK → asset_transfers(id)                 |
| asset_id          | UUID          | SÍ   | —       | FK → assets(id)                          |
| component_id      | UUID          | SÍ   | —       | FK → components(id)                      |
| condition_out     | VARCHAR(30)   | SÍ   | —       |                                          |
| condition_in      | VARCHAR(30)   | SÍ   | —       |                                          |
| created_at        | TIMESTAMPTZ   | SÍ   | NOW()   |                                          |
| updated_at        | TIMESTAMPTZ   | SÍ   | NOW()   |                                          |

CHECK: al menos uno de asset_id, component_id NOT NULL.

---

## 5. Activos (tecnológicos) — 4 tablas

### assets
Activo principal; ubicación vía `warehouse_id` (zonal y oficina se obtienen por warehouse → office → zonal). Opcional: `repair_shop_id`. El tipo de ubicación se deduce de qué FK está llena (warehouse / repair_shop) y de `status`.

| Campo             | Tipo          | Nulo | Default   | Notas                                                                 |
|-------------------|---------------|------|-----------|-----------------------------------------------------------------------|
| id                | UUID          | NO   | gen_random_uuid() | PK                                                        |
| code              | VARCHAR(60)   | NO   | —         | UNIQUE (formato TI-{ZONAL}-{TIPO}-{SEQ})                             |
| serial_number     | VARCHAR(200)  | SÍ   | —         | UNIQUE                                                                |
| model_id          | UUID          | NO   | —         | FK → asset_models(id)                                                 |
| category_id       | UUID          | NO   | —         | FK → asset_categories(id)                                             |
| purchase_item_id  | UUID          | SÍ   | —         | FK → purchase_items(id)                                               |
| status            | VARCHAR(30)   | NO   | 'stored'  | CHECK (active, stored, in_repair, in_transit, disposed, sold)          |
| condition         | VARCHAR(30)   | NO   | 'new'     | CHECK (new, good, regular, damaged, obsolete)                          |
| warehouse_id      | UUID          | SÍ   | —         | FK → warehouses(id) ON DELETE RESTRICT                               |
| repair_shop_id    | UUID          | SÍ   | —         | FK → repair_shops(id) ON DELETE RESTRICT                              |
| acquisition_value | NUMERIC(14,2) | SÍ   | —         |                                                                       |
| current_value     | NUMERIC(14,2) | SÍ   | —         |                                                                       |
| depreciation_rate | NUMERIC(5,2)  | SÍ   | 20.00     |                                                                       |
| warranty_until    | DATE          | SÍ   | —         |                                                                       |
| specs             | JSONB         | SÍ   | —         | Índice GIN                                                            |
| notes             | TEXT          | SÍ   | —         |                                                                       |
| registered_by_id  | UUID          | SÍ   | —         | FK → users(id) (quien registró el activo)                             |
| updated_by_id     | UUID          | SÍ   | —         | FK → users(id) (quien modificó por última vez)                        |
| created_at        | TIMESTAMPTZ   | SÍ   | NOW()     |                                                                       |
| updated_at        | TIMESTAMPTZ   | SÍ   | NOW()     |                                                                       |
| deleted_at        | TIMESTAMPTZ   | SÍ   | NULL      |                                                                       |

---

### asset_computers
Datos de PC/laptop (hostname, IP, MAC, BIOS serial, last_seen).

| Campo        | Tipo          | Nulo | Default | Notas                |
|--------------|---------------|------|---------|----------------------|
| id           | UUID          | NO   | gen_random_uuid() | PK          |
| asset_id     | UUID          | NO   | —       | FK → assets(id) UNIQUE|
| hostname     | VARCHAR(255)  | SÍ   | —       |                      |
| bios_serial  | VARCHAR(200)  | SÍ   | —       |                      |
| ip_address   | INET          | SÍ   | —       |                      |
| mac_address  | VARCHAR(50)   | SÍ   | —       |                      |
| last_seen_at | TIMESTAMPTZ   | SÍ   | —       |                      |
| created_at   | TIMESTAMPTZ   | SÍ   | NOW()   |                      |
| updated_at   | TIMESTAMPTZ   | SÍ   | NOW()   |                      |

---

### asset_assignments
Historial de asignaciones a usuario (returned_at, condition_out/condition_in). Sin soft delete.

| Campo         | Tipo         | Nulo | Default | Notas              |
|---------------|--------------|------|---------|--------------------|
| id            | UUID         | NO   | gen_random_uuid() | PK        |
| asset_id      | UUID         | NO   | —       | FK → assets(id)    |
| user_id       | UUID         | NO   | —       | FK → users(id)     |
| assigned_by   | UUID         | SÍ   | —       | FK → users(id)     |
| assigned_at   | TIMESTAMPTZ  | NO   | NOW()   |                    |
| returned_at   | TIMESTAMPTZ  | SÍ   | —       |                    |
| condition_out | VARCHAR(30)  | SÍ   | —       |                    |
| condition_in  | VARCHAR(30)  | SÍ   | —       |                    |
| notes         | TEXT         | SÍ   | —       |                    |
| created_at    | TIMESTAMPTZ  | SÍ   | NOW()   |                    |
| updated_at    | TIMESTAMPTZ  | SÍ   | NOW()   |                    |

---

### asset_photos
Fotos del activo (path, caption, type: front/back/damage).

| Campo      | Tipo          | Nulo | Default | Notas             |
|------------|---------------|------|---------|-------------------|
| id         | UUID          | NO   | gen_random_uuid() | PK       |
| asset_id   | UUID          | NO   | —       | FK → assets(id)   |
| path       | VARCHAR(500)  | NO   | —       |                   |
| caption    | VARCHAR(255)  | SÍ   | —       |                   |
| type       | VARCHAR(30)   | SÍ   | —       | front, back, damage |
| created_at | TIMESTAMPTZ   | SÍ   | NOW()   |                   |
| updated_at | TIMESTAMPTZ   | SÍ   | NOW()   |                   |

---

## 6. Componentes — 2 tablas

### components
Componente físico (warehouse_id, repair_shop_id opcionales; status, condition).

| Campo            | Tipo          | Nulo | Default  | Notas                                                          |
|------------------|---------------|------|----------|----------------------------------------------------------------|
| id               | UUID          | NO   | gen_random_uuid() | PK                                                   |
| code             | VARCHAR(60)   | NO   | —        | UNIQUE                                                         |
| serial_number    | VARCHAR(200)  | SÍ   | —        |                                                                |
| type_id          | UUID          | NO   | —        | FK → component_types(id)                                       |
| brand_id         | UUID          | SÍ   | —        | FK → asset_brands(id)                                          |
| model            | VARCHAR(150)  | SÍ   | —        |                                                                |
| warehouse_id     | UUID          | SÍ   | —        | FK → warehouses(id)                                            |
| repair_shop_id   | UUID          | SÍ   | —        | FK → repair_shops(id)                                          |
| status           | VARCHAR(30)   | NO   | 'stored' | CHECK (active, stored, in_repair, in_transit, disposed)        |
| condition        | VARCHAR(30)   | NO   | 'new'    | CHECK (new, good, regular, damaged, obsolete)                   |
| purchase_item_id | UUID          | SÍ   | —        | FK → purchase_items(id)                                        |
| specs            | JSONB         | SÍ   | —        | Índice GIN                                                     |
| notes            | TEXT          | SÍ   | —        |                                                                |
| created_at       | TIMESTAMPTZ   | SÍ   | NOW()    |                                                                |
| updated_at       | TIMESTAMPTZ   | SÍ   | NOW()    |                                                                |
| deleted_at       | TIMESTAMPTZ   | SÍ   | NULL     |                                                                |

---

### computer_components
Historial de instalaciones en PCs (slot, installed_at, uninstalled_at) con trazabilidad de usuario. Sin soft delete.

| Campo          | Tipo         | Nulo | Default | Notas                                |
|----------------|--------------|------|---------|--------------------------------------|
| id             | BIGINT       | NO   | serial  | PK                                   |
| asset_id       | UUID         | NO   | —       | FK → assets(id)                      |
| component_id   | UUID         | NO   | —       | FK → components(id)                  |
| slot           | VARCHAR(60)  | SÍ   | —       |                                      |
| installed_at   | TIMESTAMPTZ  | NO   | NOW()   |                                      |
| installed_by   | UUID         | SÍ   | —       | FK → users(id) (quién instaló)       |
| uninstalled_at | TIMESTAMPTZ  | SÍ   | —       |                                      |
| uninstalled_by | UUID         | SÍ   | —       | FK → users(id) (quién retiró)        |
| created_at     | TIMESTAMPTZ  | SÍ   | NOW()   |                                      |
| updated_at     | TIMESTAMPTZ  | SÍ   | NOW()   |                                      |

---

## 7. Mantenimiento de bienes — 7 tablas

**Alcance:** esta sección es **solo** para mantenimiento de bienes físicos, tanto **tecnológicos** como **no tecnológicos**.  
No aplica para licencias, suscripciones, VPS, alquileres, limpieza ni otros servicios.

Se separa en dos bloques:

1. **Correctivo**: cuando un activo o componente falla, se diagnostica, se repara, se usan repuestos y se registran costos.
2. **Preventivo**: cuando se programa una revisión periódica para evitar fallas.

---

### repair_tickets
Ticket de mantenimiento correctivo para un **asset** o un **component**, anclado siempre a un **almacén** lógico para respetar el alcance zonal del responsable.

| Campo             | Tipo          | Nulo | Default           | Notas |
|-------------------|---------------|------|-------------------|-------|
| id                | UUID          | NO   | gen_random_uuid() | PK |
| code              | VARCHAR(60)   | NO   | —                 | Código interno del ticket |
| asset_id          | UUID          | SÍ   | —                 | FK → assets(id) |
| component_id      | UUID          | SÍ   | —                 | FK → components(id) |
| warehouse_id      | UUID          | SÍ   | —                 | FK → warehouses(id); almacén “dueño” del ticket (para scope por zonal) |
| status            | VARCHAR(30)   | NO   | 'pending_approval'| CHECK (pending_approval, approved, rejected, diagnosed, in_progress, completed, cancelled) |
| priority          | VARCHAR(20)   | NO   | 'medium'          | CHECK (low, medium, high, critical) |
| failure_type      | VARCHAR(40)   | SÍ   | —                 | hardware, electrical, physical, cosmetic, connectivity, other |
| maintenance_mode  | VARCHAR(20)   | NO   | 'internal'        | CHECK (internal, external, warranty) |
| estimated_cost    | NUMERIC(12,2) | SÍ   | —                 | Costo estimado inicial |
| approved_budget   | NUMERIC(12,2) | SÍ   | —                 | Monto finalmente aprobado |
| reported_at       | TIMESTAMPTZ   | NO   | NOW()             | Fecha/hora del reporte |
| diagnosed_at      | TIMESTAMPTZ   | SÍ   | —                 | Fecha/hora del diagnóstico |
| started_at        | TIMESTAMPTZ   | SÍ   | —                 | Fecha/hora de inicio de trabajo |
| completed_at      | TIMESTAMPTZ   | SÍ   | —                 | Fecha/hora de reparación completada |
| approved_at       | TIMESTAMPTZ   | SÍ   | —                 | Fecha/hora de aprobación del ticket |
| rejected_at       | TIMESTAMPTZ   | SÍ   | —                 | Fecha/hora de rechazo (antes de ejecutar) |
| cancelled_at      | TIMESTAMPTZ   | SÍ   | —                 | Fecha/hora de cancelación (después de aprobado) |
| issue_description | TEXT          | NO   | —                 | Problema reportado |
| diagnosis         | TEXT          | SÍ   | —                 | Diagnóstico técnico |
| solution          | TEXT          | SÍ   | —                 | Solución aplicada |
| condition_in      | VARCHAR(30)   | SÍ   | —                 | Condición al ingresar a mantenimiento |
| condition_out     | VARCHAR(30)   | SÍ   | —                 | Condición al salir de mantenimiento |
| opened_by         | UUID          | SÍ   | —                 | FK → users(id); quien reporta |
| technician_id     | UUID          | SÍ   | —                 | FK → users(id); técnico asignado |
| approved_by       | UUID          | SÍ   | —                 | FK → users(id); aprobador |
| rejected_by       | UUID          | SÍ   | —                 | FK → users(id); quien rechazó el ticket |
| cancelled_by      | UUID          | SÍ   | —                 | FK → users(id); quien canceló el ticket |
| repair_shop_id    | UUID          | SÍ   | —                 | FK → repair_shops(id); taller externo |
| external_reference| VARCHAR(120)  | SÍ   | —                 | Código OT/proveedor/garantía si aplica |
| rejection_reason  | TEXT          | SÍ   | —                 | Motivo de rechazo (status = rejected) |
| cancellation_reason | TEXT        | SÍ   | —                 | Motivo de cancelación (status = cancelled) |
| notes             | TEXT          | SÍ   | —                 | Observaciones generales |
| created_at        | TIMESTAMPTZ   | SÍ   | NOW()             | |
| updated_at        | TIMESTAMPTZ   | SÍ   | NOW()             | |
| deleted_at        | TIMESTAMPTZ   | SÍ   | NULL              | |

CHECK recomendado:
- **exactamente uno** de `asset_id` o `component_id` debe estar informado.
- si `status = 'approved'` → `approved_by` y `approved_at` NOT NULL.
- si `status = 'rejected'` → `rejected_by`, `rejected_at` y `rejection_reason` NOT NULL.
- si `status = 'cancelled'` → `cancelled_by`, `cancelled_at` y `cancellation_reason` NOT NULL.

---

### repair_parts
Repuestos usados en el ticket. Permite usar un componente del inventario o registrar un repuesto externo/manual.

| Campo             | Tipo          | Nulo | Default | Notas |
|-------------------|---------------|------|---------|-------|
| id                | UUID          | NO   | gen_random_uuid() | PK |
| repair_ticket_id  | UUID          | NO   | —       | FK → repair_tickets(id) |
| component_id      | UUID          | SÍ   | —       | FK → components(id); repuesto tomado del inventario |
| part_name         | VARCHAR(200)  | SÍ   | —       | Nombre libre si no existe como componente |
| part_number       | VARCHAR(120)  | SÍ   | —       | Código o referencia del repuesto |
| source_type       | VARCHAR(20)   | NO   | 'stock' | CHECK (stock, external) |
| quantity          | INTEGER       | NO   | 1       | CHECK (quantity > 0) |
| unit_cost         | NUMERIC(12,2) | SÍ   | —       | Costo unitario referencial |
| total_cost        | NUMERIC(12,2) | SÍ   | —       | Puede calcularse como quantity * unit_cost |
| notes             | TEXT          | SÍ   | —       | |
| created_at        | TIMESTAMPTZ   | SÍ   | NOW()   | |
| updated_at        | TIMESTAMPTZ   | SÍ   | NOW()   | |

CHECK recomendado: si `source_type = 'stock'`, debe existir `component_id`; si `source_type = 'external'`, debe existir al menos `part_name`.

---

### repair_costs
Costos adicionales del ticket, distintos o complementarios a los repuestos.

| Campo             | Tipo          | Nulo | Default | Notas |
|-------------------|---------------|------|---------|-------|
| id                | UUID          | NO   | gen_random_uuid() | PK |
| repair_ticket_id  | UUID          | NO   | —       | FK → repair_tickets(id) |
| type              | VARCHAR(30)   | NO   | —       | labour, transport, external_service, miscellaneous |
| amount            | NUMERIC(12,2) | NO   | —       | |
| supplier_id       | UUID          | SÍ   | —       | FK → suppliers(id); si hubo tercero |
| document_type     | VARCHAR(30)   | SÍ   | —       | factura, recibo_honorarios, boleta, ticket |
| document_number   | VARCHAR(100)  | SÍ   | —       | Nro. del comprobante |
| document_path     | VARCHAR(500)  | SÍ   | —       | Ruta del PDF/imagen del comprobante si se guarda directo aquí |
| description       | TEXT          | SÍ   | —       | |
| incurred_at       | TIMESTAMPTZ   | SÍ   | NOW()   | Fecha del costo |
| created_at        | TIMESTAMPTZ   | SÍ   | NOW()   | |
| updated_at        | TIMESTAMPTZ   | SÍ   | NOW()   | |

---

### preventive_plans
Plantilla o plan preventivo aplicable a una familia de bienes o a un tipo de componente.

| Campo                | Tipo          | Nulo | Default | Notas |
|----------------------|---------------|------|---------|-------|
| id                   | UUID          | NO   | gen_random_uuid() | PK |
| name                 | VARCHAR(200)  | NO   | —       | Nombre del plan |
| target_type          | VARCHAR(20)   | NO   | —       | CHECK (asset, component) |
| subcategory_id       | UUID          | SÍ   | —       | FK → asset_subcategories(id); identifica la familia de activos (la categoría viene por FK) |
| component_type_id    | UUID          | SÍ   | —       | FK → component_types(id); para planes orientados a componentes |
| warehouse_id         | UUID          | SÍ   | —       | FK → warehouses(id); localización física (de ahí se infiere oficina y zonal) |
| frequency_type       | VARCHAR(30)   | NO   | —       | CHECK (monthly, quarterly, biannual, annual, custom) |
| frequency_days       | INTEGER       | SÍ   | —       | Obligatorio si `frequency_type = 'custom'` |
| checklist            | JSONB         | SÍ   | —       | Lista de validaciones preventivas |
| default_priority     | VARCHAR(20)   | SÍ   | 'medium' | CHECK (low, medium, high) |
| estimated_cost       | NUMERIC(12,2) | SÍ   | —       | Costo estimado por ejecución |
| assigned_role        | VARCHAR(60)   | SÍ   | 'tecnico' | Rol responsable por defecto |
| is_active            | BOOLEAN       | SÍ   | TRUE    | |
| description          | TEXT          | SÍ   | —       | |
| created_at           | TIMESTAMPTZ   | SÍ   | NOW()   | |
| updated_at           | TIMESTAMPTZ   | SÍ   | NOW()   | |

Reglas recomendadas:
- si `target_type = 'asset'`, filtrar por `subcategory_id` (la categoría se infiere desde la subcategoría)
- si `target_type = 'component'`, usar `component_type_id`
- `warehouse_id` permite conocer oficina y zonal vía FK; si es NULL, el plan aplica a todos los almacenes

---

### preventive_tasks
Ejecución concreta de un plan preventivo sobre un **asset** o un **component** específico.

| Campo               | Tipo          | Nulo | Default | Notas |
|---------------------|---------------|------|---------|-------|
| id                  | UUID          | NO   | gen_random_uuid() | PK |
| plan_id             | UUID          | NO   | —       | FK → preventive_plans(id) |
| asset_id            | UUID          | SÍ   | —       | FK → assets(id) |
| component_id        | UUID          | SÍ   | —       | FK → components(id) |
| status              | VARCHAR(30)   | NO   | 'scheduled' | CHECK (scheduled, in_progress, completed, skipped, overdue, cancelled) |
| priority            | VARCHAR(20)   | SÍ   | 'medium' | CHECK (low, medium, high) |
| scheduled_date      | DATE          | NO   | —       | Fecha programada |
| started_at          | TIMESTAMPTZ   | SÍ   | —       | Inicio real |
| completed_at        | TIMESTAMPTZ   | SÍ   | —       | Fin real |
| technician_id       | UUID          | SÍ   | —       | FK → users(id) |
| findings            | TEXT          | SÍ   | —       | Hallazgos |
| action_taken        | TEXT          | SÍ   | —       | Acción realizada |
| checklist_done      | JSONB         | SÍ   | —       | Evidencia del checklist ejecutado |
| condition_after     | VARCHAR(30)   | SÍ   | —       | Condición luego del preventivo |
| cost                | NUMERIC(10,2) | SÍ   | —       | Costo real |
| next_due_date       | DATE          | SÍ   | —       | Próxima fecha sugerida |
| created_at          | TIMESTAMPTZ   | SÍ   | NOW()   | |
| updated_at          | TIMESTAMPTZ   | SÍ   | NOW()   | |

CHECK recomendado: **exactamente uno** de `asset_id` o `component_id` debe estar informado.

---

### maintenance_status_logs
Historial de cambios de estado y eventos relevantes del mantenimiento, para trazabilidad completa.

| Campo              | Tipo          | Nulo | Default | Notas |
|--------------------|---------------|------|---------|-------|
| id                 | UUID          | NO   | gen_random_uuid() | PK |
| repair_ticket_id   | UUID          | SÍ   | —       | FK → repair_tickets(id) |
| preventive_task_id | UUID          | SÍ   | —       | FK → preventive_tasks(id) |
| event_type         | VARCHAR(40)   | NO   | —       | status_change, assignment, approval, cancellation, completion, note |
| from_status        | VARCHAR(30)   | SÍ   | —       | Estado anterior |
| to_status          | VARCHAR(30)   | SÍ   | —       | Estado nuevo |
| comment            | TEXT          | SÍ   | —       | Observación del evento |
| performed_by       | UUID          | SÍ   | —       | FK → users(id) |
| created_at         | TIMESTAMPTZ   | SÍ   | NOW()   | Fecha/hora del evento |
| updated_at         | TIMESTAMPTZ   | SÍ   | NOW()   | |

CHECK recomendado: al menos uno de `repair_ticket_id` o `preventive_task_id` debe estar informado.

---

### maintenance_documents
Documentos y evidencias asociados al mantenimiento: comprobantes, facturas, presupuestos, informes, fotos y actas.

| Campo              | Tipo          | Nulo | Default | Notas |
|--------------------|---------------|------|---------|-------|
| id                 | UUID          | NO   | gen_random_uuid() | PK |
| repair_ticket_id   | UUID          | SÍ   | —       | FK → repair_tickets(id) |
| preventive_task_id | UUID          | SÍ   | —       | FK → preventive_tasks(id) |
| repair_cost_id     | UUID          | SÍ   | —       | FK → repair_costs(id); opcional si el documento respalda un costo puntual |
| type               | VARCHAR(40)   | NO   | —       | invoice, receipt, fee_receipt, quote, report, evidence_photo, before_photo, after_photo, warranty_doc, other |
| issuer_type        | VARCHAR(20)   | SÍ   | —       | company, supplier, technician, other |
| document_number    | VARCHAR(120)  | SÍ   | —       | Nro. del comprobante o referencia |
| title              | VARCHAR(200)  | SÍ   | —       | Título amigable del archivo |
| file_name          | VARCHAR(255)  | SÍ   | —       | Nombre original |
| file_path          | VARCHAR(500)  | NO   | —       | Ruta del archivo |
| mime_type          | VARCHAR(120)  | SÍ   | —       | application/pdf, image/jpeg, etc. |
| file_size          | BIGINT        | SÍ   | —       | Tamaño en bytes |
| issued_at          | TIMESTAMPTZ   | SÍ   | —       | Fecha de emisión del documento |
| uploaded_by        | UUID          | SÍ   | —       | FK → users(id) |
| notes              | TEXT          | SÍ   | —       | |
| created_at         | TIMESTAMPTZ   | SÍ   | NOW()   | |
| updated_at         | TIMESTAMPTZ   | SÍ   | NOW()   | |

CHECK recomendado: al menos uno de `repair_ticket_id` o `preventive_task_id` debe estar informado.

Ejemplos de uso:
- factura del proveedor por reparación externa
- recibo por honorarios del técnico
- presupuesto aprobado
- informe técnico
- fotos del antes y después
- acta o sustento de garantía

---

## 8. Baja — 2 tablas

### asset_disposals
Solicitudes de baja de bienes (activos y componentes), con flujo de aprobación y referencia al almacén origen.

| Campo        | Tipo         | Nulo | Default    | Notas                                                              |
|--------------|--------------|------|------------|--------------------------------------------------------------------|
| id           | UUID         | NO   | gen_random_uuid() | PK                                                       |
| asset_id     | UUID         | SÍ   | —          | FK → assets(id); exactamente uno de `asset_id` o `component_id`    |
| component_id | UUID         | SÍ   | —          | FK → components(id); exactamente uno de `asset_id` o `component_id`|
| warehouse_id | UUID         | SÍ   | —          | FK → warehouses(id); almacén desde donde se solicita la baja       |
| status       | VARCHAR(30)  | NO   | 'requested'| requested, approved, rejected                                      |
| reason       | TEXT         | NO   | —          | Motivo de la baja (obsoleto, sin uso, robo, pérdida, etc.)        |
| approved_by  | UUID         | SÍ   | —          | FK → users(id)                                                     |
| approved_at  | TIMESTAMPTZ  | SÍ   | —          |                                                                    |
| created_by   | UUID         | SÍ   | —          | FK → users(id)                                                     |
| created_at   | TIMESTAMPTZ  | SÍ   | NOW()      |                                                                    |
| updated_at   | TIMESTAMPTZ  | SÍ   | NOW()      |                                                                    |
| deleted_at   | TIMESTAMPTZ  | SÍ   | NULL       | Soft delete                                                        |

CHECK recomendado: exactamente uno de `asset_id` o `component_id` debe estar informado.

---

### asset_sales
Ventas a trabajadores (buyer_name, DNI, amount, payment_method).

| Campo              | Tipo          | Nulo | Default              | Notas                                                                 |
|--------------------|---------------|------|----------------------|-----------------------------------------------------------------------|
| id                 | UUID          | NO   | gen_random_uuid()    | PK                                                                    |
| asset_disposal_id  | UUID          | NO   | —                    | FK → asset_disposals(id)                                             |
| created_by         | UUID          | SÍ   | —                    | FK → users(id); quién registró la venta                              |
| buyer_name         | VARCHAR(200)  | NO   | —                    | Nombre del comprador (trabajador u otro)                             |
| buyer_dni          | VARCHAR(20)   | SÍ   | —                    | DNI/RUC del comprador                                                |
| amount             | NUMERIC(14,2) | SÍ   | —                    | Importe de la venta                                                  |
| payment_method     | VARCHAR(60)   | SÍ   | —                    | Efectivo, depósito, tarjeta, Yape, Plin, etc.                        |
| status             | VARCHAR(30)   | NO   | 'pending_approval'   | pending_approval, approved, rejected                                 |
| approved_by        | UUID          | SÍ   | —                    | FK → users(id); quién aprobó la venta                                |
| approved_at        | TIMESTAMPTZ   | SÍ   | —                    | Cuándo se aprobó la venta                                            |
| notes              | TEXT          | SÍ   | —                    | Nota registrada al crear la venta (opcional)                         |
| approval_notes     | TEXT          | SÍ   | —                    | Nota registrada al aprobar/rechazar la venta (opcional)              |
| sold_at            | TIMESTAMPTZ   | SÍ   | NOW()                | Fecha/hora efectiva de venta                                         |
| created_at         | TIMESTAMPTZ   | SÍ   | NOW()                |                                                                       |
| updated_at         | TIMESTAMPTZ   | SÍ   | NOW()                |                                                                       |

---

## 9. Inventario — 2 tablas

**Contexto: inventario ya existente.** El sistema parte de que **ya hay inventario**: las oficinas y almacenes tienen equipos tecnológicos y no tecnológicos, activos fijos activos e inactivos. No se parte de cero.

Dos procesos distintos:

1. **Ingreso a almacén** (§4 `stock_entries`): Entrada de **activos nuevos** que llegan con factura/OC. El usuario registra la llegada y los ítems desde la orden de compra. No aplica para lo que ya está en el almacén.

2. **Carga de inventario por almacén:** Registrar **lo que ya hay** en cada almacén (y/o oficina). El usuario va almacén por almacén y “sube” o registra lo existente: computadoras, muebles, activos fijos, etc., **sin factura**. Incluye tecnológicos y no tecnológicos, activos e inactivos. Es la **carga inicial o periódica de existencias** y es fundamental para que el sistema refleje la realidad. Puede apoyarse en conteos físicos (tablas siguientes), en un proceso específico de “carga por almacén” o en ambos (carga inicial + conteos para verificación y conciliación).

Las tablas de esta sección sirven para **conteos físicos** (esperado vs contado y conciliación). La “carga de lo que hay en cada almacén” puede implementarse usando o integrando estos mecanismos según se defina el flujo.

---

### inventory_counts
Conteos físicos (warehouse, count_date, status, reconciled_at).

| Campo         | Tipo         | Nulo | Default      | Notas                                    |
|---------------|--------------|------|--------------|------------------------------------------|
| id            | UUID         | NO   | gen_random_uuid() | PK                             |
| warehouse_id  | UUID         | NO   | —            | FK → warehouses(id)                      |
| count_date    | DATE         | NO   | —            |                                          |
| status        | VARCHAR(30)  | NO   | 'in_progress'| CHECK (in_progress, reconciled, closed)   |
| reconciled_at | TIMESTAMPTZ  | SÍ   | —            |                                          |
| reconciled_by | UUID         | SÍ   | —            | FK → users(id)                            |
| created_at    | TIMESTAMPTZ  | SÍ   | NOW()        |                                          |
| updated_at    | TIMESTAMPTZ  | SÍ   | NOW()        |                                          |

---

### inventory_count_items
Ítems verificados (expected_quantity, counted_quantity, difference).

| Campo               | Tipo         | Nulo | Default | Notas                          |
|---------------------|--------------|------|---------|--------------------------------|
| id                  | UUID         | NO   | gen_random_uuid() | PK                   |
| inventory_count_id  | UUID         | NO   | —       | FK → inventory_counts(id)      |
| asset_id            | UUID         | SÍ   | —       | FK → assets(id)                |
| component_id        | UUID         | SÍ   | —       | FK → components(id)            |
| expected_quantity   | INTEGER      | NO   | —       |                                |
| counted_quantity    | INTEGER      | NO   | —       |                                |
| difference          | INTEGER      | SÍ   | —       |                                |
| notes               | TEXT         | SÍ   | —       |                                |
| created_at          | TIMESTAMPTZ  | SÍ   | NOW()   |                                |
| updated_at          | TIMESTAMPTZ  | SÍ   | NOW()   |                                |

---

## 9.1 Servicios (VPS, hosting, alquiler, etc.) — 1 tabla

**Contexto:** Compras de **servicios** (VPS, hosting, alquiler de local, seguros, SOAT, etc.) que se solicitan por **Orden de Compra (OC)** y, al generarse la **factura**, pasan a registrarse como **servicio en concreto** con almacén, subcategoría, solicitante y **vigencia (fecha inicio / fecha fin)**. El mantenimiento de activos y componentes tiene su propia sección (reparaciones, planes preventivos, etc.).

**Flujo:** (1) Se crea una OC con ítem(s) de tipo servicio. (2) Se aprueba la OC y se genera la factura. (3) Al registrar la factura, se crea o actualiza el registro en `services`. OC, factura y proveedor se obtienen en cascada desde `purchase_item_id`.

**Vigencia:** Por lo habitual estos servicios tienen **fecha de inicio** y **fecha de fin** (el VPS/plan vence cada cierto tiempo; a veces el plan es mensual, anual, etc.). Los campos `start_date`, `end_date` y `renewal` permiten llevar el ciclo y las alertas de vencimiento.

---

### services
Servicios contratados (VPS, hosting, alquiler, seguros, SOAT). Solo FKs necesarios: `purchase_item_id` (OC, factura y proveedor en cascada), subcategoría y almacén. Vigencia con fecha inicio y fecha fin.

| Campo                 | Tipo           | Nulo | Default     | Notas                                                                 |
|-----------------------|----------------|------|-------------|-----------------------------------------------------------------------|
| id                    | UUID           | NO   | gen_random_uuid() | PK                                                          |
| purchase_item_id      | UUID           | NO   | —           | FK → purchase_items(id). OC, factura y proveedor se obtienen por relación (cascada). |
| asset_subcategory_id  | UUID           | SÍ   | —           | FK → asset_subcategories(id). Subcategoría del servicio (no se guarda categoría). |
| warehouse_id          | UUID           | NO   | —           | FK → warehouses(id). Almacén al que se imputa (sin oficina ni zonal). |
| name                  | VARCHAR(200)   | NO   | —           | Nombre o descripción del servicio.                                    |
| type                  | VARCHAR(60)    | NO   | —           | Tipo: vps, hosting, rental, insurance, soat, other. (Mantenimiento de activos → tabla aparte.) |
| requested_by          | UUID           | SÍ   | —           | FK → users(id). Quién solicitó el servicio.                          |
| start_date            | DATE           | SÍ   | —           | Fecha de inicio de vigencia.                                          |
| end_date              | DATE           | SÍ   | —           | Fecha de fin de vigencia (plan vence aquí; renovación mensual/anual). |
| renewal               | VARCHAR(30)    | SÍ   | —           | monthly, annual, none. Periodicidad del plan.                         |
| amount                | NUMERIC(14,2)  | SÍ   | —           | Monto del servicio.                                                   |
| status                | VARCHAR(30)    | NO   | 'draft'     | draft, pending_oc, oc_approved, invoiced, active, expired, cancelled. |
| notes                 | TEXT           | SÍ   | —           |                                                                       |
| created_at            | TIMESTAMPTZ    | SÍ   | NOW()       |                                                                       |
| updated_at            | TIMESTAMPTZ    | SÍ   | NOW()       |                                                                       |

**Notas:** Proveedor, OC e factura se derivan de `purchase_item` → `purchase_order` (y facturas de la OC). Mantenimiento de bienes (reparaciones, preventivo) → sección correspondiente del documento.

---

## 10. Alertas — 3 tablas

### alert_rules
Reglas configurables (type, channels, recipients, threshold_config).

| Campo           | Tipo          | Nulo | Default | Notas |
|-----------------|---------------|------|---------|-------|
| id              | UUID          | NO   | gen_random_uuid() | PK |
| name            | VARCHAR(200)  | NO   | —       |       |
| type            | VARCHAR(60)   | NO   | —       | warranty_expiry, no_agent_report, transfer_stuck, stock_low, hw_discrepancy, license_expiry, license_violation, maintenance_overdue, brute_force_login, insurance_expiry, soat_expiry, tech_review_expiry, fa_unassigned |
| channels        | JSONB         | SÍ   | —       | in_app, email, slack |
| notify_roles    | JSONB         | SÍ   | —       |       |
| threshold_config| JSONB         | SÍ   | —       |       |
| is_active       | BOOLEAN       | SÍ   | TRUE    |       |
| created_at      | TIMESTAMPTZ   | SÍ   | NOW()   |       |
| updated_at      | TIMESTAMPTZ   | SÍ   | NOW()   |       |

---

### alert_events
Alertas disparadas (severity, model_type/model_id, resolved_at).

| Campo        | Tipo         | Nulo | Default | Notas                 |
|--------------|--------------|------|---------|-----------------------|
| id           | UUID         | NO   | gen_random_uuid() | PK      |
| alert_rule_id| UUID         | SÍ   | —       | FK → alert_rules(id)  |
| severity     | VARCHAR(30)  | NO   | —       | low, medium, high, critical |
| model_type   | VARCHAR(255) | SÍ   | —       |                       |
| model_id     | UUID         | SÍ   | —       |                       |
| payload      | JSONB        | SÍ   | —       |                       |
| resolved_at  | TIMESTAMPTZ  | SÍ   | —       |                       |
| resolved_by  | UUID         | SÍ   | —       | FK → users(id)        |
| created_at   | TIMESTAMPTZ  | SÍ   | NOW()   |                       |
| updated_at   | TIMESTAMPTZ  | SÍ   | NOW()   |                       |

---

### notifications
Notificaciones in-app por usuario.

| Campo      | Tipo          | Nulo | Default | Notas                |
|------------|---------------|------|---------|----------------------|
| id         | UUID          | NO   | gen_random_uuid() | PK         |
| user_id    | UUID          | NO   | —       | FK → users(id)       |
| type       | VARCHAR(100)  | NO   | —       |                      |
| data       | JSONB         | SÍ   | —       |                      |
| read_at    | TIMESTAMPTZ   | SÍ   | —       |                      |
| created_at | TIMESTAMPTZ   | SÍ   | NOW()   |                      |
| updated_at | TIMESTAMPTZ   | SÍ   | NOW()   |                      |

---

## 11. Depreciación (activos tecnológicos) — 2 tablas

### depreciation_schedules
Configuración por categoría SUNAT (método, vida útil, valor residual). Una fila por categoría tributaria.

| Campo               | Tipo          | Nulo | Default        | Notas                          |
|---------------------|---------------|------|----------------|--------------------------------|
| id                  | UUID          | NO   | gen_random_uuid() | PK                        |
| category_id         | UUID          | NO   | —              | FK → asset_categories(id) (SUNAT) |
| method              | VARCHAR(30)   | NO   | 'straight_line'| straight_line, double_declining, sum_of_years |
| useful_life_years   | INTEGER       | NO   | —              |                                |
| residual_value_pct  | NUMERIC(5,2)  | SÍ   | 0              |                                |
| created_at          | TIMESTAMPTZ   | SÍ   | NOW()          |                                |
| updated_at          | TIMESTAMPTZ   | SÍ   | NOW()          |                                |

---

### depreciation_entries
Registros mensuales por activo (period, amount, book_value_before/after, approved_by).

| Campo            | Tipo          | Nulo | Default | Notas                 |
|------------------|---------------|------|---------|-----------------------|
| id               | UUID          | NO   | gen_random_uuid() | PK      |
| asset_id         | UUID          | NO   | —       | FK → assets(id)       |
| period           | CHAR(7)       | NO   | —       | YYYY-MM               |
| method           | VARCHAR(30)   | NO   | —       |                       |
| amount           | NUMERIC(14,2) | NO   | —       |                       |
| book_value_before| NUMERIC(14,2) | NO   | —       |                       |
| book_value_after | NUMERIC(14,2) | NO   | —       |                       |
| calculated_at    | TIMESTAMPTZ   | SÍ   | NOW()   |                       |
| approved_by      | UUID          | SÍ   | —       | FK → users(id)        |
| status           | VARCHAR(30)   | SÍ   | 'draft' | draft, approved       |
| created_at       | TIMESTAMPTZ   | SÍ   | NOW()   |                       |
| updated_at       | TIMESTAMPTZ   | SÍ   | NOW()   |                       |

---

## 12. Licencias de software — 5 tablas

### software_vendors
Fabricantes de software.

| Campo      | Tipo          | Nulo | Default | Notas |
|------------|---------------|------|---------|-------|
| id         | UUID          | NO   | gen_random_uuid() | PK |
| name       | VARCHAR(200)  | NO   | —       |       |
| created_at | TIMESTAMPTZ   | SÍ   | NOW()   |       |
| updated_at | TIMESTAMPTZ   | SÍ   | NOW()   |       |

---

### software_products
Productos rastreables.

| Campo      | Tipo          | Nulo | Default | Notas                    |
|------------|---------------|------|---------|--------------------------|
| id         | UUID          | NO   | gen_random_uuid() | PK             |
| vendor_id  | UUID          | NO   | —       | FK → software_vendors(id)|
| name       | VARCHAR(200)  | NO   | —       |                          |
| is_tracked | BOOLEAN       | SÍ   | TRUE    |                          |
| created_at | TIMESTAMPTZ   | SÍ   | NOW()   |                          |
| updated_at | TIMESTAMPTZ   | SÍ   | NOW()   |                          |

---

### software_licenses
Licencias (tipo, seats, valid_until, costo cifrado). Claves con Laravel Crypt.

| Campo        | Tipo          | Nulo | Default | Notas                                        |
|--------------|---------------|------|---------|----------------------------------------------|
| id           | UUID          | NO   | gen_random_uuid() | PK                                 |
| product_id   | UUID          | NO   | —       | FK → software_products(id)                   |
| license_type | VARCHAR(30)   | SÍ   | —       | OEM, retail, volume, subscription            |
| seats_total  | INTEGER       | NO   | —       |                                              |
| seats_used   | INTEGER       | SÍ   | 0       | CHECK (seats_used <= seats_total)            |
| valid_until  | DATE          | SÍ   | —       | Índice parcial WHERE valid_until IS NOT NULL |
| cost         | NUMERIC(14,2) | SÍ   | —       |                                              |
| notes        | TEXT          | SÍ   | —       |                                              |
| created_at   | TIMESTAMPTZ   | SÍ   | NOW()   |                                              |
| updated_at   | TIMESTAMPTZ   | SÍ   | NOW()   |                                              |

---

### license_assignments
Asignación licencia → activo (revoked_at al dar de baja activo).

| Campo               | Tipo         | Nulo | Default | Notas                          |
|---------------------|--------------|------|---------|--------------------------------|
| id                  | UUID         | NO   | gen_random_uuid() | PK                     |
| software_license_id  | UUID         | NO   | —       | FK → software_licenses(id)     |
| asset_id            | UUID         | NO   | —       | FK → assets(id)                |
| assigned_at         | TIMESTAMPTZ  | NO   | NOW()   |                                |
| revoked_at          | TIMESTAMPTZ  | SÍ   | —       |                                |
| valid_until         | DATE         | SÍ   | —       |                                |
| created_at          | TIMESTAMPTZ  | SÍ   | NOW()   |                                |
| updated_at          | TIMESTAMPTZ  | SÍ   | NOW()   |                                |

---

### software_installations
Software detectado por el agente (is_authorized para alertas).

| Campo        | Tipo          | Nulo | Default | Notas                       |
|--------------|---------------|------|---------|-----------------------------|
| id           | UUID          | NO   | gen_random_uuid() | PK                  |
| asset_id     | UUID          | NO   | —       | FK → assets(id)             |
| product_id   | UUID          | NO   | —       | FK → software_products(id)  |
| version      | VARCHAR(100)  | SÍ   | —       |                             |
| detected_at  | TIMESTAMPTZ   | NO   | NOW()   |                             |
| is_authorized| BOOLEAN       | NO   | FALSE   |                             |
| created_at   | TIMESTAMPTZ   | SÍ   | NOW()   |                             |
| updated_at   | TIMESTAMPTZ   | SÍ   | NOW()   |                             |

---

## 13. Auditoría — 3 tablas

### audit_logs
Log de cambios (user_id, action, model_type/model_id, old_values/new_values, ip, request_id). Particionada por created_at (anual); UUID v7 recomendado para PK.

| Campo      | Tipo          | Nulo | Default | Notas                    |
|------------|---------------|------|---------|--------------------------|
| id         | UUID/BIGINT    | NO   | —       | PK (v7 o bigint)         |
| user_id    | UUID          | SÍ   | —       | FK → users(id)           |
| action     | VARCHAR(50)   | NO   | —       | created, updated, soft_deleted |
| model_type | VARCHAR(255)  | NO   | —       |                          |
| model_id   | UUID          | NO   | —       |                          |
| old_values | JSONB         | SÍ   | —       |                          |
| new_values | JSONB         | SÍ   | —       |                          |
| ip_address | INET          | SÍ   | —       |                          |
| request_id | VARCHAR(100)  | SÍ   | —       |                          |
| created_at | TIMESTAMPTZ   | NO   | NOW()   | PARTITION KEY            |

---

### agent_reports
Snapshots de hardware (payload o columnas; is_full_snapshot). Particionada por created_at; UUID v7 para alta escritura.

| Campo            | Tipo         | Nulo | Default | Notas           |
|------------------|--------------|------|---------|-----------------|
| id               | UUID/BIGINT  | NO   | —       | PK              |
| asset_id         | UUID         | NO   | —       | FK → assets(id) |
| payload          | JSONB        | NO   | —       |                 |
| reported_at      | TIMESTAMPTZ  | NO   | —       |                 |
| is_full_snapshot | BOOLEAN      | SÍ   | TRUE    |                 |
| created_at       | TIMESTAMPTZ  | SÍ   | NOW()   | PARTITION KEY   |

---

### agent_tokens
Tokens del agente (token_hash, ip_whitelist, expires_at, last_used_at).

| Campo        | Tipo         | Nulo | Default | Notas              |
|--------------|--------------|------|---------|--------------------|
| id           | UUID         | NO   | gen_random_uuid() | PK       |
| name         | VARCHAR(100) | SÍ   | —       |                    |
| token_hash   | VARCHAR(255) | NO   | —       |                    |
| ip_whitelist | JSONB        | SÍ   | —       |                    |
| expires_at   | TIMESTAMPTZ  | SÍ   | —       |                    |
| last_used_at | TIMESTAMPTZ  | SÍ   | —       |                    |
| created_at   | TIMESTAMPTZ  | SÍ   | NOW()   |                    |
| updated_at   | TIMESTAMPTZ  | SÍ   | NOW()   |                    |

---

## 14. Seguridad e infraestructura — 3 tablas

### login_attempts
Intentos de login (email, ip, success, failure_reason). Particionada por created_at.

| Campo          | Tipo         | Nulo | Default | Notas     |
|----------------|--------------|------|---------|-----------|
| id             | UUID         | NO   | gen_random_uuid() | PK  |
| email          | VARCHAR(255) | NO   | —       |           |
| ip_address     | INET         | NO   | —       |           |
| user_agent     | TEXT         | SÍ   | —       |           |
| success        | BOOLEAN      | NO   | —       |           |
| failure_reason | VARCHAR(100) | SÍ   | —       | invalid_password, account_locked, 2fa_failed |
| created_at     | TIMESTAMPTZ  | SÍ   | NOW()   | PARTITION KEY |

---

### api_key_logs
Log de uso de tokens del agente (endpoint, status_code). Particionada por created_at.

| Campo      | Tipo          | Nulo | Default | Notas                  |
|------------|---------------|------|---------|------------------------|
| id         | UUID          | NO   | gen_random_uuid() | PK           |
| token_id   | UUID          | NO   | —       | FK → agent_tokens(id)  |
| endpoint   | VARCHAR(200)  | SÍ   | —       |                        |
| ip_address | INET          | SÍ   | —       |                        |
| status_code| SMALLINT      | SÍ   | —       |                        |
| created_at | TIMESTAMPTZ   | SÍ   | NOW()   | PARTITION KEY          |

---

### backup_logs
Registro de backups (type, status, started_at, completed_at, verified_at, path_or_ref).

| Campo        | Tipo         | Nulo | Default | Notas                          |
|--------------|--------------|------|---------|--------------------------------|
| id           | UUID         | NO   | gen_random_uuid() | PK                     |
| type         | VARCHAR(50)  | NO   | —       | full, wal, redis, files        |
| status       | VARCHAR(30)  | NO   | —       | started, completed, failed, verified |
| started_at   | TIMESTAMPTZ  | NO   | —       |                                |
| completed_at | TIMESTAMPTZ  | SÍ   | —       |                                |
| verified_at  | TIMESTAMPTZ  | SÍ   | —       |                                |
| path_or_ref  | TEXT         | SÍ   | —       |                                |
| created_at   | TIMESTAMPTZ  | SÍ   | NOW()   |                                |

---

## Tablas pivote Spatie (fuera del conteo 54)

- **model_has_roles**: role_id, model_type, model_id (asignación rol → usuario).
- **role_has_permissions**: permission_id, role_id.

---

*Documento generado para el ERP de Gestión de Parque Informático y Logística TI — Dios v4.0 + M16 Activos Fijos.*
