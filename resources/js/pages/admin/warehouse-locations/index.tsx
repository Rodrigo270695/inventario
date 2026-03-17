import { Head, router, usePage } from '@inertiajs/react';
import { Building2, Inbox, MapPin, Pencil, Plus, Trash2, Warehouse } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DataTableColumn } from '@/components/data-table';
import { DataTable } from '@/components/data-table';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';
import { WarehouseLocationFormModal } from '@/components/organization/warehouse-location-form-modal';
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
import type { BreadcrumbItem, Office, Warehouse as WarehouseType, WarehouseLocation, Zonal } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Panel de control', href: '/dashboard' },
    { title: 'Compras y logística', href: '#' },
    { title: 'Ubicaciones físicas', href: '/admin/warehouse-locations' },
];

type WarehouseLocationsIndexProps = {
    zonals: Pick<Zonal, 'id' | 'name' | 'code' | 'is_active'>[];
    offices: Pick<Office, 'id' | 'zonal_id' | 'name' | 'code' | 'is_active'>[];
    warehouses: WarehouseType[];
    locations: WarehouseLocation[];
    can: {
        create: boolean;
        update: boolean;
        delete: boolean;
    };
};

export default function WarehouseLocationsIndex({
    zonals,
    offices,
    warehouses,
    locations,
    can,
}: WarehouseLocationsIndexProps) {
    const [formOpen, setFormOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<WarehouseLocation | null>(null);
    const [selectedZonalId, setSelectedZonalId] = useState<string | null>(null);
    const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<WarehouseLocation | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);

    const { props } = usePage();
    const flash = props.flash as { toast?: ToastMessage } | undefined;
    const [toastQueue, setToastQueue] = useState<Array<ToastMessage & { id: number }>>([]);
    const lastFlashToastRef = useRef<ToastMessage | null>(null);

    useEffect(() => {
        const offStart = router.on('start', () => setIsNavigating(true));
        const offFinish = router.on('finish', () => setIsNavigating(false));
        return () => {
            offStart();
            offFinish();
        };
    }, []);

    useEffect(() => {
        const t = flash?.toast;
        if (!t) return;
        if (t === lastFlashToastRef.current) return;
        lastFlashToastRef.current = t;
        const id = Date.now();
        setToastQueue((q) => [...q, { ...t, id }]);
    }, [flash?.toast]);

    const officesForZonal = useMemo(
        () => (selectedZonalId ? offices.filter((o) => o.zonal_id === selectedZonalId) : []),
        [offices, selectedZonalId]
    );
    const warehousesForOffice = useMemo(
        () => (selectedOfficeId ? warehouses.filter((w) => w.office_id === selectedOfficeId) : []),
        [warehouses, selectedOfficeId]
    );
    const locationsForWarehouse = useMemo(
        () => (selectedWarehouseId ? locations.filter((loc) => loc.warehouse_id === selectedWarehouseId) : []),
        [locations, selectedWarehouseId]
    );

    /** Almacenes cuyos office pertenecen al zonal seleccionado (para badges cuando solo hay zonal). */
    const warehousesInZonal = useMemo(
        () =>
            selectedZonalId
                ? warehouses.filter((w) => officesForZonal.some((o) => o.id === w.office_id))
                : [],
        [warehouses, officesForZonal, selectedZonalId]
    );
    /** Ubicaciones en almacenes del zonal seleccionado. */
    const locationsInZonal = useMemo(
        () =>
            selectedZonalId && warehousesInZonal.length > 0
                ? locations.filter((loc) => warehousesInZonal.some((w) => w.id === loc.warehouse_id))
                : [],
        [locations, warehousesInZonal, selectedZonalId]
    );
    /** Ubicaciones en almacenes de la oficina seleccionada (cuando no hay almacén elegido). */
    const locationsInOffice = useMemo(
        () =>
            selectedOfficeId && !selectedWarehouseId
                ? locations.filter((loc) => warehousesForOffice.some((w) => w.id === loc.warehouse_id))
                : [],
        [locations, warehousesForOffice, selectedOfficeId, selectedWarehouseId]
    );

    const onZonalChange = (value: string) => {
        setSelectedZonalId(value || null);
        setSelectedOfficeId(null);
        setSelectedWarehouseId(null);
    };
    const onOfficeChange = (value: string) => {
        setSelectedOfficeId(value || null);
        setSelectedWarehouseId(null);
    };
    const onWarehouseChange = (value: string) => {
        setSelectedWarehouseId(value || null);
    };

    const openCreate = () => {
        setEditingLocation(null);
        setFormOpen(true);
    };
    const openEdit = (loc: WarehouseLocation) => {
        setEditingLocation(loc);
        setFormOpen(true);
    };
    const closeForm = (open: boolean) => {
        if (!open) setEditingLocation(null);
        setFormOpen(open);
    };

    const handleDeleteConfirm = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        router.delete(`/admin/warehouse-locations/${deleteTarget.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    const columns: DataTableColumn<WarehouseLocation>[] = [
        {
            key: 'code',
            label: 'Código',
            sortable: false,
            render: (row) => <span className="font-medium text-foreground">{row.code}</span>,
        },
        {
            key: 'aisle',
            label: 'Pasillo',
            sortable: false,
            className: 'text-muted-foreground text-sm',
            render: (row) => row.aisle ?? '—',
        },
        {
            key: 'row',
            label: 'Fila',
            sortable: false,
            className: 'text-muted-foreground text-sm',
            render: (row) => row.row ?? '—',
        },
        {
            key: 'bin',
            label: 'Columna',
            sortable: false,
            className: 'text-muted-foreground text-sm',
            render: (row) => row.bin ?? '—',
        },
        {
            key: 'is_active',
            label: 'Activo',
            sortable: false,
            className: 'text-sm',
            render: (row) => (
                <span
                    className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                        row.is_active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                            : 'bg-muted text-muted-foreground'
                    }`}
                >
                    {row.is_active ? 'Activo' : 'Inactivo'}
                </span>
            ),
        },
        {
            key: 'actions',
            label: '',
            className: 'w-0 text-right',
            render: (row) => (
                <div className="flex justify-end gap-1">
                    {can.update && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer shrink-0 size-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
                            aria-label={`Editar ${row.code}`}
                            onClick={() => openEdit(row)}
                        >
                            <Pencil className="size-4" />
                        </Button>
                    )}
                    {can.delete && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer shrink-0 size-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400/80 dark:hover:bg-rose-900/20"
                            aria-label={`Eliminar ${row.code}`}
                            onClick={() => setDeleteTarget(row)}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    const emptyContent = (
        <div className="flex flex-col items-center justify-center gap-3 py-8">
            <Inbox className="size-10 text-muted-foreground/60" aria-hidden />
            <span className="text-muted-foreground text-sm">No hay ubicaciones en este almacén.</span>
            {can.create && selectedWarehouseId && (
                <Button size="sm" onClick={openCreate} className="cursor-pointer mt-1 bg-inv-primary hover:bg-inv-primary/90 text-white">
                    <Plus className="size-4 mr-1" />
                    Crear primera ubicación
                </Button>
            )}
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ubicaciones físicas" />

            <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 relative">
                {isNavigating && (
                    <div
                        className="absolute top-0 left-0 right-0 h-0.5 bg-inv-primary/80 animate-pulse z-10 rounded-b"
                        role="progressbar"
                        aria-label="Cargando"
                    />
                )}
                {toastQueue.length > 0 && (
                    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
                        {toastQueue.map((t) => (
                            <Toast
                                key={t.id}
                                toast={t}
                                onDismiss={() => setToastQueue((q) => q.filter((i) => i.id !== t.id))}
                                duration={3000}
                            />
                        ))}
                    </div>
                )}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-3">
                        <div>
                            <h1 className="relative inline-block pb-1 text-xl font-semibold text-foreground">
                                Ubicaciones físicas
                                <span className="absolute bottom-0 left-0 h-0.5 w-8 rounded-full bg-inv-primary" />
                            </h1>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            Estante, pasillo, fila y columna por almacén.
                        </p>
                        <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-blue-500/20 dark:text-gray-400">
                                <MapPin className="size-3 shrink-0 text-blue-600 dark:text-blue-400" />
                                <span>{selectedZonalId ? 'Zonal' : 'Zonales activos'}</span>
                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                    {selectedZonalId ? '1' : zonals.filter((z) => z.is_active).length}
                                </span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-violet-500/20 dark:text-gray-400">
                                <Building2 className="size-3 shrink-0 text-violet-600 dark:text-violet-400" />
                                <span>{selectedOfficeId ? 'Oficina' : selectedZonalId ? 'Oficinas activas (zonal)' : 'Oficinas activas'}</span>
                                <span className="font-semibold text-violet-600 dark:text-violet-400">
                                    {selectedOfficeId
                                        ? '1'
                                        : selectedZonalId
                                          ? officesForZonal.filter((o) => o.is_active).length
                                          : offices.filter((o) => o.is_active).length}
                                </span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-emerald-500/20 dark:text-gray-400">
                                <Warehouse className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <span>{selectedWarehouseId ? 'Almacén' : selectedOfficeId ? 'Almacenes activos (oficina)' : selectedZonalId ? 'Almacenes activos (zonal)' : 'Almacenes activos'}</span>
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                    {selectedWarehouseId
                                        ? '1'
                                        : selectedOfficeId
                                          ? warehousesForOffice.filter((w) => w.is_active).length
                                          : selectedZonalId
                                            ? warehousesInZonal.filter((w) => w.is_active).length
                                            : warehouses.filter((w) => w.is_active).length}
                                </span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-amber-500/20 dark:text-gray-400">
                                <Inbox className="size-3 shrink-0 text-amber-600 dark:text-amber-400" />
                                <span>{selectedWarehouseId ? 'Ubicaciones (almacén)' : selectedOfficeId ? 'Ubicaciones (oficina)' : selectedZonalId ? 'Ubicaciones (zonal)' : 'Ubicaciones'}</span>
                                <span className="font-semibold text-amber-600 dark:text-amber-400">
                                    {selectedWarehouseId
                                        ? locationsForWarehouse.length
                                        : selectedOfficeId
                                          ? locationsInOffice.length
                                          : selectedZonalId
                                            ? locationsInZonal.length
                                            : locations.length}
                                </span>
                            </span>
                        </div>
                    </div>
                    {can.create && (
                        <Button
                            onClick={openCreate}
                            disabled={!selectedWarehouseId}
                            className="cursor-pointer shrink-0 bg-inv-primary text-white hover:bg-inv-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus className="size-4" />
                            Nueva ubicación
                        </Button>
                    )}
                </div>

                <div className="border-t border-border w-full shrink-0" aria-hidden />

                <div className="rounded-xl border border-border bg-card shadow-sm">
                    <div className="border-b border-border p-3 sm:p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                            <Select value={selectedZonalId || '_'} onValueChange={(v) => onZonalChange(v === '_' ? '' : v)}>
                                <SelectTrigger className="w-full sm:w-52 border-border bg-background">
                                    <SelectValue placeholder="Zonal" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_">Zonal</SelectItem>
                                    {zonals.map((z) => (
                                        <SelectItem key={z.id} value={z.id}>
                                            {z.name} {z.code ? `(${z.code})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={selectedOfficeId || '_'} onValueChange={(v) => onOfficeChange(v === '_' ? '' : v)} disabled={!selectedZonalId}>
                                <SelectTrigger className="w-full sm:w-52 border-border bg-background disabled:opacity-60">
                                    <SelectValue placeholder="Oficina" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_">Oficina</SelectItem>
                                    {officesForZonal.map((o) => (
                                        <SelectItem key={o.id} value={o.id}>
                                            {o.name} {o.code ? `(${o.code})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={selectedWarehouseId || '_'} onValueChange={(v) => onWarehouseChange(v === '_' ? '' : v)} disabled={!selectedOfficeId}>
                                <SelectTrigger className="w-full sm:w-52 border-border bg-background disabled:opacity-60">
                                    <SelectValue placeholder="Almacén" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_">Almacén</SelectItem>
                                    {warehousesForOffice.map((w) => (
                                        <SelectItem key={w.id} value={w.id}>
                                            {w.name} {w.code ? `(${w.code})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="hidden md:block">
                        {!selectedWarehouseId ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-12 px-4">
                                <MapPin className="size-10 text-muted-foreground/60" aria-hidden />
                                <span className="text-muted-foreground text-sm text-center">
                                    Seleccione un zonal, luego una oficina y un almacén para ver las ubicaciones.
                                </span>
                            </div>
                        ) : locationsForWarehouse.length === 0 ? (
                            <div className="px-4 py-8">
                                {emptyContent}
                            </div>
                        ) : (
                            <DataTable
                                columns={columns}
                                data={locationsForWarehouse}
                                keyExtractor={(r) => r.id}
                                emptyMessage="No hay ubicaciones. Cree una con «Nueva ubicación»."
                                variant="default"
                            />
                        )}
                    </div>
                    <div className="md:hidden px-3 pb-3">
                        {!selectedWarehouseId ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-8">
                                <MapPin className="size-10 text-muted-foreground/60" aria-hidden />
                                <span className="text-muted-foreground text-sm text-center">
                                    Seleccione zonal, oficina y almacén.
                                </span>
                            </div>
                        ) : locationsForWarehouse.length === 0 ? (
                            <div className="py-6">{emptyContent}</div>
                        ) : (
                            <ul className="flex flex-col gap-3">
                                {locationsForWarehouse.map((loc) => (
                                    <li key={loc.id}>
                                        <article className="rounded-lg border border-border bg-card overflow-hidden">
                                            <div className="p-4">
                                                <p className="font-medium text-foreground">{loc.code}</p>
                                                <p className="text-muted-foreground mt-1 text-sm">
                                                    {[loc.aisle, loc.row, loc.bin].filter(Boolean).join(' / ') || '—'}
                                                    <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${loc.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                                        {loc.is_active ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-muted/30 px-4 py-3">
                                                {can.update && (
                                                    <Button type="button" variant="outline" size="sm" className="cursor-pointer border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400" onClick={() => openEdit(loc)}>
                                                        <Pencil className="size-3.5 shrink-0 mr-1" />
                                                        Editar
                                                    </Button>
                                                )}
                                                {can.delete && (
                                                    <Button type="button" variant="outline" size="sm" className="cursor-pointer border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400" onClick={() => setDeleteTarget(loc)}>
                                                        <Trash2 className="size-3.5 shrink-0 mr-1" />
                                                        Eliminar
                                                    </Button>
                                                )}
                                            </div>
                                        </article>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            <WarehouseLocationFormModal
                open={formOpen}
                onOpenChange={closeForm}
                location={editingLocation}
                warehouses={selectedWarehouseId ? warehousesForOffice : warehouses}
                selectedWarehouseId={selectedWarehouseId}
            />
            <DeleteConfirmModal
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title="Eliminar ubicación"
                description={deleteTarget ? `¿Eliminar «${deleteTarget.code}»? Esta acción no se puede deshacer.` : undefined}
                onConfirm={handleDeleteConfirm}
                loading={deleting}
            />
        </AppLayout>
    );
}
