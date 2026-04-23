import { Head, router, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    FolderOpen,
    LayoutGrid,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataTableColumn, SortOrder } from '@/components/data-table';
import { DataTable } from '@/components/data-table';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';
import { DepartmentFormModal } from '@/components/organization/department-form-modal';
import { RestoreConfirmModal, type RestoreCandidate } from '@/components/restore-confirm-modal';
import { SearchFilter } from '@/components/search-filter';
import { TablePagination } from '@/components/table-pagination';
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
import type {
    BreadcrumbItem,
    Department,
    PaginationMeta,
} from '@/types';
import type { ToastMessage } from '@/components/toast';

type FlashWithRestore = {
    toast?: ToastMessage;
    restore_candidate?: RestoreCandidate;
    restore_payload?: Record<string, unknown>;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Departamentos', href: '/admin/departments' },
];

const SEARCH_DEBOUNCE_MS = 400;

type Filters = {
    q: string;
    is_active: string;
    sort_by: string;
    sort_order: SortOrder;
    per_page: number;
};

type Stats = {
    total: number;
    total_active: number;
};

type ZonalOption = { id: string; name: string; code: string };
type DepartmentOption = { id: string; zonal_id: string; name: string; code: string | null };

type DepartmentsIndexProps = {
    departments: {
        data: Department[];
        links: PaginationMeta['links'];
        from: number | null;
        to: number | null;
        total: number;
        current_page: number;
        last_page: number;
        per_page: number;
    };
    zonals: ZonalOption[];
    departmentsForSelect: DepartmentOption[];
    filters: Filters;
    stats?: Stats;
};

function buildUrl(params: Partial<Filters> & { page?: number }) {
    const search = new URLSearchParams();
    if (params.q !== undefined) search.set('q', params.q);
    if (params.is_active !== undefined) search.set('is_active', params.is_active);
    if (params.sort_by !== undefined) search.set('sort_by', params.sort_by);
    if (params.sort_order !== undefined)
        search.set('sort_order', params.sort_order);
    if (params.per_page !== undefined)
        search.set('per_page', String(params.per_page));
    if (params.page !== undefined) search.set('page', String(params.page));
    return `/admin/departments?${search.toString()}`;
}

export default function DepartmentsIndex({
    departments,
    zonals,
    departmentsForSelect,
    filters,
    stats,
}: DepartmentsIndexProps) {
    const { data, links, from, to, total, current_page, last_page } =
        departments;
    const totalActive = stats?.total_active ?? 0;
    const [searchInput, setSearchInput] = useState(() => {
        const q = filters.q;
        if (q == null || q === 'null') return '';
        return String(q);
    });
    const [deleteDept, setDeleteDept] = useState<Department | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [formDept, setFormDept] = useState<Department | null>(null);

    const { props } = usePage();
    const auth = (props as { auth?: { permissions?: string[] } }).auth;
    const permissions = auth?.permissions ?? [];
    const canCreate = permissions.includes('departments.create');
    const canUpdate = permissions.includes('departments.update');
    const canDelete = permissions.includes('departments.delete');
    const flash = props.flash as FlashWithRestore | undefined;
    const [toastQueue, setToastQueue] = useState<
        Array<ToastMessage & { id: number }>
    >([]);
    const lastFlashToastRef = useRef<ToastMessage | null>(null);
    const [restoreModalOpen, setRestoreModalOpen] = useState(false);
    const [restoring, setRestoring] = useState(false);

    useEffect(() => {
        if (flash?.restore_candidate) setRestoreModalOpen(true);
    }, [flash?.restore_candidate]);

    useEffect(() => {
        const t = flash?.toast;
        if (!t) return;
        if (t === lastFlashToastRef.current) return;
        lastFlashToastRef.current = t;
        const id = Date.now();
        const item = { ...t, id };
        queueMicrotask(() => {
            setToastQueue((q) => [...q, item]);
        });
    }, [flash?.toast]);

    const removeToast = useCallback((id: number) => {
        setToastQueue((q) => q.filter((item) => item.id !== id));
    }, []);

    const applyFilters = useCallback(
        (next: Partial<Filters> & { page?: number }) => {
            router.get(buildUrl({ ...filters, ...next }), {}, {
                preserveState: true,
            });
        },
        [filters]
    );

    useEffect(() => {
        const t = setTimeout(() => {
            const effectiveQ =
                filters.q == null || filters.q === 'null'
                    ? ''
                    : String(filters.q);
            if (searchInput !== effectiveQ) {
                applyFilters({ q: searchInput || '', page: 1 });
            }
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [searchInput, filters.q, applyFilters]);

    const handleSort = useCallback(
        (key: string) => {
            const order =
                filters.sort_by === key && filters.sort_order === 'asc'
                    ? 'desc'
                    : 'asc';
            applyFilters({
                sort_by: key,
                sort_order: order as SortOrder,
            });
        },
        [filters.sort_by, filters.sort_order, applyFilters]
    );

    const handlePerPage = (perPage: number) => {
        applyFilters({ per_page: perPage, page: 1 });
    };

    const handleDeleteConfirm = () => {
        if (!deleteDept) return;
        setDeleting(true);
        router.delete(`/admin/departments/${deleteDept.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteDept(null);
            },
        });
    };

    const handleRestoreConfirm = () => {
        const candidate = flash?.restore_candidate;
        const payload = flash?.restore_payload as Record<string, unknown> | undefined;
        if (!candidate || candidate.type !== 'department' || !payload) return;
        setRestoring(true);
        router.post('/admin/departments/restore', { id: candidate.id, ...payload }, {
            preserveScroll: true,
            onFinish: () => setRestoring(false),
            onSuccess: () => setRestoreModalOpen(false),
        });
    };

    const handleRestoreCancel = () => {
        setRestoreModalOpen(false);
        router.get(window.location.pathname, {}, { preserveState: false });
    };

    const columns: DataTableColumn<Department>[] = [
        {
            key: 'name',
            label: 'Nombre',
            sortable: true,
            render: (row) => (
                <span className="font-medium text-foreground">{row.name}</span>
            ),
        },
        {
            key: 'code',
            label: 'Código',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => (
                <span className="tabular-nums">{row.code ?? '—'}</span>
            ),
        },
        {
            key: 'zonal',
            label: 'Zonal',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => (
                <span>{row.zonal ? `${row.zonal.name} (${row.zonal.code})` : '—'}</span>
            ),
        },
        {
            key: 'parent',
            label: 'Padre',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => (
                <span>{row.parent ? row.parent.name : '—'}</span>
            ),
        },
        {
            key: 'is_active',
            label: 'Activo',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => (
                <span
                    className={
                        row.is_active
                            ? 'inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                            : 'inline-flex rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                    }
                >
                    {row.is_active ? 'Sí' : 'No'}
                </span>
            ),
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
            className: 'w-0 text-right',
            render: (row) => (
                <div className="flex justify-end gap-1">
                    {canUpdate && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer shrink-0 size-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
                            aria-label={`Editar ${row.name}`}
                            onClick={() => {
                                setFormDept(row);
                                setFormOpen(true);
                            }}
                        >
                            <Pencil className="size-4" />
                        </Button>
                    )}
                    {canDelete && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer shrink-0 size-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400/80 dark:hover:bg-rose-900/20"
                            aria-label={`Eliminar ${row.name}`}
                            onClick={() => setDeleteDept(row)}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Departamentos" />

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
                                Departamentos
                                <span className="absolute bottom-0 left-0 h-0.5 w-8 rounded-full bg-inv-primary" />
                            </h1>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            Departamentos y áreas con jerarquía por zonal.
                        </p>
                        <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-blue-500/20 dark:text-gray-400">
                                <FolderOpen className="size-3 shrink-0 text-blue-600 dark:text-blue-400" />
                                <span>Total</span>
                                <span className="font-semibold">{total}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-emerald-500/20 dark:text-gray-400">
                                <CheckCircle2 className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <span>Activos</span>
                                <span className="font-semibold">{totalActive}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-amber-500/20 dark:text-gray-400">
                                <span>Página</span>
                                <span className="font-semibold">
                                    {current_page}/{last_page}
                                </span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-slate-500/20 dark:text-gray-400">
                                <LayoutGrid className="size-3 shrink-0 text-slate-600 dark:text-slate-400" />
                                <span>En pantalla</span>
                                <span className="font-semibold">{data.length}</span>
                            </span>
                        </div>
                    </div>
                    {canCreate && (
                        <button
                            type="button"
                            onClick={() => {
                                setFormDept(null);
                                setFormOpen(true);
                            }}
                            className="inline-flex w-fit cursor-pointer items-center gap-2 self-start rounded-md bg-inv-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-inv-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2"
                            aria-label="Nuevo departamento"
                        >
                            <Plus className="size-4" />
                            <span>Nuevo departamento</span>
                        </button>
                    )}
                </div>

                <div
                    className="border-t border-border w-full shrink-0"
                    aria-hidden
                />

                <div className="rounded-xl border border-border bg-card shadow-sm">
                    <div className="flex flex-wrap items-center gap-3 p-3">
                        <SearchFilter
                            value={searchInput}
                            onChange={setSearchInput}
                            placeholder="Buscar por nombre, código o zonal…"
                            className="max-w-xs [&_input]:bg-white [&_input]:border-border [&_input]:text-foreground"
                        />
                        <Select
                            value={(filters.is_active ?? '') === '' ? '_' : filters.is_active}
                            onValueChange={(v) =>
                                applyFilters({
                                    is_active: v === '_' ? '' : v,
                                    page: 1,
                                })
                            }
                        >
                            <SelectTrigger className="w-[140px] border-border bg-background">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos los estados</SelectItem>
                                <SelectItem value="1">Activos</SelectItem>
                                <SelectItem value="0">Inactivos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="hidden md:block">
                        <DataTable
                            columns={columns}
                            data={data}
                            keyExtractor={(r) => r.id}
                            sortBy={filters.sort_by}
                            sortOrder={filters.sort_order}
                            onSort={handleSort}
                            emptyMessage="No hay departamentos. Crea uno con «Nuevo departamento»."
                            variant="default"
                        />
                    </div>
                    <div className="md:hidden">
                        {data.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8 px-4 text-sm">
                                No hay departamentos. Crea uno con «Nuevo departamento».
                            </p>
                        ) : (
                            <ul className="flex flex-col gap-3 p-3 sm:p-4">
                                {data.map((row) => (
                                    <li key={row.id}>
                                        <article className="rounded-lg border border-border bg-card shadow-[0_1px_2px_0_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                                            <div className="space-y-2 p-4">
                                                <p className="font-medium text-foreground text-base">
                                                    {row.name}
                                                </p>
                                                <dl className="grid grid-cols-1 gap-1.5 text-sm">
                                                    {row.code && (
                                                        <div className="flex flex-wrap gap-x-2">
                                                            <dt className="text-muted-foreground shrink-0">Código:</dt>
                                                            <dd className="text-foreground">{row.code}</dd>
                                                        </div>
                                                    )}
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Zonal:</dt>
                                                        <dd className="text-foreground">
                                                            {row.zonal ? `${row.zonal.name} (${row.zonal.code})` : '—'}
                                                        </dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Padre:</dt>
                                                        <dd className="text-foreground">{row.parent ? row.parent.name : '—'}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Activo:</dt>
                                                        <dd className="text-foreground">{row.is_active ? 'Sí' : 'No'}</dd>
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
                                            <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-muted/30 px-4 py-3">
                                                {canUpdate && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="cursor-pointer shrink-0 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30"
                                                        aria-label={`Editar ${row.name}`}
                                                        onClick={() => {
                                                            setFormDept(row);
                                                            setFormOpen(true);
                                                        }}
                                                    >
                                                        <Pencil className="size-3.5 shrink-0 mr-1" />
                                                        <span>Editar</span>
                                                    </Button>
                                                )}
                                                {canDelete && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="cursor-pointer shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/20"
                                                        aria-label={`Eliminar ${row.name}`}
                                                        onClick={() =>
                                                            setDeleteDept(row)
                                                        }
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
                            buildPageUrl={(page) =>
                                buildUrl({ ...filters, page })
                            }
                            onPerPageChange={handlePerPage}
                            perPageOptions={[5, 10, 15, 25]}
                        />
                    </div>
                </div>
            </div>

            <DepartmentFormModal
                open={formOpen}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) setFormDept(null);
                }}
                department={formDept}
                zonals={zonals}
                departmentsForSelect={departmentsForSelect}
            />

            <DeleteConfirmModal
                open={!!deleteDept}
                onOpenChange={(open) => !open && setDeleteDept(null)}
                title="Eliminar departamento"
                description={
                    deleteDept
                        ? `¿Eliminar el departamento «${deleteDept.name}»? Esta acción no se puede deshacer.`
                        : undefined
                }
                onConfirm={handleDeleteConfirm}
                loading={deleting}
            />

            <RestoreConfirmModal
                open={restoreModalOpen}
                onOpenChange={(open) => !open && handleRestoreCancel()}
                candidate={flash?.restore_candidate ?? null}
                onConfirm={handleRestoreConfirm}
                loading={restoring}
            />
        </AppLayout>
    );
}
