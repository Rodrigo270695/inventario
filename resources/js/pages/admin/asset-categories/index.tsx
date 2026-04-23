import { Head, router, usePage } from '@inertiajs/react';
import { CheckCircle2, LayoutGrid, Pencil, Plus, Trash2, Wrench } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataTableColumn, SortOrder } from '@/components/data-table';
import { DataTable } from '@/components/data-table';
import { AssetCategoryFormModal } from '@/components/asset-catalog/asset-category-form-modal';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';
import { SearchFilter } from '@/components/search-filter';
import { TablePagination } from '@/components/table-pagination';
import { Toast } from '@/components/toast';
import type { ToastMessage } from '@/components/toast';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { AssetCategory, BreadcrumbItem, PaginationMeta } from '@/types';

type FlashWithToast = {
    toast?: ToastMessage;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Categorías de activos', href: '/admin/asset-categories' },
];

const SEARCH_DEBOUNCE_MS = 400;

const TYPE_LABELS: Record<string, string> = {
    technology: 'Tecnología',
    vehicle: 'Vehículo',
    furniture: 'Mobiliario',
    building: 'Inmueble',
    machinery: 'Maquinaria',
    fixed_asset: 'Activo fijo',
    minor_asset: 'Activo menor',
    service_maintenance: 'Servicios y mantenimiento',
    other: 'Otro',
};

type Filters = {
    q: string;
    is_active: string;
    type: string;
    gl_account_id: string;
    sort_by: string;
    sort_order: SortOrder;
    per_page: number;
};

type Stats = {
    total: number;
    total_active: number;
};

type GlAccountOption = { id: string; code: string; name: string };

type AssetCategoriesIndexProps = {
    categories: {
        data: AssetCategory[];
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
    glAccountsForSelect: GlAccountOption[];
};

function buildUrl(params: Partial<Filters> & { page?: number }) {
    const search = new URLSearchParams();
    if (params.q !== undefined) search.set('q', params.q);
    if (params.is_active !== undefined) search.set('is_active', params.is_active);
    if (params.type !== undefined) search.set('type', params.type);
    if (params.gl_account_id !== undefined) search.set('gl_account_id', params.gl_account_id);
    if (params.sort_by !== undefined) search.set('sort_by', params.sort_by);
    if (params.sort_order !== undefined) search.set('sort_order', params.sort_order);
    if (params.per_page !== undefined) search.set('per_page', String(params.per_page));
    if (params.page !== undefined) search.set('page', String(params.page));
    return `/admin/asset-categories?${search.toString()}`;
}

export default function AssetCategoriesIndex({
    categories,
    filters,
    stats,
    glAccountsForSelect,
}: AssetCategoriesIndexProps) {
    const { data, links, from, to, total, current_page, last_page } = categories;
    const totalActive = stats?.total_active ?? 0;
    const [searchInput, setSearchInput] = useState(() => {
        const q = filters.q;
        if (q == null || q === 'null') return '';
        return String(q);
    });
    const [deleteCategory, setDeleteCategory] = useState<AssetCategory | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [formCategory, setFormCategory] = useState<AssetCategory | null>(null);

    const { props } = usePage();
    const auth = (props as { auth?: { permissions?: string[] } }).auth;
    const permissions = auth?.permissions ?? [];
    const canCreate = permissions.includes('asset_categories.create');
    const canUpdate = permissions.includes('asset_categories.update');
    const canDelete = permissions.includes('asset_categories.delete');
    const flash = props.flash as FlashWithToast | undefined;
    const [toastQueue, setToastQueue] = useState<Array<ToastMessage & { id: number }>>([]);
    const lastFlashToastRef = useRef<ToastMessage | null>(null);

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
        if (!deleteCategory) return;
        setDeleting(true);
        router.delete(`/admin/asset-categories/${deleteCategory.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteCategory(null);
            },
        });
    };

    const columns: DataTableColumn<AssetCategory>[] = [
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
            sortable: true,
            className: 'text-foreground text-xs',
            render: (row) => (
                <span className="tabular-nums">{row.code}</span>
            ),
        },
        {
            key: 'type',
            label: 'Tipo',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => (
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-500/20 dark:text-slate-300">
                    {TYPE_LABELS[row.type] ?? row.type}
                </span>
            ),
        },
        {
            key: 'gl_account',
            label: 'Cuenta contable',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => (
                <span className="tabular-nums text-muted-foreground">
                    {row.gl_account ? `${row.gl_account.code} — ${row.gl_account.name}` : '—'}
                </span>
            ),
        },
        {
            key: 'default_useful_life_years',
            label: 'Vida útil (años)',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => (
                <span className="tabular-nums">
                    {row.default_useful_life_years ?? '—'}
                </span>
            ),
        },
        {
            key: 'default_depreciation_method',
            label: 'Método',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => (
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-500/20 dark:text-slate-300">
                    {row.default_depreciation_method === 'sum_of_years'
                        ? 'Suma de dígitos de los años'
                        : 'Línea recta'}
                </span>
            ),
        },
        {
            key: 'default_residual_value_pct',
            label: 'Residual %',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => (
                <span className="tabular-nums">
                    {row.default_residual_value_pct != null
                        ? `${row.default_residual_value_pct}%`
                        : '—'}
                </span>
            ),
        },
        {
            key: 'is_active',
            label: 'Activa',
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
            key: 'actions',
            label: '',
            className: 'min-w-[100px] text-right',
            render: (row) => (
                <div className="flex flex-row flex-nowrap items-center justify-end gap-1">
                    {canUpdate && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer shrink-0 size-8 text-inv-primary hover:bg-inv-primary/10"
                            aria-label="Editar categoría"
                            onClick={() => {
                                setFormCategory(row);
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
                            aria-label="Eliminar categoría"
                            onClick={() => setDeleteCategory(row)}
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
            <Head title="Categorías de activos" />

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
                                Categorías de activos
                                <span className="absolute bottom-0 left-0 h-0.5 w-8 rounded-full bg-inv-primary" />
                            </h1>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            Categorías tributarias SUNAT (tecnología, vehículos, mobiliario, inmuebles, maquinaria, otros) con vida útil, depreciación y cuentas contables.
                        </p>
                        <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-blue-500/20 dark:text-gray-400">
                                <Wrench className="size-3 shrink-0 text-blue-600 dark:text-blue-400" />
                                <span>Total</span>
                                <span className="font-semibold">{stats?.total ?? total}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-emerald-500/20 dark:text-gray-400">
                                <CheckCircle2 className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <span>Activas</span>
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
                    <div className="flex flex-col gap-2 sm:items-end">
                        {canCreate && (
                            <button
                                type="button"
                                onClick={() => {
                                    setFormCategory(null);
                                    setFormOpen(true);
                                }}
                                className="inline-flex w-fit cursor-pointer items-center gap-2 self-start rounded-md bg-inv-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-inv-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2"
                                aria-label="Nueva categoría"
                            >
                                <Plus className="size-4" />
                                <span>Nueva categoría</span>
                            </button>
                        )}
                    </div>
                </div>

                <div
                    className="border-t border-border w-full shrink-0"
                    aria-hidden
                />

                <div className="rounded-xl border border-border bg-card shadow-sm">
                    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <SearchFilter
                            value={searchInput}
                            onChange={setSearchInput}
                            placeholder="Buscar por nombre, código, tipo o cuenta contable…"
                            className="w-full sm:max-w-xs [&_input]:bg-white [&_input]:border-border [&_input]:text-foreground"
                        />
                        <Select
                            value={(filters.type ?? '') === '' ? '_' : filters.type}
                            onValueChange={(value) =>
                                applyFilters({
                                    type: value === '_' ? '' : value,
                                    page: 1,
                                })
                            }
                        >
                            <SelectTrigger className="w-full border-border bg-background sm:w-[160px]">
                                <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos los tipos</SelectItem>
                                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={(filters.gl_account_id ?? '') === '' ? '_' : filters.gl_account_id}
                            onValueChange={(value) =>
                                applyFilters({
                                    gl_account_id: value === '_' ? '' : value,
                                    page: 1,
                                })
                            }
                        >
                            <SelectTrigger className="w-full border-border bg-background sm:w-[220px]">
                                <SelectValue placeholder="Cuenta contable" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todas las cuentas</SelectItem>
                                {glAccountsForSelect.map((acc) => (
                                    <SelectItem key={acc.id} value={String(acc.id)}>
                                        {acc.code} — {acc.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={(filters.is_active ?? '') === '' ? '_' : filters.is_active}
                            onValueChange={(value) =>
                                applyFilters({
                                    is_active: value === '_' ? '' : value,
                                    page: 1,
                                })
                            }
                        >
                            <SelectTrigger className="w-full border-border bg-background sm:w-[140px]">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos los estados</SelectItem>
                                <SelectItem value="1">Solo activas</SelectItem>
                                <SelectItem value="0">Solo inactivas</SelectItem>
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
                            emptyMessage="No hay categorías de activos registradas."
                            variant="default"
                        />
                    </div>
                    <div className="md:hidden">
                        {data.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8 px-4 text-sm">
                                No hay categorías de activos registradas.
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
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Código:</dt>
                                                        <dd className="text-foreground tabular-nums">{row.code}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Tipo:</dt>
                                                        <dd className="text-foreground">{TYPE_LABELS[row.type] ?? row.type}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Cuenta contable:</dt>
                                                        <dd className="text-foreground tabular-nums">
                                                            {row.gl_account ? `${row.gl_account.code} — ${row.gl_account.name}` : '—'}
                                                        </dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Vida útil:</dt>
                                                        <dd className="text-foreground tabular-nums">
                                                            {row.default_useful_life_years != null
                                                                ? `${row.default_useful_life_years} año(s)`
                                                                : '—'}
                                                        </dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Método:</dt>
                                                        <dd className="text-foreground">
                                                            {row.default_depreciation_method === 'sum_of_years'
                                                                ? 'Suma de dígitos de los años'
                                                                : 'Línea recta'}
                                                        </dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Residual %:</dt>
                                                        <dd className="text-foreground tabular-nums">
                                                            {row.default_residual_value_pct != null
                                                                ? `${row.default_residual_value_pct}%`
                                                                : '—'}
                                                        </dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Activa:</dt>
                                                        <dd className="text-foreground">
                                                            {row.is_active ? 'Sí' : 'No'}
                                                        </dd>
                                                    </div>
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
                                                            setFormCategory(row);
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
                                                        onClick={() => setDeleteCategory(row)}
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
                            perPageOptions={[5, 10, 15, 25]}
                        />
                    </div>
                </div>
            </div>

            <AssetCategoryFormModal
                open={formOpen}
                onOpenChange={setFormOpen}
                category={formCategory}
                glAccountsForSelect={glAccountsForSelect}
            />

            <DeleteConfirmModal
                open={deleteCategory != null}
                onOpenChange={(open) => {
                    if (!open) setDeleteCategory(null);
                }}
                loading={deleting}
                title="Eliminar categoría"
                description={
                    deleteCategory
                        ? `¿Seguro que deseas eliminar la categoría «${deleteCategory.name}»?`
                        : ''
                }
                onConfirm={handleDeleteConfirm}
            />
        </AppLayout>
    );
}
