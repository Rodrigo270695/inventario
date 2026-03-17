import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    Filter,
    LayoutGrid,
    Plus,
    Settings,
    Wrench,
    FileDown,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppModal } from '@/components/app-modal';
import { RepairTicketActionsCell } from '@/components/repair-tickets/actions-cell';
import { RepairTicketFormModal } from '@/components/repair-tickets/repair-ticket-form-modal';
import type { DataTableColumn, SortOrder } from '@/components/data-table';
import { DataTable } from '@/components/data-table';
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
import type { BreadcrumbItem, PaginationMeta, RepairTicket } from '@/types';
import type { AssetOption, ComponentOption, RepairShopOption, TabId, UserOption } from './config';
import type { Office, Warehouse, Zonal } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Mantenimiento', href: '#' },
    { title: 'Reparaciones', href: '/admin/repair-tickets' },
];

const SEARCH_DEBOUNCE_MS = 400;

const STATUS_LABELS: Record<string, string> = {
    pending_approval: 'Pendiente aprobación',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    diagnosed: 'Diagnosticado',
    in_progress: 'En proceso',
    completed: 'Completado',
    cancelled: 'Cancelado',
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
    pending_approval: 'bg-amber-100 text-amber-800 dark:bg-amber-500/25 dark:text-amber-300',
    approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-300',
    rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-500/25 dark:text-rose-300',
    diagnosed: 'bg-violet-100 text-violet-800 dark:bg-violet-500/25 dark:text-violet-300',
    in_progress: 'bg-sky-100 text-sky-800 dark:bg-sky-500/25 dark:text-sky-300',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-500/25 dark:text-blue-300',
    cancelled: 'bg-slate-200 text-slate-700 dark:bg-slate-500/30 dark:text-slate-300',
};

const PRIORITY_LABELS: Record<string, string> = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    critical: 'Crítica',
};

const MODE_LABELS: Record<string, string> = {
    internal: 'Interno',
    external: 'Externo',
    warranty: 'Garantía',
};

type Filters = {
    q: string;
    status: string;
    priority: string;
    maintenance_mode: string;
    date_from: string;
    date_to: string;
    zonal_id: string;
    office_id: string;
    warehouse_id: string;
    sort_by: string;
    sort_order: SortOrder;
    per_page: number;
};

type Props = {
    repairTickets: {
        data: RepairTicket[];
        links: PaginationMeta['links'];
        from: number | null;
        to: number | null;
        total: number;
        current_page: number;
        last_page: number;
        per_page: number;
    };
    filters: Filters;
    stats?: {
        total: number;
        pending_approval: number;
        approved: number;
        in_progress: number;
        completed: number;
        cancelled: number;
        has_filters?: boolean;
    };
    assetsForSelect: AssetOption[];
    componentsForSelect: ComponentOption[];
    repairShopsForSelect: RepairShopOption[];
    usersForSelect: UserOption[];
    zonalsForSelect: Zonal[];
    officesForSelect: Office[];
    warehousesForSelect: Warehouse[];
};

function buildUrl(params: Partial<Filters> & { page?: number }) {
    const search = new URLSearchParams();
    if (params.q !== undefined) search.set('q', params.q);
    if (params.status !== undefined) search.set('status', params.status);
    if (params.priority !== undefined) search.set('priority', params.priority);
    if (params.maintenance_mode !== undefined) search.set('maintenance_mode', params.maintenance_mode);
    if (params.date_from !== undefined && params.date_from !== '') search.set('date_from', params.date_from);
    if (params.date_to !== undefined && params.date_to !== '') search.set('date_to', params.date_to);
    if (params.zonal_id !== undefined) search.set('zonal_id', params.zonal_id);
    if (params.office_id !== undefined) search.set('office_id', params.office_id);
    if (params.warehouse_id !== undefined) search.set('warehouse_id', params.warehouse_id);
    if (params.sort_by !== undefined) search.set('sort_by', params.sort_by);
    if (params.sort_order !== undefined) search.set('sort_order', params.sort_order);
    if (params.per_page !== undefined) search.set('per_page', String(params.per_page));
    if (params.page !== undefined) search.set('page', String(params.page));
    return `/admin/repair-tickets?${search.toString()}`;
}

function userName(user?: { name?: string | null; last_name?: string | null; usuario?: string | null } | null): string {
    if (!user) return '—';

    return [user.name, user.last_name].filter(Boolean).join(' ') || user.usuario || '—';
}

function affectedItem(ticket: RepairTicket): string {
    if (ticket.asset) {
        return [
            ticket.asset.code,
            ticket.asset.category?.name,
            ticket.asset.model?.brand?.name,
            ticket.asset.model?.name,
        ].filter(Boolean).join(' · ');
    }

    if (ticket.component) {
        return [
            ticket.component.code,
            ticket.component.type?.name,
            ticket.component.brand?.name,
            ticket.component.model,
        ].filter(Boolean).join(' · ');
    }

    return '—';
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

export default function RepairTicketsIndex({
    repairTickets,
    filters,
    stats,
    assetsForSelect,
    componentsForSelect,
    repairShopsForSelect,
    usersForSelect,
    zonalsForSelect,
    officesForSelect,
    warehousesForSelect,
}: Props) {
    const { data, from, to, total, current_page, last_page } = repairTickets;
    const [searchInput, setSearchInput] = useState(() => {
        const q = filters.q;
        if (q == null || q === 'null') return '';
        return String(q);
    });
    const [deleteTicket, setDeleteTicket] = useState<RepairTicket | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [cancelTicket, setCancelTicket] = useState<RepairTicket | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [approveTicket, setApproveTicket] = useState<RepairTicket | null>(null);
    const [approveComment, setApproveComment] = useState('');
    const [cascadeZonalId, setCascadeZonalId] = useState<string>(() => filters.zonal_id ?? '');
    const [cascadeOfficeId, setCascadeOfficeId] = useState<string>(() => filters.office_id ?? '');
    const [modalError, setModalError] = useState('');
    const [createOpen, setCreateOpen] = useState(false);

    const { props } = usePage();
    const auth = (props as { auth?: { permissions?: string[] } }).auth;
    const permissions = auth?.permissions ?? [];
    const canCreate = permissions.includes('repair_tickets.create');
    const canExport = permissions.includes('repair_tickets.export');
    const canUpdate = permissions.includes('repair_tickets.update') || permissions.includes('repair_tickets.configure');
    const canDelete = permissions.includes('repair_tickets.delete');
    const canApprove = permissions.includes('repair_tickets.approve');
    const canCancel = permissions.includes('repair_tickets.cancel');
    const canConfigure = permissions.includes('repair_tickets.configure');
    const flash = props.flash as { toast?: ToastMessage } | undefined;
    const [toastQueue, setToastQueue] = useState<Array<ToastMessage & { id: number }>>([]);
    const lastFlashToastRef = useRef<ToastMessage | null>(null);

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

    const officesFilteredByZonal = useMemo(
        () =>
            cascadeZonalId
                ? officesForSelect.filter((office) => office.zonal_id === cascadeZonalId)
                : officesForSelect,
        [cascadeZonalId, officesForSelect]
    );

    const warehousesFilteredByOffice = useMemo(
        () =>
            cascadeOfficeId
                ? warehousesForSelect.filter((w) => w.office_id === cascadeOfficeId)
                : cascadeZonalId
                    ? warehousesForSelect.filter((w) => w.office?.zonal_id === cascadeZonalId)
                    : warehousesForSelect,
        [cascadeOfficeId, cascadeZonalId, warehousesForSelect]
    );

    const applyFilters = useCallback(
        (next: Partial<Filters> & { page?: number }) => {
            router.get(buildUrl({ ...filters, ...next }), {}, { preserveState: true, preserveScroll: true });
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

    const handleApprove = useCallback((ticket: RepairTicket) => {
        setApproveTicket(ticket);
        setApproveComment('');
    }, []);

    const handleCancel = useCallback((ticket: RepairTicket) => {
        setCancelTicket(ticket);
        setCancelReason(ticket.status === 'pending_approval'
            ? ticket.rejection_reason ?? ''
            : ticket.cancellation_reason ?? '');
        setModalError('');
    }, []);

    const submitCancel = useCallback(() => {
        if (!cancelTicket) return;
        if (cancelReason.trim() === '') {
            setModalError('Debe indicar el motivo.');
            return;
        }

        setActionLoading(true);
        router.post(`/admin/repair-tickets/${cancelTicket.id}/cancel`, { reason: cancelReason.trim() }, {
            preserveScroll: true,
            onFinish: () => {
                setActionLoading(false);
                setCancelTicket(null);
                setCancelReason('');
                setModalError('');
            },
        });
    }, [cancelReason, cancelTicket]);

    const submitApprove = useCallback(() => {
        if (!approveTicket) return;
        setActionLoading(true);
        const payload = approveComment.trim() ? { comment: approveComment.trim() } : {};
        router.post(`/admin/repair-tickets/${approveTicket.id}/approve`, payload, {
            preserveScroll: true,
            onFinish: () => {
                setActionLoading(false);
                setApproveTicket(null);
                setApproveComment('');
            },
        });
    }, [approveTicket, approveComment]);

    const handleDeleteConfirm = () => {
        if (!deleteTicket) return;
        setDeleting(true);
        router.delete(`/admin/repair-tickets/${deleteTicket.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteTicket(null);
            },
        });
    };

    const columns: DataTableColumn<RepairTicket>[] = [
        {
            key: 'code',
            label: 'Código',
            sortable: true,
            render: (row) => <span className="font-medium text-foreground">{row.code}</span>,
        },
        {
            key: 'item',
            label: 'Bien',
            sortable: false,
            className: 'text-foreground text-xs max-w-[240px]',
            render: (row) => <span>{affectedItem(row)}</span>,
        },
        {
            key: 'maintenance_mode',
            label: 'Modo',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => <span>{MODE_LABELS[row.maintenance_mode] ?? row.maintenance_mode}</span>,
        },
        {
            key: 'status',
            label: 'Estado',
            sortable: true,
            className: 'text-foreground text-xs',
            render: (row) => (
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_BADGE_CLASSES[row.status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400'}`}>
                    {STATUS_LABELS[row.status] ?? row.status}
                </span>
            ),
        },
        {
            key: 'priority',
            label: 'Prioridad',
            sortable: true,
            className: 'text-foreground text-xs',
            render: (row) => <span>{PRIORITY_LABELS[row.priority] ?? row.priority}</span>,
        },
        {
            key: 'technician',
            label: 'Técnico',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => <span>{userName(row.technician)}</span>,
        },
        {
            key: 'repair_shop',
            label: 'Taller',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => <span>{row.repair_shop?.name ?? '—'}</span>,
        },
        {
            key: 'reported_at',
            label: 'Reportado',
            sortable: true,
            className: 'text-foreground text-xs',
            render: (row) => formatDateTime(row.reported_at),
        },
        {
            key: 'actions',
            label: '',
            className: 'w-0 text-right',
            render: (row) => (
                <RepairTicketActionsCell
                    ticket={row}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    canApprove={canApprove}
                    canCancel={canCancel}
                    onApprove={handleApprove}
                    onCancel={handleCancel}
                    onDelete={setDeleteTicket}
                />
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reparaciones" />

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
                                Reparaciones
                                <span className="absolute bottom-0 left-0 h-0.5 w-8 rounded-full bg-inv-primary" />
                            </h1>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            Gestión general de tickets correctivos para activos y componentes.
                        </p>
                        <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-blue-500/20 dark:text-gray-400">
                                <Wrench className="size-3 shrink-0 text-blue-600 dark:text-blue-400" />
                                <span>Total</span>
                                <span className="font-semibold">{stats?.total ?? total}</span>
                            </span>
                            {stats?.has_filters && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-violet-500/20 dark:text-gray-400">
                                    <Filter className="size-3 shrink-0 text-violet-600 dark:text-violet-400" />
                                    <span>Con filtros</span>
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-500/25 dark:text-amber-300">
                                <span>Pendientes</span>
                                <span className="font-semibold">{stats?.pending_approval ?? 0}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-300">
                                <CheckCircle2 className="size-3 shrink-0" />
                                <span>Aprobados</span>
                                <span className="font-semibold">{stats?.approved ?? 0}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-medium text-sky-800 dark:bg-sky-500/25 dark:text-sky-300">
                                <span>En proceso</span>
                                <span className="font-semibold">{stats?.in_progress ?? 0}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-medium text-blue-800 dark:bg-blue-500/25 dark:text-blue-300">
                                <span>Completados</span>
                                <span className="font-semibold">{stats?.completed ?? 0}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-500/30 dark:text-slate-300">
                                <span>Cancel./Rech.</span>
                                <span className="font-semibold">{stats?.cancelled ?? 0}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-500/25 dark:text-amber-300">
                                <span>Página</span>
                                <span className="font-semibold">{current_page}/{last_page}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-medium text-teal-800 dark:bg-teal-500/25 dark:text-teal-300">
                                <LayoutGrid className="size-3 shrink-0" />
                                <span>En pantalla</span>
                                <span className="font-semibold">{data.length}</span>
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-start">
                        {canExport && (
                            <a
                                href={(() => {
                                    const search = new URLSearchParams();
                                    if (filters.q !== undefined && filters.q !== '') search.set('q', filters.q);
                                    if (filters.status !== undefined && filters.status !== '') search.set('status', filters.status);
                                    if (filters.priority !== undefined && filters.priority !== '') search.set('priority', filters.priority);
                                    if (filters.maintenance_mode !== undefined && filters.maintenance_mode !== '') search.set('maintenance_mode', filters.maintenance_mode);
                                    if (filters.date_from !== undefined && filters.date_from !== '') search.set('date_from', filters.date_from);
                                    if (filters.date_to !== undefined && filters.date_to !== '') search.set('date_to', filters.date_to);
                                    if (filters.zonal_id !== undefined && filters.zonal_id !== '') search.set('zonal_id', filters.zonal_id);
                                    if (filters.office_id !== undefined && filters.office_id !== '') search.set('office_id', filters.office_id);
                                    if (filters.warehouse_id !== undefined && filters.warehouse_id !== '') search.set('warehouse_id', filters.warehouse_id);
                                    if (filters.sort_by !== undefined) search.set('sort_by', filters.sort_by);
                                    if (filters.sort_order !== undefined) search.set('sort_order', filters.sort_order);
                                    return `/admin/repair-tickets/export?${search.toString()}`;
                                })()}
                                className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md bg-[#217346] text-white shadow-sm hover:bg-[#1a5c38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#217346] focus-visible:ring-offset-2"
                                aria-label="Exportar reparaciones a Excel"
                            >
                                <FileDown className="size-5" />
                            </a>
                        )}
                        {canCreate && (
                            <button
                                type="button"
                                onClick={() => setCreateOpen(true)}
                                className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md bg-inv-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-inv-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2"
                                aria-label="Nuevo ticket de reparación"
                            >
                                <Plus className="size-4" />
                                <span>Nuevo ticket</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="border-t border-border w-full shrink-0" aria-hidden />

                <div className="rounded-xl border border-border bg-card shadow-sm">
                    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <SearchFilter
                            value={searchInput}
                            onChange={setSearchInput}
                            placeholder="Buscar por código, bien, serie, taller o técnico…"
                            className="w-full sm:max-w-xs [&_input]:bg-white [&_input]:border-border [&_input]:text-foreground"
                        />
                        <Select
                            value={(filters.status ?? '') === '' ? '_' : filters.status}
                            onValueChange={(value) =>
                                applyFilters({ status: value === '_' ? '' : value, page: 1 })
                            }
                        >
                            <SelectTrigger className="w-full sm:w-[200px] border-border bg-background">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos los estados</SelectItem>
                                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                            <Select
                                value={cascadeZonalId === '' ? '_' : cascadeZonalId}
                                onValueChange={(value) => {
                                    const id = value === '_' ? '' : value;
                                    setCascadeZonalId(id);
                                    setCascadeOfficeId('');
                                    applyFilters({
                                        zonal_id: id,
                                        office_id: '',
                                        warehouse_id: '',
                                        page: 1,
                                    });
                                }}
                            >
                                <SelectTrigger className="w-full border-border bg-background sm:w-[180px]">
                                    <SelectValue placeholder="Zonal" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_">Todos los zonales</SelectItem>
                                    {zonalsForSelect.map((zonal) => (
                                        <SelectItem key={zonal.id} value={zonal.id}>
                                            {zonal.name} {zonal.code ? `(${zonal.code})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={cascadeOfficeId === '' ? '_' : cascadeOfficeId}
                                onValueChange={(value) => {
                                    const id = value === '_' ? '' : value;
                                    setCascadeOfficeId(id);
                                    applyFilters({
                                        office_id: id,
                                        warehouse_id: '',
                                        page: 1,
                                    });
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
                                    applyFilters({
                                        warehouse_id: value === '_' ? '' : value,
                                        page: 1,
                                    })
                                }
                                disabled={!cascadeZonalId && !cascadeOfficeId}
                            >
                                <SelectTrigger className="w-full border-border bg-background sm:w-[220px]">
                                    <SelectValue placeholder="Almacén" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_">Todos los almacenes</SelectItem>
                                    {warehousesFilteredByOffice.map((warehouse) => (
                                        <SelectItem key={warehouse.id} value={warehouse.id}>
                                            {warehouse.name} {warehouse.code ? `(${warehouse.code})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="flex gap-2 sm:flex-nowrap flex-wrap">
                                <input
                                    type="date"
                                    value={filters.date_from ?? ''}
                                    onChange={(event) =>
                                        applyFilters({
                                            date_from: event.target.value,
                                            page: 1,
                                        })
                                    }
                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary sm:w-auto"
                                />
                                <input
                                    type="date"
                                    value={filters.date_to ?? ''}
                                    onChange={(event) =>
                                        applyFilters({
                                            date_to: event.target.value,
                                            page: 1,
                                        })
                                    }
                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary sm:w-auto"
                                />
                            </div>
                        </div>
                        <Select
                            value={(filters.priority ?? '') === '' ? '_' : filters.priority}
                            onValueChange={(value) =>
                                applyFilters({ priority: value === '_' ? '' : value, page: 1 })
                            }
                        >
                            <SelectTrigger className="w-full sm:w-[180px] border-border bg-background">
                                <SelectValue placeholder="Prioridad" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todas las prioridades</SelectItem>
                                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={(filters.maintenance_mode ?? '') === '' ? '_' : filters.maintenance_mode}
                            onValueChange={(value) =>
                                applyFilters({ maintenance_mode: value === '_' ? '' : value, page: 1 })
                            }
                        >
                            <SelectTrigger className="w-full sm:w-[180px] border-border bg-background">
                                <SelectValue placeholder="Modo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos los modos</SelectItem>
                                {Object.entries(MODE_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="hidden md:block">
                        <DataTable
                            columns={columns}
                            data={data}
                            keyExtractor={(row) => row.id}
                            sortBy={filters.sort_by}
                            sortOrder={filters.sort_order}
                            onSort={handleSort}
                            emptyMessage="No hay tickets registrados. Crea uno con «Nuevo ticket»."
                            variant="default"
                        />
                    </div>

                    <div className="md:hidden">
                        {data.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8 px-4 text-sm">
                                No hay tickets registrados. Crea uno con «Nuevo ticket».
                            </p>
                        ) : (
                            <ul className="flex flex-col gap-3 p-3 sm:p-4">
                                {data.map((row) => (
                                    <li key={row.id}>
                                        <article className="rounded-lg border border-border bg-card shadow-[0_1px_2px_0_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                                            <div className="space-y-2 p-4">
                                                <p className="font-medium text-foreground text-base">{row.code}</p>
                                                <dl className="grid grid-cols-1 gap-1.5 text-sm">
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Bien:</dt>
                                                        <dd className="text-foreground">{affectedItem(row)}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Estado:</dt>
                                                        <dd className="text-foreground">{STATUS_LABELS[row.status] ?? row.status}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Prioridad:</dt>
                                                        <dd className="text-foreground">{PRIORITY_LABELS[row.priority] ?? row.priority}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Modo:</dt>
                                                        <dd className="text-foreground">{MODE_LABELS[row.maintenance_mode] ?? row.maintenance_mode}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Técnico:</dt>
                                                        <dd className="text-foreground">{userName(row.technician)}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Taller:</dt>
                                                        <dd className="text-foreground">{row.repair_shop?.name ?? '—'}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Reportado:</dt>
                                                        <dd className="text-foreground">{formatDateTime(row.reported_at)}</dd>
                                                    </div>
                                                </dl>
                                            </div>
                                            <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-muted/30 px-4 py-3">
                                                {canApprove && row.status === 'pending_approval' && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="cursor-pointer shrink-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                                        title="Aprobar ticket"
                                                        onClick={() => handleApprove(row)}
                                                    >
                                                        Aprobar
                                                    </Button>
                                                )}
                                                {canCancel && !['completed', 'rejected', 'cancelled'].includes(row.status) && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="cursor-pointer shrink-0 border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                                        title={row.status === 'pending_approval' ? 'Rechazar ticket' : 'Cancelar ticket'}
                                                        onClick={() => handleCancel(row)}
                                                    >
                                                        {row.status === 'pending_approval' ? 'Rechazar' : 'Cancelar'}
                                                    </Button>
                                                )}
                                                {canUpdate && (
                                                    <Button
                                                        asChild
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="cursor-pointer shrink-0 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30"
                                                    >
                                                        <Link href={`/admin/repair-tickets/${row.id}/config?tab=general`}>
                                                            <span>Editar</span>
                                                        </Link>
                                                    </Button>
                                                )}
                                                {canDelete && row.status === 'pending_approval' && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="cursor-pointer shrink-0 border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                                        onClick={() => setDeleteTicket(row)}
                                                    >
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
                            links={repairTickets.links}
                            onPerPageChange={handlePerPage}
                        />
                    </div>
                </div>
            </div>

            <DeleteConfirmModal
                open={!!deleteTicket}
                title="Eliminar ticket"
                description={
                    deleteTicket
                        ? `¿Eliminar el ticket «${deleteTicket.code}»? Esta acción no se puede deshacer.`
                        : ''
                }
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                loading={deleting}
                onOpenChange={(open) => {
                    if (!open) setDeleteTicket(null);
                }}
                onConfirm={handleDeleteConfirm}
            />

            <AppModal
                open={!!approveTicket}
                onOpenChange={(open) => {
                    if (!open) {
                        setApproveTicket(null);
                        setApproveComment('');
                        setModalError('');
                    }
                }}
                title="Aprobar ticket"
                contentClassName="space-y-4"
            >
                <p className="text-muted-foreground text-sm">
                    Escribe una nota de aprobación para el ticket {approveTicket?.code}.
                </p>
                <textarea
                    value={approveComment}
                    onChange={(event) => setApproveComment(event.target.value)}
                    className="min-h-[120px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Comentario opcional…"
                />
                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => {
                            setApproveTicket(null);
                            setApproveComment('');
                        }}
                    >
                        Cerrar
                    </Button>
                    <Button
                        type="button"
                        className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
                        disabled={actionLoading}
                        onClick={submitApprove}
                    >
                        Aprobar
                    </Button>
                </div>
            </AppModal>

            <AppModal
                open={!!cancelTicket}
                onOpenChange={(open) => {
                    if (!open) {
                        setCancelTicket(null);
                        setCancelReason('');
                        setModalError('');
                    }
                }}
                title={cancelTicket?.status === 'pending_approval' ? 'Rechazar ticket' : 'Cancelar ticket'}
                contentClassName="space-y-4"
            >
                <p className="text-muted-foreground text-sm">
                    {cancelTicket?.status === 'pending_approval'
                        ? `Indique el motivo del rechazo para el ticket ${cancelTicket?.code || 'seleccionado'}.`
                        : `Indique el motivo de cancelación para el ticket ${cancelTicket?.code || 'seleccionado'}.`}
                </p>
                <textarea
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                    className="min-h-[120px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Escriba el motivo..."
                />
                {modalError && <p className="text-sm text-destructive">{modalError}</p>}
                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => {
                            setCancelTicket(null);
                            setCancelReason('');
                            setModalError('');
                        }}
                    >
                        Cerrar
                    </Button>
                    <Button
                        type="button"
                        className="cursor-pointer bg-amber-600 text-white hover:bg-amber-700"
                        disabled={actionLoading}
                        onClick={submitCancel}
                    >
                        {cancelTicket?.status === 'pending_approval' ? 'Rechazar' : 'Cancelar'}
                    </Button>
                </div>
            </AppModal>

            <RepairTicketFormModal
                open={createOpen}
                onOpenChange={setCreateOpen}
                assetsForSelect={assetsForSelect}
                componentsForSelect={componentsForSelect}
                usersForSelect={usersForSelect}
                repairShopsForSelect={repairShopsForSelect}
                zonalsForSelect={zonalsForSelect}
                officesForSelect={officesForSelect}
                warehousesForSelect={warehousesForSelect}
            />
        </AppLayout>
    );
}
