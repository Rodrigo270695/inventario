import { Head, router, useForm, usePage } from '@inertiajs/react';
import { LayoutGrid, TrendingDown, Pencil, Trash2, Plus } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { AppModal } from '@/components/app-modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { TablePagination } from '@/components/table-pagination';
import type { BreadcrumbItem, PaginationLink } from '@/types';
import { cn } from '@/lib/utils';

type CategoryRef = { id: string; name: string; code: string | null } | null;

type DepreciationScheduleRow = {
    id: string;
    category_id: string;
    category?: CategoryRef;
    method: string;
    useful_life_years: number;
    residual_value_pct: string;
};

type DepreciationEntryRow = {
    id: string;
    asset_id: string;
    period: string;
    method: string;
    amount: string;
    book_value_before: string;
    book_value_after: string;
    status: string;
    created_at: string;
    asset?: { id: string; code: string; category_id?: string | null } | null;
};

type DepreciationIndexProps = {
    schedules: DepreciationScheduleRow[];
    recentEntries: DepreciationEntryRow[];
    entriesPaginator: {
        from: number | null;
        to: number | null;
        total: number;
        current_page: number;
        last_page: number;
        per_page: number;
        links: PaginationLink[];
    };
    availablePeriods: string[];
    entriesFilters: { period: string; per_page: number };
    categories: {
        id: string;
        name: string;
        code: string | null;
        type: string;
        default_useful_life_years?: number | null;
        default_depreciation_method?: string | null;
        default_residual_value_pct?: string | number | null;
    }[];
    canCreateSchedule: boolean;
    canUpdateSchedule: boolean;
    canDeleteSchedule: boolean;
    canApproveEntries: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Alertas y reportes', href: '#' },
    { title: 'Depreciación', href: '/admin/depreciation' },
];

const METHOD_LABELS: Record<string, string> = {
    straight_line: 'Línea recta',
    double_declining: 'Saldos decrecientes',
    sum_of_years: 'Suma de dígitos de los años',
};

function methodLabel(method: string): string {
    return METHOD_LABELS[method] ?? method;
}

const CATEGORY_TYPE_LABELS: Record<string, string> = {
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

function formatCurrency(value: string | number | null | undefined): string {
    if (value == null || value === '') return '—';
    const n = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2,
    }).format(n);
}

function formatDateTime(value: string | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function buildEntriesUrl(params: { period?: string; per_page?: number; page?: number }): string {
    const search = new URLSearchParams();
    if (params.period !== undefined && params.period !== 'all')
        search.set('period', params.period);
    if (params.per_page !== undefined) search.set('per_page', String(params.per_page));
    if (params.page !== undefined) search.set('page', String(params.page));
    const q = search.toString();
    return q ? `/admin/depreciation?${q}` : '/admin/depreciation';
}

export default function DepreciationIndex({
    schedules,
    recentEntries,
    entriesPaginator,
    availablePeriods,
    entriesFilters,
    categories,
    canCreateSchedule,
    canUpdateSchedule,
    canDeleteSchedule,
    canApproveEntries,
}: DepreciationIndexProps) {
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<DepreciationScheduleRow | null>(null);
    const [tab, setTab] = useState<'config' | 'entries'>('config');
    const periodFilter = entriesFilters.period;
    const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
    const [approveModalOpen, setApproveModalOpen] = useState(false);

    const categoryMap = useMemo(() => {
        const map = new Map<string, (typeof categories)[number]>();
        categories.forEach((c) => map.set(c.id, c));
        return map;
    }, [categories]);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        category_id: '',
        method: 'straight_line',
        useful_life_years: '',
        residual_value_pct: '',
    });

    const filteredEntries = recentEntries;

    const draftEntries = useMemo(
        () => filteredEntries.filter((e) => e.status !== 'approved'),
        [filteredEntries]
    );

    const allDraftSelected =
        draftEntries.length > 0 && draftEntries.every((e) => selectedEntryIds.has(e.id));

    const toggleSelectAll = useCallback(() => {
        setSelectedEntryIds((prev) =>
            allDraftSelected ? new Set() : new Set(draftEntries.map((e) => e.id))
        );
    }, [allDraftSelected, draftEntries]);

    const toggleSelectOne = useCallback((id: string) => {
        setSelectedEntryIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const openCreateModal = () => {
        setEditingSchedule(null);
        reset({
            category_id: '',
            method: 'straight_line',
            useful_life_years: '',
            residual_value_pct: '',
        });
        setScheduleModalOpen(true);
    };

    const openEditModal = (schedule: DepreciationScheduleRow) => {
        setEditingSchedule(schedule);
        reset({
            category_id: schedule.category_id,
            method: schedule.method,
            useful_life_years: String(schedule.useful_life_years ?? ''),
            residual_value_pct: String(schedule.residual_value_pct ?? ''),
        });
        setScheduleModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            category_id: data.category_id || editingSchedule?.category_id,
            method: data.method,
            useful_life_years: data.useful_life_years === '' ? null : Number(data.useful_life_years),
            residual_value_pct:
                data.residual_value_pct === '' ? null : Number(data.residual_value_pct),
        };

        if (editingSchedule) {
            put(`/admin/depreciation/schedules/${editingSchedule.id}`, {
                preserveScroll: true,
                data: payload,
                transform: () => payload,
                onSuccess: () => {
                    setScheduleModalOpen(false);
                },
            });
        } else {
            post('/admin/depreciation/schedules', {
                preserveScroll: true,
                data: payload,
                transform: () => payload,
                onSuccess: () => {
                    setScheduleModalOpen(false);
                },
            });
        }
    };

    const handleDeleteSchedule = (schedule: DepreciationScheduleRow) => {
        if (!canDeleteSchedule) return;
        if (!window.confirm('¿Eliminar la regla de depreciación para esta categoría?')) return;
        window.location.href = `/admin/depreciation/schedules/${schedule.id}`;
    };

    const scheduleColumns: DataTableColumn<DepreciationScheduleRow>[] = [
        {
            key: 'category',
            label: 'Categoría SUNAT',
            sortable: false,
            className: 'text-xs text-foreground',
            render: (row) => {
                const cat = row.category;
                if (!cat) return '—';
                return (
                    <div className="min-w-0 truncate">
                        <span className="block truncate font-medium text-foreground">
                            {cat.name}
                        </span>
                        {cat.code && (
                            <span className="block truncate text-[11px] text-muted-foreground">
                                {cat.code}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'method',
            label: 'Método',
            sortable: false,
            className: 'text-xs text-foreground',
            render: (row) => methodLabel(row.method),
        },
        {
            key: 'useful_life_years',
            label: 'Vida útil (años)',
            sortable: false,
            className: 'text-xs text-foreground whitespace-nowrap',
        },
        {
            key: 'residual_value_pct',
            label: 'Valor residual (%)',
            sortable: false,
            className: 'text-xs text-foreground whitespace-nowrap',
            render: (row) => `${row.residual_value_pct ?? '0'} %`,
        },
        {
            key: 'actions',
            label: '',
            sortable: false,
            className: 'text-xs text-right text-foreground whitespace-nowrap',
            render: (row) =>
                !canUpdateSchedule && !canDeleteSchedule ? null : (
                    <div className="flex justify-end gap-1">
                        {canUpdateSchedule && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7 text-sky-700 hover:text-sky-800 hover:bg-sky-50 cursor-pointer"
                                onClick={() => openEditModal(row)}
                            >
                                <Pencil className="size-4" />
                            </Button>
                        )}
                        {canDeleteSchedule && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7 text-rose-700 hover:text-rose-800 hover:bg-rose-50 cursor-pointer"
                                onClick={() => handleDeleteSchedule(row)}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        )}
                    </div>
                ),
        },
    ];

    const entriesColumns: DataTableColumn<DepreciationEntryRow>[] = [
        ...(canApproveEntries
            ? [
                  {
                      key: '_select',
                      label: ' ',
                      sortable: false,
                      className: 'text-xs w-10',
                      render: (row) =>
                          row.status !== 'approved' ? (
                              <Checkbox
                                  checked={selectedEntryIds.has(row.id)}
                                  onCheckedChange={() => toggleSelectOne(row.id)}
                                  aria-label={`Seleccionar ${row.asset?.code ?? row.id}`}
                                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 data-[state=checked]:text-white"
                              />
                          ) : null,
                  } as DataTableColumn<DepreciationEntryRow>,
              ]
            : []),
        {
            key: 'period',
            label: 'Periodo',
            sortable: false,
            className: 'text-xs text-foreground whitespace-nowrap',
        },
        {
            key: 'asset',
            label: 'Activo',
            sortable: false,
            className: 'text-xs text-foreground',
            render: (row) => (
                <span className="font-medium text-foreground">
                    {row.asset?.code ?? '—'}
                </span>
            ),
        },
        {
            key: 'amount',
            label: 'Monto',
            sortable: false,
            className: 'text-xs text-foreground whitespace-nowrap',
            render: (row) => formatCurrency(row.amount),
        },
        {
            key: 'book_value_before',
            label: 'Valor antes',
            sortable: false,
            className: 'text-xs text-foreground whitespace-nowrap',
            render: (row) => formatCurrency(row.book_value_before),
        },
        {
            key: 'book_value_after',
            label: 'Valor después',
            sortable: false,
            className: 'text-xs text-foreground whitespace-nowrap',
            render: (row) => formatCurrency(row.book_value_after),
        },
        {
            key: 'status',
            label: 'Estado',
            sortable: false,
            className: 'text-xs text-foreground whitespace-nowrap',
            render: (row) =>
                row.status === 'approved' ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        Aprobado
                    </span>
                ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        Borrador
                    </span>
                ),
        },
        {
            key: 'created_at',
            label: 'Generado',
            sortable: false,
            className: 'text-xs text-foreground whitespace-nowrap',
            render: (row) => formatDateTime(row.created_at),
        },
        {
            key: 'entry_actions',
            label: '',
            sortable: false,
            className: 'text-xs text-right text-foreground whitespace-nowrap',
            render: (row) =>
                canApproveEntries && row.status !== 'approved' ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer border-emerald-500 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                        onClick={() => {
                            if (
                                !window.confirm(
                                    '¿Aprobar este movimiento de depreciación? Esta acción no se puede deshacer fácilmente.'
                                )
                            ) {
                                return;
                            }
                            const form = document.createElement('form');
                            form.method = 'POST';
                            form.action = `/admin/depreciation/entries/${row.id}/approve`;
                            const token = (document.querySelector(
                                'meta[name="csrf-token"]'
                            ) as HTMLMetaElement | null)?.content;
                            if (token) {
                                const input = document.createElement('input');
                                input.type = 'hidden';
                                input.name = '_token';
                                input.value = token;
                                form.appendChild(input);
                            }
                            document.body.appendChild(form);
                            form.submit();
                        }}
                    >
                        Aprobar
                    </Button>
                ) : null,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Depreciación" />

            <div className="min-h-[60vh] flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="inline-flex size-10 items-center justify-center rounded-xl border-2 border-inv-surface/20 bg-inv-primary/5 text-inv-primary shadow-sm">
                            <LayoutGrid className="size-5" />
                        </div>
                        <div className="border-l-2 border-inv-primary/30 pl-4">
                            <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                                Depreciación de activos tecnológicos
                            </h1>
                            <p className="mt-0.5 text-muted-foreground text-xs md:text-sm">
                                Configuración por categoría SUNAT y últimos movimientos de depreciación.
                            </p>
                        </div>
                    </div>
                    {canCreateSchedule && (
                        <Button
                            type="button"
                            className="mt-2 inline-flex items-center gap-2 bg-inv-primary text-white hover:bg-inv-primary/90 cursor-pointer"
                            onClick={openCreateModal}
                        >
                            <Plus className="size-4" />
                            Nueva regla
                        </Button>
                    )}
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
                    <div className="border-b border-inv-primary/40 bg-inv-primary/10">
                        <nav className="flex gap-1 p-2" aria-label="Tabs">
                            <button
                                type="button"
                                onClick={() => setTab('config')}
                                className={cn(
                                    'cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all sm:text-sm',
                                    tab === 'config'
                                        ? 'bg-inv-primary text-white shadow-md ring-2 ring-inv-surface/30'
                                        : 'text-muted-foreground hover:bg-inv-primary/10 hover:text-inv-primary'
                                )}
                            >
                                <TrendingDown className="hidden size-4 sm:inline-block" />
                                <span>Configuración</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setTab('entries')}
                                className={cn(
                                    'cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all sm:text-sm',
                                    tab === 'entries'
                                        ? 'bg-inv-primary text-white shadow-md ring-2 ring-inv-surface/30'
                                        : 'text-muted-foreground hover:bg-inv-primary/10 hover:text-inv-primary'
                                )}
                            >
                                <TrendingDown className="hidden size-4 sm:inline-block" />
                                <span>Movimientos</span>
                            </button>
                        </nav>
                    </div>

                    {/* Contenido por pestaña */}
                    {tab === 'config' && (
                        <div className="space-y-4 p-4 md:p-6">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <TrendingDown className="size-4 text-inv-primary" />
                                    <h2 className="text-sm font-semibold tracking-tight text-foreground">
                                        Configuración de depreciación por categoría
                                    </h2>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {schedules.length === 0
                                        ? 'Sin configuración registrada'
                                        : `${schedules.length} categorías configuradas`}
                                </span>
                            </div>

                            <div className="rounded-xl border border-border/70 bg-card shadow-sm">
                                {/* Desktop / pantallas medianas en adelante: tabla densa */}
                                <div className="hidden md:block">
                                    <DataTable
                                        columns={scheduleColumns}
                                        data={schedules}
                                        keyExtractor={(row) => row.id}
                                        variant="neutral"
                                    />
                                </div>

                                {/* Móvil: tarjetas por categoría, más legibles */}
                                <div className="block divide-y divide-border/70 md:hidden">
                                    {schedules.length === 0 ? (
                                        <div className="p-4 text-xs text-muted-foreground">
                                            Aún no hay reglas de depreciación configuradas.
                                        </div>
                                    ) : (
                                        schedules.map((row) => {
                                            const cat = row.category;
                                            return (
                                                <div key={row.id} className="p-4">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-semibold text-foreground">
                                                                {cat?.name ?? 'Categoría sin nombre'}
                                                            </p>
                                                            {cat?.code && (
                                                                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                                                    {cat.code}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {!canUpdateSchedule && !canDeleteSchedule ? null : (
                                                            <div className="flex shrink-0 items-center gap-1">
                                                                {canUpdateSchedule && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="size-7 text-sky-700 hover:text-sky-800 hover:bg-sky-50 cursor-pointer"
                                                                        onClick={() => openEditModal(row)}
                                                                    >
                                                                        <Pencil className="size-4" />
                                                                    </Button>
                                                                )}
                                                                {canDeleteSchedule && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="size-7 text-rose-700 hover:text-rose-800 hover:bg-rose-50 cursor-pointer"
                                                                        onClick={() =>
                                                                            handleDeleteSchedule(row)
                                                                        }
                                                                    >
                                                                        <Trash2 className="size-4" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                                                        <div>
                                                            <p className="font-medium text-foreground/80">
                                                                Método
                                                            </p>
                                                            <p className="mt-0.5 text-xs">
                                                                {methodLabel(row.method)}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-foreground/80">
                                                                Vida útil
                                                            </p>
                                                            <p className="mt-0.5 text-xs">
                                                                {row.useful_life_years} años
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-foreground/80">
                                                                Valor residual
                                                            </p>
                                                            <p className="mt-0.5 text-xs">
                                                                {row.residual_value_pct ?? '0'} %
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'entries' && (
                        <div className="space-y-4 p-4 md:p-6">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-2">
                                    <TrendingDown className="size-4 text-sky-600" />
                                    <h2 className="text-sm font-semibold tracking-tight text-foreground">
                                        Movimientos de depreciación
                                    </h2>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <Label className="text-xs text-muted-foreground">
                                        Periodo
                                    </Label>
                                    <Select
                                        value={periodFilter}
                                        onValueChange={(v) => {
                                            router.get(buildEntriesUrl({
                                                period: v,
                                                per_page: entriesFilters.per_page,
                                                page: 1,
                                            }), {}, { preserveState: true });
                                        }}
                                    >
                                        <SelectTrigger className="h-8 w-40 text-xs">
                                            <SelectValue placeholder="Todos los periodos" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos los periodos</SelectItem>
                                            {availablePeriods.map((p) => (
                                                <SelectItem key={p} value={p}>
                                                    {p}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {canApproveEntries && draftEntries.length > 0 && (
                                        <>
                                            <div className="flex items-center gap-2 border-l border-border/70 pl-3">
                                                <Checkbox
                                                    id="depreciation-select-all"
                                                    checked={allDraftSelected}
                                                    onCheckedChange={toggleSelectAll}
                                                    aria-label="Seleccionar todos los borradores"
                                                    className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 data-[state=checked]:text-white"
                                                />
                                                <Label
                                                    htmlFor="depreciation-select-all"
                                                    className="cursor-pointer text-xs text-muted-foreground"
                                                >
                                                    Seleccionar todos
                                                </Label>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={selectedEntryIds.size === 0}
                                                className="cursor-pointer border-emerald-500 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-50"
                                                onClick={() => setApproveModalOpen(true)}
                                            >
                                                Aprobar seleccionados
                                                {selectedEntryIds.size > 0 &&
                                                    ` (${selectedEntryIds.size})`}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {filteredEntries.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                    No hay movimientos de depreciación para el filtro seleccionado.
                                </p>
                            ) : (
                                <>
                                    {/* Desktop / pantallas medianas: tabla resumida */}
                                    <div className="hidden md:block rounded-lg border border-border/70 bg-background/40">
                                        <DataTable
                                            columns={entriesColumns}
                                            data={filteredEntries}
                                            keyExtractor={(row) => row.id}
                                            variant="neutral"
                                        />
                                    </div>

                                    {/* Móvil: tarjetas por movimiento */}
                                    <div className="mt-2 space-y-3 md:hidden">
                                        {filteredEntries.map((row) => (
                                            <div
                                                key={row.id}
                                                className="rounded-lg border border-border/70 bg-background/60 p-3"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex min-w-0 items-start gap-2">
                                                        {canApproveEntries &&
                                                            row.status !== 'approved' && (
                                                                <Checkbox
                                                                    checked={selectedEntryIds.has(
                                                                        row.id
                                                                    )}
                                                                    onCheckedChange={() =>
                                                                        toggleSelectOne(row.id)
                                                                    }
                                                                    aria-label={`Seleccionar ${row.asset?.code ?? row.id}`}
                                                                    className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 data-[state=checked]:text-white"
                                                                />
                                                            )}
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-semibold text-foreground">
                                                                {row.asset?.code ??
                                                                    'Activo sin código'}
                                                            </p>
                                                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                                Periodo {row.period}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span
                                                        className={
                                                            row.status === 'approved'
                                                                ? 'inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700'
                                                                : 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700'
                                                        }
                                                    >
                                                        {row.status === 'approved' ? 'Aprobado' : 'Borrador'}
                                                    </span>
                                                </div>
                                                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                                                    <div>
                                                        <p className="font-medium text-foreground/80">
                                                            Monto
                                                        </p>
                                                        <p className="mt-0.5 text-xs">
                                                            {formatCurrency(row.amount)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-foreground/80">
                                                            Valor antes
                                                        </p>
                                                        <p className="mt-0.5 text-xs">
                                                            {formatCurrency(row.book_value_before)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-foreground/80">
                                                            Valor después
                                                        </p>
                                                        <p className="mt-0.5 text-xs">
                                                            {formatCurrency(row.book_value_after)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-foreground/80">
                                                            Generado
                                                        </p>
                                                        <p className="mt-0.5 text-xs">
                                                            {formatDateTime(row.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                                {canApproveEntries && row.status !== 'approved' && (
                                                    <div className="mt-3">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full cursor-pointer border-emerald-500 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                                            onClick={() => {
                                                                if (
                                                                    !window.confirm(
                                                                        '¿Aprobar este movimiento de depreciación? Esta acción no se puede deshacer fácilmente.'
                                                                    )
                                                                ) {
                                                                    return;
                                                                }
                                                                const form =
                                                                    document.createElement('form');
                                                                form.method = 'POST';
                                                                form.action = `/admin/depreciation/entries/${row.id}/approve`;
                                                                const token = (
                                                                    document.querySelector(
                                                                        'meta[name="csrf-token"]'
                                                                    ) as HTMLMetaElement | null
                                                                )?.content;
                                                                if (token) {
                                                                    const input =
                                                                        document.createElement('input');
                                                                    input.type = 'hidden';
                                                                    input.name = '_token';
                                                                    input.value = token;
                                                                    form.appendChild(input);
                                                                }
                                                                document.body.appendChild(form);
                                                                form.submit();
                                                            }}
                                                        >
                                                            Aprobar
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                            <div className="px-3 py-3">
                                <TablePagination
                                    from={entriesPaginator.from}
                                    to={entriesPaginator.to}
                                    total={entriesPaginator.total}
                                    perPage={entriesFilters.per_page}
                                    currentPage={entriesPaginator.current_page}
                                    lastPage={entriesPaginator.last_page}
                                    links={entriesPaginator.links}
                                    buildPageUrl={(page) =>
                                        buildEntriesUrl({
                                            period: periodFilter !== 'all' ? periodFilter : undefined,
                                            per_page: entriesFilters.per_page,
                                            page,
                                        })
                                    }
                                    onPerPageChange={(perPage) => {
                                        router.get(
                                            buildEntriesUrl({
                                                period: periodFilter !== 'all' ? periodFilter : undefined,
                                                per_page: perPage,
                                                page: 1,
                                            }),
                                            {},
                                            { preserveState: true }
                                        );
                                    }}
                                    perPageOptions={[25, 50, 100]}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <AppModal
                open={approveModalOpen}
                onOpenChange={setApproveModalOpen}
                title="Aprobar movimientos"
                contentClassName="space-y-4"
            >
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Se aprobarán{' '}
                        <span className="font-semibold text-foreground">
                            {selectedEntryIds.size}
                        </span>{' '}
                        movimiento{selectedEntryIds.size !== 1 ? 's' : ''} de depreciación. ¿Desea
                        continuar?
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => setApproveModalOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
                            onClick={() => {
                                if (selectedEntryIds.size === 0) return;
                                router.post(
                                    '/admin/depreciation/entries/bulk-approve',
                                    { entry_ids: Array.from(selectedEntryIds) },
                                    {
                                        preserveScroll: true,
                                        onSuccess: () => {
                                            setApproveModalOpen(false);
                                            setSelectedEntryIds(new Set());
                                        },
                                    }
                                );
                            }}
                        >
                            Aprobar
                        </Button>
                    </div>
                </div>
            </AppModal>
            <AppModal
                open={scheduleModalOpen}
                onOpenChange={setScheduleModalOpen}
                title={editingSchedule ? 'Editar regla de depreciación' : 'Nueva regla de depreciación'}
                contentClassName="space-y-4"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!editingSchedule && (
                        <div className="space-y-2">
                            <Label>
                                Categoría SUNAT <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={data.category_id}
                                onValueChange={(v) => {
                                    setData('category_id', v);
                                    const cat = categoryMap.get(v);
                                    if (cat) {
                                        if (cat.default_useful_life_years) {
                                            setData(
                                                'useful_life_years',
                                                String(cat.default_useful_life_years)
                                            );
                                        }
                                        if (cat.default_depreciation_method) {
                                            setData(
                                                'method',
                                                cat.default_depreciation_method
                                            );
                                        }
                                        if (cat.default_residual_value_pct != null) {
                                            setData(
                                                'residual_value_pct',
                                                String(cat.default_residual_value_pct)
                                            );
                                        }
                                    }
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Seleccione categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            {cat.name}
                                            {CATEGORY_TYPE_LABELS[cat.type] ? ` (${CATEGORY_TYPE_LABELS[cat.type]})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.category_id && (
                                <p className="text-sm text-destructive">{errors.category_id}</p>
                            )}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label>
                            Método <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={data.method}
                            onValueChange={(v) => setData('method', v)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccione método" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="straight_line">Línea recta</SelectItem>
                                <SelectItem value="double_declining">
                                    Saldos decrecientes
                                </SelectItem>
                                <SelectItem value="sum_of_years">
                                    Suma de dígitos de los años
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.method && (
                            <p className="text-sm text-destructive">{errors.method}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label>
                            Vida útil (años) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            type="number"
                            min={1}
                            value={data.useful_life_years}
                            onChange={(e) => setData('useful_life_years', e.target.value)}
                            className={errors.useful_life_years ? 'border-destructive' : ''}
                        />
                        {errors.useful_life_years && (
                            <p className="text-sm text-destructive">
                                {errors.useful_life_years}
                            </p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label>Valor residual (%)</Label>
                        <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            value={data.residual_value_pct}
                            onChange={(e) => setData('residual_value_pct', e.target.value)}
                            className={errors.residual_value_pct ? 'border-destructive' : ''}
                        />
                        {errors.residual_value_pct && (
                            <p className="text-sm text-destructive">
                                {errors.residual_value_pct}
                            </p>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => setScheduleModalOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="bg-inv-primary text-white hover:bg-inv-primary/90 cursor-pointer"
                            disabled={processing}
                        >
                            Guardar
                        </Button>
                    </div>
                </form>
            </AppModal>
        </AppLayout>
    );
}

