import type { PermissionTreeNode } from '@/types/permission';

/**
 * Árbol de permisos que replica el orden y estructura del sidebar (app-sidebar.tsx).
 * Solo los nodos con `permission` tienen checkbox; el resto es estructura visual.
 */
export const PERMISSION_TREE: PermissionTreeNode[] = [
    {
        key: 'nav',
        label: 'Navegación',
        children: [
            {
                key: 'dashboard',
                label: 'Panel de control',
                permission: 'dashboard.view',
            },
        ],
    },
    {
        key: 'activos',
        label: 'Activos',
        children: [
            {
                key: 'assets',
                label: 'Activos',
                children: [
                    { key: 'assets.view', label: 'Ver', permission: 'assets.view' },
                    { key: 'assets.create', label: 'Crear', permission: 'assets.create' },
                    { key: 'assets.update', label: 'Editar', permission: 'assets.update' },
                    { key: 'assets.delete', label: 'Eliminar', permission: 'assets.delete' },
                    { key: 'assets.configure', label: 'Configurar', permission: 'assets.configure' },
                    { key: 'assets.barcodes.view', label: 'Ver barcode individual', permission: 'assets.barcodes.view' },
                    { key: 'assets.barcodes.bulk', label: 'Imprimir barcode masivo', permission: 'assets.barcodes.bulk' },
                    { key: 'assets.export', label: 'Exportar a Excel', permission: 'assets.export' },
                ],
            },
            {
                key: 'components',
                label: 'Componentes',
                children: [
                    { key: 'components.view', label: 'Ver', permission: 'components.view' },
                    { key: 'components.create', label: 'Crear', permission: 'components.create' },
                    { key: 'components.update', label: 'Editar', permission: 'components.update' },
                    { key: 'components.delete', label: 'Eliminar', permission: 'components.delete' },
                    { key: 'components.configure', label: 'Configurar', permission: 'components.configure' },
                    { key: 'components.barcodes.view', label: 'Ver barcode individual', permission: 'components.barcodes.view' },
                    { key: 'components.barcodes.bulk', label: 'Imprimir barcode masivo', permission: 'components.barcodes.bulk' },
                    { key: 'components.export', label: 'Exportar a Excel', permission: 'components.export' },
                ],
            },
            {
                key: 'services',
                label: 'Servicios',
                children: [
                    { key: 'services.view', label: 'Ver listado', permission: 'services.view' },
                    { key: 'services.create', label: 'Crear', permission: 'services.create' },
                    { key: 'services.update', label: 'Editar', permission: 'services.update' },
                    { key: 'services.delete', label: 'Eliminar', permission: 'services.delete' },
                ],
            },
            {
                key: 'asset_transfers',
                label: 'Traslados',
                children: [
                    { key: 'asset_transfers.view', label: 'Ver listado', permission: 'asset_transfers.view' },
                    { key: 'asset_transfers.view_detail', label: 'Ver detalle', permission: 'asset_transfers.view_detail' },
                    { key: 'asset_transfers.create', label: 'Crear', permission: 'asset_transfers.create' },
                    { key: 'asset_transfers.update', label: 'Editar', permission: 'asset_transfers.update' },
                    { key: 'asset_transfers.delete', label: 'Eliminar', permission: 'asset_transfers.delete' },
                    { key: 'asset_transfers.approve', label: 'Aprobar', permission: 'asset_transfers.approve' },
                    { key: 'asset_transfers.cancel', label: 'Cancelar / Rechazar', permission: 'asset_transfers.cancel' },
                    { key: 'asset_transfers.dispatch', label: 'Despachar', permission: 'asset_transfers.dispatch' },
                    { key: 'asset_transfers.receive', label: 'Recibir', permission: 'asset_transfers.receive' },
                    { key: 'asset_transfers.export', label: 'Exportar a Excel', permission: 'asset_transfers.export' },
                ],
            },
            {
                key: 'inventory_counts',
                label: 'Inventario físico',
                children: [
                    { key: 'inventory_counts.view', label: 'Ver listado', permission: 'inventory_counts.view' },
                    { key: 'inventory_counts.create', label: 'Crear conteo', permission: 'inventory_counts.create' },
                    { key: 'inventory_counts.update', label: 'Editar', permission: 'inventory_counts.update' },
                    { key: 'inventory_counts.delete', label: 'Eliminar', permission: 'inventory_counts.delete' },
                    { key: 'inventory_counts.view_items', label: 'Ver detalle / ítems', permission: 'inventory_counts.view_items' },
                    { key: 'inventory_counts.scan', label: 'Escanear / contar ítems', permission: 'inventory_counts.scan' },
                    { key: 'inventory_counts.reconcile', label: 'Reconciliar diferencias', permission: 'inventory_counts.reconcile' },
                    { key: 'inventory_counts.close', label: 'Cerrar conteo', permission: 'inventory_counts.close' },
                    { key: 'inventory_counts.export', label: 'Exportar a Excel', permission: 'inventory_counts.export' },
                ],
            },
        ],
    },
    {
        key: 'compras',
        label: 'Compras y logística',
        children: [
            {
                key: 'purchase_orders',
                label: 'Órdenes de compra',
                children: [
                    { key: 'purchase_orders.view', label: 'Ver', permission: 'purchase_orders.view' },
                    { key: 'purchase_orders.view_detail', label: 'Ver detalle', permission: 'purchase_orders.view_detail' },
                    { key: 'purchase_orders.create', label: 'Crear', permission: 'purchase_orders.create' },
                    { key: 'purchase_orders.update', label: 'Editar', permission: 'purchase_orders.update' },
                    { key: 'purchase_orders.delete', label: 'Eliminar', permission: 'purchase_orders.delete' },
                    {
                        key: 'purchase_orders.minor_approve',
                        label: 'Aprobar/Rechazar (1.º nivel)',
                        permission: 'purchase_orders.minor_approve',
                    },
                    {
                        key: 'purchase_orders.minor_observe',
                        label: 'Observación (1.º nivel)',
                        permission: 'purchase_orders.minor_observe',
                    },
                    { key: 'purchase_orders.approve', label: 'Aprobar/Rechazar (Ger. Oper.)', permission: 'purchase_orders.approve' },
                    { key: 'purchase_orders.export', label: 'Exportar a Excel', permission: 'purchase_orders.export' },
                    { key: 'purchase_orders.observe', label: 'Poner en observado', permission: 'purchase_orders.observe' },
                    { key: 'purchase_quotes.view', label: 'Ver cotizaciones', permission: 'purchase_quotes.view' },
                    { key: 'purchase_quotes.create', label: 'Subir/Añadir cotización', permission: 'purchase_quotes.create' },
                    { key: 'purchase_quotes.delete', label: 'Eliminar cotización', permission: 'purchase_quotes.delete' },
                    { key: 'purchase_quotes.select', label: 'Elegir cotización ganadora', permission: 'purchase_quotes.select' },
                ],
            },
            {
                key: 'invoices',
                label: 'Facturas',
                children: [
                    { key: 'invoices.view', label: 'Ver', permission: 'invoices.view' },
                    { key: 'invoices.create', label: 'Crear', permission: 'invoices.create' },
                    { key: 'invoices.update', label: 'Editar documentos', permission: 'invoices.update' },
                    { key: 'invoices.delete', label: 'Eliminar', permission: 'invoices.delete' },
                    { key: 'invoices.status', label: 'Abrir/Cerrar factura', permission: 'invoices.status' },
                ],
            },
            {
                key: 'stock_entries',
                label: 'Ingresos almacén',
                children: [
                    { key: 'stock_entries.view', label: 'Ver', permission: 'stock_entries.view' },
                    { key: 'stock_entries.create', label: 'Crear', permission: 'stock_entries.create' },
                    { key: 'stock_entries.items.create', label: 'Agregar ítems al borrador', permission: 'stock_entries.items.create' },
                    { key: 'stock_entries.items.update', label: 'Editar ítems del borrador', permission: 'stock_entries.items.update' },
                    { key: 'stock_entries.items.delete', label: 'Eliminar ítems del borrador', permission: 'stock_entries.items.delete' },
                    { key: 'stock_entries.save', label: 'Guardar y completar ingreso', permission: 'stock_entries.save' },
                    { key: 'stock_entries.delete', label: 'Eliminar', permission: 'stock_entries.delete' },
                ],
            },
            {
                key: 'warehouse_locations',
                label: 'Ubicaciones físicas',
                children: [
                    { key: 'warehouse_locations.view', label: 'Ver', permission: 'warehouse_locations.view' },
                    { key: 'warehouse_locations.create', label: 'Crear', permission: 'warehouse_locations.create' },
                    { key: 'warehouse_locations.update', label: 'Editar', permission: 'warehouse_locations.update' },
                    { key: 'warehouse_locations.delete', label: 'Eliminar', permission: 'warehouse_locations.delete' },
                ],
            },
        ],
    },
    {
        key: 'mantenimiento',
        label: 'Mantenimiento',
        children: [
            {
                key: 'repair_tickets',
                label: 'Reparaciones',
                children: [
                    { key: 'repair_tickets.view', label: 'Ver listado', permission: 'repair_tickets.view' },
                    { key: 'repair_tickets.create', label: 'Crear', permission: 'repair_tickets.create' },
                    { key: 'repair_tickets.update', label: 'Editar', permission: 'repair_tickets.update' },
                    { key: 'repair_tickets.delete', label: 'Eliminar', permission: 'repair_tickets.delete' },
                    { key: 'repair_tickets.approve', label: 'Aprobar', permission: 'repair_tickets.approve' },
                    { key: 'repair_tickets.cancel', label: 'Cancelar / Rechazar', permission: 'repair_tickets.cancel' },
                    { key: 'repair_tickets.configure', label: 'Configurar', permission: 'repair_tickets.configure' },
                    { key: 'repair_tickets.export', label: 'Exportar a Excel', permission: 'repair_tickets.export' },
                ],
            },
            {
                key: 'preventive_maintenance',
                label: 'Mant. preventivo',
                children: [
                    {
                        key: 'preventive_plans',
                        label: 'Planes',
                        children: [
                            { key: 'preventive_plans.view', label: 'Ver', permission: 'preventive_plans.view' },
                            { key: 'preventive_plans.create', label: 'Crear', permission: 'preventive_plans.create' },
                            { key: 'preventive_plans.update', label: 'Editar', permission: 'preventive_plans.update' },
                            { key: 'preventive_plans.delete', label: 'Eliminar', permission: 'preventive_plans.delete' },
                        ],
                    },
                    {
                        key: 'preventive_tasks',
                        label: 'Tareas',
                        children: [
                            { key: 'preventive_tasks.view', label: 'Ver', permission: 'preventive_tasks.view' },
                            { key: 'preventive_tasks.create', label: 'Crear', permission: 'preventive_tasks.create' },
                            { key: 'preventive_tasks.update', label: 'Editar', permission: 'preventive_tasks.update' },
                            { key: 'preventive_tasks.delete', label: 'Eliminar', permission: 'preventive_tasks.delete' },
                        ],
                    },
                ],
            },
        ],
    },
    {
        key: 'bajas',
        label: 'Bajas y ventas',
        children: [
            {
                key: 'asset_disposals',
                label: 'Bajas de bienes',
                children: [
                    { key: 'asset_disposals.view', label: 'Ver listado', permission: 'asset_disposals.view' },
                    { key: 'asset_disposals.create', label: 'Crear solicitud de baja', permission: 'asset_disposals.create' },
                    { key: 'asset_disposals.approve', label: 'Aprobar baja', permission: 'asset_disposals.approve' },
                    { key: 'asset_disposals.reject', label: 'Rechazar baja', permission: 'asset_disposals.reject' },
                    { key: 'asset_disposals.delete', label: 'Eliminar solicitud', permission: 'asset_disposals.delete' },
                    { key: 'asset_disposals.export', label: 'Exportar bajas y ventas', permission: 'asset_disposals.export' },
                    { key: 'asset_disposals.sale', label: 'Registrar / editar venta', permission: 'asset_disposals.sale' },
                    { key: 'asset_disposals.sale.approve', label: 'Aprobar venta', permission: 'asset_disposals.sale.approve' },
                    { key: 'asset_disposals.sale.reject', label: 'Rechazar venta', permission: 'asset_disposals.sale.reject' },
                    { key: 'asset_disposals.sale.delete', label: 'Eliminar venta', permission: 'asset_disposals.sale.delete' },
                ],
            },
        ],
    },
    {
        key: 'licencias',
        label: 'Licencias',
        children: [{ key: 'licenses.view', label: 'Ver', permission: 'licenses.view' }],
    },
    {
        key: 'alertas-reportes',
        label: 'Alertas y reportes',
        children: [
            {
                key: 'alerts',
                label: 'Alertas',
                children: [
                    { key: 'alerts.view', label: 'Ver centro de alertas', permission: 'alerts.view' },
                ],
            },
            {
                key: 'depreciation',
                label: 'Depreciación',
                children: [
                    { key: 'depreciation.view', label: 'Ver módulo de depreciación', permission: 'depreciation.view' },
                    { key: 'depreciation.create', label: 'Crear / editar reglas', permission: 'depreciation.create' },
                    { key: 'depreciation.update', label: 'Actualizar reglas', permission: 'depreciation.update' },
                    { key: 'depreciation.delete', label: 'Eliminar reglas', permission: 'depreciation.delete' },
                    { key: 'depreciation.approve', label: 'Aprobar movimientos', permission: 'depreciation.approve' },
                ],
            },
        ],
    },
    {
        key: 'admin',
        label: 'Administración',
        children: [
            {
                key: 'usuario',
                label: 'Usuario',
                children: [
                    {
                        key: 'roles',
                        label: 'Roles',
                        children: [
                            { key: 'roles.view', label: 'Ver', permission: 'roles.view' },
                            { key: 'roles.create', label: 'Crear', permission: 'roles.create' },
                            { key: 'roles.update', label: 'Editar', permission: 'roles.update' },
                            { key: 'roles.delete', label: 'Eliminar', permission: 'roles.delete' },
                            { key: 'permissions.view', label: 'Ver permisos', permission: 'permissions.view' },
                        ],
                    },
                    {
                        key: 'users',
                        label: 'Usuarios',
                        children: [
                            { key: 'users.view', label: 'Ver', permission: 'users.view' },
                            { key: 'users.create', label: 'Crear', permission: 'users.create' },
                            { key: 'users.update', label: 'Editar', permission: 'users.update' },
                            { key: 'users.delete', label: 'Eliminar', permission: 'users.delete' },
                            { key: 'users.restore', label: 'Restaurar', permission: 'users.restore' },
                            { key: 'users.configure', label: 'Configurar', permission: 'users.configure' },
                            { key: 'users.send_credentials', label: 'Enviar credenciales por correo', permission: 'users.send_credentials' },
                        ],
                    },
                ],
            },
            {
                key: 'catalogos',
                label: 'Catálogos',
                children: [
                    {
                        key: 'gl_accounts',
                        label: 'Cuentas contables',
                        children: [
                            { key: 'gl_accounts.view', label: 'Ver', permission: 'gl_accounts.view' },
                            { key: 'gl_accounts.create', label: 'Crear', permission: 'gl_accounts.create' },
                            { key: 'gl_accounts.update', label: 'Editar', permission: 'gl_accounts.update' },
                            { key: 'gl_accounts.delete', label: 'Eliminar', permission: 'gl_accounts.delete' },
                        ],
                    },
                    {
                        key: 'asset_categories_sunat',
                        label: 'Categorías de activos',
                        children: [
                            { key: 'asset_categories.view', label: 'Ver categorías', permission: 'asset_categories.view' },
                            { key: 'asset_categories.create', label: 'Crear categoría', permission: 'asset_categories.create' },
                            { key: 'asset_categories.update', label: 'Editar categoría', permission: 'asset_categories.update' },
                            { key: 'asset_categories.delete', label: 'Eliminar categoría', permission: 'asset_categories.delete' },
                        ],
                    },
                    {
                        key: 'asset_subcategories_block',
                        label: 'Subcategorías de activos',
                        children: [
                            { key: 'asset_subcategories.view', label: 'Ver subcategorías', permission: 'asset_subcategories.view' },
                            { key: 'asset_subcategories.create', label: 'Crear subcategoría', permission: 'asset_subcategories.create' },
                            { key: 'asset_subcategories.update', label: 'Editar subcategoría', permission: 'asset_subcategories.update' },
                            { key: 'asset_subcategories.delete', label: 'Eliminar subcategoría', permission: 'asset_subcategories.delete' },
                            { key: 'asset_brands.view', label: 'Ver marcas', permission: 'asset_brands.view' },
                            { key: 'asset_brands.create', label: 'Crear marca', permission: 'asset_brands.create' },
                            { key: 'asset_brands.update', label: 'Editar marca', permission: 'asset_brands.update' },
                            { key: 'asset_brands.delete', label: 'Eliminar marca', permission: 'asset_brands.delete' },
                            { key: 'asset_models.view', label: 'Ver modelos', permission: 'asset_models.view' },
                            { key: 'asset_models.create', label: 'Crear modelo', permission: 'asset_models.create' },
                            { key: 'asset_models.update', label: 'Editar modelo', permission: 'asset_models.update' },
                            { key: 'asset_models.delete', label: 'Eliminar modelo', permission: 'asset_models.delete' },
                            { key: 'component_types.view', label: 'Ver tipos componente', permission: 'component_types.view' },
                            { key: 'component_types.create', label: 'Crear tipo componente', permission: 'component_types.create' },
                            { key: 'component_types.update', label: 'Editar tipo componente', permission: 'component_types.update' },
                            { key: 'component_types.delete', label: 'Eliminar tipo componente', permission: 'component_types.delete' },
                        ],
                    },
                    {
                        key: 'suppliers',
                        label: 'Proveedores',
                        children: [
                            { key: 'suppliers.view', label: 'Ver', permission: 'suppliers.view' },
                            { key: 'suppliers.create', label: 'Crear', permission: 'suppliers.create' },
                            { key: 'suppliers.update', label: 'Editar', permission: 'suppliers.update' },
                            { key: 'suppliers.delete', label: 'Eliminar', permission: 'suppliers.delete' },
                        ],
                    },
                    {
                        key: 'zonals',
                        label: 'Zonales, oficinas y almacenes',
                        children: [
                            { key: 'zonals.view', label: 'Ver zonales', permission: 'zonals.view' },
                            { key: 'zonals.create', label: 'Crear zonal', permission: 'zonals.create' },
                            { key: 'zonals.update', label: 'Editar zonal', permission: 'zonals.update' },
                            { key: 'zonals.delete', label: 'Eliminar zonal', permission: 'zonals.delete' },
                            { key: 'offices.view', label: 'Ver oficinas', permission: 'offices.view' },
                            { key: 'offices.create', label: 'Crear oficina', permission: 'offices.create' },
                            { key: 'offices.update', label: 'Editar oficina', permission: 'offices.update' },
                            { key: 'offices.delete', label: 'Eliminar oficina', permission: 'offices.delete' },
                            { key: 'warehouses.view', label: 'Ver almacenes', permission: 'warehouses.view' },
                            { key: 'warehouses.create', label: 'Crear almacén', permission: 'warehouses.create' },
                            { key: 'warehouses.update', label: 'Editar almacén', permission: 'warehouses.update' },
                            { key: 'warehouses.delete', label: 'Eliminar almacén', permission: 'warehouses.delete' },
                        ],
                    },
                    {
                        key: 'repair_shops',
                        label: 'Talleres externos',
                        children: [
                            { key: 'repair_shops.view', label: 'Ver', permission: 'repair_shops.view' },
                            { key: 'repair_shops.create', label: 'Crear', permission: 'repair_shops.create' },
                            { key: 'repair_shops.update', label: 'Editar', permission: 'repair_shops.update' },
                            { key: 'repair_shops.delete', label: 'Eliminar', permission: 'repair_shops.delete' },
                        ],
                    },
                    {
                        key: 'departments',
                        label: 'Departamentos',
                        children: [
                            { key: 'departments.view', label: 'Ver', permission: 'departments.view' },
                            { key: 'departments.create', label: 'Crear', permission: 'departments.create' },
                            { key: 'departments.update', label: 'Editar', permission: 'departments.update' },
                            { key: 'departments.delete', label: 'Eliminar', permission: 'departments.delete' },
                        ],
                    },
                ],
            },
            {
                key: 'seguridad',
                label: 'Seguridad',
                children: [
                    {
                        key: 'security_login_attempts',
                        label: 'Intentos de login',
                        children: [
                            {
                                key: 'security.login_attempts.view',
                                label: 'Ver',
                                permission: 'security.login_attempts.view',
                            },
                        ],
                    },
                    {
                        key: 'security_api_logs',
                        label: 'Logs de API',
                        children: [
                            {
                                key: 'security.api_logs.view',
                                label: 'Ver',
                                permission: 'security.api_logs.view',
                            },
                        ],
                    },
                    {
                        key: 'security_backups',
                        label: 'Backups',
                        children: [
                            {
                                key: 'security.backups.view',
                                label: 'Ver',
                                permission: 'security.backups.view',
                            },
                        ],
                    },
                ],
            },
            {
                key: 'auditoria',
                label: 'Auditoría',
                children: [{ key: 'audit.view', label: 'Ver', permission: 'audit.view' }],
            },
        ],
    },
];

/**
 * Estructura del sidebar para la vista previa (mismo orden que app-sidebar).
 * Cada sección tiene título y ítems; cada ítem se muestra si el rol tiene el permiso.
 */
export const SIDEBAR_PREVIEW_SECTIONS: Array<{
    key: string;
    label: string;
    items: Array<{ title: string; permission: string }>;
}> = [
    { key: 'nav', label: 'Navegación', items: [{ title: 'Panel de control', permission: 'dashboard.view' }] },
    {
        key: 'activos',
        label: 'Activos',
        items: [
            { title: 'Activos', permission: 'assets.view' },
            { title: 'Componentes', permission: 'components.view' },
            { title: 'Servicios', permission: 'services.view' },
            { title: 'Traslados', permission: 'asset_transfers.view' },
            { title: 'Inventario físico', permission: 'inventory_counts.view' },
        ],
    },
    { key: 'compras', label: 'Compras y logística', items: [{ title: 'Órdenes de compra', permission: 'purchase_orders.view' }, { title: 'Facturas', permission: 'invoices.view' }, { title: 'Ingresos almacén', permission: 'stock_entries.view' }, { title: 'Ubicaciones físicas', permission: 'warehouse_locations.view' }] },
    { key: 'mantenimiento', label: 'Mantenimiento', items: [{ title: 'Reparaciones', permission: 'repair_tickets.view' }] },
    { key: 'bajas', label: 'Bajas y ventas', items: [{ title: 'Bajas y ventas', permission: 'asset_disposals.view' }] },
    { key: 'licencias', label: 'Licencias', items: [{ title: 'Licencias', permission: 'licenses.view' }] },
    {
        key: 'alertas',
        label: 'Alertas y reportes',
        items: [
            { title: 'Alertas', permission: 'alerts.view' },
            { title: 'Depreciación', permission: 'depreciation.view' },
        ],
    },
    { key: 'admin', label: 'Administración', items: [] },
];

/** Ítems bajo Usuario (Administración) para la vista previa. */
export const ADMIN_USUARIO_ITEMS: Array<{ title: string; permission: string }> = [
    { title: 'Roles', permission: 'roles.view' },
    { title: 'Usuarios', permission: 'users.view' },
];

/** Ítems bajo Catálogos (Administración) para la vista previa. Mismo orden que nav-administracion CATALOGOS_ITEMS. */
export const ADMIN_CATALOGOS_ITEMS: Array<{ title: string; permission: string }> = [
    { title: 'Cuentas contables', permission: 'gl_accounts.view' },
    { title: 'Categorías de activos', permission: 'asset_categories.view' },
    { title: 'Subcategorías de activos', permission: 'asset_subcategories.view' },
    { title: 'Proveedores', permission: 'suppliers.view' },
    { title: 'Zonales, oficinas y almacenes', permission: 'zonals.view' },
    { title: 'Talleres externos', permission: 'repair_shops.view' },
    { title: 'Departamentos', permission: 'departments.view' },
];

/** Ítems bajo Seguridad (Administración). Mismo orden que nav-administracion SEGURIDAD_ITEMS. */
export const ADMIN_SEGURIDAD_ITEMS: Array<{ title: string; permission: string }> = [
    { title: 'Intentos de login', permission: 'security.login_attempts.view' },
    { title: 'Logs de API', permission: 'security.api_logs.view' },
    { title: 'Backups', permission: 'security.backups.view' },
];

/** Ítem Auditoría (Administración). Mismo permiso que el enlace en nav-administracion. */
export const ADMIN_AUDITORIA_ITEMS: Array<{ title: string; permission: string }> = [
    { title: 'Auditoría', permission: 'audit.view' },
];

/** Ítems del menú Usuario para el sidebar real (nav-administracion). */
export const USUARIO_MENU_ITEMS: Array<{ title: string; permission: string }> = [
    { title: 'Roles', permission: 'roles.view' },
    { title: 'Usuarios', permission: 'users.view' },
    { title: 'Zonales, oficinas y almacenes', permission: 'zonals.view' },
];

let permissionToModuleMap: Map<string, string> | null = null;

function buildPermissionToModule(): Map<string, string> {
    if (permissionToModuleMap) return permissionToModuleMap;
    permissionToModuleMap = new Map();
    for (const root of PERMISSION_TREE) {
        const moduleLabel = root.label;
        function walk(nodes: PermissionTreeNode[]) {
            for (const node of nodes) {
                if (node.permission) permissionToModuleMap!.set(node.permission, moduleLabel);
                if (node.children?.length) walk(node.children);
            }
        }
        if (root.children?.length) walk(root.children);
    }
    return permissionToModuleMap;
}

/** Módulo del sidebar al que pertenece un permiso (ej. "Administración", "Navegación"). */
export function getModuleForPermission(permissionName: string): string {
    return buildPermissionToModule().get(permissionName) ?? 'Otros';
}

/** Orden de módulos como en el sidebar (para agrupar permisos). */
export const MODULE_ORDER: string[] = PERMISSION_TREE.map((r) => r.label);
