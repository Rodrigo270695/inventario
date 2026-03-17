import { Head, router, usePage } from '@inertiajs/react';
import {
    Filter,
    FileDown,
    LayoutGrid,
    Monitor,
    Pencil,
    Plus,
    Printer,
    Settings,
    Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AssetFormModal } from '@/components/assets/asset-form-modal';
import { conditionToLabel } from '@/constants/conditions';
import type { DataTableColumn, SortOrder } from '@/components/data-table';
import { DataTable } from '@/components/data-table';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';
import type { RestoreCandidate } from '@/components/restore-confirm-modal';
import { RestoreConfirmModal } from '@/components/restore-confirm-modal';
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
import type {
    Asset,
    BreadcrumbItem,
    PaginationMeta,
} from '@/types';

type FlashWithRestore = {
    toast?: ToastMessage;
    restore_candidate?: RestoreCandidate;
    restore_payload?: Record<string, unknown>;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Activos', href: '/admin/assets' },
];

const SEARCH_DEBOUNCE_MS = 400;

type Filters = {
    q: string;
    zonal_id: string;
    office_id: string;
    category_id: string;
    subcategory_id: string;
    status: string;
    sort_by: string;
    sort_order: SortOrder;
    per_page: number;
};

type CategoryOption = { id: string; name: string; code: string };
type SubcategoryOption = { id: string; asset_category_id: string; name: string; code: string | null };
type ModelOption = { id: string; subcategory_id: string; name: string; brand?: { id: string; name: string } | null };
type WarehouseOption = { id: string; office_id: string; name: string; code: string | null };
type ZonalOption = { id: string; name: string; code: string };
type OfficeOption = { id: string; zonal_id: string; name: string; code: string | null };

type AssetsIndexProps = {
    assets: {
        data: Asset[];
        links: PaginationMeta['links'];
        from: number | null;
        to: number | null;
        total: number;
        current_page: number;
        last_page: number;
        per_page: number;
    };
    categoriesForSelect: CategoryOption[];
    subcategoriesForSelect: SubcategoryOption[];
    modelsForSelect: ModelOption[];
    warehousesForSelect: WarehouseOption[];
    zonalsForFilter: ZonalOption[];
    officesForFilter: OfficeOption[];
    filters: Filters;
    stats?: {
        total: number;
        has_filters?: boolean;
        status_counts?: Record<string, number>;
    };
};

/** Convierte null/undefined/'null' a '' para no enviar la cadena "null" en la URL */
function paramStr(v: unknown): string {
    if (v == null || v === 'null') return '';
    return String(v).trim();
}

function buildUrl(params: Partial<Filters> & { page?: number }) {
    const search = new URLSearchParams();
    if (params.q !== undefined) search.set('q', paramStr(params.q));
    if (params.zonal_id !== undefined) search.set('zonal_id', paramStr(params.zonal_id));
    if (params.office_id !== undefined) search.set('office_id', paramStr(params.office_id));
    if (params.category_id !== undefined) search.set('category_id', paramStr(params.category_id));
    if (params.subcategory_id !== undefined) search.set('subcategory_id', paramStr(params.subcategory_id));
    if (params.status !== undefined) search.set('status', paramStr(params.status));
    if (params.sort_by !== undefined) search.set('sort_by', paramStr(params.sort_by) || 'code');
    if (params.sort_order !== undefined)
        search.set('sort_order', paramStr(params.sort_order) || 'asc');
    if (params.per_page !== undefined)
        search.set('per_page', String(params.per_page ?? 50));
    if (params.page !== undefined) search.set('page', String(params.page ?? 1));
    return `/admin/assets?${search.toString()}`;
}

function buildExportUrl(filters: Filters): string {
    const search = new URLSearchParams();
    if (filters.q !== undefined && filters.q !== '') search.set('q', filters.q);
    if (filters.zonal_id !== undefined && filters.zonal_id !== '') search.set('zonal_id', filters.zonal_id);
    if (filters.office_id !== undefined && filters.office_id !== '') search.set('office_id', filters.office_id);
    if (filters.category_id !== undefined && filters.category_id !== '') search.set('category_id', filters.category_id);
    if (filters.subcategory_id !== undefined && filters.subcategory_id !== '') search.set('subcategory_id', filters.subcategory_id);
    if (filters.status !== undefined && filters.status !== '') search.set('status', filters.status);
    if (filters.sort_by !== undefined) search.set('sort_by', filters.sort_by);
    if (filters.sort_order !== undefined) search.set('sort_order', filters.sort_order);
    return `/admin/assets/export?${search.toString()}`;
}

function buildBarcodePdfUrl(ids: string[]): string {
    const search = new URLSearchParams();
    search.set('ids', ids.join(','));
    return `/admin/assets/barcodes/pdf?${search.toString()}`;
}

const STATUS_LABELS: Record<string, string> = {
    stored: 'Almacenado',
    active: 'En uso',
    in_repair: 'En reparación',
    in_transit: 'En tránsito',
    disposed: 'Dado de baja',
    sold: 'Vendido',
};

/** Clases de color por estado para los badges (fondo + texto) */
const STATUS_BADGE_CLASSES: Record<string, string> = {
    stored: 'bg-blue-100 text-blue-800 dark:bg-blue-500/25 dark:text-blue-300',
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-300',
    in_repair: 'bg-amber-100 text-amber-800 dark:bg-amber-500/25 dark:text-amber-300',
    in_transit: 'bg-sky-100 text-sky-800 dark:bg-sky-500/25 dark:text-sky-300',
    disposed: 'bg-slate-200 text-slate-700 dark:bg-slate-500/30 dark:text-slate-300',
    sold: 'bg-violet-100 text-violet-800 dark:bg-violet-500/25 dark:text-violet-300',
};

const CATEGORY_TYPE_LABELS: Record<string, string> = {
    fixed_asset: 'Activo fijo',
    minor_asset: 'Activo menor',
    intangible: 'Intangible',
};

export default function AssetsIndex({
    assets,
    categoriesForSelect,
    subcategoriesForSelect,
    modelsForSelect,
    warehousesForSelect,
    zonalsForFilter,
    officesForFilter,
    filters,
    stats,
}: AssetsIndexProps) {
    const { data, links, from, to, total, current_page, last_page } = assets;
    const officesFilteredByZonal = useMemo(
        () =>
            filters.zonal_id
                ? officesForFilter.filter((o) => o.zonal_id === filters.zonal_id)
                : [],
        [filters.zonal_id, officesForFilter]
    );
    const subcategoriesFilteredByCategory = useMemo(
        () =>
            filters.category_id
                ? subcategoriesForSelect.filter((s) => s.asset_category_id === filters.category_id)
                : [],
        [filters.category_id, subcategoriesForSelect]
    );
    const [searchInput, setSearchInput] = useState(() => {
        const q = filters.q;
        if (q == null || q === 'null') return '';
        return String(q).trim();
    });

    // Sincronizar input de búsqueda cuando los filtros vienen del servidor (ej. navegación atrás)
    useEffect(() => {
        const fromServer =
            filters.q == null || filters.q === 'null'
                ? ''
                : String(filters.q).trim();
        queueMicrotask(() => {
            setSearchInput((prev) => (prev !== fromServer ? fromServer : prev));
        });
    }, [filters.q]);
    const [deleteAsset, setDeleteAsset] = useState<Asset | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [formAsset, setFormAsset] = useState<Asset | null>(null);

    const { props } = usePage();
    const auth = (props as { auth?: { permissions?: string[] } }).auth;
    const permissions = auth?.permissions ?? [];
    const canCreate = permissions.includes('assets.create');
    const canExport = permissions.includes('assets.export');
    const canUpdate = permissions.includes('assets.update');
    const canDelete = permissions.includes('assets.delete');
    const canConfigure = permissions.includes('assets.configure');
    const canBarcodeView = permissions.includes('assets.barcodes.view');
    const canBarcodeBulk = permissions.includes('assets.barcodes.bulk');
    const flash = props.flash as FlashWithRestore | undefined;
    const [toastQueue, setToastQueue] = useState<
        Array<ToastMessage & { id: number }>
    >([]);
    const lastFlashToastRef = useRef<ToastMessage | null>(null);
    const [restoreModalOpen, setRestoreModalOpen] = useState(false);
    const [restoring, setRestoring] = useState(false);

    useEffect(() => {
        if (!flash?.restore_candidate) return;

        queueMicrotask(() => {
            setRestoreModalOpen(true);
        });
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
        if (!deleteAsset) return;
        setDeleting(true);
        router.delete(`/admin/assets/${deleteAsset.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteAsset(null);
            },
        });
    };

    const handleRestoreConfirm = () => {
        const candidate = flash?.restore_candidate;
        const payload = flash?.restore_payload as Record<string, unknown> | undefined;
        if (!candidate || candidate.type !== 'asset' || !payload) return;
        setRestoring(true);
        router.post('/admin/assets/restore', { id: candidate.id, ...payload }, {
            preserveScroll: true,
            onFinish: () => setRestoring(false),
            onSuccess: () => setRestoreModalOpen(false),
        });
    };

    const handleRestoreCancel = () => {
        setRestoreModalOpen(false);
        router.get(window.location.pathname, {}, { preserveState: false });
    };

    const columns: DataTableColumn<Asset>[] = [
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
            render: (row) => (
                <span>{row.serial_number ?? '—'}</span>
            ),
        },
        {
            key: 'model',
            label: 'Modelo',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => (
                <span>{row.model?.name ?? '—'}</span>
            ),
        },
        {
            key: 'category',
            label: 'Categoría',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => {
                const rawType = (row.category as { type?: string } | null | undefined)?.type ?? '';
                const catType =
                    rawType !== ''
                        ? CATEGORY_TYPE_LABELS[rawType] ?? rawType.replace(/_/g, ' ')
                        : '';
                const catName = row.category?.name ?? '';
                const cat =
                    catType && catName
                        ? `${catType} - ${catName}`
                        : catName || catType || '';
                const sub = row.model?.subcategory?.name;
                const text = sub ? `${cat} · ${sub}` : cat || '—';
                return <span>{text}</span>;
            },
        },
        {
            key: 'status',
            label: 'Estado',
            sortable: true,
            className: 'text-foreground text-xs',
            render: (row) => (
                <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
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
                <span>{row.warehouse ? `${row.warehouse.name}${row.warehouse.code ? ` (${row.warehouse.code})` : ''}` : '—'}</span>
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
                    {canBarcodeView && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer shrink-0 size-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                            aria-label={`Imprimir barcode de ${row.code}`}
                            onClick={() => {
                                window.open(`/admin/assets/${row.id}/barcode/pdf`, '_blank', 'noopener,noreferrer');
                            }}
                        >
                            <Printer className="size-4" />
                        </Button>
                    )}
                    {canConfigure && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer shrink-0 size-8 text-violet-600 hover:bg-violet-50 hover:text-violet-700 dark:text-violet-400 dark:hover:bg-violet-950/30"
                            aria-label={`Configurar ${row.code}`}
                            onClick={() => {
                                router.get(`/admin/assets/${row.id}/config`);
                            }}
                        >
                            <Settings className="size-4" />
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
                                setFormAsset(row);
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
                            onClick={() => setDeleteAsset(row)}
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
            <Head title="Activos" />

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
                                Activos
                                <span className="absolute bottom-0 left-0 h-0.5 w-8 rounded-full bg-inv-primary" />
                            </h1>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            Inventario de activos tecnológicos por código, modelo y ubicación.
                        </p>
                        <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-blue-500/20 dark:text-gray-400">
                                <Monitor className="size-3 shrink-0 text-blue-600 dark:text-blue-400" />
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
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_BADGE_CLASSES[statusKey] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400'}`}
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
                                aria-label="Exportar activos a Excel"
                            >
                                <FileDown className="size-5" />
                            </a>
                        )}
                        {canBarcodeBulk && data.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    window.open(buildBarcodePdfUrl(data.map((asset) => asset.id)), '_blank', 'noopener,noreferrer');
                                }}
                                className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-sm hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                                aria-label="Imprimir barcode de activos visibles"
                            >
                                <Printer className="size-4" />
                                <span>Imprimir barcode</span>
                            </button>
                        )}
                        {canCreate && (
                            <button
                                type="button"
                                onClick={() => {
                                    setFormAsset(null);
                                    setFormOpen(true);
                                }}
                                className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md bg-inv-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-inv-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2"
                                aria-label="Nuevo activo"
                            >
                                <Plus className="size-4" />
                                <span>Nuevo activo</span>
                            </button>
                        )}
                    </div>
                </div>

                <div
                    className="border-t border-border w-full shrink-0"
                    aria-hidden
                />

                <div className="rounded-xl border border-border bg-card shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 p-3 w-full">
                        <SearchFilter
                            value={searchInput}
                            onChange={setSearchInput}
                            placeholder="Buscar por código, serie, modelo o categoría…"
                            className="w-full sm:max-w-xs [&_input]:bg-white [&_input]:border-border [&_input]:text-foreground"
                        />
                        {/* 1. Zonal */}
                        <Select
                            value={(filters.zonal_id ?? '') === '' ? '_' : filters.zonal_id}
                            onValueChange={(v) =>
                                applyFilters({
                                    zonal_id: v === '_' ? '' : v,
                                    office_id: '',
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
                        {/* 2. Oficina (depende de zonal) */}
                        <Select
                            value={(filters.office_id ?? '') === '' ? '_' : filters.office_id}
                            onValueChange={(v) =>
                                applyFilters({
                                    office_id: v === '_' ? '' : v,
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
                        {/* 3. Categoría */}
                        <Select
                            value={(filters.category_id ?? '') === '' ? '_' : filters.category_id}
                            onValueChange={(v) =>
                                applyFilters({
                                    category_id: v === '_' ? '' : v,
                                    subcategory_id: '',
                                    page: 1,
                                })
                            }
                        >
                            <SelectTrigger className="w-full sm:w-[180px] border-border bg-background">
                                <SelectValue placeholder="Categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todas las categorías</SelectItem>
                                {categoriesForSelect.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.name} {c.code ? `(${c.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {/* 4. Subcategoría (depende de categoría) */}
                        <Select
                            value={(filters.subcategory_id ?? '') === '' ? '_' : filters.subcategory_id}
                            onValueChange={(v) =>
                                applyFilters({
                                    subcategory_id: v === '_' ? '' : v,
                                    page: 1,
                                })
                            }
                            disabled={!filters.category_id}
                        >
                            <SelectTrigger className="w-full sm:w-[180px] border-border bg-background">
                                <SelectValue placeholder="Subcategoría" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todas las subcategorías</SelectItem>
                                {subcategoriesFilteredByCategory.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.name} {s.code ? `(${s.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {/* 5. Estado */}
                        <Select
                            value={(filters.status ?? '') === '' ? '_' : filters.status}
                            onValueChange={(v) =>
                                applyFilters({
                                    status: v === '_' ? '' : v,
                                    page: 1,
                                })
                            }
                        >
                            <SelectTrigger className="w-full sm:w-[160px] border-border bg-background">
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
                    </div>
                    <div className="hidden md:block">
                        <DataTable
                            columns={columns}
                            data={data}
                            keyExtractor={(r) => r.id}
                            sortBy={filters.sort_by}
                            sortOrder={filters.sort_order}
                            onSort={handleSort}
                            emptyMessage="No hay activos. Crea uno con «Nuevo activo»."
                            variant="default"
                        />
                    </div>
                    <div className="md:hidden">
                        {data.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8 px-4 text-sm">
                                No hay activos. Crea uno con «Nuevo activo».
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
                                                        <dt className="text-muted-foreground shrink-0">Modelo:</dt>
                                                        <dd className="text-foreground">{row.model?.name ?? '—'}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Categoría:</dt>
                                                        <dd className="text-foreground">
                                                            {row.model?.subcategory?.name
                                                                ? `${row.category?.name ?? ''} · ${row.model.subcategory.name}`
                                                                : (row.category?.name ?? '—')}
                                                        </dd>
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
                                                            {row.warehouse ? `${row.warehouse.name}${row.warehouse.code ? ` (${row.warehouse.code})` : ''}` : '—'}
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
                                            <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-muted/30 px-4 py-3">
                                                {canBarcodeView && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="cursor-pointer shrink-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                                        aria-label={`Imprimir barcode de ${row.code}`}
                                                        onClick={() => {
                                                            window.open(`/admin/assets/${row.id}/barcode/pdf`, '_blank', 'noopener,noreferrer');
                                                        }}
                                                    >
                                                        <Printer className="mr-1 size-3.5 shrink-0" />
                                                        <span>Barcode</span>
                                                    </Button>
                                                )}
                                                {canConfigure && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="cursor-pointer shrink-0 border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-400 dark:hover:bg-violet-950/30"
                                                        aria-label={`Configurar ${row.code}`}
                                                        onClick={() => {
                                                            router.get(`/admin/assets/${row.id}/config`);
                                                        }}
                                                    >
                                                        <Settings className="mr-1 size-3.5 shrink-0" />
                                                        <span>Configurar</span>
                                                    </Button>
                                                )}
                                                {canUpdate && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="cursor-pointer shrink-0 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30"
                                                        aria-label={`Editar ${row.code}`}
                                                        onClick={() => {
                                                            setFormAsset(row);
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
                                                        aria-label={`Eliminar ${row.code}`}
                                                        onClick={() => setDeleteAsset(row)}
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
                            perPageOptions={[5, 10, 15, 25, 50, 100]}
                        />
                    </div>
                </div>
            </div>

            <AssetFormModal
                open={formOpen}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) setFormAsset(null);
                }}
                asset={formAsset}
                categoriesForSelect={categoriesForSelect}
                subcategoriesForSelect={subcategoriesForSelect}
                modelsForSelect={modelsForSelect}
                zonalsForSelect={zonalsForFilter}
                officesForSelect={officesForFilter}
                warehousesForSelect={warehousesForSelect}
            />

            <DeleteConfirmModal
                open={!!deleteAsset}
                onOpenChange={(open) => !open && setDeleteAsset(null)}
                title="Eliminar activo"
                description={
                    deleteAsset
                        ? `¿Eliminar el activo «${deleteAsset.code}»? Esta acción no se puede deshacer.`
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
