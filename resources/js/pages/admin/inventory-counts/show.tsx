import { Head, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Barcode, CheckCircle2, ClipboardList, Lock, PackageSearch, RefreshCw, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { DataTableColumn } from '@/components/data-table';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppModal } from '@/components/app-modal';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    CONDITION_OPTIONS,
    conditionToLabel as conditionToLabelShared,
    normalizeConditionValue,
} from '@/constants/conditions';
import { cn } from '@/lib/utils';

type Warehouse = {
    id: string;
    name: string;
    code: string | null;
    office?: { name: string; zonal?: { name: string; code: string | null } | null } | null;
};

type Count = {
    id: string;
    count_date: string;
    status: string;
    warehouse: Warehouse | null;
    reconciled_at: string | null;
    reconciled_by?: { id: string; name: string; last_name: string | null; usuario: string | null } | null;
};

type ItemRow = {
    id: string;
    label: string;
    expected_quantity: number;
    counted_quantity: number;
    difference: number | null;
    status: 'pending' | 'counted' | 'difference';
    /** Estado del activo/componente en el inventario (almacenado, en uso, vendido, etc.) */
    lifecycle_status?: string | null;
    notes: string | null;
    /** Condición registrada en el catálogo (activo/componente) */
    condition_original?: string | null;
    /** Condición al momento del conteo (lo que se encontró) */
    condition_at_count?: string | null;
    /** Para el modal: condition_at_count ?? condition_original */
    condition?: string | null;
};

type Summary = {
    total_items: number;
    counted_items: number;
    with_difference: number;
    pending_items: number;
};

function countStatusBadge(status: Count['status']) {
    const map: Record<Count['status'], { label: string; className: string }> = {
        in_progress: {
            label: 'En progreso',
            className: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200',
        },
        reconciled: {
            label: 'Reconciliado',
            className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
        },
        closed: {
            label: 'Cerrado',
            className: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
        },
    };
    const cfg = map[status];
    return (
        <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium', cfg.className)}>
            {cfg.label}
        </span>
    );
}

type Props = {
    count: Count;
    items: ItemRow[];
    summary: Summary;
    scannedItemId?: string | null;
};

const breadcrumbs = (id: string): BreadcrumbItem[] => [
    { title: 'Activos', href: '#' },
    { title: 'Inventario físico', href: '/admin/inventory-counts' },
    { title: 'Detalle de conteo', href: `/admin/inventory-counts/${id}` },
];

function statusBadge(status: ItemRow['status']) {
    const map: Record<ItemRow['status'], { label: string; className: string }> = {
        pending: {
            label: 'Pendiente',
            className: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
        },
        counted: {
            label: 'Contado',
            className: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200',
        },
        difference: {
            label: 'Con diferencia',
            className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
        },
    };
    const cfg = map[status];
    return (
        <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium', cfg.className)}>
            {cfg.label}
        </span>
    );
}

function formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function warehousePath(warehouse: Warehouse | null): string {
    if (!warehouse) return '—';
    const zonal = warehouse.office?.zonal?.name ?? warehouse.office?.zonal?.code ?? '';
    const office = warehouse.office?.name ?? '';
    return [zonal, office, warehouse.name].filter(Boolean).join(' / ') || warehouse.name;
}

function conditionToLabel(raw?: string | null): string {
    return conditionToLabelShared(raw);
}

export default function InventoryCountShow({ count, items, summary, scannedItemId }: Props) {
    const [scanCode, setScanCode] = useState('');
    const [filterText, setFilterText] = useState('');
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [editItem, setEditItem] = useState<ItemRow | null>(null);
    const [editCounted, setEditCounted] = useState<string>('');
    const [editNotes, setEditNotes] = useState<string>('');
    const [editCondition, setEditCondition] = useState<string>('');
    const [confirmAction, setConfirmAction] = useState<'reconcile' | 'close' | null>(null);

    const { props } = usePage();
    const auth = (props as { auth?: { permissions?: string[] } }).auth;
    const permissions = auth?.permissions ?? [];
    const canScan = permissions.includes('inventory_counts.scan');
    const canReconcile = permissions.includes('inventory_counts.reconcile');
    const canClose = permissions.includes('inventory_counts.close');

    useEffect(() => {
        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    const handleScanSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const value = scanCode.trim();
        if (!value) return;
        router.post(
            `/admin/inventory-counts/${count.id}/scan`,
            { code: value },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setScanCode('');
                    inputRef.current?.focus();
                },
            }
        );
    };

    const filteredItems = items.filter((item) =>
        filterText.trim() === ''
            ? true
            : item.label.toLowerCase().includes(filterText.trim().toLowerCase())
    );
    const canDeleteItems = false; // reservado para futuro: permisos por ítem

    useEffect(() => {
        if (!scannedItemId) return;
        const found = items.find((it) => it.id === scannedItemId);
        if (!found) return;
        setEditItem(found);
        const nextCount =
            found.expected_quantity != null && found.counted_quantity + 1 > found.expected_quantity
                ? found.expected_quantity
                : found.counted_quantity + 1;
        setEditCounted(String(nextCount));
        setEditNotes(found.notes ?? '');
        setEditCondition(normalizeConditionValue(found.condition) || '');
    }, [scannedItemId, items]);

    const handleOpenEdit = (item: ItemRow) => {
        setEditItem(item);
        setEditCounted(String(item.counted_quantity));
        setEditNotes(item.notes ?? '');
        setEditCondition(normalizeConditionValue(item.condition) || '');
    };

    const handleSubmitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editItem) return;
        const qty = parseInt(editCounted, 10);
        if (Number.isNaN(qty) || qty < 0) return;
        router.put(
            `/admin/inventory-counts/${count.id}/items/${editItem.id}`,
            {
                counted_quantity: qty,
                notes: editNotes || null,
                condition_at_count: editCondition ? normalizeConditionValue(editCondition) || null : null,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setEditItem(null);
                },
            }
        );
    };

    const handleReconcile = () => {
        setConfirmAction(null);
        router.post(
            `/admin/inventory-counts/${count.id}/reconcile`,
            {},
            { preserveScroll: true, preserveState: true }
        );
    };

    const handleClose = () => {
        setConfirmAction(null);
        router.post(
            `/admin/inventory-counts/${count.id}/close`,
            {},
            { preserveScroll: true, preserveState: true }
        );
    };

    const columns: DataTableColumn<ItemRow>[] = [
        {
            key: 'label',
            label: 'Bien',
            sortable: false,
            className: 'max-w-[260px] text-xs text-foreground',
            render: (row) => <span>{row.label}</span>,
        },
        {
            key: 'expected_quantity',
            label: 'Esperado',
            sortable: false,
            className: 'text-xs text-right text-foreground',
            render: (row) => row.expected_quantity,
        },
        {
            key: 'counted_quantity',
            label: 'Contado',
            sortable: false,
            className: 'text-xs text-right text-foreground',
            render: (row) => row.counted_quantity,
        },
        {
            key: 'difference',
            label: 'Dif.',
            sortable: false,
            className: 'text-xs text-right text-foreground',
            render: (row) => (
                <span
                    className={cn(
                        'inline-flex min-w-[3rem] justify-end rounded-full px-2 py-0.5 text-[11px]',
                        (row.difference ?? 0) === 0
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
                    )}
                >
                    {row.difference ?? 0}
                </span>
            ),
        },
        {
            key: 'lifecycle_status',
            label: 'Estado inventario',
            sortable: false,
            className: 'text-xs text-foreground',
            render: (row) =>
                row.lifecycle_status && row.lifecycle_status.trim() !== ''
                    ? row.lifecycle_status
                    : '—',
        },
        {
            key: 'status',
            label: 'Estado',
            sortable: false,
            className: 'text-xs text-left text-foreground',
            render: (row) => statusBadge(row.status),
        },
        {
            key: 'condition_original',
            label: 'Condición (registrada)',
            sortable: false,
            className: 'text-xs text-left text-muted-foreground',
            render: (row) => (
                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] dark:bg-slate-500/20" title="Condición con la que estaba en el sistema">
                    {conditionToLabel(row.condition_original)}
                </span>
            ),
        },
        {
            key: 'condition_at_count',
            label: 'Condición al conteo',
            sortable: false,
            className: 'text-xs text-left text-muted-foreground',
            render: (row) => (
                <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[11px] dark:bg-sky-500/20" title="Condición encontrada en el inventario físico">
                    {row.condition_at_count != null && row.condition_at_count !== '' ? conditionToLabel(row.condition_at_count) : '—'}
                </span>
            ),
        },
        {
            key: 'notes',
            label: 'Notas',
            sortable: false,
            className: 'text-xs text-left text-muted-foreground',
            render: (row) => row.notes ?? '—',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs(count.id)}>
            <Head title="Detalle de conteo" />

            <div className="min-h-[60vh] flex flex-col gap-6 p-4 md:p-6">
                {/* Header similar a configure */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => router.get('/admin/inventory-counts')}
                            className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-inv-surface/20 bg-inv-primary/5 text-inv-primary shadow-sm transition-all hover:border-inv-primary/40 hover:bg-inv-primary/10 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2 dark:border-inv-surface/30 dark:bg-inv-section/20 dark:text-inv-primary dark:hover:bg-inv-section/30"
                            aria-label="Volver a inventario físico"
                        >
                            <ArrowLeft className="size-5" />
                        </button>
                        <div className="border-l-2 border-inv-primary/30 pl-4">
                            <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                                Conteo físico
                            </h1>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground md:text-sm">
                                <span className="font-medium text-foreground/90">
                                    {warehousePath(count.warehouse)}
                                </span>
                                <span className="text-muted-foreground/80">·</span>
                                <span className="font-medium text-inv-primary">
                                    {formatDate(count.count_date)}
                                </span>
                                <span className="text-muted-foreground/80">·</span>
                                {countStatusBadge(count.status)}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {canReconcile && count.status === 'in_progress' && (
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => setConfirmAction('reconcile')}
                                className="cursor-pointer inline-flex items-center gap-2 bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700"
                            >
                                <RefreshCw className="size-3.5" />
                                <span>Reconciliar conteo</span>
                            </Button>
                        )}
                        {canClose && count.status === 'reconciled' && (
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => setConfirmAction('close')}
                                className="cursor-pointer inline-flex items-center gap-2 bg-slate-800 text-xs font-medium text-white hover:bg-slate-900"
                            >
                                <Lock className="size-3.5" />
                                <span>Cerrar conteo</span>
                            </Button>
                        )}
                        </div>
                    </div>

                {/* Badges de resumen (estilo purchase-orders) */}
                <div className="flex flex-wrap gap-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-blue-500/20 dark:text-gray-400">
                        <ClipboardList className="size-3 shrink-0 text-blue-600 dark:text-blue-400" />
                        <span>Total en almacén</span>
                        <span className="font-semibold">{summary.total_items}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-emerald-500/20 dark:text-gray-400">
                        <CheckCircle2 className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>Ya contados</span>
                        <span className="font-semibold">{summary.counted_items}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-amber-500/20 dark:text-gray-400">
                        <PackageSearch className="size-3 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>Faltan por contar</span>
                        <span className="font-semibold">{summary.pending_items}</span>
                    </span>
                    {summary.with_difference > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                            <span>Con diferencia</span>
                            <span className="font-semibold">{summary.with_difference}</span>
                        </span>
                    )}
                </div>

                {/* Contenedor principal con gradiente, similar a configure */}
                <div className="relative overflow-hidden rounded-2xl">
                    <div
                        className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
                        style={{
                            background: 'linear-gradient(135deg, #447794 0%, #2d5b75 40%, #123249 100%)',
                        }}
                        aria-hidden
                    />
                    <div
                        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-30"
                        style={{ background: 'radial-gradient(circle, #447794 0%, transparent 70%)' }}
                        aria-hidden
                    />

                    <div className="relative rounded-2xl border border-border/80 bg-card shadow-sm">
                    {canScan && count.status === 'in_progress' && (
                        <div className="border-b border-border bg-muted/40 p-3">
                            <form
                                onSubmit={handleScanSubmit}
                                className="flex flex-col gap-2 sm:flex-row sm:items-center"
                            >
                                <div className="flex-1">
                                    <label className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                        <Barcode className="size-3" />
                                        Código o código de barras
                                    </label>
                                    <Input
                                        ref={inputRef}
                                        value={scanCode}
                                        onChange={(e) => setScanCode(e.target.value)}
                                        placeholder="Escanee el código o escriba y presione Enter…"
                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="mt-1 inline-flex cursor-pointer items-center gap-2 bg-inv-primary text-white hover:bg-inv-primary/90 sm:mt-5"
                                >
                                    <Barcode className="size-4" />
                                    <span>Registrar lectura</span>
                                </Button>
                            </form>
                        </div>
                    )}

                    <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
                        <Search className="size-3 text-muted-foreground" />
                        <Input
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            placeholder="Filtrar por descripción del bien…"
                            className="h-8 max-w-xs rounded-md border border-border bg-background px-2 text-xs text-foreground shadow-sm focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                        />
                    </div>

                    <div className="hidden md:block">
                        <div className="overflow-x-auto">
                            <DataTable
                                columns={columns}
                                data={filteredItems}
                                keyExtractor={(row) => row.id}
                                emptyMessage="Aún no hay ítems registrados para este conteo."
                                variant="default"
                            />
                        </div>
                    </div>
                    <div className="md:hidden">
                        {filteredItems.length === 0 ? (
                            <p className="py-6 px-4 text-center text-sm text-muted-foreground">
                                Aún no hay ítems registrados para este conteo.
                            </p>
                        ) : (
                            <ul className="flex flex-col gap-3 p-3">
                                {filteredItems.map((row) => (
                                    <li key={row.id}>
                                        <article className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
                                            <div className="space-y-1.5 p-4">
                                                <p className="text-sm font-semibold text-foreground">{row.label}</p>
                                                <dl className="grid grid-cols-1 gap-1 text-xs">
                                                    <div className="flex flex-wrap gap-1">
                                                        <dt className="mr-1 font-medium text-muted-foreground">
                                                            Esperado:
                                                        </dt>
                                                        <dd>{row.expected_quantity}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        <dt className="mr-1 font-medium text-muted-foreground">
                                                            Contado:
                                                        </dt>
                                                        <dd>{row.counted_quantity}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        <dt className="mr-1 font-medium text-muted-foreground">
                                                            Dif.:
                                                        </dt>
                                                        <dd>{row.difference ?? 0}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        <dt className="mr-1 font-medium text-muted-foreground">
                                                            Estado:
                                                        </dt>
                                                        <dd>{statusBadge(row.status)}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        <dt className="mr-1 font-medium text-muted-foreground">
                                                            Condición (registrada):
                                                        </dt>
                                                        <dd>{conditionToLabel(row.condition_original)}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        <dt className="mr-1 font-medium text-muted-foreground">
                                                            Condición al conteo:
                                                        </dt>
                                                        <dd>{row.condition_at_count != null && row.condition_at_count !== '' ? conditionToLabel(row.condition_at_count) : '—'}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        <dt className="mr-1 font-medium text-muted-foreground">
                                                            Notas:
                                                        </dt>
                                                        <dd>{row.notes ?? '—'}</dd>
                                                    </div>
                                                </dl>
                                            </div>
                                        </article>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    </div>
                </div>
            </div>

            <AppModal
                open={!!editItem}
                onOpenChange={(open) => {
                    if (!open) setEditItem(null);
                }}
                title="Detalle del ítem contado"
                contentClassName="space-y-4"
            >
                {editItem && (
                    <form onSubmit={handleSubmitEdit} className="space-y-4">
                        <div className="space-y-1">
                            <Label className="text-xs font-medium text-muted-foreground">Bien</Label>
                            <p className="text-sm text-foreground">{editItem.label}</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label className="text-xs font-medium">
                                    Condición al momento del conteo
                                </Label>
                                <Select
                                    value={editCondition || 'none'}
                                    onValueChange={(value) =>
                                        setEditCondition(value === 'none' ? '' : value)
                                    }
                                >
                                    <SelectTrigger className="w-full border-border bg-background text-xs">
                                        <SelectValue placeholder="Seleccione condición…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Seleccione condición…</SelectItem>
                                        {CONDITION_OPTIONS.map((o) => (
                                            <SelectItem key={o.value} value={o.value}>
                                                {o.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    Estado de conteo
                                </Label>
                                <div>{statusBadge(editItem.status)}</div>
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label className="text-xs font-medium">
                                    Esperado
                                </Label>
                                <p className="rounded-md border border-border bg-muted px-3 py-1.5 text-sm">
                                    {editItem.expected_quantity}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="edit_counted" className="text-xs font-medium">
                                    Contado <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit_counted"
                                    type="number"
                                    min={0}
                                    value={editCounted}
                                    onChange={(e) => setEditCounted(e.target.value)}
                                    className="w-full border-border bg-background"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="edit_notes" className="text-xs font-medium">
                                Notas
                            </Label>
                            <textarea
                                id="edit_notes"
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                rows={3}
                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="cursor-pointer"
                                onClick={() => setEditItem(null)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="cursor-pointer bg-inv-primary text-white hover:bg-inv-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Guardar cambios
                            </Button>
                        </div>
                    </form>
                )}
            </AppModal>

            {/* Modal de confirmación: Reconciliar o Cerrar */}
            <AppModal
                open={confirmAction !== null}
                onOpenChange={(open) => {
                    if (!open) setConfirmAction(null);
                }}
                title={confirmAction === 'reconcile' ? 'Confirmar reconciliación' : 'Confirmar cierre'}
                contentClassName="space-y-4"
            >
                <p className="text-muted-foreground text-sm">
                    {confirmAction === 'reconcile'
                        ? '¿Reconciliar este conteo? Se marcará como reconciliado y podrá cerrarlo después desde el listado.'
                        : '¿Cerrar este conteo? No se podrán editar los ítems después del cierre.'}
                </p>
                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => setConfirmAction(null)}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        className={
                            confirmAction === 'reconcile'
                                ? 'cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'cursor-pointer bg-slate-800 text-white hover:bg-slate-900'
                        }
                        onClick={() => (confirmAction === 'reconcile' ? handleReconcile() : handleClose())}
                    >
                        {confirmAction === 'reconcile' ? 'Reconciliar' : 'Cerrar conteo'}
                    </Button>
                </div>
            </AppModal>
        </AppLayout>
    );
}

