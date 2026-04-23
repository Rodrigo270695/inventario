import { Head, Link, router, usePage } from '@inertiajs/react';
import { Eye, LayoutGrid, PackagePlus, Plus, Trash2, Warehouse } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataTableColumn, SortOrder } from '@/components/data-table';
import { DataTable } from '@/components/data-table';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';
import { DateRangeFilter, type DateRangeFilterValue } from '@/components/date-range-filter';
import { SearchFilter } from '@/components/search-filter';
import { StockEntryFormModal } from '@/components/stock-entries/stock-entry-form-modal';
import { Toast } from '@/components/toast';
import type { ToastMessage } from '@/components/toast';
import { TablePagination } from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, PaginationMeta, StockEntry } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Compras y logística', href: '#' },
    { title: 'Ingresos almacén', href: '/admin/stock-entries' },
];

const SEARCH_DEBOUNCE_MS = 400;

const STATUS_LABELS: Record<string, string> = {
    draft: 'Borrador',
    completed: 'Completado',
};

const STATUS_CLASS: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
};

type WarehouseOption = {
    id: string;
    name: string;
    code: string | null;
    office?: { id: string; zonal_id?: string; name?: string; code?: string | null; zonal?: { id: string; name?: string; code?: string } | null } | null;
};

type Filters = {
    q: string;
    status: string;
    warehouse_id: string;
    date_from: string;
    date_to: string;
    sort_by: string;
    sort_order: SortOrder;
    per_page: number;
};

type Stats = {
    total: number;
    draft: number;
};

type InvoiceForCreate = {
    id: string;
    invoice_number: string;
    purchase_order_id: string | null;
    purchase_order?: {
        id: string;
        code: string | null;
        office_id?: string;
        office?: { id: string; name: string; code: string | null; zonal?: { id: string; name: string; code: string } | null } | null;
    } | null;
};

type UserForCreate = { id: string; name: string; last_name: string; usuario: string; zonal_ids?: string[] };

type StockEntriesIndexProps = {
    stockEntries: {
        data: StockEntry[];
        links: PaginationMeta['links'];
        from: number | null;
        to: number | null;
        total: number;
        current_page: number;
        last_page: number;
        per_page: number;
    };
    warehousesForFilter: WarehouseOption[];
    invoicesForCreate?: InvoiceForCreate[];
    usersForCreate?: UserForCreate[];
    filters: Filters;
    stats?: Stats;
    canView?: boolean;
    canCreate?: boolean;
    canItemCreate?: boolean;
    canItemUpdate?: boolean;
    canItemDelete?: boolean;
    canSave?: boolean;
    canDelete?: boolean;
};

function buildUrl(params: Partial<Filters> & { page?: number }) {
    const search = new URLSearchParams();
    if (params.q !== undefined) search.set('q', params.q);
    if (params.status !== undefined) search.set('status', params.status);
    if (params.warehouse_id !== undefined) search.set('warehouse_id', params.warehouse_id);
    if (params.date_from !== undefined && params.date_from !== '') search.set('date_from', params.date_from);
    if (params.date_to !== undefined && params.date_to !== '') search.set('date_to', params.date_to);
    if (params.sort_by !== undefined) search.set('sort_by', params.sort_by);
    if (params.sort_order !== undefined) search.set('sort_order', params.sort_order);
    if (params.per_page !== undefined) search.set('per_page', String(params.per_page));
    if (params.page !== undefined) search.set('page', String(params.page));
    return `/admin/stock-entries?${search.toString()}`;
}

function formatWarehousePath(row: StockEntry): string {
    const wh = row.warehouse;
    if (!wh) return '—';
    const parts = [
        wh.office?.zonal?.name ?? wh.office?.zonal?.code ?? null,
        wh.office?.name ?? wh.office?.code ?? null,
        wh.name ?? wh.code ?? null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' / ') : (wh.name ?? '—');
}

function fullName(u: StockEntry['received_by_user']): string {
    if (!u) return '—';
    return [u.name, u.last_name].filter(Boolean).join(' ') || u.usuario || '—';
}

export default function StockEntriesIndex({
    stockEntries,
    warehousesForFilter,
    invoicesForCreate = [],
    usersForCreate = [],
    filters,
    stats,
    canView = true,
    canCreate = false,
    canItemCreate = false,
    canItemUpdate = false,
    canItemDelete = false,
    canSave = false,
    canDelete = false,
}: StockEntriesIndexProps) {
    const { data, links, from, to, total, current_page, last_page } = stockEntries;
    const statsDraft = stats?.draft ?? 0;
    const [searchInput, setSearchInput] = useState(() => {
        const q = filters.q;
        if (q == null || q === 'null') return '';
        return String(q);
    });
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [deleteEntry, setDeleteEntry] = useState<StockEntry | null>(null);
    const [deleting, setDeleting] = useState(false);

    const { props } = usePage();
    const flash = props.flash as { toast?: ToastMessage } | undefined;
    const [toastQueue, setToastQueue] = useState<Array<ToastMessage & { id: number }>>([]);
    const lastFlashToastRef = useRef<ToastMessage | null>(null);

    useEffect(() => {
        const t = flash?.toast;
        if (!t) return;
        if (t === lastFlashToastRef.current) return;
        lastFlashToastRef.current = t;
        const id = Date.now();
        setToastQueue((q) => [...q, { ...t, id }]);
    }, [flash?.toast]);

    const removeToast = useCallback((id: number) => {
        setToastQueue((q) => q.filter((item) => item.id !== id));
    }, []);

    const applyFilters = useCallback(
        (next: Partial<Filters> & { page?: number }) => {
            router.get(buildUrl({ ...filters, ...next }), {}, { preserveState: true });
        },
        [filters]
    );

    useEffect(() => {
        const t = setTimeout(() => {
            const effectiveQ = filters.q == null || filters.q === 'null' ? '' : String(filters.q);
            if (searchInput !== effectiveQ) {
                applyFilters({ q: searchInput || '', page: 1 });
            }
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [searchInput, filters.q, applyFilters]);

    const handleSort = useCallback(
        (key: string) => {
            const order =
                filters.sort_by === key && filters.sort_order === 'asc' ? 'desc' : 'asc';
            applyFilters({ sort_by: key, sort_order: order as SortOrder });
        },
        [filters.sort_by, filters.sort_order, applyFilters]
    );

    const handlePerPage = (perPage: number) => {
        applyFilters({ per_page: perPage, page: 1 });
    };

    const handleDeleteConfirm = () => {
        if (!deleteEntry) return;
        setDeleting(true);
        router.delete(`/admin/stock-entries/${deleteEntry.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteEntry(null);
            },
        });
    };

    const columns: DataTableColumn<StockEntry>[] = [
        {
            key: 'entry_date',
            label: 'Fecha ingreso',
            sortable: true,
            className: 'text-foreground text-xs',
            render: (row) =>
                row.entry_date
                    ? new Date(row.entry_date).toLocaleDateString('es', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                      })
                    : '—',
        },
        {
            key: 'warehouse',
            label: 'Zonal / Oficina / Almacén',
            sortable: false,
            className: 'text-foreground text-xs max-w-[200px]',
            render: (row) => {
                const wh = row.warehouse;
                const fullPath = formatWarehousePath(row);
                const warehouse = wh?.name ?? wh?.code ?? '—';
                const zonalOffice = wh?.office
                    ? [wh.office.zonal?.name ?? wh.office.zonal?.code, wh.office.name ?? wh.office.code].filter(Boolean).join(' · ') || null
                    : null;
                return (
                    <div className="min-w-0 truncate" title={fullPath}>
                        <span className="block truncate font-medium text-foreground">{warehouse}</span>
                        {zonalOffice && (
                            <span className="block truncate text-[11px] text-muted-foreground">
                                {zonalOffice}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'invoice',
            label: 'Factura',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => {
                const inv = row.invoice;
                if (!inv) return <span>—</span>;
                const num = inv.invoice_number ?? '—';
                const oc = inv.purchase_order?.code ? ` #${inv.purchase_order.code}` : '';
                return (
                    <span className="font-medium text-foreground">
                        {num}
                        {oc && <span className="text-muted-foreground text-[11px]">{oc}</span>}
                    </span>
                );
            },
        },
        {
            key: 'status',
            label: 'Estado',
            sortable: true,
            className: 'text-foreground text-xs',
            render: (row) => (
                <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_CLASS[row.status] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400'}`}
                >
                    {STATUS_LABELS[row.status] ?? row.status}
                </span>
            ),
        },
        {
            key: 'items_count',
            label: 'Ítems',
            sortable: false,
            className: 'text-foreground text-xs text-center',
            render: (row) => (
                <span className="tabular-nums">{row.items_count != null ? row.items_count : '—'}</span>
            ),
        },
        {
            key: 'registered_by',
            label: 'Registrado por',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => <span>{fullName(row.registered_by_user)}</span>,
        },
        {
            key: 'created_at',
            label: 'Creado',
            sortable: true,
            className: 'text-foreground text-xs',
            render: (row) =>
                row.created_at
                    ? new Date(row.created_at).toLocaleDateString('es', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                      })
                    : '—',
        },
        {
            key: 'actions',
            label: '',
            className: 'min-w-[100px] text-right',
            render: (row) => {
                const isDraft = row.status === 'draft';
                const itemsHref = `/admin/stock-entries/${row.id}/items`;
                return (
                    <div className="flex flex-row flex-nowrap items-center justify-end gap-1">
                        {isDraft ? (
                            (canView || canItemCreate || canItemUpdate || canItemDelete || canSave) && (
                                <Link
                                    href={itemsHref}
                                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-inv-primary hover:bg-inv-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary"
                                    aria-label="Ver ítems"
                                >
                                    <PackagePlus className="size-4" />
                                </Link>
                            )
                        ) : (
                            <Link
                                href={itemsHref}
                                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                aria-label="Ver detalle"
                            >
                                <Eye className="size-4" />
                            </Link>
                        )}
                        {isDraft && canDelete && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer shrink-0 size-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400/80 dark:hover:bg-rose-900/20"
                                aria-label="Eliminar ingreso"
                                onClick={() => setDeleteEntry(row)}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        )}
                    </div>
                );
            },
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ingresos almacén" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-3">
                        <div>
                            <h1 className="relative inline-block pb-1 text-xl font-semibold text-foreground">
                                Ingresos almacén
                                <span className="absolute bottom-0 left-0 h-0.5 w-8 rounded-full bg-inv-primary" />
                            </h1>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            Registro de ingresos de stock al almacén (vinculados a factura u otros).
                        </p>
                        <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-blue-500/20 dark:text-gray-400">
                                <Warehouse className="size-3 shrink-0 text-blue-600 dark:text-blue-400" />
                                <span>Total</span>
                                <span className="font-semibold">{total}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-slate-500/20 dark:text-gray-400">
                                <span>Borrador</span>
                                <span className="font-semibold">{statsDraft}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-amber-500/20 dark:text-gray-400">
                                <span>Página</span>
                                <span className="font-semibold">{current_page}/{last_page}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-slate-500/20 dark:text-gray-400">
                                <LayoutGrid className="size-3 shrink-0 text-slate-600 dark:text-slate-400" />
                                <span>En pantalla</span>
                                <span className="font-semibold">{data.length}</span>
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-start">
                        {canCreate && (
                            <Button
                                type="button"
                                onClick={() => setCreateModalOpen(true)}
                                className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md bg-inv-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-inv-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2"
                                aria-label="Nuevo ingreso"
                            >
                                <Plus className="size-4" />
                                <span>Nuevo ingreso</span>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="border-t border-border w-full shrink-0" aria-hidden />

                <div className="rounded-xl border border-border bg-card shadow-sm">
                    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <SearchFilter
                            value={searchInput}
                            onChange={setSearchInput}
                            placeholder="Buscar por factura, almacén, zonal, recibido por…"
                            className="w-full [&_input]:bg-white [&_input]:border-border [&_input]:text-foreground sm:max-w-xs"
                        />
                        <Select
                            value={(filters.status ?? '') === '' ? '_' : filters.status}
                            onValueChange={(v) =>
                                applyFilters({ status: v === '_' ? '' : v, page: 1 })
                            }
                        >
                            <SelectTrigger className="w-full border-border bg-background sm:w-[160px]">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos los estados</SelectItem>
                                <SelectItem value="draft">Borrador</SelectItem>
                                <SelectItem value="completed">Completado</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={(filters.warehouse_id ?? '') === '' ? '_' : filters.warehouse_id}
                            onValueChange={(v) =>
                                applyFilters({ warehouse_id: v === '_' ? '' : v, page: 1 })
                            }
                        >
                            <SelectTrigger className="w-full border-border bg-background sm:w-[200px]">
                                <SelectValue placeholder="Almacén" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos los almacenes</SelectItem>
                                {warehousesForFilter.map((w) => (
                                    <SelectItem key={w.id} value={w.id}>
                                        {w.code ? `${w.code} - ${w.name}` : w.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <DateRangeFilter
                            value={
                                (filters.date_from ?? '') !== '' || (filters.date_to ?? '') !== ''
                                    ? {
                                          date_from: filters.date_from ?? '',
                                          date_to: filters.date_to ?? '',
                                      }
                                    : null
                            }
                            onChange={(range: DateRangeFilterValue) =>
                                applyFilters({
                                    date_from: range?.date_from ?? '',
                                    date_to: range?.date_to ?? '',
                                    page: 1,
                                })
                            }
                            className="w-full sm:w-auto"
                        />
                    </div>
                    <div className="hidden md:block">
                        <DataTable
                            columns={columns}
                            data={data}
                            keyExtractor={(r) => r.id}
                            sortBy={filters.sort_by}
                            sortOrder={filters.sort_order}
                            onSort={handleSort}
                            emptyMessage="No hay ingresos de almacén. Crea uno con «Nuevo ingreso»."
                            variant="default"
                        />
                    </div>
                    <div className="md:hidden">
                        {data.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8 px-4 text-sm">
                                No hay ingresos de almacén. Crea uno con «Nuevo ingreso».
                            </p>
                        ) : (
                            <ul className="flex flex-col gap-3 p-3 sm:p-4">
                                {data.map((row) => (
                                    <li key={row.id}>
                                        <article className="rounded-lg border border-border bg-card shadow-[0_1px_2px_0_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                                            <div className="space-y-2 p-4">
                                                <p className="font-medium text-foreground text-base">
                                                    {row.entry_date
                                                        ? new Date(row.entry_date).toLocaleDateString('es', {
                                                              day: '2-digit',
                                                              month: 'short',
                                                              year: 'numeric',
                                                          })
                                                        : 'Sin fecha'}
                                                    {row.invoice?.invoice_number && (
                                                        <span className="ml-2 text-muted-foreground text-sm">
                                                            · {row.invoice.invoice_number}
                                                        </span>
                                                    )}
                                                </p>
                                                <dl className="grid grid-cols-1 gap-1.5 text-sm">
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Almacén:</dt>
                                                        <dd className="text-foreground">{formatWarehousePath(row)}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Estado:</dt>
                                                        <dd>
                                                            <span
                                                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[row.status] ?? ''}`}
                                                            >
                                                                {STATUS_LABELS[row.status] ?? row.status}
                                                            </span>
                                                        </dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Ítems:</dt>
                                                        <dd className="text-foreground tabular-nums">
                                                            {row.items_count != null ? row.items_count : '—'}
                                                        </dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Registrado por:</dt>
                                                        <dd className="text-foreground">{fullName(row.registered_by_user)}</dd>
                                                    </div>
                                                    {row.created_at && (
                                                        <div className="flex flex-wrap gap-x-2">
                                                            <dt className="text-muted-foreground shrink-0">Creado:</dt>
                                                            <dd className="text-foreground">
                                                                {new Date(row.created_at).toLocaleDateString('es', {
                                                                    day: '2-digit',
                                                                    month: 'short',
                                                                    year: 'numeric',
                                                                })}
                                                            </dd>
                                                        </div>
                                                    )}
                                                </dl>
                                            </div>
                                            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-muted/30 px-4 py-3 min-h-[44px]">
                                                {row.status === 'draft' ? (
                                                    (canView || canItemCreate || canItemUpdate || canItemDelete || canSave) && (
                                                        <Link
                                                            href={`/admin/stock-entries/${row.id}/items`}
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-inv-primary bg-inv-primary/5 px-3 py-2 text-sm font-medium text-inv-primary hover:bg-inv-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary"
                                                        >
                                                            <PackagePlus className="size-4" />
                                                            Ver ítems
                                                        </Link>
                                                    )
                                                ) : (
                                                    <Link
                                                        href={`/admin/stock-entries/${row.id}/items`}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                                    >
                                                        <Eye className="size-4" />
                                                        Ver detalle
                                                    </Link>
                                                )}
                                                {row.status === 'draft' && canDelete && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="cursor-pointer shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/20"
                                                        onClick={() => setDeleteEntry(row)}
                                                    >
                                                        <Trash2 className="size-3.5 shrink-0 mr-1" />
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
                            from={from}
                            to={to}
                            total={total}
                            perPage={filters.per_page}
                            currentPage={current_page}
                            lastPage={last_page}
                            links={links}
                            buildPageUrl={(page) => buildUrl({ ...filters, page })}
                            onPerPageChange={handlePerPage}
                            perPageOptions={[5, 10, 15, 25, 50, 100]}
                        />
                    </div>
                </div>
            </div>

            {canCreate && (
                <StockEntryFormModal
                    open={createModalOpen}
                    onOpenChange={setCreateModalOpen}
                    invoices={invoicesForCreate}
                    warehouses={warehousesForFilter}
                    users={usersForCreate}
                />
            )}

            <DeleteConfirmModal
                open={!!deleteEntry}
                onOpenChange={(open) => !open && setDeleteEntry(null)}
                title="Eliminar ingreso"
                description={
                    deleteEntry
                        ? `¿Eliminar el ingreso del ${deleteEntry.entry_date ? new Date(deleteEntry.entry_date).toLocaleDateString('es') : '—'} (${deleteEntry.warehouse?.name ?? 'almacén'})? Se eliminarán todos los ítems.`
                        : undefined
                }
                onConfirm={handleDeleteConfirm}
                loading={deleting}
            />
            {toastQueue.length > 0 && (
                <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
                    {toastQueue.map((t) => (
                        <Toast
                            key={t.id}
                            toast={t}
                            onDismiss={() => removeToast(t.id)}
                            duration={3000}
                        />
                    ))}
                </div>
            )}
        </AppLayout>
    );
}
