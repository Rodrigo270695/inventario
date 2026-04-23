import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRightLeft,
    CheckCircle2,
    CircleDot,
    FileDown,
    LayoutGrid,
    MessageSquareText,
    PackageCheck,
    Plus,
    ShieldCheck,
    Truck,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppModal } from '@/components/app-modal';
import { AssetTransferActionsCell } from '@/components/asset-transfers/actions-cell';
import { AssetTransferStatusBadge } from '@/components/asset-transfers/status-badge';
import type { DataTableColumn, SortOrder } from '@/components/data-table';
import { DataTable } from '@/components/data-table';
import type { DateRangeFilterValue } from '@/components/date-range-filter';
import { DateRangeFilter } from '@/components/date-range-filter';
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
import type { AssetTransfer, BreadcrumbItem, PaginationMeta } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Activos', href: '#' },
    { title: 'Traslados', href: '/admin/asset-transfers' },
];

const SEARCH_DEBOUNCE_MS = 400;

type WarehouseOption = {
    id: string;
    name: string;
    code: string | null;
    office?: {
        id: string;
        name: string;
        code: string | null;
        zonal?: { id: string; name: string; code: string } | null;
    } | null;
};

type Filters = {
    q: string;
    status: string;
    origin_warehouse_id: string;
    destination_warehouse_id: string;
    date_from: string;
    date_to: string;
    sort_by: string;
    sort_order: SortOrder;
    per_page: number;
};

type Stats = {
    total: number;
    pending_approval: number;
    approved: number;
    in_transit: number;
    received: number;
};

type Props = {
    assetTransfers: {
        data: AssetTransfer[];
        links: PaginationMeta['links'];
        from: number | null;
        to: number | null;
        total: number;
        current_page: number;
        last_page: number;
        per_page: number;
    };
    warehousesForFilter: WarehouseOption[];
    filters: Filters;
    stats?: Stats;
    canViewDetail?: boolean;
    isSuperadmin?: boolean;
    currentUserId?: string | null;
};

function buildUrl(params: Partial<Filters> & { page?: number }) {
    const search = new URLSearchParams();
    if (params.q !== undefined) search.set('q', params.q);
    if (params.status !== undefined) search.set('status', params.status);
    if (params.origin_warehouse_id !== undefined) search.set('origin_warehouse_id', params.origin_warehouse_id);
    if (params.destination_warehouse_id !== undefined) search.set('destination_warehouse_id', params.destination_warehouse_id);
    if (params.date_from !== undefined && params.date_from !== '') search.set('date_from', params.date_from);
    if (params.date_to !== undefined && params.date_to !== '') search.set('date_to', params.date_to);
    if (params.sort_by !== undefined) search.set('sort_by', params.sort_by);
    if (params.sort_order !== undefined) search.set('sort_order', params.sort_order);
    if (params.per_page !== undefined) search.set('per_page', String(params.per_page));
    if (params.page !== undefined) search.set('page', String(params.page));
    return `/admin/asset-transfers?${search.toString()}`;
}

function buildExportUrl(filters: Filters): string {
    const search = new URLSearchParams();
    if (filters.q !== undefined && filters.q !== '') search.set('q', filters.q);
    if (filters.status !== undefined && filters.status !== '') search.set('status', filters.status);
    if (filters.origin_warehouse_id !== undefined && filters.origin_warehouse_id !== '') {
        search.set('origin_warehouse_id', filters.origin_warehouse_id);
    }
    if (filters.destination_warehouse_id !== undefined && filters.destination_warehouse_id !== '') {
        search.set('destination_warehouse_id', filters.destination_warehouse_id);
    }
    if (filters.date_from !== undefined && filters.date_from !== '') search.set('date_from', filters.date_from);
    if (filters.date_to !== undefined && filters.date_to !== '') search.set('date_to', filters.date_to);
    if (filters.sort_by !== undefined) search.set('sort_by', filters.sort_by);
    if (filters.sort_order !== undefined) search.set('sort_order', filters.sort_order);
    return `/admin/asset-transfers/export?${search.toString()}`;
}

function warehousePath(warehouse: WarehouseOption | null | undefined): string {
    if (!warehouse) return '—';

    const parts = [
        warehouse.office?.zonal?.name ?? warehouse.office?.zonal?.code ?? null,
        warehouse.office?.name ?? warehouse.office?.code ?? null,
        warehouse.name ?? warehouse.code ?? null,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(' / ') : warehouse.name ?? '—';
}

function fullName(user?: { name?: string | null; last_name?: string | null; usuario?: string | null } | null): string {
    if (!user) return '';

    return [user.name, user.last_name].filter(Boolean).join(' ') || user.usuario || '';
}

function formatDateTime(value?: string | null): string {
    if (!value) return '—';

    return new Date(value).toLocaleString('es', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function sortWarehousesByLocation(warehouses: WarehouseOption[]): WarehouseOption[] {
    return [...warehouses].sort((a, b) => {
        const zonalA = a.office?.zonal?.name ?? '';
        const zonalB = b.office?.zonal?.name ?? '';
        const officeA = a.office?.name ?? '';
        const officeB = b.office?.name ?? '';
        const warehouseA = a.name ?? '';
        const warehouseB = b.name ?? '';

        return zonalA.localeCompare(zonalB, 'es', { sensitivity: 'base' })
            || officeA.localeCompare(officeB, 'es', { sensitivity: 'base' })
            || warehouseA.localeCompare(warehouseB, 'es', { sensitivity: 'base' });
    });
}

const CONDITION_OPTIONS = [
    { value: 'new', label: 'Nuevo' },
    { value: 'good', label: 'Bueno' },
    { value: 'regular', label: 'Regular' },
    { value: 'damaged', label: 'Dañado' },
    { value: 'obsolete', label: 'Obsoleto' },
];

function conditionLabel(value?: string | null): string {
    if (!value) return '—';

    return (
        CONDITION_OPTIONS.find((option) => option.value === value)?.label
        ?? value
    );
}

function itemLabel(item: NonNullable<AssetTransfer['items']>[number]): string {
    if (item.asset) {
        return [
            item.asset.code,
            item.asset.category?.name,
            item.asset.model?.brand?.name,
            item.asset.model?.name,
        ].filter(Boolean).join(' · ');
    }

    if (item.component) {
        return [
            item.component.code,
            item.component.type?.name,
            item.component.brand?.name,
            item.component.model,
        ].filter(Boolean).join(' · ');
    }

    return '—';
}

export default function AssetTransfersIndex({
    assetTransfers,
    warehousesForFilter,
    filters,
    stats,
    canViewDetail = false,
    isSuperadmin = false,
    currentUserId = null,
}: Props) {
    const { data, links, from, to, total, current_page, last_page } = assetTransfers;
    const statsPendingApproval = stats?.pending_approval ?? 0;
    const statsApproved = stats?.approved ?? 0;
    const statsTransit = stats?.in_transit ?? 0;
    const statsReceived = stats?.received ?? 0;
    const [searchInput, setSearchInput] = useState(() => {
        const q = filters.q;
        if (q == null || q === 'null') return '';
        return String(q);
    });
    const [deleteTransfer, setDeleteTransfer] = useState<AssetTransfer | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [cancelTransfer, setCancelTransfer] = useState<AssetTransfer | null>(null);
    const [receiveTransfer, setReceiveTransfer] = useState<AssetTransfer | null>(null);
    const [reasonTransfer, setReasonTransfer] = useState<AssetTransfer | null>(null);
    const [cancelReasonText, setCancelReasonText] = useState('');
    const [receiptCommentText, setReceiptCommentText] = useState('');
    const [receiveItemConditions, setReceiveItemConditions] = useState<Record<string, string>>({});
    const [actionLoading, setActionLoading] = useState(false);
    const [modalError, setModalError] = useState('');

    const { props } = usePage();
    const auth = (props as { auth?: { permissions?: string[] } }).auth;
    const permissions = auth?.permissions ?? [];
    const canCreate = permissions.includes('asset_transfers.create');
    const canExport = permissions.includes('asset_transfers.export');
    const canUpdate = permissions.includes('asset_transfers.update');
    const canDelete = permissions.includes('asset_transfers.delete');
    const canApprove = permissions.includes('asset_transfers.approve');
    const canCancel = permissions.includes('asset_transfers.cancel');
    const canDispatch = permissions.includes('asset_transfers.dispatch');
    const canReceive = permissions.includes('asset_transfers.receive');
    const flash = props.flash as { toast?: ToastMessage } | undefined;
    const canOperateTransfer = useCallback(
        (row: AssetTransfer) => isSuperadmin || (currentUserId != null && row.sent_by === currentUserId),
        [currentUserId, isSuperadmin]
    );

    const [toastQueue, setToastQueue] = useState<Array<ToastMessage & { id: number }>>([]);
    const lastFlashToastRef = useRef<ToastMessage | null>(null);
    const sortedWarehousesForFilter = sortWarehousesByLocation(warehousesForFilter);

    useEffect(() => {
        const t = flash?.toast;
        if (!t) return;
        if (t === lastFlashToastRef.current) return;
        lastFlashToastRef.current = t;
        const id = Date.now();
        queueMicrotask(() => {
            setToastQueue((q) => [...q, { ...t, id }]);
        });
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
        if (!deleteTransfer) return;
        setDeleting(true);
        router.delete(`/admin/asset-transfers/${deleteTransfer.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteTransfer(null);
            },
        });
    };

    const runAction = useCallback((url: string) => {
        router.post(url, {}, { preserveScroll: true });
    }, []);

    const handleApprove = useCallback((transfer: AssetTransfer) => {
        runAction(`/admin/asset-transfers/${transfer.id}/approve`);
    }, [runAction]);

    const handleCancel = useCallback((transfer: AssetTransfer) => {
        setCancelTransfer(transfer);
        setCancelReasonText(transfer.cancellation_reason ?? '');
        setModalError('');
    }, []);

    const handleDispatch = useCallback((transfer: AssetTransfer) => {
        runAction(`/admin/asset-transfers/${transfer.id}/dispatch`);
    }, [runAction]);

    const handleReceive = useCallback((transfer: AssetTransfer) => {
        setReceiveTransfer(transfer);
        setReceiptCommentText('');
        setReceiveItemConditions(
            Object.fromEntries(
                (transfer.items ?? []).map((item) => [
                    String(item.id),
                    item.condition_in ?? '',
                ])
            )
        );
        setModalError('');
    }, []);

    const handleViewCancellationReason = useCallback((transfer: AssetTransfer) => {
        setReasonTransfer(transfer);
    }, []);

    const submitCancel = useCallback(() => {
        if (!cancelTransfer) return;
        if (cancelReasonText.trim() === '') {
            setModalError('Debe indicar el motivo de cancelación.');
            return;
        }

        setActionLoading(true);
        router.post(
            `/admin/asset-transfers/${cancelTransfer.id}/cancel`,
            { cancellation_reason: cancelReasonText.trim() },
            {
                preserveScroll: true,
                onFinish: () => {
                    setActionLoading(false);
                    setCancelTransfer(null);
                    setCancelReasonText('');
                    setModalError('');
                },
            }
        );
    }, [cancelReasonText, cancelTransfer]);

    const submitReceive = useCallback(() => {
        if (!receiveTransfer) return;
        if (receiptCommentText.trim() === '') {
            setModalError('Debe registrar el comentario de recepción.');
            return;
        }

        setActionLoading(true);
        router.post(
            `/admin/asset-transfers/${receiveTransfer.id}/receive`,
            {
                receipt_notes: receiptCommentText.trim(),
                items: (receiveTransfer.items ?? []).map((item) => ({
                    id: item.id,
                    condition_in: receiveItemConditions[String(item.id)] || '',
                })),
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setActionLoading(false);
                    setReceiveTransfer(null);
                    setReceiptCommentText('');
                    setModalError('');
                },
            }
        );
    }, [receiptCommentText, receiveTransfer]);

    const columns: DataTableColumn<AssetTransfer>[] = [
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
            key: 'origin',
            label: 'Origen',
            sortable: false,
            className: 'text-foreground text-xs max-w-[220px]',
            render: (row) => (
                <div className="min-w-0 truncate" title={warehousePath(row.origin_warehouse)}>
                    <span className="block truncate font-medium">{row.origin_warehouse?.name ?? '—'}</span>
                    {row.origin_warehouse?.office?.zonal && (
                        <span className="block truncate text-[11px] text-muted-foreground">
                            {row.origin_warehouse.office.zonal.name}
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: 'destination',
            label: 'Destino',
            sortable: false,
            className: 'text-foreground text-xs max-w-[220px]',
            render: (row) => (
                <div className="min-w-0 truncate" title={warehousePath(row.destination_warehouse)}>
                    <span className="block truncate font-medium">{row.destination_warehouse?.name ?? '—'}</span>
                    {row.destination_warehouse?.office?.zonal && (
                        <span className="block truncate text-[11px] text-muted-foreground">
                            {row.destination_warehouse.office.zonal.name}
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Estado',
            sortable: true,
            className: 'text-foreground text-xs',
            render: (row) => <AssetTransferStatusBadge status={row.status} />,
        },
        {
            key: 'items_count',
            label: 'Ítems',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => <span>{row.items_count ?? 0}</span>,
        },
        {
            key: 'carrier_name',
            label: 'Transporte',
            sortable: false,
            className: 'text-foreground text-xs max-w-[180px]',
            render: (row) => (
                <div className="min-w-0 truncate">
                    <span className="block truncate">{row.carrier_name || '—'}</span>
                    {row.tracking_number && (
                        <span className="block truncate text-[11px] text-muted-foreground">
                            {row.tracking_number}
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: 'sent_by',
            label: 'Despacha',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => <span>{fullName(row.sent_by_user) || '—'}</span>,
        },
        {
            key: 'received_by',
            label: 'Recibe',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => <span>{fullName(row.received_by_user) || '—'}</span>,
        },
        {
            key: 'approved_by',
            label: 'Aprobado por',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => <span>{fullName(row.approved_by_user) || '—'}</span>,
        },
        {
            key: 'ship_date',
            label: 'Envío',
            sortable: true,
            className: 'text-foreground text-xs',
            render: (row) =>
                formatDateTime(row.ship_date),
        },
        {
            key: 'created_at',
            label: 'Creado',
            sortable: true,
            className: 'text-foreground text-xs',
            render: (row) =>
                row.created_at
                    ? new Date(row.created_at).toLocaleDateString('es', {
                          timeZone: 'America/Lima',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                      })
                    : '—',
        },
        {
            key: 'actions',
            label: '',
            className: 'min-w-[120px] text-right',
            render: (row) => (
                <AssetTransferActionsCell
                    transfer={row}
                    isSuperadmin={isSuperadmin}
                    currentUserId={currentUserId}
                    canViewDetail={canViewDetail}
                    canDelete={canDelete}
                    canUpdate={canUpdate}
                    canApprove={canApprove}
                    canCancel={canCancel}
                    canDispatch={canDispatch}
                    canReceive={canReceive}
                    onRequestDelete={setDeleteTransfer}
                    onApprove={handleApprove}
                    onCancel={handleCancel}
                    onDispatch={handleDispatch}
                    onReceive={handleReceive}
                    onViewCancellationReason={handleViewCancellationReason}
                />
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Traslados" />

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
                                Traslados
                                <span className="absolute bottom-0 left-0 h-0.5 w-8 rounded-full bg-inv-primary" />
                            </h1>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            Gestión de traslados internos de activos y componentes.
                        </p>
                        <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-blue-500/20 dark:text-gray-400">
                                <ArrowRightLeft className="size-3 shrink-0 text-blue-600 dark:text-blue-400" />
                                <span>Total</span>
                                <span className="font-semibold">{total}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-slate-500/20 dark:text-gray-400">
                                <CircleDot className="size-3 shrink-0 text-slate-600 dark:text-slate-400" />
                                <span>Por aprobar</span>
                                <span className="font-semibold">{statsPendingApproval}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-violet-500/20 dark:text-gray-400">
                                <ShieldCheck className="size-3 shrink-0 text-violet-600 dark:text-violet-400" />
                                <span>Aprobado</span>
                                <span className="font-semibold">{statsApproved}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-sky-500/20 dark:text-gray-400">
                                <Truck className="size-3 shrink-0 text-sky-600 dark:text-sky-400" />
                                <span>En tránsito</span>
                                <span className="font-semibold">{statsTransit}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-emerald-500/20 dark:text-gray-400">
                                <CheckCircle2 className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <span>Recibido</span>
                                <span className="font-semibold">{statsReceived}</span>
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
                                title="Exportar a Excel"
                            >
                                <FileDown className="size-5" />
                            </a>
                        )}
                        {canCreate && (
                            <Link
                                href="/admin/asset-transfers/create"
                                className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md bg-inv-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-inv-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2"
                                aria-label="Nuevo traslado"
                            >
                                <Plus className="size-4" />
                                <span>Nuevo traslado</span>
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
                            placeholder="Buscar por código, guía, voucher, transporte, origen o destino…"
                            className="w-full [&_input]:bg-white [&_input]:border-border [&_input]:text-foreground sm:max-w-xs"
                        />
                        <Select
                            value={(filters.status ?? '') === '' ? '_' : filters.status}
                            onValueChange={(v) =>
                                applyFilters({ status: v === '_' ? '' : v, page: 1 })
                            }
                        >
                            <SelectTrigger className="w-full border-border bg-background sm:w-[170px]">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos los estados</SelectItem>
                                <SelectItem value="pending_approval">Por aprobar</SelectItem>
                                <SelectItem value="approved">Aprobado</SelectItem>
                                <SelectItem value="in_transit">En tránsito</SelectItem>
                                <SelectItem value="received">Recibido</SelectItem>
                                <SelectItem value="cancelled">Cancelado</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={(filters.origin_warehouse_id ?? '') === '' ? '_' : filters.origin_warehouse_id}
                            onValueChange={(v) =>
                                applyFilters({ origin_warehouse_id: v === '_' ? '' : v, page: 1 })
                            }
                        >
                            <SelectTrigger className="w-full border-border bg-background sm:w-[320px]">
                                <SelectValue placeholder="Origen" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos los orígenes</SelectItem>
                                {sortedWarehousesForFilter.map((warehouse) => (
                                    <SelectItem key={warehouse.id} value={warehouse.id}>
                                        {warehousePath(warehouse)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={(filters.destination_warehouse_id ?? '') === '' ? '_' : filters.destination_warehouse_id}
                            onValueChange={(v) =>
                                applyFilters({ destination_warehouse_id: v === '_' ? '' : v, page: 1 })
                            }
                        >
                            <SelectTrigger className="w-full border-border bg-background sm:w-[320px]">
                                <SelectValue placeholder="Destino" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos los destinos</SelectItem>
                                {sortedWarehousesForFilter.map((warehouse) => (
                                    <SelectItem key={warehouse.id} value={warehouse.id}>
                                        {warehousePath(warehouse)}
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
                            emptyMessage="No hay traslados. Crea uno con «Nuevo traslado»."
                            variant="default"
                        />
                    </div>
                    <div className="md:hidden">
                        {data.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8 px-4 text-sm">
                                No hay traslados. Crea uno con «Nuevo traslado».
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
                                                        <dt className="text-muted-foreground shrink-0">Origen:</dt>
                                                        <dd className="text-foreground">{warehousePath(row.origin_warehouse)}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Destino:</dt>
                                                        <dd className="text-foreground">{warehousePath(row.destination_warehouse)}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Estado:</dt>
                                                        <dd><AssetTransferStatusBadge status={row.status} /></dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Ítems:</dt>
                                                        <dd className="text-foreground">{row.items_count ?? 0}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Despacha:</dt>
                                                        <dd className="text-foreground">{fullName(row.sent_by_user) || '—'}</dd>
                                                    </div>
                                                </dl>
                                            </div>
                                            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-muted/30 px-4 py-3 min-h-[44px]">
                                                {canViewDetail && (
                                                    <Link
                                                        href={`/admin/asset-transfers/${row.id}`}
                                                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                        title="Ver detalle"
                                                    >
                                                        <PackageCheck className="size-4" />
                                                        Ver detalle
                                                    </Link>
                                                )}
                                                {(row.status === 'approved' || (isSuperadmin && row.status === 'pending_approval')) && canUpdate && canOperateTransfer(row) && (
                                                    <Link
                                                        href={`/admin/asset-transfers/${row.id}/edit`}
                                                        className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-blue-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-400 dark:hover:bg-blue-950/30"
                                                        title={row.status === 'approved' ? 'Completar datos del traslado' : 'Editar traslado'}
                                                    >
                                                        <span>{row.status === 'approved' ? 'Completar datos' : 'Editar'}</span>
                                                    </Link>
                                                )}
                                                {canApprove && row.status === 'pending_approval' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleApprove(row)}
                                                        className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-emerald-200 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                                        title="Aprobar traslado"
                                                    >
                                                        Aprobar
                                                    </button>
                                                )}
                                                {canDispatch && row.status === 'approved' && canOperateTransfer(row) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDispatch(row)}
                                                        className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-sky-200 bg-white px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-400 dark:hover:bg-sky-950/30"
                                                        title="Despachar traslado"
                                                    >
                                                        Despachar
                                                    </button>
                                                )}
                                                {(canReceive && row.status === 'in_transit' && (isSuperadmin || (currentUserId != null && row.received_by === currentUserId))) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReceive(row)}
                                                        className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-violet-200 bg-white px-3 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-400 dark:hover:bg-violet-950/30"
                                                        title="Recibir traslado"
                                                    >
                                                        Recibir
                                                    </button>
                                                )}
                                                {row.status === 'cancelled' && row.cancellation_reason && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewCancellationReason(row)}
                                                        className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60"
                                                        title="Ver motivo de cancelación"
                                                    >
                                                        Ver motivo
                                                    </button>
                                                )}
                                                {canCancel && !['received', 'cancelled'].includes(row.status) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCancel(row)}
                                                        className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-amber-200 bg-white px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                                        title="Rechazar traslado"
                                                    >
                                                        Rechazar
                                                    </button>
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

            <DeleteConfirmModal
                open={!!deleteTransfer}
                onOpenChange={(open) => !open && setDeleteTransfer(null)}
                title="Eliminar traslado"
                description={
                    deleteTransfer
                        ? `¿Eliminar el traslado «${deleteTransfer.code || 'Sin código'}»? Se eliminarán todos sus ítems. Esta acción no se puede deshacer.`
                        : undefined
                }
                onConfirm={handleDeleteConfirm}
                loading={deleting}
            />
            <AppModal
                open={!!cancelTransfer}
                onOpenChange={(open) => {
                    if (!open && !actionLoading) {
                        setCancelTransfer(null);
                        setCancelReasonText('');
                        setModalError('');
                    }
                }}
                title="Cancelar traslado"
                contentClassName="space-y-4"
            >
                <p className="text-muted-foreground text-sm">
                    Indique el motivo de la cancelación para el traslado {cancelTransfer?.code || 'seleccionado'}.
                </p>
                <textarea
                    value={cancelReasonText}
                    onChange={(event) => {
                        setCancelReasonText(event.target.value);
                        if (modalError) setModalError('');
                    }}
                    rows={4}
                    placeholder="Escriba el motivo de la cancelación"
                    className="border-input w-full rounded-xl border bg-background/80 px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary/50 focus-visible:border-inv-primary/40"
                />
                {modalError && <p className="text-sm text-destructive">{modalError}</p>}
                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={actionLoading}
                        onClick={() => {
                            setCancelTransfer(null);
                            setCancelReasonText('');
                            setModalError('');
                        }}
                    >
                        Cerrar
                    </Button>
                    <Button
                        type="button"
                        disabled={actionLoading}
                        className="cursor-pointer bg-amber-600 text-white hover:bg-amber-700"
                        onClick={submitCancel}
                    >
                        {actionLoading ? 'Guardando…' : 'Confirmar cancelación'}
                    </Button>
                </div>
            </AppModal>
            <AppModal
                open={!!receiveTransfer}
                onOpenChange={(open) => {
                    if (!open && !actionLoading) {
                        setReceiveTransfer(null);
                        setReceiptCommentText('');
                        setModalError('');
                    }
                }}
                title="Confirmar recepción"
                contentClassName="space-y-4"
            >
                <p className="text-muted-foreground text-sm">
                    Registre el comentario de recepción para el traslado {receiveTransfer?.code || 'seleccionado'}.
                </p>
                <div className="space-y-3">
                    {(receiveTransfer?.items ?? []).map((item) => (
                        <div key={item.id} className="rounded-xl border border-border bg-muted/20 p-3">
                            <p className="text-sm font-medium text-foreground">{itemLabel(item)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Condición salida: {conditionLabel(item.condition_out)}
                            </p>
                            <div className="mt-3 space-y-2">
                                <label className="text-sm font-medium text-foreground">Condición de llegada</label>
                                <Select
                                    value={receiveItemConditions[String(item.id)] || ''}
                                    onValueChange={(value) =>
                                        setReceiveItemConditions((prev) => ({
                                            ...prev,
                                            [String(item.id)]: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione condición" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CONDITION_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ))}
                </div>
                <textarea
                    value={receiptCommentText}
                    onChange={(event) => {
                        setReceiptCommentText(event.target.value);
                        if (modalError) setModalError('');
                    }}
                    rows={4}
                    placeholder="Escriba el comentario de recepción"
                    className="border-input w-full rounded-xl border bg-background/80 px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary/50 focus-visible:border-inv-primary/40"
                />
                {modalError && <p className="text-sm text-destructive">{modalError}</p>}
                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={actionLoading}
                        onClick={() => {
                            setReceiveTransfer(null);
                            setReceiptCommentText('');
                            setModalError('');
                        }}
                    >
                        Cerrar
                    </Button>
                    <Button
                        type="button"
                        disabled={actionLoading}
                        className="cursor-pointer bg-violet-600 text-white hover:bg-violet-700"
                        onClick={submitReceive}
                    >
                        {actionLoading ? 'Guardando…' : 'Confirmar recepción'}
                    </Button>
                </div>
            </AppModal>
            <AppModal
                open={!!reasonTransfer}
                onOpenChange={(open) => !open && setReasonTransfer(null)}
                title="Motivo de cancelación"
                contentClassName="space-y-4"
            >
                <div className="rounded-xl bg-muted/40 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">
                        Traslado {reasonTransfer?.code || '—'}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                        {reasonTransfer?.cancellation_reason || 'Sin motivo registrado.'}
                    </p>
                </div>
                <div className="flex justify-end">
                    <Button type="button" variant="outline" onClick={() => setReasonTransfer(null)}>
                        Cerrar
                    </Button>
                </div>
            </AppModal>
        </AppLayout>
    );
}
