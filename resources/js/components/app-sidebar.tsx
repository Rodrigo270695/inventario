import { Link, usePage } from '@inertiajs/react';
import {
    LayoutGrid,
    MapPin,
    Monitor,
    Package,
    Server,
    Truck,
    ClipboardCheck,
    Wrench,
    FileCheck,
    ShoppingCart,
    Warehouse,
    AlertTriangle,
    TrendingDown,
    BarChart3,
    Trash2,
    Key,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavAdministracion } from '@/components/nav-administracion';
import { NavGroupCollapsible } from '@/components/nav-group-collapsible';
import { NavGroupLinks } from '@/components/nav-group-links';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { SidebarSectionProvider } from '@/components/sidebar-section-context';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Panel de control',
        href: dashboard(),
        icon: LayoutGrid,
    },
];

const ACTIVOS_ITEMS = [
    { title: 'Activos', href: '/admin/assets', icon: Monitor, permission: 'assets.view' },
    { title: 'Componentes', href: '/admin/components', icon: Package, permission: 'components.view' },
    { title: 'Servicios', href: '/admin/services', icon: Server, permission: 'services.view', permissionsAny: ['services.view', 'services.create', 'services.update', 'services.delete'] },
    { title: 'Traslados', href: '/admin/asset-transfers', icon: Truck, permission: 'asset_transfers.view', permissionsAny: ['asset_transfers.view', 'asset_transfers.view_detail', 'asset_transfers.create', 'asset_transfers.update', 'asset_transfers.delete', 'asset_transfers.approve', 'asset_transfers.cancel', 'asset_transfers.dispatch', 'asset_transfers.receive'] },
    { title: 'Inventario físico', href: '/admin/inventory-counts', icon: ClipboardCheck, permission: 'inventory_counts.view', permissionsAny: ['inventory_counts.view', 'inventory_counts.create', 'inventory_counts.update', 'inventory_counts.delete'] },
    { title: 'Órd. de servicio', href: '/fixed-assets/service', icon: Wrench, permission: 'roles.view' },
];

const COMPRAS_ITEMS = [
    { title: 'Órdenes de compra', href: '/admin/purchase-orders', icon: ShoppingCart, permission: 'purchase_orders.view' },
    { title: 'Facturas', href: '/admin/invoices', icon: FileCheck, permission: 'invoices.view' },
    { title: 'Ingresos almacén', href: '/admin/stock-entries', icon: Warehouse, permission: 'stock_entries.view', permissionsAny: ['stock_entries.view', 'stock_entries.items.create', 'stock_entries.items.update', 'stock_entries.items.delete', 'stock_entries.save'] },
    { title: 'Ubicaciones físicas', href: '/admin/warehouse-locations', icon: MapPin, permission: 'warehouse_locations.view' },
];

const MANTENIMIENTO_ITEMS = [
    { title: 'Reparaciones', href: '/admin/repair-tickets', icon: Wrench, permission: 'repair_tickets.view', permissionsAny: ['repair_tickets.view', 'repair_tickets.create', 'repair_tickets.update', 'repair_tickets.delete', 'repair_tickets.approve', 'repair_tickets.cancel', 'repair_tickets.configure'] },
    { title: 'Mant. preventivo', href: '/admin/preventive-maintenance', icon: ClipboardCheck, permission: 'preventive_plans.view', permissionsAny: ['preventive_plans.view', 'preventive_plans.create', 'preventive_plans.update', 'preventive_plans.delete', 'preventive_tasks.view', 'preventive_tasks.create', 'preventive_tasks.update', 'preventive_tasks.delete'] },
];

const BAJAS_ITEMS = [
    { title: 'Bajas y ventas', href: '/admin/asset-disposals', icon: Trash2, permission: 'asset_disposals.view', permissionsAny: ['asset_disposals.view', 'asset_disposals.create', 'asset_disposals.approve', 'asset_disposals.reject', 'asset_disposals.delete', 'asset_disposals.sale'] },
];

const LICENCIAS_ITEMS = [
    { title: 'Licencias', href: '/licenses', icon: Key, permission: 'roles.view' },
];

const ALERTAS_ITEMS = [
    { title: 'Alertas', href: '/admin/alerts', icon: AlertTriangle, permission: 'alerts.view' },
    { title: 'Depreciación', href: '/admin/depreciation', icon: TrendingDown, permission: 'depreciation.view' },
    { title: 'Reportes', href: '/reports', icon: BarChart3, permission: 'roles.view' },
];

export function AppSidebar() {
    const { stockEntriesPendingConfirmCount = 0 } = (usePage().props as { stockEntriesPendingConfirmCount?: number }) ?? {};

    const comprasBadges =
        stockEntriesPendingConfirmCount > 0
            ? { '/admin/stock-entries': stockEntriesPendingConfirmCount }
            : undefined;

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarSectionProvider>
                    <NavMain items={mainNavItems} />

                    <NavGroupCollapsible
                        sectionKey="activos"
                        groupLabel="Activos"
                        sectionTitle="Activos"
                        icon={Monitor}
                        items={ACTIVOS_ITEMS}
                    />
                    <NavGroupCollapsible
                        sectionKey="compras"
                        groupLabel="Compras y logística"
                        sectionTitle="Compras"
                        icon={ShoppingCart}
                        items={COMPRAS_ITEMS}
                        itemBadgeCounts={comprasBadges}
                    />
                    <NavGroupCollapsible
                        sectionKey="mantenimiento"
                        groupLabel="Mantenimiento"
                        sectionTitle="Mantenimiento"
                        icon={Wrench}
                        items={MANTENIMIENTO_ITEMS}
                    />
                    <NavGroupLinks groupLabel="Bajas y ventas" items={BAJAS_ITEMS} />
                    <NavGroupLinks groupLabel="Licencias" items={LICENCIAS_ITEMS} />
                    <NavGroupCollapsible
                        sectionKey="alertas-reportes"
                        groupLabel="Alertas y reportes"
                        sectionTitle="Reportes"
                        icon={BarChart3}
                        items={ALERTAS_ITEMS}
                    />

                    <NavAdministracion />
                </SidebarSectionProvider>
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
