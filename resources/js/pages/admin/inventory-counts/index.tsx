import { Head, router, usePage } from '@inertiajs/react';
import { ClipboardCheck, Eye, FileDown, Filter, LayoutGrid, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataTableColumn, SortOrder } from '@/components/data-table';
import { DataTable } from '@/components/data-table';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';
import type { ToastMessage } from '@/components/toast';
import { Toast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { cn } from '@/lib/utils';
import { TablePagination } from '@/components/table-pagination';
import { AppModal } from '@/components/app-modal';

type Zonal = { id: string; name: string; code: string | null };
type Office = { id: string; name: string; code: string | null; zonal_id: string };
type Warehouse = {
    id: string;
    name: string;
    code: string | null;
    office_id: string;
    office?: { name: string; zonal_id: string; zonal?: { name: string } };
};
type User = { id: string; name: string; last_name: string | null; usuario: string | null };

type CountRow = {
    id: string;
    warehouse_id: string;
    count_date: string;
    status: string;
    reconciled_at: string | null;
    items_count: number;
    warehouse?: Warehouse | null;
    reconciled_by?: User | null;
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
    status: string;
    date_from: string;
    date_to: string;
    zonal_id: string;
    office_id: string;
    warehouse_id: string;
    sort_by?: string;
    sort_order?: SortOrder;
};

type Props = {
    counts: Paginated<CountRow>;
    filters: Filters;
    stats: { total: number; in_progress: number; reconciled: number; closed: number };
    zonalsForSelect: Zonal[];
    officesForSelect: Office[];
    warehousesForSelect: Warehouse[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Activos', href: '#' },
    { title: 'Inventario físico', href: '/admin/inventory-counts' },
];

const STATUS_LABELS: Record<string, string> = {
    in_progress: 'En progreso',
    reconciled: 'Reconciliado',
    closed: 'Cerrado',
};

const STATUS_BADGE: Record<string, string> = {
    in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-500/25 dark:text-amber-300',
    reconciled: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-300',
    closed: 'bg-slate-200 text-slate-700 dark:bg-slate-500/30 dark:text-slate-300',
};

function userName(user?: User | null): string {
    if (!user) return '—';
    return [user.name, user.last_name].filter(Boolean).join(' ') || user.usuario || '—';
}

function warehousePath(warehouse?: Warehouse | null): string {
    if (!warehouse) return '—';
    const zonal = warehouse.office?.zonal?.name ?? '';
    const office = warehouse.office?.name ?? '';
    return [zonal, office, warehouse.name].filter(Boolean).join(' / ') || warehouse.name;
}

function formatDate(value?: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function formatDateTime(value?: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function buildUrl(params: Partial<Filters> & { page?: number }) {
    const search = new URLSearchParams();
    if (params.status !== undefined) search.set('status', params.status);
    if (params.date_from !== undefined && params.date_from !== '') search.set('date_from', params.date_from);
    if (params.date_to !== undefined && params.date_to !== '') search.set('date_to', params.date_to);
    if (params.zonal_id !== undefined) search.set('zonal_id', params.zonal_id);
    if (params.office_id !== undefined) search.set('office_id', params.office_id);
    if (params.warehouse_id !== undefined) search.set('warehouse_id', params.warehouse_id);
    if (params.page !== undefined) search.set('page', String(params.page));
    return `/admin/inventory-counts?${search.toString()}`;
}

export default function InventoryCountsIndex(props: Props) {
    const {
        counts,
        filters,
        stats,
        zonalsForSelect,
        officesForSelect,
        warehousesForSelect,
    } = props;

    const { props: pageProps } = usePage();
    const auth = (pageProps as { auth?: { permissions?: string[] } }).auth;
    const permissions = auth?.permissions ?? [];
    const canView = permissions.includes('inventory_counts.view');
    const canViewItems = permissions.includes('inventory_counts.view_items');
    const canCreate = permissions.includes('inventory_counts.create');
    const canDelete = permissions.includes('inventory_counts.delete');
    const canExport = permissions.includes('inventory_counts.export');

    const [cascadeZonalId, setCascadeZonalId] = useState<string>(filters.zonal_id ?? '');
    const [cascadeOfficeId, setCascadeOfficeId] = useState<string>(filters.office_id ?? '');
    const [createOpen, setCreateOpen] = useState(false);
    const [modalZonalId, setModalZonalId] = useState('');
    const [modalOfficeId, setModalOfficeId] = useState('');
    const [modalWarehouseId, setModalWarehouseId] = useState('');
    const today = (() => {
        const nowInLima = new Date(
            new Date().toLocaleString('en-US', { timeZone: 'America/Lima' })
        );
        const year = nowInLima.getFullYear();
        const month = String(nowInLima.getMonth() + 1).padStart(2, '0');
        const day = String(nowInLima.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    })();
    const [createForm, setCreateForm] = useState({ warehouse_id: '', count_date: today });
    const [deleteItem, setDeleteItem] = useState<CountRow | null>(null);
    const [deleting, setDeleting] = useState(false);

    const flash = pageProps.flash as { toast?: ToastMessage } | undefined;
    const [toastQueue, setToastQueue] = useState<Array<ToastMessage & { id: number }>>([]);
    const lastFlashRef = useRef<ToastMessage | null>(null);

    useEffect(() => {
        const t = flash?.toast;
        if (!t || t === lastFlashRef.current) return;
        lastFlashRef.current = t;
        setToastQueue((q) => [...q, { ...t, id: Date.now() }]);
    }, [flash?.toast]);

    const officesFilteredByZonal = cascadeZonalId
        ? officesForSelect.filter((o) => o.zonal_id === cascadeZonalId)
        : officesForSelect;
    const warehousesFilteredByCascade = cascadeOfficeId
        ? warehousesForSelect.filter((w) => w.office_id === cascadeOfficeId)
        : cascadeZonalId
          ? warehousesForSelect.filter((w) => w.office?.zonal_id === cascadeZonalId)
          : warehousesForSelect;

    const modalOfficesByZonal = modalZonalId
        ? officesForSelect.filter((o) => o.zonal_id === modalZonalId)
        : officesForSelect;
    const modalWarehousesByCascade = modalOfficeId
        ? warehousesForSelect.filter((w) => w.office_id === modalOfficeId)
        : modalZonalId
          ? warehousesForSelect.filter((w) => w.office?.zonal_id === modalZonalId)
          : warehousesForSelect;

    const applyFilters = useCallback(
        (next: Partial<Filters> & { page?: number }) => {
            router.get(buildUrl({ ...filters, ...next }), {}, { preserveState: true, preserveScroll: true });
        },
        [filters]
    );

    const handleSort = useCallback(
        (key: string) => {
            const currentKey = filters.sort_by ?? 'count_date';
            const currentOrder = filters.sort_order ?? 'desc';
            const order: SortOrder =
                currentKey === key && currentOrder === 'asc' ? 'desc' : 'asc';
            applyFilters({ sort_by: key, sort_order: order });
        },
        [filters.sort_by, filters.sort_order, applyFilters]
    );

    const canSubmitCreate = createForm.warehouse_id.trim() !== '' && createForm.count_date.trim() !== '';

    const submitCreate = () => {
        if (!canSubmitCreate) return;
        router.post('/admin/inventory-counts', {
            warehouse_id: createForm.warehouse_id,
            count_date: createForm.count_date,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setCreateOpen(false);
                setCreateForm({ warehouse_id: '', count_date: '' });
                setModalZonalId('');
                setModalOfficeId('');
                setModalWarehouseId('');
            },
        });
    };

    const submitDelete = () => {
        if (!deleteItem) return;
        setDeleting(true);
        router.delete(`/admin/inventory-counts/${deleteItem.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteItem(null);
            },
        });
    };

    const columns: DataTableColumn<CountRow>[] = [
        {
            key: 'count_date',
            label: 'Fecha conteo',
            sortable: true,
            className: 'text-xs text-foreground',
            render: (row) => formatDate(row.count_date),
        },
        {
            key: 'warehouse',
            label: 'Almacén',
            sortable: true,
            className: 'max-w-[220px] text-xs text-foreground',
            render: (row) => <span>{warehousePath(row.warehouse)}</span>,
        },
        {
            key: 'status',
            label: 'Estado',
            sortable: true,
            className: 'text-xs text-foreground',
            render: (row) => (
                <span
                    className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                        STATUS_BADGE[row.status] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-500/25 dark:text-slate-300'
                    )}
                >
                    {STATUS_LABELS[row.status] ?? row.status}
                </span>
            ),
        },
        {
            key: 'items_count',
            label: 'Ítems',
            sortable: true,
            className: 'text-xs text-foreground',
            render: (row) => row.items_count ?? 0,
        },
        {
            key: 'reconciled',
            label: 'Reconciliado',
            sortable: false,
            className: 'text-xs text-muted-foreground',
            render: (row) =>
                row.reconciled_at ? (
                    <span>
                        {userName(row.reconciled_by)} · {formatDateTime(row.reconciled_at)}
                    </span>
                ) : (
                    '—'
                ),
        },
        {
            key: 'actions',
            label: '',
            sortable: false,
            className: 'w-0 text-right',
            render: (row: CountRow) => (
                <div className="flex flex-row flex-nowrap items-center justify-end gap-1">
                    {canViewItems && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            title="Ver detalle del conteo"
                            className="cursor-pointer size-8 shrink-0 text-sky-700 hover:bg-sky-50 hover:text-sky-900 dark:text-sky-300 dark:hover:bg-sky-950/40"
                            onClick={() => router.get(`/admin/inventory-counts/${row.id}`)}
                        >
                            <span className="text-xs font-medium sm:hidden">Detalle</span>
                            <Eye className="hidden sm:inline-block size-4" />
                        </Button>
                    )}
                    {canExport && (
                        <a
                            href={`/admin/inventory-counts/${row.id}/export`}
                            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[#217346] hover:bg-emerald-50 hover:text-[#1a5c38] dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                            title="Descargar inventario físico en Excel"
                            aria-label="Descargar Excel"
                        >
                            <FileDown className="size-4" />
                        </a>
                    )}
                    {canDelete && row.status === 'in_progress' && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer size-8 shrink-0 rounded-md text-rose-700 hover:text-rose-800 hover:bg-rose-50 dark:text-rose-300 dark:hover:text-rose-200 dark:hover:bg-rose-950/30"
                            title="Eliminar conteo"
                            onClick={() => setDeleteItem(row)}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    if (!canView) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Inventario físico" />
                <div className="p-6">
                    <p className="text-sm text-muted-foreground">
                        No tiene permisos para ver este módulo.
                    </p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventario físico" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                {toastQueue.length > 0 && (
                    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
                        {toastQueue.map((t) => (
                            <Toast
                                key={t.id}
                                toast={t}
                                onDismiss={() => setToastQueue((q) => q.filter((item) => item.id !== t.id))}
                                duration={3000}
                            />
                        ))}
                    </div>
                )}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-3">
                        <div>
                            <h1 className="relative inline-block pb-1 text-xl font-semibold text-foreground">
                                Inventario físico
                                <span className="absolute bottom-0 left-0 h-0.5 w-8 rounded-full bg-inv-primary" />
                            </h1>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Conteos físicos por almacén (esperado vs contado y conciliación).
                        </p>
                        <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] text-gray-700 dark:bg-blue-500/20 dark:text-gray-300">
                                <ClipboardCheck className="size-3 shrink-0 text-blue-600 dark:text-blue-400" />
                                <span>Total</span>
                                <span className="font-semibold">{stats.total}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] text-amber-800 dark:bg-amber-500/25 dark:text-amber-300">
                                <span>En progreso</span>
                                <span className="font-semibold">{stats.in_progress}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-300">
                                <span>Reconciliados</span>
                                <span className="font-semibold">{stats.reconciled}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] text-slate-700 dark:bg-slate-500/30 dark:text-slate-300">
                                <span>Cerrados</span>
                                <span className="font-semibold">{stats.closed}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-500/25 dark:text-amber-300">
                                <Filter className="size-3 shrink-0" />
                                <span>Filtros</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-medium text-teal-800 dark:bg-teal-500/25 dark:text-teal-300">
                                <LayoutGrid className="size-3 shrink-0" />
                                <span>En pantalla</span>
                                <span className="font-semibold">{counts.data.length}</span>
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-start">
                        {canCreate && (
                            <button
                                type="button"
                                onClick={() => {
                                    setCreateForm({ warehouse_id: '', count_date: today });
                                    setModalZonalId('');
                                    setModalOfficeId('');
                                    setModalWarehouseId('');
                                    setCreateOpen(true);
                                }}
                                className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md bg-inv-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-inv-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2"
                            >
                                <Plus className="size-4" />
                                <span>Nuevo conteo</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="border-t border-border w-full shrink-0" aria-hidden />

                <div className="rounded-xl border border-border bg-card shadow-sm">
                    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <Select
                            value={(filters.status ?? '') === '' ? '_' : filters.status}
                            onValueChange={(value) =>
                                applyFilters({ status: value === '_' ? '' : value })
                            }
                        >
                            <SelectTrigger className="w-full border-border bg-background sm:w-[200px]">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos los estados</SelectItem>
                                <SelectItem value="in_progress">En progreso</SelectItem>
                                <SelectItem value="reconciled">Reconciliado</SelectItem>
                                <SelectItem value="closed">Cerrado</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={cascadeZonalId === '' ? '_' : cascadeZonalId}
                            onValueChange={(value) => {
                                const id = value === '_' ? '' : value;
                                setCascadeZonalId(id);
                                setCascadeOfficeId('');
                                applyFilters({ zonal_id: id, office_id: '', warehouse_id: '' });
                            }}
                        >
                            <SelectTrigger className="w-full border-border bg-background sm:w-[180px]">
                                <SelectValue placeholder="Zonal" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos los zonales</SelectItem>
                                {zonalsForSelect.map((z) => (
                                    <SelectItem key={z.id} value={z.id}>
                                        {z.name} {z.code ? `(${z.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={cascadeOfficeId === '' ? '_' : cascadeOfficeId}
                            onValueChange={(value) => {
                                const id = value === '_' ? '' : value;
                                setCascadeOfficeId(id);
                                applyFilters({ office_id: id, warehouse_id: '' });
                            }}
                            disabled={!cascadeZonalId}
                        >
                            <SelectTrigger className="w-full border-border bg-background sm:w-[200px]">
                                <SelectValue placeholder="Oficina" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todas las oficinas</SelectItem>
                                {officesFilteredByZonal.map((office) => (
                                    <SelectItem key={office.id} value={office.id}>
                                        {office.name} {office.code ? `(${office.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={(filters.warehouse_id ?? '') === '' ? '_' : filters.warehouse_id}
                            onValueChange={(value) =>
                                applyFilters({ warehouse_id: value === '_' ? '' : value })
                            }
                            disabled={!cascadeZonalId && !cascadeOfficeId}
                        >
                            <SelectTrigger className="w-full border-border bg-background sm:w-[220px]">
                                <SelectValue placeholder="Almacén" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos los almacenes</SelectItem>
                                {warehousesFilteredByCascade.map((w) => (
                                    <SelectItem key={w.id} value={w.id}>
                                        {warehousePath(w)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                            <Input
                                type="date"
                                value={filters.date_from ?? ''}
                                onChange={(e) => applyFilters({ date_from: e.target.value })}
                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus:border-inv-primary focus:ring-1 focus:ring-inv-primary sm:w-auto"
                            />
                            <Input
                                type="date"
                                value={filters.date_to ?? ''}
                                onChange={(e) => applyFilters({ date_to: e.target.value })}
                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus:border-inv-primary focus:ring-1 focus:ring-inv-primary sm:w-auto"
                            />
                        </div>
                    </div>

                    <div className="hidden md:block">
                        <div className="overflow-x-auto">
                            <DataTable
                                columns={columns}
                                data={counts.data}
                                keyExtractor={(row) => row.id}
                                sortBy={filters.sort_by}
                                sortOrder={filters.sort_order}
                                onSort={handleSort}
                                emptyMessage="No hay conteos registrados."
                                variant="default"
                            />
                        </div>
                    </div>

                    <div className="md:hidden">
                        {counts.data.length === 0 ? (
                            <p className="py-6 px-4 text-center text-sm text-muted-foreground">
                                No hay conteos registrados.
                            </p>
                        ) : (
                            <ul className="flex flex-col gap-3 p-3">
                                {counts.data.map((row) => (
                                    <li key={row.id}>
                                        <article className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
                                            <div className="space-y-1.5 p-4">
                                                <p className="text-sm font-semibold text-foreground">
                                                    {formatDate(row.count_date)} · {warehousePath(row.warehouse)}
                                                </p>
                                                <dl className="grid grid-cols-1 gap-1 text-xs">
                                                    <div className="flex flex-wrap gap-1">
                                                        <dt className="mr-1 font-medium text-muted-foreground">Estado:</dt>
                                                        <dd>{STATUS_LABELS[row.status] ?? row.status}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        <dt className="mr-1 font-medium text-muted-foreground">Ítems:</dt>
                                                        <dd>{row.items_count ?? 0}</dd>
                                                    </div>
                                                    {row.reconciled_at && (
                                                        <div className="flex flex-wrap gap-1">
                                                            <dt className="mr-1 font-medium text-muted-foreground">Reconciliado:</dt>
                                                            <dd>{userName(row.reconciled_by)} · {formatDateTime(row.reconciled_at)}</dd>
                                                        </div>
                                                    )}
                                                </dl>
                                            </div>
                                            <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/40 px-3 py-2">
                                                {canViewItems && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="cursor-pointer border-sky-200 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-950/30"
                                                        onClick={() => router.get(`/admin/inventory-counts/${row.id}`)}
                                                    >
                                                        Detalle
                                                    </Button>
                                                )}
                                                {canExport && (
                                                    <a
                                                        href={`/admin/inventory-counts/${row.id}/export`}
                                                        className="inline-flex items-center gap-1.5 rounded-md border border-[#217346]/40 bg-[#217346]/10 px-3 py-2 text-xs font-medium text-[#217346] hover:bg-[#217346]/20 dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                                                        title="Descargar inventario físico en Excel"
                                                    >
                                                        <FileDown className="size-3.5" />
                                                        Excel
                                                    </a>
                                                )}
                                                {canDelete && row.status === 'in_progress' && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="cursor-pointer border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                                        onClick={() => setDeleteItem(row)}
                                                    >
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
                            from={counts.from}
                            to={counts.to}
                            total={counts.total}
                            perPage={counts.per_page}
                            currentPage={counts.current_page}
                            lastPage={counts.last_page}
                            links={counts.links}
                            buildPageUrl={(page) => buildUrl({ ...filters, page })}
                            onPerPageChange={() => {}}
                            perPageOptions={[25]}
                        />
                    </div>
                </div>
            </div>

            <AppModal
                open={createOpen}
                onOpenChange={setCreateOpen}
                title="Nuevo conteo"
                contentClassName="space-y-4"
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        submitCreate();
                    }}
                    className="space-y-4"
                >
                    <div className="space-y-2">
                        <Label>
                            Zonal <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={modalZonalId === '' ? '_' : modalZonalId}
                            onValueChange={(value) => {
                                const id = value === '_' ? '' : value;
                                setModalZonalId(id);
                                setModalOfficeId('');
                                setModalWarehouseId('');
                                setCreateForm((f) => ({ ...f, warehouse_id: '' }));
                            }}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue placeholder="Seleccione zonal" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Seleccione zonal</SelectItem>
                                {zonalsForSelect.map((z) => (
                                    <SelectItem key={z.id} value={z.id}>
                                        {z.name} {z.code ? `(${z.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>
                            Oficina <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={modalOfficeId === '' ? '_' : modalOfficeId}
                            onValueChange={(value) => {
                                const id = value === '_' ? '' : value;
                                setModalOfficeId(id);
                                setModalWarehouseId('');
                                setCreateForm((f) => ({ ...f, warehouse_id: '' }));
                            }}
                            disabled={!modalZonalId}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue placeholder="Seleccione oficina" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Seleccione oficina</SelectItem>
                                {modalOfficesByZonal.map((o) => (
                                    <SelectItem key={o.id} value={o.id}>
                                        {o.name} {o.code ? `(${o.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>
                            Almacén <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={createForm.warehouse_id === '' ? '_' : createForm.warehouse_id}
                            onValueChange={(value) =>
                                setCreateForm((f) => ({ ...f, warehouse_id: value === '_' ? '' : value }))
                            }
                            disabled={!modalZonalId || !modalOfficeId}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue placeholder="Seleccione almacén" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Seleccione almacén</SelectItem>
                                {modalWarehousesByCascade.map((w) => (
                                    <SelectItem key={w.id} value={w.id}>
                                        {warehousePath(w)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="count_date">
                            Fecha de conteo <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="count_date"
                            type="date"
                            value={createForm.count_date}
                            onChange={(e) => setCreateForm((f) => ({ ...f, count_date: e.target.value }))}
                            className="w-full border-border bg-background"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCreateOpen(false)}
                            className="cursor-pointer"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={!canSubmitCreate}
                            className="cursor-pointer bg-inv-primary text-white hover:bg-inv-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Guardar
                        </Button>
                    </div>
                </form>
            </AppModal>

            <DeleteConfirmModal
                open={!!deleteItem}
                onOpenChange={(open) => !open && setDeleteItem(null)}
                title="Eliminar conteo"
                description={
                    deleteItem
                        ? `¿Está seguro de eliminar el conteo del ${formatDate(deleteItem.count_date)} (${warehousePath(deleteItem.warehouse)})? Solo se puede eliminar un conteo en estado "En progreso".`
                        : ''
                }
                confirmLabel="Eliminar"
                onConfirm={submitDelete}
                loading={deleting}
                variant="danger"
            />
        </AppLayout>
    );
}
