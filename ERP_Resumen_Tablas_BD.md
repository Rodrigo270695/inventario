# Resumen de tablas de BD — ERP Parque Informático DIOS v4 + Módulo 16 Activos Fijos

Documento generado a partir de:
- **ERP_Parque_Informatico_DIOS_v4.md** (52 tablas)
- **ERP_DIOS_v4_Modulo16_ActivosFijos.md** (+7 tablas)

**Total: 59 tablas**

---

## 1. Organización (Org) — 9 tablas

| # | Tabla               | Descripción |
|---|---------------------|-------------|
| 1 | zonals              | Zonales (Lima, Chiclayo, Arequipa, Trujillo) |
| 2 | offices             | Sedes y oficinas por zonal |
| 3 | warehouses          | Almacenes con capacidad y gestor |
| 4 | warehouse_locations | Ubicaciones físicas (estante/fila/columna) |
| 5 | repair_shops        | Talleres externos registrados con contacto y RUC |
| 6 | departments         | Departamentos/áreas con jerarquía |
| 7 | users               | Usuarios del sistema con 2FA |
| 8 | roles               | Roles con permisos |
| 9 | permissions         | Permisos granulares por acción |

---

## 2. Catálogo — 4 tablas

| # | Tabla            | Descripción |
|---|-------------------|-------------|
| 10 | asset_categories  | PC, Monitor, Impresora, Router, Switch |
| 11 | asset_brands     | Marcas: HP, Dell, Cisco, Lenovo, Kingston |
| 12 | asset_models     | Modelos por marca y categoría con specs JSON |
| 13 | component_types  | RAM, SSD, HDD, GPU, PSU, Motherboard |

---

## 3. Compras — 4 tablas

| # | Tabla            | Descripción |
|---|-------------------|-------------|
| 14 | suppliers        | Proveedores con RUC, contacto y condiciones |
| 15 | purchase_orders  | Órdenes de compra con niveles de aprobación |
| 16 | purchase_items   | Ítems de OC con precio y descripción |
| 17 | invoices         | Facturas con archivo PDF adjunto |

---

## 4. Logística — 4 tablas

| # | Tabla               | Descripción |
|---|----------------------|-------------|
| 18 | stock_entries       | Ingresos al almacén vinculados a factura |
| 19 | stock_entry_items   | Ítems ingresados con condición |
| 26 | asset_transfers     | Traslados con transportista y guía de remisión |
| 27 | transfer_items      | Ítems del traslado (asset_id / component_id / fixed_asset_id) |

---

## 5. Activos (tecnológicos) — 4 tablas

| # | Tabla              | Descripción |
|---|--------------------|-------------|
| 20 | assets             | Activo principal con FK explícitas de ubicación |
| 21 | asset_computers    | Datos de PC/laptop: hostname, IP, MAC, BIOS serial |
| 22 | asset_assignments  | Historial de asignaciones (retornable con returned_at) |
| 23 | asset_photos       | Fotos del activo (frente, reverso, daño) |

---

## 6. Componentes — 2 tablas

| # | Tabla                | Descripción |
|---|----------------------|-------------|
| 24 | components           | Componente físico con FK explícitas de ubicación |
| 25 | computer_components  | Historial de instalaciones en PCs (slot y fechas) |

---

## 7. Mantenimiento — 5 tablas

| # | Tabla               | Descripción |
|---|--------------------|-------------|
| 28 | repair_tickets     | Tickets correctivos con diagnóstico y solución |
| 29 | repair_parts       | Repuestos usados en reparación |
| 30 | repair_costs       | Costos de mano de obra y repuestos externos |
| 31 | preventive_plans   | Planes de mantenimiento preventivo por categoría/zonal |
| 32 | preventive_tasks  | Tareas programadas con checklist y resultados |

---

## 8. Baja — 2 tablas

| # | Tabla            | Descripción |
|---|------------------|-------------|
| 33 | asset_disposals  | Solicitudes de baja con motivo y aprobación |
| 34 | asset_sales      | Ventas internas de activos dados de baja |

---

## 9. Inventario — 2 tablas

| # | Tabla                  | Descripción |
|---|------------------------|-------------|
| 35 | inventory_counts      | Conteos físicos con reconciliación |
| 36 | inventory_count_items | Ítems verificados con diferencias |

---

## 10. Alertas — 3 tablas

| # | Tabla         | Descripción |
|---|---------------|-------------|
| 37 | alert_rules   | Reglas configurables con canales y destinatarios |
| 38 | alert_events  | Alertas disparadas con severidad y resolución |
| 39 | notifications | Notificaciones in-app por usuario |

---

## 11. Finanzas (depreciación) — 2 tablas

| # | Tabla                   | Descripción |
|---|-------------------------|-------------|
| 40 | depreciation_schedules | Configuración de método y vida útil por categoría |
| 41 | depreciation_entries   | Registros mensuales de depreciación por activo |

---

## 12. Licencias de software — 5 tablas

| # | Tabla                  | Descripción |
|---|------------------------|-------------|
| 42 | software_vendors      | Fabricantes de software |
| 43 | software_products     | Productos de software rastreables |
| 44 | software_licenses     | Licencias con seats, vigencia y costo |
| 45 | license_assignments   | Asignación licencia → activo (con revocación) |
| 46 | software_installations | Software detectado por el agente en PCs |

---

## 13. Auditoría — 2 tablas

| # | Tabla        | Descripción |
|---|--------------|-------------|
| 47 | audit_logs   | Log completo (PARTITION BY RANGE(created_at)) |
| 48 | agent_reports | Snapshots HW con estrategia diff optimizada |

---

## 14. Seguridad e infraestructura — 4 tablas

| # | Tabla         | Descripción |
|---|---------------|-------------|
| 49 | agent_tokens  | Tokens de agentes con IP whitelist |
| 50 | login_attempts | Registro de intentos de login |
| 51 | api_key_logs  | Log de uso de tokens de agentes |
| 52 | backup_logs   | Registro de backups realizados y verificados |

---

## 15. Módulo 16 — Activos fijos no tecnológicos — 7 tablas

| # | Tabla                            | Descripción |
|---|----------------------------------|-------------|
| 53 | fixed_asset_categories           | Categorías: mobiliario, vehículos, equipos, instalaciones, herramientas |
| 54 | fixed_assets                     | Activo fijo no TI: ubicación, estado, condición, depreciación, seguro/SOAT |
| 55 | fixed_asset_assignments          | Historial de asignaciones a usuarios o departamentos |
| 56 | fixed_asset_service_orders       | Órdenes de servicio (reparación/mantenimiento) con proveedor y costos |
| 57 | fixed_asset_depreciation_entries | Registro mensual de depreciación con aprobación |
| 58 | fixed_asset_inventory_counts     | Conteos físicos periódicos de activos fijos |
| 59 | fixed_asset_inventory_items      | Ítems verificados en el conteo con diferencias |

---

## Resumen por módulo

| Módulo        | Cantidad | Tablas |
|---------------|----------|--------|
| Organización  | 9        | zonals, offices, warehouses, warehouse_locations, repair_shops, departments, users, roles, permissions |
| Catálogo      | 4        | asset_categories, asset_brands, asset_models, component_types |
| Compras       | 4        | suppliers, purchase_orders, purchase_items, invoices |
| Logística     | 4        | stock_entries, stock_entry_items, asset_transfers, transfer_items |
| Activos       | 4        | assets, asset_computers, asset_assignments, asset_photos |
| Componentes   | 2        | components, computer_components |
| Mantenimiento | 5        | repair_tickets, repair_parts, repair_costs, preventive_plans, preventive_tasks |
| Baja          | 2        | asset_disposals, asset_sales |
| Inventario    | 2        | inventory_counts, inventory_count_items |
| Alertas       | 3        | alert_rules, alert_events, notifications |
| Finanzas      | 2        | depreciation_schedules, depreciation_entries |
| Licencias     | 5        | software_vendors, software_products, software_licenses, license_assignments, software_installations |
| Auditoría     | 2        | audit_logs, agent_reports |
| Seguridad     | 4        | agent_tokens, login_attempts, api_key_logs, backup_logs |
| **M16 Activos fijos** | **7** | fixed_asset_categories, fixed_assets, fixed_asset_assignments, fixed_asset_service_orders, fixed_asset_depreciation_entries, fixed_asset_inventory_counts, fixed_asset_inventory_items |
| **TOTAL**     | **59**   | — |

---

## Distribución en el sidebar

Estructura basada en `resources/js/components/app-sidebar.tsx`: **SidebarHeader** (logo) → **SidebarContent** (NavMain + grupos colapsables tipo NavUsuario) → **SidebarFooter** (enlaces + NavUser). Cada grupo usa `SidebarGroup` + `SidebarGroupLabel`; los ítems con hijos usan `Collapsible` + `SidebarMenuSub` + `SidebarMenuSubButton` (como en `nav-usuario.tsx`). Los ítems pueden llevar `permission` para ocultar según rol.

### Diseño propuesto del menú lateral

```
SidebarHeader
└── Logo (link a dashboard)

SidebarContent
├── Navegación
│   └── Panel de control     → /dashboard
│
├── Activos TI
│   └── [Usuario] (collapsible)
│       ├── Activos           → /assets          (assets.*)
│       ├── Componentes       → /components      (component.*)
│       ├── Traslados         → /transfers       (transfer.*)
│       └── Inventario físico → /inventory       (inventory.*)
│
├── Activos fijos (M16)
│   └── [Activos fijos] (collapsible)
│       ├── Activos fijos     → /fixed-assets           (fixed_asset.view)
│       ├── Órd. de servicio  → /fixed-assets/service   (fixed_asset.service)
│       └── Depreciación AF   → /fixed-assets/depreciation
│
├── Compras y logística
│   └── [Compras] (collapsible)
│       ├── Órdenes de compra → /purchase-orders  (purchase.*)
│       ├── Facturas          → /invoices
│       ├── Ingresos almacén  → /stock-entries    (warehouse.entry)
│       └── Almacenes         → /warehouses       (warehouse.view)
│
├── Mantenimiento
│   └── [Mantenimiento] (collapsible)
│       ├── Reparaciones     → /repairs          (repair.*)
│       └── Mant. preventivo  → /maintenance      (maintenance.*)
│
├── Bajas y ventas
│   └── Bajas / Ventas       → /disposals        (disposal.*)
│
├── Licencias
│   └── Licencias            → /licenses         (license.*)
│
├── Alertas y reportes
│   └── [Reportes] (collapsible)
│       ├── Alertas          → /alerts           (alert.*)
│       ├── Depreciación     → /depreciation     (finance.*)
│       └── Reportes         → /reports          (report.*)
│
└── Administración
    └── Usuario (collapsible)   ← ya implementado
        ├── Roles              → /admin/roles    (roles.view)
        └── Usuarios           → /admin/usuarios  (users.view)
    └── Catálogos (collapsible)
        ├── Categorías activos → /admin/asset-categories
        ├── Marcas / Modelos   → /admin/asset-brands, /admin/asset-models
        ├── Tipos componente   → /admin/component-types
        ├── Proveedores        → /admin/suppliers
        ├── Zonales            → /admin/zonals
        ├── Oficinas           → /admin/offices
        ├── Almacenes          → /admin/warehouses
        └── Departamentos     → /admin/departments
    └── Seguridad (collapsible)
        ├── Tokens agente      → /admin/agent-tokens
        ├── Intentos de login  → /admin/login-attempts
        └── Backups           → /admin/backups
    └── Auditoría             → /audit            (audit.view)
```

### Correspondencia módulo (tablas) → ítem de sidebar

| Grupo sidebar        | Subítem / Página      | Tablas / Módulo principal                    |
|----------------------|------------------------|----------------------------------------------|
| Navegación           | Panel de control      | Dashboard (KPIs; no tabla propia)            |
| Activos TI           | Activos               | assets, asset_computers, asset_assignments, asset_photos |
| Activos TI           | Componentes           | components, computer_components, component_types |
| Activos TI           | Traslados             | asset_transfers, transfer_items              |
| Activos TI           | Inventario físico     | inventory_counts, inventory_count_items      |
| Activos fijos (M16)  | Activos fijos         | fixed_assets, fixed_asset_assignments, fixed_asset_categories |
| Activos fijos (M16)  | Órd. de servicio      | fixed_asset_service_orders                    |
| Activos fijos (M16)  | Depreciación AF       | fixed_asset_depreciation_entries              |
| Compras y logística | Órdenes de compra     | purchase_orders, purchase_items, suppliers   |
| Compras y logística | Facturas              | invoices                                     |
| Compras y logística | Ingresos almacén      | stock_entries, stock_entry_items, warehouses |
| Compras y logística | Almacenes             | warehouses, warehouse_locations              |
| Mantenimiento        | Reparaciones          | repair_tickets, repair_parts, repair_costs   |
| Mantenimiento        | Mant. preventivo      | preventive_plans, preventive_tasks           |
| Bajas y ventas       | Bajas / Ventas        | asset_disposals, asset_sales                  |
| Licencias            | Licencias             | software_licenses, license_assignments, software_products, software_vendors, software_installations |
| Alertas y reportes   | Alertas               | alert_rules, alert_events, notifications      |
| Alertas y reportes   | Depreciación          | depreciation_schedules, depreciation_entries |
| Alertas y reportes   | Reportes              | Varias (vistas/exportaciones)                 |
| Administración       | Usuario (Roles/Usuarios) | users, roles, permissions                 |
| Administración       | Catálogos             | asset_categories, asset_brands, asset_models, component_types, suppliers, zonals, offices, warehouses, departments, repair_shops |
| Administración       | Seguridad             | agent_tokens, login_attempts, api_key_logs, backup_logs |
| Administración       | Auditoría             | audit_logs, agent_reports                     |

### Implementación de referencia (app-sidebar.tsx)

- **NavMain**: recibe `mainNavItems` (Panel de control) con `NavItem[]` (`title`, `href`, `icon`).
- **Grupos tipo NavUsuario**: un componente por grupo (ej. `NavActivosTI`, `NavCompras`, `NavAdministracion`) que:
  - Lee `usePage().props.auth.permissions`.
  - Filtra subítems por `permission` y solo muestra el grupo si queda al menos un ítem visible.
  - Renderiza `SidebarGroup` + `SidebarGroupLabel` + `Collapsible` + `SidebarMenuSub` con `Link` en cada `SidebarMenuSubButton`.
- **Permisos sugeridos** (alineados con ERP): `asset.view`, `component.view`, `transfer.view`, `inventory.view`, `fixed_asset.view`, `purchase.view`, `warehouse.view`, `repair.view`, `maintenance.view`, `disposal.view`, `license.view`, `alert.view`, `finance.view`, `roles.view`, `users.view`, `audit.view`, etc.

---

## Notas

- **Parque Informático (M01–M15):** 52 tablas.
- **Módulo 16** reutiliza: `zonals`, `offices`, `warehouses`, `departments`, `users`, `purchase_items`, `audit_logs`.
- **transfer_items** en M16 puede referenciar también `fixed_asset_id` (nullable) para traslados de activos fijos.
- **alert_rules** y **alert_events** se usan también para alertas del M16 (seguro, SOAT, revisión técnica).
