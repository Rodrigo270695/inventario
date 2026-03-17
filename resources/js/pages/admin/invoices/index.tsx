import type React from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Eye, FileCheck, FileText, LayoutGrid, Pencil, Plus, Trash2, Unlock, Lock } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataTableColumn, SortOrder } from '@/components/data-table';
import { DataTable } from '@/components/data-table';
import { DateRangeFilter, type DateRangeFilterValue } from '@/components/date-range-filter';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';
import { InvoiceFormModal } from '@/components/invoices/invoice-form-modal';
import { InvoiceStatusBadge } from '@/components/invoices/status-badge';
import { InvoiceActionsCell } from '@/components/invoices/actions-cell';
import { SearchFilter } from '@/components/search-filter';
import { Toast } from '@/components/toast';
import type { ToastMessage } from '@/components/toast';
import { TablePagination } from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppModal } from '@/components/app-modal';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Invoice, PaginationMeta } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Compras y logística', href: '#' },
    { title: 'Facturas', href: '/admin/invoices' },
];

const SEARCH_DEBOUNCE_MS = 400;

type Filters = {
    q: string;
    date_from: string;
    date_to: string;
    sort_by: string;
    sort_order: SortOrder;
    per_page: number;
    status: string;
};

type Stats = {
    total: number;
};

type PurchaseOrderOption = {
    id: string;
    code: string | null;
    supplier_id: string;
    total_amount?: string | number | null;
    supplier?: { id: string; name: string; ruc: string | null };
};

type InvoicesIndexProps = {
    invoices: {
        data: Invoice[];
        links: PaginationMeta['links'];
        from: number | null;
        to: number | null;
        total: number;
        current_page: number;
        last_page: number;
        per_page: number;
    };
    filters: Filters;
    stats?: Stats;
    purchase_orders?: PurchaseOrderOption[];
};

function buildUrl(params: Partial<Filters> & { page?: number }) {
    const search = new URLSearchParams();
    if (params.q !== undefined) search.set('q', params.q);
    if (params.date_from !== undefined && params.date_from !== '') search.set('date_from', params.date_from);
    if (params.date_to !== undefined && params.date_to !== '') search.set('date_to', params.date_to);
    if (params.sort_by !== undefined) search.set('sort_by', params.sort_by);
    if (params.sort_order !== undefined) search.set('sort_order', params.sort_order);
    if (params.per_page !== undefined) search.set('per_page', String(params.per_page));
    if (params.status !== undefined && params.status !== '') search.set('status', params.status);
    if (params.page !== undefined) search.set('page', String(params.page));
    return `/admin/invoices?${search.toString()}`;
}

function formatCurrency(value: number | null | undefined): string {
    if (value == null) return '—';
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
}

/** Factura solo puede eliminarse dentro de los 3 días posteriores a su creación. */
const DELETE_GRACE_DAYS = 3;

function canDeleteInvoice(invoice: Invoice): boolean {
    if (!invoice.created_at) return false;
    const created = new Date(invoice.created_at).getTime();
    const limit = Date.now() - DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000;
    return created > limit;
}

export default function InvoicesIndex({
    invoices,
    filters,
    stats,
    purchase_orders = [],
}: InvoicesIndexProps) {
    const { data, links, from, to, total, current_page, last_page } = invoices;
    const statsTotal = stats?.total ?? total;
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
    const [editDocumentFile, setEditDocumentFile] = useState<File | null>(null);
    const [editRemissionFile, setEditRemissionFile] = useState<File | null>(null);
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [searchInput, setSearchInput] = useState(() => {
        const q = filters.q;
        if (q == null || q === 'null') return '';
        return String(q);
    });

    const { props } = usePage();
    const auth = (props as { auth?: { permissions?: string[] } }).auth;
    const permissions = auth?.permissions ?? [];
    const canCreate = permissions.includes('invoices.create');
    const canDelete = permissions.includes('invoices.delete');
    const canChangeStatus = permissions.includes('invoices.status');
    const canUpdate = permissions.includes('invoices.update');
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

    const openEditModal = useCallback((invoice: Invoice) => {
        setEditInvoice(invoice);
        setEditDocumentFile(null);
        setEditRemissionFile(null);
    }, []);

    const closeEditModal = useCallback(() => {
        setEditInvoice(null);
        setEditDocumentFile(null);
        setEditRemissionFile(null);
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

    const columns: DataTableColumn<Invoice>[] = [
        {
            key: 'invoice_number',
            label: 'Nº factura',
            sortable: true,
            className: 'text-foreground text-xs',
            render: (row) => (
                <span className="font-medium text-foreground">{row.invoice_number || '—'}</span>
            ),
        },
        {
            key: 'purchase_order',
            label: 'OC',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => {
                const po = row.purchase_order;
                if (!po) return <span>—</span>;
                const code = po.code ? `#${po.code}` : '—';
                return (
                    <Link
                        href={`/admin/purchase-orders/${po.id}`}
                        className="font-medium text-inv-primary hover:underline"
                    >
                        {code}
                    </Link>
                );
            },
        },
        {
            key: 'supplier',
            label: 'Proveedor',
            sortable: false,
            className: 'text-foreground text-xs max-w-[180px]',
            render: (row) => {
                const name = row.purchase_order?.supplier?.name ?? '—';
                const ruc = row.purchase_order?.supplier?.ruc;
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
            key: 'invoice_date',
            label: 'Fecha factura',
            sortable: true,
            className: 'text-foreground text-xs',
            render: (row) =>
                row.invoice_date
                    ? new Date(row.invoice_date).toLocaleDateString('es', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                      })
                    : '—',
        },
        {
            key: 'remission_guide',
            label: 'Guía remisión',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => row.remission_guide || '—',
        },
        {
            key: 'amount',
            label: 'Monto',
            sortable: true,
            className: 'text-foreground text-xs tabular-nums',
            render: (row) => formatCurrency(row.amount),
        },
        {
            key: 'status',
            label: 'Estado',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => <InvoiceStatusBadge status={row.status} />,
        },
        {
            key: 'registered_by',
            label: 'Registrada por',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => {
                const u = row.registered_by;
                if (!u) return '—';
                const fullName = [u.name, (u as any).last_name].filter(Boolean).join(' ');
                return fullName || '—';
            },
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
            className: 'min-w-[120px] text-right',
            render: (row) => (
                <InvoiceActionsCell
                    invoice={row}
                    canUpdate={canUpdate}
                    canDelete={canDelete && canDeleteInvoice(row)}
                    canChangeStatus={canChangeStatus}
                    onEdit={openEditModal}
                    onDelete={setInvoiceToDelete}
                />
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Facturas" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-3">
                        <div>
                            <h1 className="relative inline-block pb-1 text-xl font-semibold text-foreground">
                                Facturas
                                <span className="absolute bottom-0 left-0 h-0.5 w-8 rounded-full bg-inv-primary" />
                            </h1>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            Gestión de facturas asociadas a órdenes de compra.
                        </p>
                        <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-blue-500/20 dark:text-gray-400">
                                <FileCheck className="size-3 shrink-0 text-blue-600 dark:text-blue-400" />
                                <span>Total</span>
                                <span className="font-semibold">{statsTotal}</span>
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
                                aria-label="Nueva factura"
                            >
                                <Plus className="size-4" />
                                <span>Nueva factura</span>
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
                            placeholder="Buscar por nº factura, OC, proveedor o RUC…"
                            className="w-full [&_input]:bg-white [&_input]:border-border [&_input]:text-foreground sm:max-w-xs"
                        />
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
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">Estado</span>
                            <Select
                                value={filters.status && filters.status !== 'null' ? filters.status : '_all'}
                                onValueChange={(value) =>
                                    applyFilters({
                                        status: value === '_all' ? '' : value,
                                        page: 1,
                                    })
                                }
                            >
                                <SelectTrigger className="h-9 w-[130px] rounded-xl border-border bg-background/80 shadow-xs text-xs">
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent align="start" className="rounded-xl text-xs">
                                    <SelectItem value="_all">Todos</SelectItem>
                                    <SelectItem value="open">Abierta</SelectItem>
                                    <SelectItem value="closed">Cerrada</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="hidden md:block">
                        <DataTable
                            columns={columns}
                            data={data}
                            keyExtractor={(r) => r.id}
                            sortBy={filters.sort_by}
                            sortOrder={filters.sort_order}
                            onSort={handleSort}
                            emptyMessage="No hay facturas registradas."
                            variant="default"
                        />
                    </div>
                    <div className="md:hidden">
                        {data.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8 px-4 text-sm">
                                No hay facturas registradas.
                            </p>
                        ) : (
                            <ul className="flex flex-col gap-3 p-3 sm:p-4">
                                {data.map((row) => (
                                    <li key={row.id}>
                                        <article className="rounded-lg border border-border bg-card shadow-[0_1px_2px_0_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                                            <div className="space-y-2 p-4">
                                                <p className="font-medium text-foreground text-base">
                                                    {row.invoice_number || 'Sin número'}
                                                </p>
                                                <dl className="grid grid-cols-1 gap-1.5 text-sm">
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">OC:</dt>
                                                        <dd className="text-foreground">
                                                            {row.purchase_order?.code ? `#${row.purchase_order.code}` : '—'}
                                                        </dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Proveedor:</dt>
                                                        <dd className="text-foreground">
                                                            {row.purchase_order?.supplier?.name ?? '—'}
                                                        </dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Fecha factura:</dt>
                                                        <dd className="text-foreground">
                                                            {row.invoice_date
                                                                ? new Date(row.invoice_date).toLocaleDateString('es', {
                                                                      day: '2-digit',
                                                                      month: 'short',
                                                                      year: 'numeric',
                                                                  })
                                                                : '—'}
                                                        </dd>
                                                    </div>
                                                <div className="flex flex-wrap gap-x-2">
                                                    <dt className="text-muted-foreground shrink-0">Guía remisión:</dt>
                                                    <dd className="text-foreground">
                                                        {row.remission_guide || '—'}
                                                    </dd>
                                                </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Monto:</dt>
                                                        <dd className="text-foreground tabular-nums">{formatCurrency(row.amount)}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Estado:</dt>
                                                        <dd className="text-foreground">
                                                            <span
                                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                                    row.status === 'closed'
                                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                                                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                                                                }`}
                                                            >
                                                                {row.status === 'closed' ? 'Cerrada' : 'Abierta'}
                                                            </span>
                                                        </dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Registrada por:</dt>
                                                        <dd className="text-foreground">
                                                            {row.registered_by
                                                                ? [row.registered_by.name, (row.registered_by as any).last_name]
                                                                      .filter(Boolean)
                                                                      .join(' ') || '—'
                                                                : '—'}
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
                                                <Link
                                                    href={`/admin/purchase-orders/${row.purchase_order?.id ?? '#'}`}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-inv-primary/30 bg-inv-primary/10 px-3 py-2 text-sm font-medium text-inv-primary hover:bg-inv-primary/20 dark:bg-inv-primary/20 dark:hover:bg-inv-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary"
                                                >
                                                    <Eye className="size-4" />
                                                    Ver OC
                                                </Link>
                                                {row.pdf_path && (
                                                    <a
                                                        href={`/admin/invoices/${row.id}/document`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                                    >
                                                        <FileText className="size-4" />
                                                        Descargar factura
                                                    </a>
                                                )}
                                                {row.remission_guide_path && (
                                                    <a
                                                        href={`/admin/invoices/${row.id}/remission-guide`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                                                    >
                                                        <FileText className="size-4" />
                                                        Descargar guía de remisión
                                                    </a>
                                                )}
                                                {canChangeStatus && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            router.post(
                                                                row.status === 'closed'
                                                                    ? `/admin/invoices/${row.id}/open`
                                                                    : `/admin/invoices/${row.id}/close`,
                                                                {},
                                                                { preserveScroll: true }
                                                            )
                                                        }
                                                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium cursor-pointer ${
                                                            row.status === 'closed'
                                                                ? 'border-amber-500 text-amber-700 hover:bg-amber-50'
                                                                : 'border-emerald-500 text-emerald-700 hover:bg-emerald-50'
                                                        }`}
                                                    >
                                                        {row.status === 'closed' ? (
                                                            <>
                                                                <Unlock className="size-4" />
                                                                Abrir
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Lock className="size-4" />
                                                                Cerrar
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                                {canUpdate && row.status !== 'closed' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(row)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-500/20 dark:text-sky-300 dark:hover:bg-sky-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                                                    >
                                                        <Pencil className="size-4" />
                                                        Editar documentos
                                                    </button>
                                                )}
                                                {canDelete && row.status !== 'closed' && canDeleteInvoice(row) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setInvoiceToDelete(row)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                                                    >
                                                        <Trash2 className="size-4" />
                                                        Eliminar
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

            {canCreate && (
                <InvoiceFormModal
                    open={createModalOpen}
                    onOpenChange={setCreateModalOpen}
                    purchase_orders={purchase_orders}
                />
            )}

            <DeleteConfirmModal
                open={invoiceToDelete !== null}
                onOpenChange={(open) => !open && setInvoiceToDelete(null)}
                title="Eliminar factura"
                description={
                    invoiceToDelete
                        ? `¿Eliminar la factura ${invoiceToDelete.invoice_number ?? 'sin número'}? Se eliminará también el documento asociado.`
                        : ''
                }
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                loading={deleting}
                onConfirm={() => {
                    if (!invoiceToDelete) return;
                    setDeleting(true);
                    router.delete(`/admin/invoices/${invoiceToDelete.id}`, {
                        preserveScroll: true,
                        onFinish: () => {
                            setDeleting(false);
                            setInvoiceToDelete(null);
                        },
                    });
                }}
            />
            {canUpdate && editInvoice && (
                <AppModal
                    open={!!editInvoice}
                    onOpenChange={(open) => {
                        if (!open) closeEditModal();
                    }}
                    title="Editar documentos de factura"
                    contentClassName="space-y-4"
                >
                    <form
                        onSubmit={(e: React.FormEvent) => {
                            e.preventDefault();
                            if (!editInvoice) return;
                            setEditSubmitting(true);
                            const formData = new FormData();
                            formData.append('_method', 'PUT');
                            formData.append('invoice_number', editInvoice.invoice_number ?? '');
                            formData.append('invoice_date', editInvoice.invoice_date ?? '');
                            if (editInvoice.amount != null) {
                                formData.append('amount', String(editInvoice.amount));
                            }
                            formData.append('remission_guide', editInvoice.remission_guide ?? '');
                            if (editDocumentFile) {
                                formData.append('document', editDocumentFile);
                            }
                            if (editRemissionFile) {
                                formData.append('remission_guide_file', editRemissionFile);
                            }
                            router.post(`/admin/invoices/${editInvoice.id}`, formData, {
                                forceFormData: true,
                                preserveScroll: true,
                                onFinish: () => setEditSubmitting(false),
                                onSuccess: () => closeEditModal(),
                            });
                        }}
                        className="space-y-4"
                    >
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                                Solo puedes actualizar los archivos de la factura y la guía de remisión. El resto de
                                datos se mantendrán iguales.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Documento de factura (PDF o Word)</label>
                            {editInvoice?.pdf_path && (
                                <p className="text-xs text-muted-foreground">
                                    Ya hay un documento cargado.{' '}
                                    <a
                                        href={`/admin/invoices/${editInvoice.id}/document`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-inv-primary hover:underline"
                                    >
                                        Ver/descargar actual
                                    </a>
                                </p>
                            )}
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setEditDocumentFile(e.target.files?.[0] ?? null)
                                }
                                className="border-input flex h-9 w-full rounded-xl border bg-background/80 px-3 py-1.5 text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-inv-primary/10 file:px-3 file:py-1 file:text-inv-primary file:text-sm"
                            />
                            {editDocumentFile && (
                                <p className="text-xs text-muted-foreground">
                                    Seleccionado: {editDocumentFile.name} ({(editDocumentFile.size / 1024).toFixed(1)} KB)
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Guía de remisión (PDF)</label>
                            {editInvoice?.remission_guide_path && (
                                <p className="text-xs text-muted-foreground">
                                    Ya hay una guía cargada.{' '}
                                    <a
                                        href={`/admin/invoices/${editInvoice.id}/remission-guide`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-inv-primary hover:underline"
                                    >
                                        Ver/descargar actual
                                    </a>
                                </p>
                            )}
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setEditRemissionFile(e.target.files?.[0] ?? null)
                                }
                                className="border-input flex h-9 w-full rounded-xl border bg-background/80 px-3 py-1.5 text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-inv-primary/10 file:px-3 file:py-1 file:text-inv-primary file:text-sm"
                            />
                            {editRemissionFile && (
                                <p className="text-xs text-muted-foreground">
                                    Seleccionado: {editRemissionFile.name} (
                                    {(editRemissionFile.size / 1024).toFixed(1)} KB)
                                </p>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeEditModal}
                                className="cursor-pointer"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={editSubmitting}
                                className="cursor-pointer bg-inv-primary hover:bg-inv-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {editSubmitting ? 'Guardando…' : 'Guardar cambios'}
                            </Button>
                        </div>
                    </form>
                </AppModal>
            )}
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
