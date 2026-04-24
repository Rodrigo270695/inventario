import { Head, router, usePage } from '@inertiajs/react';
import { FileDown, Filter, LayoutGrid, Package, Pencil, Plus, Printer, Settings, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ComponentFormModal } from '@/components/components/component-form-modal';
import { conditionToLabel } from '@/constants/conditions';
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
import type { AssetCategory, AssetSubcategory, BreadcrumbItem, Component, PaginationMeta } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Componentes', href: '/admin/components' },
];

const SEARCH_DEBOUNCE_MS = 400;

type Filters = {
    q: string;
    type_id: string;
    zonal_id: string;
    office_id: string;
    warehouse_id: string;
    status: string;
    sort_by: string;
    sort_order: SortOrder;
    per_page: number;
};

type TypeOption = { id: string; name: string; code: string | null };
type BrandOption = { id: string; name: string };
type WarehouseOption = { id: string; name: string; code: string | null; office_id: string; office?: { id: string; zonal_id: string; name: string; code: string | null } | null };
type ZonalOption = { id: string; name: string; code: string };
type OfficeOption = { id: string; zonal_id: string; name: string; code: string | null };
type CategoryOption = AssetCategory;
type SubcategoryOption = AssetSubcategory;

type ComponentsIndexProps = {
    components: {
        data: Component[];
        links: PaginationMeta['links'];
        from: number | null;
        to: number | null;
        total: number;
        current_page: number;
        last_page: number;
        per_page: number;
    };
    typesForSelect: TypeOption[];
    brandsForSelect: BrandOption[];
    warehousesForSelect: WarehouseOption[];
    zonalsForFilter: ZonalOption[];
    officesForFilter: OfficeOption[];
    categoriesForSelect: CategoryOption[];
    subcategoriesForSelect: SubcategoryOption[];
    filters: Filters;
    stats?: {
        total: number;
        has_filters?: boolean;
        status_counts?: Record<string, number>;
    };
};

function paramStr(v: unknown): string {
    if (v == null || v === 'null') return '';
    return String(v).trim();
}

function buildUrl(params: Partial<Filters> & { page?: number }) {
    const search = new URLSearchParams();
    if (params.q !== undefined) search.set('q', paramStr(params.q));
    if (params.type_id !== undefined) search.set('type_id', paramStr(params.type_id));
    if (params.zonal_id !== undefined) search.set('zonal_id', paramStr(params.zonal_id));
    if (params.office_id !== undefined) search.set('office_id', paramStr(params.office_id));
    if (params.warehouse_id !== undefined) search.set('warehouse_id', paramStr(params.warehouse_id));
    if (params.status !== undefined) search.set('status', paramStr(params.status));
    if (params.sort_by !== undefined) search.set('sort_by', paramStr(params.sort_by) || 'code');
    if (params.sort_order !== undefined)
        search.set('sort_order', paramStr(params.sort_order) || 'asc');
    if (params.per_page !== undefined)
        search.set('per_page', String(params.per_page ?? 50));
    if (params.page !== undefined) search.set('page', String(params.page ?? 1));
    return `/admin/components?${search.toString()}`;
}

function buildExportUrl(filters: Filters): string {
    const search = new URLSearchParams();
    if (filters.q !== undefined && filters.q !== '') search.set('q', filters.q);
    if (filters.type_id !== undefined && filters.type_id !== '') search.set('type_id', filters.type_id);
    if (filters.zonal_id !== undefined && filters.zonal_id !== '') search.set('zonal_id', filters.zonal_id);
    if (filters.office_id !== undefined && filters.office_id !== '') search.set('office_id', filters.office_id);
    if (filters.warehouse_id !== undefined && filters.warehouse_id !== '') search.set('warehouse_id', filters.warehouse_id);
    if (filters.status !== undefined && filters.status !== '') search.set('status', filters.status);
    if (filters.sort_by !== undefined) search.set('sort_by', filters.sort_by);
    if (filters.sort_order !== undefined) search.set('sort_order', filters.sort_order);
    return `/admin/components/export?${search.toString()}`;
}

function buildBarcodePdfUrl(ids: string[]): string {
    const search = new URLSearchParams();
    search.set('ids', ids.join(','));
    return `/admin/components/barcodes/pdf?${search.toString()}`;
}

const STATUS_LABELS: Record<string, string> = {
    stored: 'Almacenado',
    active: 'En uso',
    in_repair: 'En reparación',
    in_transit: 'En tránsito',
    broken: 'Malogrado',
    disposed: 'Dado de baja',
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
    stored: 'bg-blue-100 text-blue-800 dark:bg-blue-500/25 dark:text-blue-300',
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-300',
    in_repair: 'bg-amber-100 text-amber-800 dark:bg-amber-500/25 dark:text-amber-300',
    in_transit: 'bg-sky-100 text-sky-800 dark:bg-sky-500/25 dark:text-sky-300',
    broken: 'bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-200',
    disposed: 'bg-slate-200 text-slate-700 dark:bg-slate-500/30 dark:text-slate-300',
};

const CATEGORY_TYPE_LABELS: Record<string, string> = {
    fixed_asset: 'Activo fijo',
    minor_asset: 'Activo menor',
    intangible: 'Intangible',
};

export default function ComponentsIndex({
    components,
    typesForSelect,
    brandsForSelect,
    warehousesForSelect,
    zonalsForFilter,
    officesForFilter,
    categoriesForSelect,
    subcategoriesForSelect,
    filters,
    stats,
}: ComponentsIndexProps) {
    const { data, links, from, to, total, current_page, last_page } = components;

    const officesFilteredByZonal = useMemo(
        () =>
            filters.zonal_id
                ? officesForFilter.filter((o) => o.zonal_id === filters.zonal_id)
                : [],
        [filters.zonal_id, officesForFilter]
    );

    const warehousesFilteredByOffice = useMemo(
        () =>
            filters.office_id
                ? warehousesForSelect.filter((w) => w.office_id === filters.office_id)
                : warehousesForSelect,
        [filters.office_id, warehousesForSelect]
    );

    const [searchInput, setSearchInput] = useState(() => {
        const q = filters.q;
        if (q == null || q === 'null') return '';
        return String(q).trim();
    });

    useEffect(() => {
        const fromServer =
            filters.q == null || filters.q === 'null'
                ? ''
                : String(filters.q).trim();
        queueMicrotask(() => {
            setSearchInput((prev) => (prev !== fromServer ? fromServer : prev));
        });
    }, [filters.q]);

    const [deleteComponent, setDeleteComponent] = useState<Component | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [formComponent, setFormComponent] = useState<Component | null>(null);

    const { props } = usePage();
    const auth = (props as { auth?: { permissions?: string[] } }).auth;
    const permissions = auth?.permissions ?? [];
    const canCreate = permissions.includes('components.create');
    const canExport = permissions.includes('components.export');
    const canUpdate = permissions.includes('components.update');
    const canDelete = permissions.includes('components.delete');
    const canConfigure = permissions.includes('components.configure');
    const canBarcodeView = permissions.includes('components.barcodes.view');
    const canBarcodeBulk = permissions.includes('components.barcodes.bulk');

    const flash = props.flash as { toast?: ToastMessage } | undefined;
    const [toastQueue, setToastQueue] = useState<Array<ToastMessage & { id: number }>>([]);
    const lastFlashToastRef = useRef<ToastMessage | null>(null);

    useEffect(() => {
        const t = flash?.toast;
        if (!t) return;
        if (t === lastFlashToastRef.current) return;
        lastFlashToastRef.current = t;
        const id = Date.now();
        queueMicrotask(() => setToastQueue((q) => [...q, { ...t, id }]));
    }, [flash?.toast]);

    const removeToast = useCallback((id: number) => {
        setToastQueue((q) => q.filter((item) => item.id !== id));
    }, []);

    const applyFilters = useCallback(
        (next: Partial<Filters> & { page?: number }) => {
            const merged = { ...filters, ...next };
            const url = buildUrl(merged);
            router.get(url, {}, { preserveState: true, preserveScroll: true, replace: true });
        },
        [filters]
    );

    useEffect(() => {
        const t = setTimeout(() => {
            const effectiveQ =
                filters.q == null || filters.q === 'null'
                    ? ''
                    : String(filters.q).trim();
            const pendingQ = (searchInput ?? '').trim();
            if (pendingQ !== effectiveQ) {
                applyFilters({ q: pendingQ || '', page: 1 });
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
        if (!deleteComponent) return;
        setDeleting(true);
        router.delete(`/admin/components/${deleteComponent.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteComponent(null);
            },
        });
    };

    const columns: DataTableColumn<Component>[] = useMemo(
        () => [
            {
                key: 'code',
                label: 'Código',
                sortable: true,
                render: (row) => (
                    <span className="font-medium text-foreground">{row.code}</span>
                ),
            },
            {
                key: 'serial_number',
                label: 'Nº serie',
                sortable: false,
                className: 'text-foreground text-xs',
                render: (row) => <span>{row.serial_number ?? '—'}</span>,
            },
            {
                key: 'type',
                label: 'Tipo',
                sortable: false,
                className: 'text-foreground text-xs',
                render: (row) => <span>{row.type?.name ?? '—'}</span>,
            },
            {
                key: 'brand',
                label: 'Marca / Modelo',
                sortable: false,
                className: 'text-foreground text-xs',
                render: (row) => {
                    const brand = row.brand?.name ?? '';
                    const model = row.model ?? '';
                    const text = [brand, model].filter(Boolean).join(' · ') || '—';
                    return <span>{text}</span>;
                },
            },
            {
                key: 'category',
                label: 'Categoría / Subcategoría',
                sortable: false,
                className: 'text-foreground text-xs',
                render: (row) => {
                    const rawType =
                        (row.subcategory?.category as { type?: string } | null | undefined)?.type ??
                        '';
                    const catType =
                        rawType !== ''
                            ? CATEGORY_TYPE_LABELS[rawType] ?? rawType.replace(/_/g, ' ')
                            : '';
                    const catName = row.subcategory?.category?.name ?? '';
                    const cat =
                        catType && catName
                            ? `${catType} - ${catName}`
                            : catName || catType || '';
                    const sub = row.subcategory?.name ?? '';
                    const text = cat || sub ? [cat, sub].filter(Boolean).join(' · ') : '—';
                    return <span>{text}</span>;
                },
            },
            {
                key: 'status',
                label: 'Estado',
                sortable: true,
                className: 'text-foreground text-xs',
                render: (row) => (
                    <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            STATUS_BADGE_CLASSES[row.status] ?? 'bg-slate-100 text-slate-700'
                        }`}
                    >
                        {STATUS_LABELS[row.status] ?? row.status}
                    </span>
                ),
            },
            {
                key: 'condition',
                label: 'Condición',
                sortable: false,
                className: 'text-foreground text-xs',
                render: (row) => (
                    <span>{conditionToLabel(row.condition)}</span>
                ),
            },
            {
                key: 'warehouse',
                label: 'Almacén',
                sortable: false,
                className: 'text-foreground text-xs',
                render: (row) => (
                    <span>
                        {row.warehouse
                            ? `${row.warehouse.name}${row.warehouse.code ? ` (${row.warehouse.code})` : ''}`
                            : '—'}
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
                        {canConfigure && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer shrink-0 size-8 text-violet-600 hover:bg-violet-50 hover:text-violet-700 dark:text-violet-400 dark:hover:bg-violet-950/30"
                                aria-label={`Configurar ${row.code}`}
                                onClick={() => {
                                    router.get(`/admin/components/${row.id}/config`);
                                }}
                            >
                                <Settings className="size-4" />
                            </Button>
                        )}
                        {canBarcodeView && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer shrink-0 size-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                aria-label={`Imprimir barcode de ${row.code}`}
                                onClick={() => {
                                    window.open(`/admin/components/${row.id}/barcode/pdf`, '_blank', 'noopener,noreferrer');
                                }}
                            >
                                <Printer className="size-4" />
                            </Button>
                        )}
                        {canUpdate && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer shrink-0 size-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
                                aria-label={`Editar ${row.code}`}
                                onClick={() => {
                                    setFormComponent(row);
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
                                aria-label={`Eliminar ${row.code}`}
                                onClick={() => setDeleteComponent(row)}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        )}
                    </div>
                ),
            },
        ],
        [canConfigure, canBarcodeView, canUpdate, canDelete]
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Componentes" />

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
                                Componentes
                                <span className="absolute bottom-0 left-0 h-0.5 w-8 rounded-full bg-inv-primary" />
                            </h1>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            Inventario de componentes (RAM, disco, etc.) por código, tipo y ubicación.
                        </p>
                        <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-blue-500/20 dark:text-gray-400">
                                <Package className="size-3 shrink-0 text-blue-600 dark:text-blue-400" />
                                <span>Total</span>
                                <span className="font-semibold">{stats?.total ?? total}</span>
                            </span>
                            {stats?.has_filters && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-violet-500/20 dark:text-gray-400">
                                    <Filter className="size-3 shrink-0 text-violet-600 dark:text-violet-400" />
                                    <span>Con filtros</span>
                                </span>
                            )}
                            {Object.entries(STATUS_LABELS).map(([statusKey, label]) => (
                                <span
                                    key={statusKey}
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                                        STATUS_BADGE_CLASSES[statusKey] ?? 'bg-slate-100 text-slate-600'
                                    }`}
                                >
                                    <span>{label}</span>
                                    <span className="font-semibold">
                                        {stats?.status_counts?.[statusKey] ?? 0}
                                    </span>
                                </span>
                            ))}
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-500/25 dark:text-amber-300">
                                <span>Página</span>
                                <span className="font-semibold">
                                    {current_page}/{last_page}
                                </span>
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
                                href={buildExportUrl(filters)}
                                className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md bg-[#217346] text-white shadow-sm hover:bg-[#1a5c38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#217346] focus-visible:ring-offset-2"
                                aria-label="Exportar componentes a Excel"
                            >
                                <FileDown className="size-5" />
                            </a>
                        )}
                        {canBarcodeBulk && data.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    window.open(buildBarcodePdfUrl(data.map((component) => component.id)), '_blank', 'noopener,noreferrer');
                                }}
                                className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-sm hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                                aria-label="Imprimir barcode de componentes visibles"
                            >
                                <Printer className="size-4" />
                                <span>Imprimir barcode</span>
                            </button>
                        )}
                        {canCreate && (
                            <button
                                type="button"
                                onClick={() => {
                                    setFormComponent(null);
                                    setFormOpen(true);
                                }}
                                className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md bg-inv-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-inv-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2"
                                aria-label="Nuevo componente"
                            >
                                <Plus className="size-4" />
                                <span>Nuevo componente</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="border-t border-border w-full shrink-0" aria-hidden />

                <div className="rounded-xl border border-border bg-card shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 p-3 w-full">
                        <SearchFilter
                            value={searchInput}
                            onChange={setSearchInput}
                            placeholder="Buscar por código, serie, modelo o tipo…"
                            className="w-full sm:max-w-xs [&_input]:bg-white [&_input]:border-border [&_input]:text-foreground"
                        />
                        <Select
                            value={(filters.zonal_id ?? '') === '' ? '_' : filters.zonal_id}
                            onValueChange={(v) =>
                                applyFilters({
                                    zonal_id: v === '_' ? '' : v,
                                    office_id: '',
                                    warehouse_id: '',
                                    page: 1,
                                })
                            }
                        >
                            <SelectTrigger className="w-full sm:w-[160px] border-border bg-background">
                                <SelectValue placeholder="Zonal" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos los zonales</SelectItem>
                                {zonalsForFilter.map((z) => (
                                    <SelectItem key={z.id} value={z.id}>
                                        {z.name} {z.code ? `(${z.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={(filters.office_id ?? '') === '' ? '_' : filters.office_id}
                            onValueChange={(v) =>
                                applyFilters({
                                    office_id: v === '_' ? '' : v,
                                    warehouse_id: '',
                                    page: 1,
                                })
                            }
                            disabled={!filters.zonal_id}
                        >
                            <SelectTrigger className="w-full sm:w-[180px] border-border bg-background">
                                <SelectValue placeholder="Oficina" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todas las oficinas</SelectItem>
                                {officesFilteredByZonal.map((o) => (
                                    <SelectItem key={o.id} value={o.id}>
                                        {o.name} {o.code ? `(${o.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={(filters.warehouse_id ?? '') === '' ? '_' : filters.warehouse_id}
                            onValueChange={(v) =>
                                applyFilters({ warehouse_id: v === '_' ? '' : v, page: 1 })
                            }
                            disabled={!filters.office_id}
                        >
                            <SelectTrigger className="w-full sm:w-[180px] border-border bg-background">
                                <SelectValue placeholder="Almacén" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos los almacenes</SelectItem>
                                {warehousesFilteredByOffice.map((w) => (
                                    <SelectItem key={w.id} value={w.id}>
                                        {w.name} {w.code ? `(${w.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={(filters.type_id ?? '') === '' ? '_' : filters.type_id}
                            onValueChange={(v) =>
                                applyFilters({ type_id: v === '_' ? '' : v, page: 1 })
                            }
                        >
                            <SelectTrigger className="w-full sm:w-[180px] border-border bg-background">
                                <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos los tipos</SelectItem>
                                {typesForSelect.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                        {t.name} {t.code ? `(${t.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={(filters.status ?? '') === '' ? '_' : filters.status}
                            onValueChange={(v) =>
                                applyFilters({ status: v === '_' ? '' : v, page: 1 })
                            }
                        >
                            <SelectTrigger className="w-full sm:w-[160px] border-border bg-background">
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
                    </div>
                    <div className="hidden md:block">
                        <DataTable
                            columns={columns}
                            data={data}
                            keyExtractor={(r) => r.id}
                            sortBy={filters.sort_by}
                            sortOrder={filters.sort_order}
                            onSort={handleSort}
                            emptyMessage="No hay componentes. Crea uno con «Nuevo componente»."
                            variant="default"
                        />
                    </div>
                    <div className="md:hidden">
                        {data.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8 px-4 text-sm">
                                No hay componentes. Crea uno con «Nuevo componente».
                            </p>
                        ) : (
                            <ul className="flex flex-col gap-3 p-3 sm:p-4">
                                {data.map((row) => (
                                    <li key={row.id}>
                                        <article className="rounded-lg border border-border bg-card shadow-[0_1px_2px_0_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                                            <div className="space-y-2 p-4">
                                                <p className="font-medium text-foreground text-base">
                                                    {row.code}
                                                </p>
                                                <dl className="grid grid-cols-1 gap-1.5 text-sm">
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Nº serie:</dt>
                                                        <dd className="text-foreground">{row.serial_number ?? '—'}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Tipo:</dt>
                                                        <dd className="text-foreground">{row.type?.name ?? '—'}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Estado:</dt>
                                                        <dd className="text-foreground">{STATUS_LABELS[row.status] ?? row.status}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Condición:</dt>
                                                        <dd className="text-foreground">{conditionToLabel(row.condition)}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Almacén:</dt>
                                                        <dd className="text-foreground">
                                                            {row.warehouse
                                                                ? `${row.warehouse.name}${row.warehouse.code ? ` (${row.warehouse.code})` : ''}`
                                                                : '—'}
                                                        </dd>
                                                    </div>
                                                </dl>
                                            </div>
                                            <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-muted/30 px-4 py-3">
                                                {canBarcodeView && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="cursor-pointer shrink-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
                                                        onClick={() => {
                                                            window.open(`/admin/components/${row.id}/barcode/pdf`, '_blank', 'noopener,noreferrer');
                                                        }}
                                                    >
                                                        <Printer className="mr-1 size-3.5 shrink-0" />
                                                        <span>Barcode</span>
                                                    </Button>
                                                )}
                                                {canUpdate && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="cursor-pointer shrink-0 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400"
                                                        onClick={() => {
                                                            setFormComponent(row);
                                                            setFormOpen(true);
                                                        }}
                                                    >
                                                        <Pencil className="mr-1 size-3.5 shrink-0" />
                                                        <span>Editar</span>
                                                    </Button>
                                                )}
                                                {canDelete && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="cursor-pointer shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50"
                                                        onClick={() => setDeleteComponent(row)}
                                                    >
                                                        <Trash2 className="mr-1 size-3.5 shrink-0" />
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

            <ComponentFormModal
                open={formOpen}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) setFormComponent(null);
                }}
                component={formComponent}
                typesForSelect={typesForSelect}
                brandsForSelect={brandsForSelect}
                warehousesForSelect={warehousesForSelect}
                zonalsForSelect={zonalsForFilter}
                officesForSelect={officesForFilter}
                categoriesForSelect={categoriesForSelect}
                subcategoriesForSelect={subcategoriesForSelect}
            />

            <DeleteConfirmModal
                open={!!deleteComponent}
                onOpenChange={(open) => !open && setDeleteComponent(null)}
                title="Eliminar componente"
                description={
                    deleteComponent
                        ? `¿Eliminar el componente «${deleteComponent.code}»? Esta acción no se puede deshacer.`
                        : undefined
                }
                onConfirm={handleDeleteConfirm}
                loading={deleting}
            />
        </AppLayout>
    );
}
