import { Head, Link, router, usePage } from '@inertiajs/react';
import { Filter, LayoutGrid, Pencil, Plus, Server, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataTable } from '@/components/data-table';
import type { DataTableColumn, SortOrder } from '@/components/data-table';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';
import { SearchFilter } from '@/components/search-filter';
import { TablePagination } from '@/components/table-pagination';
import type { ToastMessage } from '@/components/toast';
import { Toast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { ServiceFormModal } from '@/components/services/service-form-modal';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Activos', href: '#' },
    { title: 'Servicios', href: '/admin/services' },
];

type WarehouseOption = {
    id: string;
    name: string;
    code: string | null;
    office_id: string;
    office?: { name: string; code: string | null; zonal?: { name: string } } | null;
};

type ServiceRow = {
    id: string;
    name: string;
    type: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    amount: string | null;
    purchase_item_id: string | null;
    warehouse_id: string;
    purchase_item?: {
        id: string;
        description: string;
        total_price: string | null;
        purchase_order?: { code: string | null; supplier?: { name: string } | null } | null;
    } | null;
    supplier_id?: string | null;
    supplier?: { id: string; name: string } | null;
    warehouse?: WarehouseOption | null;
    requested_by_user?: { id: string; name: string; last_name: string | null; usuario: string | null } | null;
    asset_subcategory?: { id: string; name: string } | null;
    renewal?: string | null;
};

type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    from: number | null;
    to: number | null;
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
};

type Filters = {
    q: string;
    status: string;
    type: string;
    warehouse_id: string;
    sort_by: string;
    sort_order: SortOrder;
    per_page: number;
};

type Props = {
    services: Paginated<ServiceRow>;
    filters: Filters;
    stats: { total: number; active: number; expired: number; draft: number };
    warehousesForFilter: WarehouseOption[];
    warehousesForSelect: WarehouseOption[];
    assetCategoriesForSelect: { id: string; name: string; code: string | null }[];
    assetSubcategoriesForSelect: { id: string; name: string; category_id: string }[];
    zonalsForSelect: { id: string; name: string; code: string | null }[];
    officesForSelect: { id: string; name: string; code: string | null; zonal_id: string }[];
    usersForSelect: {
        id: string;
        name: string;
        last_name: string | null;
        usuario: string | null;
    }[];
    suppliersForSelect: {
        id: string;
        name: string;
        ruc: string | null;
    }[];
    purchaseItemsForSelect: {
        id: string;
        purchase_order_id: string;
        description: string;
        total_price: string | null;
        purchase_order?: { code: string | null; supplier?: { name: string } | null } | null;
    }[];
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
};

const STATUS_LABELS: Record<string, string> = {
    active: 'Activo',
    about_to_expire: 'Por vencer',
    expired: 'Vencido',
    cancelled: 'Cancelado',
};

const TYPE_LABELS: Record<string, string> = {
    vps: 'VPS',
    hosting: 'Hosting',
    rental: 'Alquiler',
    insurance: 'Seguro',
    soat: 'SOAT',
    other: 'Otro',
};

const STATUS_BADGE: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-300',
    about_to_expire: 'bg-amber-100 text-amber-800 dark:bg-amber-500/25 dark:text-amber-300',
    expired: 'bg-rose-100 text-rose-800 dark:bg-rose-500/25 dark:text-rose-300',
    cancelled: 'bg-slate-200 text-slate-600 dark:bg-slate-500/30 dark:text-slate-400',
};

function warehousePath(w?: WarehouseOption | null): string {
    if (!w) return '—';
    const parts = [w.office?.zonal?.name, w.office?.name, w.name].filter(Boolean);
    return parts.length > 0 ? parts.join(' / ') : w.name ?? '—';
}

function formatDate(v?: string | null): string {
    if (!v) return '—';
    return new Date(v).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(v?: string | number | null): string {
    if (v == null || v === '') return '—';
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return Number.isNaN(n) ? '—' : new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);
}

function supplierName(row: ServiceRow): string {
    return (
        row.purchase_item?.purchase_order?.supplier?.name ??
        row.supplier?.name ??
        '—'
    );
}

function daysUntil(dateStr?: string | null): number | null {
    if (!dateStr) return null;
    const end = new Date(dateStr);
    if (Number.isNaN(end.getTime())) return null;
    const today = new Date();
    // Normalizar a medianoche para ambos
    const startUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    const diffMs = endUtc - startUtc;
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function renewalBadge(row: ServiceRow): { text: string; className: string } | null {
    const days = daysUntil(row.end_date);
    if (days === null) return null;

    if (days < 0) {
        const abs = Math.abs(days);
        return {
            text: abs === 0 ? 'Vence hoy' : `Vencido hace ${abs} día${abs === 1 ? '' : 's'}`,
            className:
                'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
        };
    }
    if (days <= 15) {
        return {
            text: `Faltan ${days} día${days === 1 ? '' : 's'}`,
            className:
                'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
        };
    }
    if (days <= 30) {
        return {
            text: `Faltan ${days} día${days === 1 ? '' : 's'}`,
            className:
                'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
        };
    }
    return {
        text: `Faltan ${days} día${days === 1 ? '' : 's'}`,
        className:
            'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
    };
}

function buildUrl(params: Partial<Filters> & { page?: number }): string {
    const s = new URLSearchParams();
    if (params.q !== undefined) s.set('q', params.q ?? '');
    if (params.status !== undefined) s.set('status', params.status ?? '');
    if (params.type !== undefined) s.set('type', params.type ?? '');
    if (params.warehouse_id !== undefined) s.set('warehouse_id', params.warehouse_id ?? '');
    if (params.sort_by !== undefined) s.set('sort_by', params.sort_by ?? 'created_at');
    if (params.sort_order !== undefined) s.set('sort_order', params.sort_order ?? 'desc');
    if (params.per_page !== undefined) s.set('per_page', String(params.per_page));
    if (params.page !== undefined) s.set('page', String(params.page));
    return `/admin/services?${s.toString()}`;
}

const SEARCH_DEBOUNCE_MS = 400;

export default function ServicesIndex({
    services,
    filters,
    stats,
    warehousesForFilter,
    warehousesForSelect,
    assetCategoriesForSelect,
    assetSubcategoriesForSelect,
    zonalsForSelect,
    officesForSelect,
    usersForSelect,
    suppliersForSelect,
    purchaseItemsForSelect,
    canCreate,
    canUpdate,
    canDelete,
}: Props) {
    const { props: pageProps } = usePage();
    const flash = pageProps.flash as { toast?: ToastMessage } | undefined;

    const [toastQueue, setToastQueue] = useState<Array<ToastMessage & { id: number }>>([]);
    const lastFlashRef = useRef<ToastMessage | null>(null);

    useEffect(() => {
        const t = flash?.toast;
        if (!t || t === lastFlashRef.current) return;
        lastFlashRef.current = t;
        setToastQueue((q) => [...q, { ...t, id: Date.now() }]);
    }, [flash?.toast]);

    const [deleteItem, setDeleteItem] = useState<ServiceRow | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [editingService, setEditingService] = useState<ServiceRow | null>(null);

    const applyFilters = useCallback(
        (next: Partial<Filters> & { page?: number }) => {
            router.get(buildUrl({ ...filters, ...next }), {}, { preserveState: true });
        },
        [filters],
    );

    const handleSort = useCallback(
        (key: string) => {
            const order =
                filters.sort_by === key && filters.sort_order === 'asc' ? 'desc' : 'asc';
            applyFilters({ sort_by: key, sort_order: order as SortOrder });
        },
        [filters.sort_by, filters.sort_order, applyFilters],
    );

    const columns: DataTableColumn<ServiceRow>[] = useMemo(
        () => [
            {
                key: 'name',
                label: 'Servicio',
                sortable: true,
                className: 'text-foreground text-xs max-w-[220px]',
                render: (row) => (
                    <div className="min-w-0 truncate">
                        <span className="block truncate font-medium text-foreground">
                            {row.name}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                            {row.purchase_item?.description ?? 'Sin descripción de ítem'}
                        </span>
                    </div>
                ),
            },
            {
                key: 'supplier',
                label: 'Proveedor',
                sortable: true,
                className: 'text-foreground text-xs max-w-[180px]',
                render: (row) => {
                    const name = supplierName(row);
                    const ocCode = row.purchase_item?.purchase_order?.code;
                    return (
                        <div className="min-w-0 truncate">
                            <span className="block truncate font-medium">{name}</span>
                            {ocCode && (
                                <span className="block truncate text-[11px] text-muted-foreground">
                                    OC #{ocCode}
                                </span>
                            )}
                        </div>
                    );
                },
            },
            {
                key: 'warehouse',
                label: 'Almacén',
                sortable: true,
                className: 'text-foreground text-xs max-w-[200px]',
                render: (row) => (
                    <span className="text-sm">{warehousePath(row.warehouse)}</span>
                ),
            },
            {
                key: 'type',
                label: 'Tipo',
                sortable: true,
                className: 'text-foreground text-xs',
                render: (row) => (
                    <span className="text-sm text-muted-foreground">
                        {TYPE_LABELS[row.type] ?? row.type}
                    </span>
                ),
            },
            {
                key: 'status',
                label: 'Estado',
                sortable: true,
                className: 'text-foreground text-xs',
                render: (row) => (
                    <span
                        className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                            STATUS_BADGE[row.status] ?? 'bg-muted text-muted-foreground',
                        )}
                    >
                        {STATUS_LABELS[row.status] ?? row.status}
                    </span>
                ),
            },
            {
                key: 'dates',
                label: 'Vigencia',
                className: 'text-foreground text-xs',
                render: (row) => (
                    <div className="min-w-0 truncate text-xs text-muted-foreground space-y-0.5">
                        <span className="block truncate">
                            {formatDate(row.start_date)} – {formatDate(row.end_date)}
                        </span>
                        {row.renewal && (
                            <span className="block truncate text-[11px]">
                                Renovación: {row.renewal === 'monthly' ? 'Mensual' : row.renewal === 'annual' ? 'Anual' : 'Sin renovación'}
                            </span>
                        )}
                    </div>
                ),
            },
            {
                key: 'remaining_days',
                label: 'Días restantes',
                sortable: true,
                className: 'text-foreground text-xs',
                render: (row) => {
                    const badge = renewalBadge(row);
                    return badge ? (
                        <span
                            className={cn(
                                'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                                badge.className,
                            )}
                        >
                            {badge.text}
                        </span>
                    ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                    );
                },
            },
            {
                key: 'amount',
                label: 'Monto',
                sortable: true,
                className: 'text-foreground text-xs tabular-nums',
                render: (row) => (
                    <span className="text-sm">{formatCurrency(row.amount)}</span>
                ),
            },
            {
                key: 'actions',
                label: '',
                className: 'min-w-[120px] text-right',
                render: (row) => (
                    <div className="flex items-center justify-end gap-1">
                        {canUpdate && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0 cursor-pointer text-sky-700 hover:text-sky-800 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-900/30"
                                onClick={() => {
                                    setEditingService(row);
                                    setFormOpen(true);
                                }}
                            >
                                <Pencil className="size-4" />
                            </Button>
                        )}
                        {canDelete && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0 cursor-pointer text-rose-700 hover:text-rose-800 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
                                onClick={() => setDeleteItem(row)}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        )}
                    </div>
                ),
            },
        ],
        [canDelete, canUpdate],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Servicios" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                {toastQueue.length > 0 && (
                    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
                        {toastQueue.map((t) => (
                            <Toast
                                key={t.id}
                                toast={t}
                                onDismiss={() => setToastQueue((q) => q.filter((x) => x.id !== t.id))}
                                duration={3000}
                            />
                        ))}
                    </div>
                )}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-3">
                        <div>
                            <h1 className="relative inline-block pb-1 text-xl font-semibold text-foreground">
                                Servicios
                                <span className="absolute bottom-0 left-0 h-0.5 w-8 rounded-full bg-inv-primary" />
                            </h1>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Servicios contratados (VPS, hosting, alquiler, seguros, SOAT) vinculados a ítem de OC.
                        </p>
                        <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] text-gray-700 dark:bg-blue-500/20 dark:text-gray-300">
                                <Server className="size-3 shrink-0 text-blue-600 dark:text-blue-400" />
                                <span>Total</span>
                                <span className="font-semibold">{stats.total}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-300">
                                <span>Activos</span>
                                <span className="font-semibold">{stats.active}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] text-rose-800 dark:bg-rose-500/25 dark:text-rose-300">
                                <span>Vencidos</span>
                                <span className="font-semibold">{stats.expired}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] text-slate-700 dark:bg-slate-500/30 dark:text-slate-300">
                                <span>Borrador</span>
                                <span className="font-semibold">{stats.draft}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-500/25 dark:text-amber-300">
                                <Filter className="size-3 shrink-0" />
                                <span>Filtros</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-medium text-teal-800 dark:bg-teal-500/25 dark:text-teal-300">
                                <LayoutGrid className="size-3 shrink-0" />
                                <span>En pantalla</span>
                                <span className="font-semibold">{services.data.length}</span>
                            </span>
                        </div>
                    </div>
                    {canCreate && (
                        <Button
                            className="bg-inv-primary hover:bg-inv-primary/90 cursor-pointer"
                            onClick={() => {
                                setEditingService(null);
                                setFormOpen(true);
                            }}
                        >
                            <Plus className="size-4" />
                            Nuevo servicio
                        </Button>
                    )}
                </div>

                <div className="border-t border-border w-full shrink-0" aria-hidden />

                <div className="rounded-xl border border-border bg-card shadow-sm">
                    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <SearchFilter
                            value={filters.q ?? ''}
                            onChange={(value) => applyFilters({ q: value, page: 1 })}
                            placeholder="Buscar por nombre, tipo o proveedor..."
                            debounceMs={SEARCH_DEBOUNCE_MS}
                            className="w-full [&_input]:bg-white [&_input]:border-border [&_input]:text-foreground sm:max-w-xs"
                        />
                        <Select
                            value={(filters.status ?? '') === '' ? '_' : filters.status}
                            onValueChange={(v) => applyFilters({ status: v === '_' ? '' : v, page: 1 })}
                        >
                            <SelectTrigger className="w-full sm:w-[180px] border-border bg-background">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos</SelectItem>
                                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={(filters.warehouse_id ?? '') === '' ? '_' : filters.warehouse_id}
                            onValueChange={(v) => applyFilters({ warehouse_id: v === '_' ? '' : v, page: 1 })}
                        >
                            <SelectTrigger className="w-full sm:w-[220px] border-border bg-background">
                                <SelectValue placeholder="Almacén" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos los almacenes</SelectItem>
                                {warehousesForFilter.map((w) => (
                                    <SelectItem key={w.id} value={w.id}>
                                        {warehousePath(w)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Tabla escritorio */}
                    <div className="hidden md:block overflow-x-auto">
                        <DataTable
                            columns={columns}
                            data={services.data}
                            keyExtractor={(row) => row.id}
                            sortBy={filters.sort_by}
                            sortOrder={filters.sort_order}
                            onSort={handleSort}
                            emptyMessage="No hay servicios registrados."
                            variant="default"
                        />
                    </div>

                    {/* Vista móvil tipo tarjetas, similar a órdenes de compra */}
                    <div className="md:hidden">
                        {services.data.length === 0 ? (
                            <p className="py-8 px-4 text-center text-sm text-muted-foreground">
                                No hay servicios registrados.
                            </p>
                        ) : (
                            <ul className="flex flex-col gap-3 p-3 sm:p-4">
                                {services.data.map((row) => (
                                    <li key={row.id}>
                                        <article className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
                                            <div className="space-y-2 p-4">
                                                <p className="text-sm font-semibold text-foreground">
                                                    {row.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {row.purchase_item?.description ?? 'Sin descripción de ítem'}
                                                </p>
                                                <dl className="grid grid-cols-1 gap-1.5 text-xs">
                                                    <div className="flex flex-wrap gap-1">
                                                        <dt className="mr-1 font-medium text-muted-foreground">
                                                            Proveedor:
                                                        </dt>
                                                        <dd>{supplierName(row)}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        <dt className="mr-1 font-medium text-muted-foreground">
                                                            Almacén:
                                                        </dt>
                                                        <dd>{warehousePath(row.warehouse)}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        <dt className="mr-1 font-medium text-muted-foreground">
                                                            Tipo:
                                                        </dt>
                                                        <dd>{TYPE_LABELS[row.type] ?? row.type}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        <dt className="mr-1 font-medium text-muted-foreground">
                                                            Estado:
                                                        </dt>
                                                        <dd>
                                                            <span
                                                                className={cn(
                                                                    'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                                                                    STATUS_BADGE[row.status] ?? 'bg-muted text-muted-foreground',
                                                                )}
                                                            >
                                                                {STATUS_LABELS[row.status] ?? row.status}
                                                            </span>
                                                        </dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        <dt className="mr-1 font-medium text-muted-foreground">
                                                            Vigencia:
                                                        </dt>
                                                        <dd className="space-y-0.5">
                                                            <span className="block">
                                                                {formatDate(row.start_date)} – {formatDate(row.end_date)}
                                                            </span>
                                                            {row.renewal && (
                                                                <span className="block text-[11px] text-muted-foreground">
                                                                    Renovación:{' '}
                                                                    {row.renewal === 'monthly'
                                                                        ? 'Mensual'
                                                                        : row.renewal === 'annual'
                                                                            ? 'Anual'
                                                                            : 'Sin renovación'}
                                                                </span>
                                                            )}
                                                        </dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        <dt className="mr-1 font-medium text-muted-foreground">
                                                            Días restantes:
                                                        </dt>
                                                        <dd>
                                                            {renewalBadge(row) ? (
                                                                <span
                                                                    className={cn(
                                                                        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                                                                        renewalBadge(row)!.className,
                                                                    )}
                                                                >
                                                                    {renewalBadge(row)!.text}
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">
                                                                    —
                                                                </span>
                                                            )}
                                                        </dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        <dt className="mr-1 font-medium text-muted-foreground">
                                                            Monto:
                                                        </dt>
                                                        <dd>{formatCurrency(row.amount)}</dd>
                                                    </div>
                                                </dl>
                                            </div>
                                            <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-4 py-2">
                                                {canUpdate && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="cursor-pointer rounded-lg border-sky-200 text-sky-700 hover:bg-sky-50 hover:border-sky-400 dark:border-sky-700 dark:text-sky-300 dark:hover:bg-sky-900/40"
                                                        onClick={() => {
                                                            setEditingService(row);
                                                            setFormOpen(true);
                                                        }}
                                                    >
                                                        <Pencil className="mr-1 size-3.5" />
                                                        Editar
                                                    </Button>
                                                )}
                                                {canDelete && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="cursor-pointer rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-400 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/40"
                                                        onClick={() => setDeleteItem(row)}
                                                    >
                                                        <Trash2 className="mr-1 size-3.5" />
                                                        Eliminar
                                                    </Button>
                                                )}
                                            </div>
                                        </article>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="px-3 py-3">
                        <TablePagination
                            links={services.links}
                            from={services.from}
                            to={services.to}
                            total={services.total}
                            currentPage={services.current_page}
                            lastPage={services.last_page}
                            perPage={services.per_page}
                            buildUrl={(page) => buildUrl({ ...filters, page })}
                        />
                    </div>
                </div>
            </div>

            <DeleteConfirmModal
                open={!!deleteItem}
                onClose={() => setDeleteItem(null)}
                title="Eliminar servicio"
                message={deleteItem ? `¿Eliminar el servicio "${deleteItem.name}"? Esta acción no se puede deshacer.` : ''}
                onConfirm={() => {
                    if (deleteItem) {
                        router.delete(`/admin/services/${deleteItem.id}`, {
                            preserveScroll: true,
                            onSuccess: () => setDeleteItem(null),
                        });
                    }
                }}
            />
            <ServiceFormModal
                open={formOpen}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) {
                        setEditingService(null);
                    }
                }}
                service={
                    editingService
                        ? {
                              id: editingService.id,
                              name: editingService.name,
                              type: editingService.type,
                              status: editingService.status,
                              start_date: editingService.start_date,
                              end_date: editingService.end_date,
                              renewal: editingService.renewal ?? null,
                              amount: editingService.amount,
                              notes: '',
                              warehouse_id: editingService.warehouse_id,
                              asset_subcategory_id: editingService.asset_subcategory?.id ?? null,
                              requested_by: editingService.requested_by_user?.id ?? null,
                              supplier_id: editingService.supplier_id ?? editingService.supplier?.id ?? null,
                          }
                        : null
                }
                warehousesForSelect={warehousesForSelect}
                assetCategoriesForSelect={assetCategoriesForSelect}
                assetSubcategoriesForSelect={assetSubcategoriesForSelect}
                zonalsForSelect={zonalsForSelect}
                officesForSelect={officesForSelect}
                usersForSelect={usersForSelect}
                suppliersForSelect={suppliersForSelect}
            />
        </AppLayout>
    );
}

function cn(...classes: (string | undefined | false)[]): string {
    return classes.filter(Boolean).join(' ');
}
