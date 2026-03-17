import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    Check,
    CheckCircle2,
    Eye,
    FileDown,
    FileText,
    LayoutGrid,
    Pencil,
    Plus,
    ShoppingCart,
    Trash2,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataTableColumn, SortOrder } from '@/components/data-table';
import { DataTable } from '@/components/data-table';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';
import { DateRangeFilter, type DateRangeFilterValue } from '@/components/date-range-filter';
import { SearchFilter } from '@/components/search-filter';
import { TablePagination } from '@/components/table-pagination';
import { Toast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { AppModal } from '@/components/app-modal';
import { PurchaseOrderStatusBadge } from '@/components/purchase-orders/status-badge';
import { PurchaseOrderActionsCell } from '@/components/purchase-orders/actions-cell';
import type { BreadcrumbItem, PaginationMeta, PurchaseOrder } from '@/types';
import type { ToastMessage } from '@/components/toast';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Compras y logística', href: '#' },
    { title: 'Órdenes de compra', href: '/admin/purchase-orders' },
];

const SEARCH_DEBOUNCE_MS = 400;

type SupplierOption = { id: string; name: string };

type Filters = {
    q: string;
    status: string;
    supplier_id: string;
    date_from: string;
    date_to: string;
    sort_by: string;
    sort_order: SortOrder;
    per_page: number;
};

type Stats = {
    total: number;
    pending: number;
    approved: number;
};

type PurchaseOrdersIndexProps = {
    purchaseOrders: {
        data: PurchaseOrder[];
        links: PaginationMeta['links'];
        from: number | null;
        to: number | null;
        total: number;
        current_page: number;
        last_page: number;
        per_page: number;
    };
    suppliersForFilter: SupplierOption[];
    filters: Filters;
    stats?: Stats;
    canApprove?: boolean;
    canViewDetail?: boolean;
};

type ActionModalType = 'approve' | 'reject' | 'observe' | null;

const ACTION_MODAL_CONFIG: Record<
    Exclude<ActionModalType, null>,
    { title: string; description: string; placeholder: string; endpoint: string; confirmLabel: string; confirmClassName: string }
> = {
    approve: {
        title: 'Confirmar aprobación',
        description: 'Esta acción aprobará la orden seleccionada y la enviará a ejecución.',
        placeholder: 'Indique la observación o nota (ej. Se procede con la orden, conforme…)',
        endpoint: 'approve',
        confirmLabel: 'Aprobar orden',
        confirmClassName: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
    reject: {
        title: 'Rechazar orden',
        description: 'La orden será rechazada y no continuará con el proceso.',
        placeholder: 'Indique el motivo del rechazo…',
        endpoint: 'reject',
        confirmLabel: 'Rechazar orden',
        confirmClassName: 'bg-rose-600 hover:bg-rose-700 text-white',
    },
    observe: {
        title: 'Poner en observación',
        description: 'La orden quedará en estado Observado hasta que el solicitante revise y corrija.',
        placeholder: 'Indique el motivo de la observación…',
        endpoint: 'observe',
        confirmLabel: 'Guardar observación',
        confirmClassName: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
};

function buildUrl(params: Partial<Filters> & { page?: number }) {
    const search = new URLSearchParams();
    if (params.q !== undefined) search.set('q', params.q);
    if (params.status !== undefined) search.set('status', params.status);
    if (params.supplier_id !== undefined) search.set('supplier_id', params.supplier_id);
    if (params.date_from !== undefined && params.date_from !== '') search.set('date_from', params.date_from);
    if (params.date_to !== undefined && params.date_to !== '') search.set('date_to', params.date_to);
    if (params.sort_by !== undefined) search.set('sort_by', params.sort_by);
    if (params.sort_order !== undefined) search.set('sort_order', params.sort_order);
    if (params.per_page !== undefined) search.set('per_page', String(params.per_page));
    if (params.page !== undefined) search.set('page', String(params.page));
    return `/admin/purchase-orders?${search.toString()}`;
}

function buildExportUrl(filters: Filters): string {
    const search = new URLSearchParams();
    if (filters.q !== undefined && filters.q !== '') search.set('q', filters.q);
    if (filters.status !== undefined && filters.status !== '') search.set('status', filters.status);
    if (filters.supplier_id !== undefined && filters.supplier_id !== '') search.set('supplier_id', filters.supplier_id);
    if (filters.date_from !== undefined && filters.date_from !== '') search.set('date_from', filters.date_from);
    if (filters.date_to !== undefined && filters.date_to !== '') search.set('date_to', filters.date_to);
    if (filters.sort_by !== undefined) search.set('sort_by', filters.sort_by);
    if (filters.sort_order !== undefined) search.set('sort_order', filters.sort_order);
    return `/admin/purchase-orders/export?${search.toString()}`;
}

function formatCurrency(value: number | null | undefined): string {
    if (value == null) return '—';
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
}

function formatOfficePath(row: PurchaseOrder): string {
    const office = (row as { office?: { name?: string; code?: string | null; zonal?: { name?: string; code?: string } | null } | null }).office;
    if (!office) return '—';
    const parts = [
        office.zonal?.name ?? office.zonal?.code ?? null,
        office.name ?? office.code ?? null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' / ') : (office.name ?? '—');
}

type ApproverUser = { name?: string | null; last_name?: string | null; usuario?: string | null };

function fullName(u: ApproverUser | null | undefined): string {
    if (!u) return '';
    return [u.name, u.last_name].filter(Boolean).join(' ') || u.usuario || '';
}

const dateTimeFormat: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
};

function formatGerOperCell(row: PurchaseOrder): React.ReactNode {
    const approvedUser = row.approved_by_user;
    const approvedAt = row.approved_at;
    const rejectedUser = row.rejected_by_user;
    const rejectedAt = row.rejected_at;
    const observedUser = (row as { observed_by_user?: { name?: string | null; last_name?: string | null; usuario?: string | null } | null }).observed_by_user;
    const observedAt = (row as { observed_at?: string | null }).observed_at;

    if (approvedAt && approvedUser) {
        const name = fullName(approvedUser);
        const dateStr = new Date(approvedAt).toLocaleString('es', dateTimeFormat);
        return (
            <div className="min-w-0 truncate" title={`Aprobado: ${name} · ${dateStr}`}>
                <span className="block truncate text-emerald-700 dark:text-emerald-400">Apr. {name || '—'}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{dateStr}</span>
            </div>
        );
    }
    if (rejectedAt && rejectedUser) {
        const name = fullName(rejectedUser);
        const dateStr = new Date(rejectedAt).toLocaleString('es', dateTimeFormat);
        return (
            <div className="min-w-0 truncate" title={`Rechazado: ${name} · ${dateStr}`}>
                <span className="block truncate text-rose-700 dark:text-rose-400">Rech. {name || '—'}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{dateStr}</span>
            </div>
        );
    }
    if (observedAt && observedUser) {
        const name = fullName(observedUser);
        const dateStr = new Date(observedAt).toLocaleString('es', dateTimeFormat);
        return (
            <div className="min-w-0 truncate" title={`Observado: ${name} · ${dateStr}`}>
                <span className="block truncate text-amber-700 dark:text-amber-400">Obs. {name || '—'}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{dateStr}</span>
            </div>
        );
    }
    return <span>—</span>;
}

function officeDisplayParts(row: PurchaseOrder): { office: string; zonal: string | null } {
    const office = (row as { office?: { name?: string; code?: string | null; zonal?: { name?: string; code?: string } | null } | null }).office;
    if (!office) return { office: '—', zonal: null };
    const officeName = office.name ?? office.code ?? '—';
    const zonal = office.zonal?.name ?? office.zonal?.code ?? null;
    return { office: officeName, zonal };
}

export default function PurchaseOrdersIndex({
    purchaseOrders,
    suppliersForFilter,
    filters,
    stats,
    canApprove = false,
    canViewDetail = false,
}: PurchaseOrdersIndexProps) {
    const { data, links, from, to, total, current_page, last_page } = purchaseOrders;
    const statsPending = stats?.pending ?? 0;
    const statsApproved = stats?.approved ?? 0;
    const [searchInput, setSearchInput] = useState(() => {
        const q = filters.q;
        if (q == null || q === 'null') return '';
        return String(q);
    });
    const [deleteOrder, setDeleteOrder] = useState<PurchaseOrder | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [actioningId, setActioningId] = useState<string | null>(null);
    const [modalOrder, setModalOrder] = useState<PurchaseOrder | null>(null);
    const [modalAction, setModalAction] = useState<ActionModalType>(null);
    const [modalObservation, setModalObservation] = useState('');
    const [modalSubmitting, setModalSubmitting] = useState(false);

    const { props } = usePage();
    const auth = (props as { auth?: { permissions?: string[] } }).auth;
    const permissions = auth?.permissions ?? [];
    const canCreate = permissions.includes('purchase_orders.create');
    const canExport = permissions.includes('purchase_orders.export');
    const canUpdate = permissions.includes('purchase_orders.update');
    const canDelete = permissions.includes('purchase_orders.delete');
    const canObserve = permissions.includes('purchase_orders.observe');
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
        if (!deleteOrder) return;
        setDeleting(true);
        router.delete(`/admin/purchase-orders/${deleteOrder.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteOrder(null);
            },
        });
    };

    const openActionModal = (order: PurchaseOrder, action: Exclude<ActionModalType, null>) => {
        setModalOrder(order);
        setModalAction(action);
        setModalObservation('');
    };

    const closeActionModal = () => {
        setModalOrder(null);
        setModalAction(null);
        setModalObservation('');
    };

    const submitActionModal = () => {
        if (!modalOrder || !modalAction) return;
        const config = ACTION_MODAL_CONFIG[modalAction];
        setModalSubmitting(true);
        setActioningId(modalOrder.id);
        router.post(
            `/admin/purchase-orders/${modalOrder.id}/${config.endpoint}`,
            { observation_notes: modalObservation },
            {
                preserveScroll: true,
                onFinish: () => {
                    setModalSubmitting(false);
                    setActioningId(null);
                    closeActionModal();
                },
            }
        );
    };

    const columns: DataTableColumn<PurchaseOrder>[] = [
        {
            key: 'code',
            label: 'Código',
            sortable: true,
            className: 'text-foreground text-xs',
            render: (row) => (
                <span className="font-medium text-foreground">{row.code ? `#${row.code}` : '—'}</span>
            ),
        },
        {
            key: 'supplier',
            label: 'Proveedor',
            sortable: false,
            className: 'text-foreground text-xs max-w-[180px]',
            render: (row) => {
                const name = row.supplier?.name ?? '—';
                const ruc = row.supplier?.ruc;
                return (
                    <div className="min-w-0 truncate">
                        <span className="block truncate font-medium">{name}</span>
                        {ruc && (
                            <span className="block truncate text-[11px] text-muted-foreground">{ruc}</span>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'office',
            label: 'Zonal / Oficina',
            sortable: false,
            className: 'text-foreground text-xs max-w-[200px]',
            render: (row) => {
                const { office: officeName, zonal } = officeDisplayParts(row);
                const fullPath = formatOfficePath(row);
                return (
                    <div
                        className="min-w-0 truncate"
                        title={fullPath}
                    >
                        <span className="block truncate font-medium text-foreground">{officeName}</span>
                        {zonal && (
                            <span className="block truncate text-[11px] text-muted-foreground">
                                {zonal}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'status',
            label: 'Estado',
            sortable: true,
            className: 'text-foreground text-xs',
            render: (row) => <PurchaseOrderStatusBadge status={row.status} />,
        },
        {
            key: 'total_amount',
            label: 'Total',
            sortable: true,
            className: 'text-foreground text-xs tabular-nums',
            render: (row) => formatCurrency(row.total_amount),
        },
        {
            key: 'requested_by',
            label: 'Solicitado por',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => (
                <span>{[row.requested_by_user?.name, row.requested_by_user?.last_name].filter(Boolean).join(' ') || row.requested_by_user?.usuario || '—'}</span>
            ),
        },
        {
            key: 'approved_by',
            label: 'Ger. Oper.',
            sortable: false,
            className: 'text-foreground text-xs max-w-[160px]',
            render: (row) => formatGerOperCell(row),
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
            className: 'min-w-[140px] text-right',
            render: (row) => {
                return (
                    <PurchaseOrderActionsCell
                        order={row}
                        canViewDetail={canViewDetail}
                        canApprove={canApprove}
                        canObserve={canObserve}
                        canDelete={canDelete}
                        canUpdate={canUpdate}
                        actioningId={actioningId}
                        onOpenActionModal={openActionModal}
                        onRequestDelete={setDeleteOrder}
                    />
                );
            },
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Órdenes de compra" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
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

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-3">
                        <div>
                            <h1 className="relative inline-block pb-1 text-xl font-semibold text-foreground">
                                Órdenes de compra
                                <span className="absolute bottom-0 left-0 h-0.5 w-8 rounded-full bg-inv-primary" />
                            </h1>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            Gestión de órdenes de compra y sus ítems.
                        </p>
                        <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-blue-500/20 dark:text-gray-400">
                                <ShoppingCart className="size-3 shrink-0 text-blue-600 dark:text-blue-400" />
                                <span>Total</span>
                                <span className="font-semibold">{total}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-amber-500/20 dark:text-gray-400">
                                <FileText className="size-3 shrink-0 text-amber-600 dark:text-amber-400" />
                                <span>Pendiente</span>
                                <span className="font-semibold">{statsPending}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-emerald-500/20 dark:text-gray-400">
                                <CheckCircle2 className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <span>Aprobadas</span>
                                <span className="font-semibold">{statsApproved}</span>
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
                        {canExport && (
                            <a
                                href={buildExportUrl(filters)}
                                className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md bg-[#217346] text-white shadow-sm hover:bg-[#1a5c38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#217346] focus-visible:ring-offset-2"
                                aria-label="Exportar a Excel"
                            >
                                <FileDown className="size-5" />
                            </a>
                        )}
                        {canCreate && (
                            <Link
                                href="/admin/purchase-orders/create"
                                className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md bg-inv-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-inv-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2"
                                aria-label="Nueva orden de compra"
                            >
                                <Plus className="size-4" />
                                <span>Nueva orden</span>
                            </Link>
                        )}
                    </div>
                </div>

                <div className="border-t border-border w-full shrink-0" aria-hidden />

                <div className="rounded-xl border border-border bg-card shadow-sm">
                    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <SearchFilter
                            value={searchInput}
                            onChange={setSearchInput}
                            placeholder="Buscar por código, proveedor, zonal, oficina, solicitado o RUC…"
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
                                <SelectItem value="_">Todos</SelectItem>
                                <SelectItem value="pending">Pendiente</SelectItem>
                                <SelectItem value="observed">Observado</SelectItem>
                                <SelectItem value="approved">Aprobada</SelectItem>
                                <SelectItem value="rejected">Rechazada</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={(filters.supplier_id ?? '') === '' ? '_' : filters.supplier_id}
                            onValueChange={(v) =>
                                applyFilters({ supplier_id: v === '_' ? '' : v, page: 1 })
                            }
                        >
                            <SelectTrigger className="w-full border-border bg-background sm:w-[200px]">
                                <SelectValue placeholder="Proveedor" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos</SelectItem>
                                {suppliersForFilter.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.name}
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
                            emptyMessage="No hay órdenes de compra. Crea una con «Nueva orden»."
                            variant="default"
                        />
                    </div>
                    <div className="md:hidden">
                        {data.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8 px-4 text-sm">
                                No hay órdenes de compra. Crea una con «Nueva orden».
                            </p>
                        ) : (
                            <ul className="flex flex-col gap-3 p-3 sm:p-4">
                                {data.map((row) => (
                                    <li key={row.id}>
                                        <article className="rounded-lg border border-border bg-card shadow-[0_1px_2px_0_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                                            <div className="space-y-2 p-4">
                                                <p className="font-medium text-foreground text-base">
                                                    {row.code ? `#${row.code}` : 'Sin código'}
                                                </p>
                                                <dl className="grid grid-cols-1 gap-1.5 text-sm">
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Proveedor:</dt>
                                                        <dd className="text-foreground">
                                                            {row.supplier?.name ?? '—'}
                                                            {row.supplier?.ruc && (
                                                                <span className="block text-muted-foreground text-xs">{row.supplier.ruc}</span>
                                                            )}
                                                        </dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Zonal / Oficina:</dt>
                                                        <dd className="text-foreground">{formatOfficePath(row)}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Estado:</dt>
                                                        <dd>
                                                            <PurchaseOrderStatusBadge status={row.status} />
                                                        </dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Total:</dt>
                                                        <dd className="text-foreground tabular-nums">{formatCurrency(row.total_amount)}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Solicitado por:</dt>
                                                        <dd className="text-foreground">{[row.requested_by_user?.name, row.requested_by_user?.last_name].filter(Boolean).join(' ') || row.requested_by_user?.usuario || '—'}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Ger. Oper.:</dt>
                                                        <dd className="text-foreground text-sm">
                                                            {formatGerOperCell(row)}
                                                        </dd>
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
                                                {canViewDetail && (
                                                    <Link
                                                        href={`/admin/purchase-orders/${row.id}`}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                    >
                                                        <Eye className="size-4" />
                                                        Ver detalle
                                                    </Link>
                                                )}
                                                {row.status === 'pending' && (canApprove || canObserve) && (
                                                    <>
                                                        {canApprove && (
                                                            <>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="cursor-pointer shrink-0 rounded-lg border-emerald-400/80 bg-emerald-50/80 py-2 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-500 dark:border-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
                                                                    disabled={actioningId === row.id}
                                                                    onClick={() => openActionModal(row, 'approve')}
                                                                >
                                                                    {actioningId === row.id ? '…' : 'Aprobar'}
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="cursor-pointer shrink-0 rounded-lg border-rose-400/80 bg-rose-50/80 py-2 text-rose-700 hover:bg-rose-100 hover:border-rose-500 dark:border-rose-600 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40"
                                                                    disabled={actioningId === row.id}
                                                                    onClick={() => openActionModal(row, 'reject')}
                                                                >
                                                                    {actioningId === row.id ? '…' : 'Rechazar'}
                                                                </Button>
                                                            </>
                                                        )}
                                                        {canObserve && (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="cursor-pointer shrink-0 rounded-lg border-amber-400/80 bg-amber-50/80 py-2 text-amber-700 hover:bg-amber-100 hover:border-amber-500 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40"
                                                                disabled={actioningId === row.id}
                                                                onClick={() => openActionModal(row, 'observe')}
                                                            >
                                                                {actioningId === row.id ? '…' : 'Observar'}
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                                {(row.status === 'pending' || row.status === 'observed') && canUpdate && (
                                                    <Link
                                                        href={`/admin/purchase-orders/${row.id}/edit`}
                                                        className="inline-flex shrink-0 items-center justify-center rounded-md border border-blue-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-400 dark:hover:bg-blue-950/30"
                                                    >
                                                        <Pencil className="size-3.5 shrink-0 mr-1" />
                                                        <span>Editar</span>
                                                    </Link>
                                                )}
                                                {row.status === 'pending' && canDelete && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="cursor-pointer shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/20"
                                                        aria-label={`Eliminar orden ${row.code || row.id}`}
                                                        onClick={() => setDeleteOrder(row)}
                                                    >
                                                        <Trash2 className="size-3.5 shrink-0 mr-1" />
                                                        <span>Eliminar</span>
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

            {modalOrder && modalAction && (
                <AppModal
                    open={!!modalOrder && !!modalAction}
                    onOpenChange={(open) => {
                        if (!open) closeActionModal();
                    }}
                    title={ACTION_MODAL_CONFIG[modalAction].title}
                    contentClassName="space-y-4"
                >
                    <div className="space-y-2">
                        <p className="text-muted-foreground text-sm">
                            {ACTION_MODAL_CONFIG[modalAction].description}
                        </p>
                        <Label htmlFor="observation_notes_index" className="text-sm">
                            Observación
                        </Label>
                        <textarea
                            id="observation_notes_index"
                            value={modalObservation}
                            onChange={(e) => setModalObservation(e.target.value)}
                            placeholder={ACTION_MODAL_CONFIG[modalAction].placeholder}
                            rows={4}
                            className="border-input w-full rounded-xl border bg-background/80 px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary/50 focus-visible:border-inv-primary/40"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={modalSubmitting}
                            onClick={closeActionModal}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            disabled={modalSubmitting}
                            className={`cursor-pointer ${ACTION_MODAL_CONFIG[modalAction].confirmClassName}`}
                            onClick={submitActionModal}
                        >
                            {modalSubmitting ? 'Enviando…' : ACTION_MODAL_CONFIG[modalAction].confirmLabel}
                        </Button>
                    </div>
                </AppModal>
            )}

            <DeleteConfirmModal
                open={!!deleteOrder}
                onOpenChange={(open) => !open && setDeleteOrder(null)}
                title="Eliminar orden de compra"
                description={
                    deleteOrder
                        ? `¿Eliminar la orden «${deleteOrder.code || 'Sin código'}» (${deleteOrder.supplier?.name ?? 'proveedor'})? Se eliminarán todos los ítems. Esta acción no se puede deshacer.`
                        : undefined
                }
                onConfirm={handleDeleteConfirm}
                loading={deleting}
            />
        </AppLayout>
    );
}
 