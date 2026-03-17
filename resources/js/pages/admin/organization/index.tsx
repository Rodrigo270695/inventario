import { Head, router, usePage } from '@inertiajs/react';
import { Building2, Inbox, MapPin, Plus, Pencil, Trash2, Warehouse } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';
import { RestoreConfirmModal, type RestoreCandidate } from '@/components/restore-confirm-modal';
import { Toast } from '@/components/toast';
import type { ToastMessage } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { OfficeFormModal } from '@/components/organization/office-form-modal';
import { WarehouseFormModal } from '@/components/organization/warehouse-form-modal';
import { ZonalFormModal } from '@/components/organization/zonal-form-modal';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Office, Warehouse as WarehouseType, Zonal } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Panel de control', href: '/dashboard' },
    { title: 'Administración', href: '#' },
    { title: 'Zonales, oficinas y almacenes', href: '/admin/zonals' },
];

type UserOption = { id: string; name: string; last_name: string; document_number: string };

type FlashWithRestore = {
    toast?: ToastMessage;
    restore_candidate?: RestoreCandidate;
    restore_payload?: Record<string, unknown>;
};

type OrganizationIndexProps = {
    zonals: Zonal[];
    offices: Office[];
    warehouses: WarehouseType[];
    users: UserOption[];
    can: {
        create_zonal: boolean;
        update_zonal: boolean;
        delete_zonal: boolean;
        create_office: boolean;
        update_office: boolean;
        delete_office: boolean;
        create_warehouse: boolean;
        update_warehouse: boolean;
        delete_warehouse: boolean;
    };
};

export default function OrganizationIndex({
    zonals,
    offices,
    warehouses,
    users,
    can,
}: OrganizationIndexProps) {
    const [zonalFormOpen, setZonalFormOpen] = useState(false);
    const [editingZonal, setEditingZonal] = useState<Zonal | null>(null);
    const [officeFormOpen, setOfficeFormOpen] = useState(false);
    const [editingOffice, setEditingOffice] = useState<Office | null>(null);
    const [warehouseFormOpen, setWarehouseFormOpen] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState<WarehouseType | null>(null);
    const [selectedZonalId, setSelectedZonalId] = useState<string | null>(null);
    const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'zonal'; item: Zonal } | { type: 'office'; item: Office } | { type: 'warehouse'; item: WarehouseType } | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);

    const { props } = usePage();
    const flash = props.flash as FlashWithRestore | undefined;
    const [toastQueue, setToastQueue] = useState<Array<ToastMessage & { id: number }>>([]);
    const lastFlashToastRef = useRef<ToastMessage | null>(null);
    const [restoreModalOpen, setRestoreModalOpen] = useState(false);
    const [restoring, setRestoring] = useState(false);

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

    useEffect(() => {
        if (flash?.restore_candidate) setRestoreModalOpen(true);
    }, [flash?.restore_candidate]);

    const officesForZonal = selectedZonalId
        ? offices.filter((o) => o.zonal_id === selectedZonalId)
        : [];
    const warehousesForOffice = selectedOfficeId
        ? warehouses.filter((w) => w.office_id === selectedOfficeId)
        : [];

    const openCreateZonal = () => {
        setEditingZonal(null);
        setZonalFormOpen(true);
    };
    const openEditZonal = (z: Zonal) => {
        setEditingZonal(z);
        setZonalFormOpen(true);
    };
    const openCreateOffice = () => {
        setEditingOffice(null);
        setOfficeFormOpen(true);
    };
    const openEditOffice = (o: Office) => {
        setEditingOffice(o);
        setOfficeFormOpen(true);
    };
    const openCreateWarehouse = () => {
        setEditingWarehouse(null);
        setWarehouseFormOpen(true);
    };
    const openEditWarehouse = (w: WarehouseType) => {
        setEditingWarehouse(w);
        setWarehouseFormOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        const url =
            deleteTarget.type === 'zonal'
                ? `/admin/zonals/${deleteTarget.item.id}`
                : deleteTarget.type === 'office'
                  ? `/admin/offices/${deleteTarget.item.id}`
                  : `/admin/warehouses/${deleteTarget.item.id}`;
        router.delete(url, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    const deleteTitle =
        deleteTarget?.type === 'zonal'
            ? 'Eliminar zonal'
            : deleteTarget?.type === 'office'
              ? 'Eliminar oficina'
              : 'Eliminar almacén';
    const deleteDescription =
        deleteTarget
            ? `¿Eliminar «${deleteTarget.type === 'zonal' ? deleteTarget.item.name : deleteTarget.type === 'office' ? deleteTarget.item.name : deleteTarget.item.name}»? Esta acción no se puede deshacer.`
            : undefined;

    const handleRestoreConfirm = () => {
        const candidate = flash?.restore_candidate;
        const payload = flash?.restore_payload as Record<string, unknown> | undefined;
        if (!candidate || !payload) return;
        setRestoring(true);
        const url =
            candidate.type === 'zonal'
                ? '/admin/zonals/restore'
                : candidate.type === 'office'
                  ? '/admin/offices/restore'
                  : '/admin/warehouses/restore';
        router.post(url, { id: candidate.id, ...payload }, {
            preserveScroll: true,
            onFinish: () => setRestoring(false),
            onSuccess: () => setRestoreModalOpen(false),
        });
    };

    const handleRestoreCancel = () => {
        setRestoreModalOpen(false);
        router.get(window.location.pathname, {}, { preserveState: false });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Zonales, oficinas y almacenes" />

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
                    <div>
                        <h1 className="relative inline-block font-semibold text-foreground text-xl tracking-tight pb-1">
                            Zonales, oficinas y almacenes
                            <span className="absolute bottom-0 left-0 h-0.5 w-8 rounded-full bg-inv-primary" aria-hidden />
                        </h1>
                        <p className="mt-1 text-muted-foreground text-sm">
                            Gestión de zonales, oficinas y almacenes.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 dark:bg-blue-500/20 text-gray-600 dark:text-gray-400">
                        <MapPin className="size-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Zonales</span>
                        <span className="font-semibold">{zonals.length}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 dark:bg-violet-500/20 text-gray-600 dark:text-gray-400">
                        <Building2 className="size-3.5 text-violet-600 dark:text-violet-400" />
                        <span>Oficinas</span>
                        <span className="font-semibold">{offices.length}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 dark:bg-emerald-500/20 text-gray-600 dark:text-gray-400">
                        <Warehouse className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Almacenes</span>
                        <span className="font-semibold">{warehouses.length}</span>
                    </span>
                </div>

                <div className="border-t border-border pt-4" />

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {/* Panel Zonales */}
                    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                        <div className="border-b border-border p-3 sm:p-4 flex items-center justify-between gap-2">
                            <h2 className="font-semibold text-foreground text-base">Zonales</h2>
                            {can.create_zonal && (
                                <Button
                                    size="sm"
                                    onClick={openCreateZonal}
                                    className="cursor-pointer shrink-0 bg-inv-primary text-white hover:bg-inv-primary/90"
                                >
                                    <Plus className="size-4" />
                                    Nuevo zonal
                                </Button>
                            )}
                        </div>
                        <div className="p-3 sm:p-4">
                            {zonals.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-8">
                                    <Inbox className="size-10 text-muted-foreground/60" aria-hidden />
                                    <span className="text-muted-foreground text-sm">No hay zonales.</span>
                                    {can.create_zonal && (
                                        <Button size="sm" onClick={openCreateZonal} className="cursor-pointer mt-1 bg-inv-primary hover:bg-inv-primary/90 text-white">
                                            <Plus className="size-4 mr-1" />
                                            Crear primer zonal
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <ul className="flex flex-col gap-0.5 sm:gap-1 max-h-[min(420px,55vh)] overflow-y-auto pr-1">
                                    {zonals.map((z) => (
                                        <li
                                            key={z.id}
                                            role="button"
                                            tabIndex={0}
                                            className={`flex items-center justify-between gap-1.5 sm:gap-2 rounded-md border py-1.5 px-2 sm:py-2 sm:px-2.5 transition-colors shrink-0 cursor-pointer ${
                                                selectedZonalId === z.id
                                                    ? 'border-inv-primary/50 bg-inv-primary/5'
                                                    : 'border-border/50 hover:bg-muted/30'
                                            }`}
                                            onClick={() => {
                                                setSelectedZonalId((prev) => (prev === z.id ? null : z.id));
                                                setSelectedOfficeId(null);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setSelectedZonalId((prev) => (prev === z.id ? null : z.id));
                                                    setSelectedOfficeId(null);
                                                }
                                            }}
                                        >
                                            <div className="flex-1 min-w-0 flex items-center gap-2">
                                                <span className="font-medium text-foreground text-sm truncate">{z.name}</span>
                                                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase ${z.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                                    {z.is_active ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </div>
                                            <div onClick={(e) => e.stopPropagation()} className="flex gap-1">
                                                {can.update_zonal && (
                                                    <Button type="button" variant="ghost" size="icon" className="cursor-pointer size-7 sm:size-8 shrink-0 text-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:text-blue-400/70 dark:hover:bg-blue-900/20 dark:hover:text-blue-300" aria-label={`Editar ${z.name}`} onClick={() => openEditZonal(z)}>
                                                        <Pencil className="size-4" />
                                                    </Button>
                                                )}
                                                {can.delete_zonal && (
                                                    <Button type="button" variant="ghost" size="icon" className="cursor-pointer size-7 sm:size-8 shrink-0 text-red-400 hover:bg-red-50 hover:text-red-600 dark:text-red-400/70 dark:hover:bg-red-900/20 dark:hover:text-red-300" aria-label={`Eliminar ${z.name}`} onClick={() => setDeleteTarget({ type: 'zonal', item: z })}>
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Panel Oficinas */}
                    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                        <div className="border-b border-border p-3 sm:p-4 flex items-center justify-between gap-2">
                            <h2 className="font-semibold text-foreground text-base">
                                Oficinas
                                {selectedZonalId != null && (
                                    <span className="text-muted-foreground font-normal text-sm ml-1">
                                        ({zonals.find((z) => z.id === selectedZonalId)?.name})
                                    </span>
                                )}
                            </h2>
                            {can.create_office && selectedZonalId != null && (
                                <Button size="sm" onClick={openCreateOffice} className="cursor-pointer shrink-0 bg-inv-primary text-white hover:bg-inv-primary/90">
                                    <Plus className="size-4" />
                                    Nueva oficina
                                </Button>
                            )}
                        </div>
                        <div className="p-3 sm:p-4">
                            {selectedZonalId == null ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-8">
                                    <Building2 className="size-10 text-muted-foreground/60" aria-hidden />
                                    <span className="text-muted-foreground text-sm text-center">Seleccione un zonal para ver sus oficinas.</span>
                                </div>
                            ) : officesForZonal.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-8">
                                    <Inbox className="size-10 text-muted-foreground/60" aria-hidden />
                                    <span className="text-muted-foreground text-sm">No hay oficinas en este zonal.</span>
                                    {can.create_office && (
                                        <Button size="sm" onClick={openCreateOffice} className="cursor-pointer mt-1 bg-inv-primary hover:bg-inv-primary/90 text-white">
                                            <Plus className="size-4 mr-1" />
                                            Crear primera oficina
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <ul className="flex flex-col gap-0.5 sm:gap-1 max-h-[min(420px,55vh)] overflow-y-auto pr-1">
                                    {officesForZonal.map((o) => (
                                        <li
                                            key={o.id}
                                            role="button"
                                            tabIndex={0}
                                            className={`flex items-center justify-between gap-1.5 sm:gap-2 rounded-md border py-1.5 px-2 sm:py-2 sm:px-2.5 transition-colors shrink-0 cursor-pointer ${
                                                selectedOfficeId === o.id
                                                    ? 'border-inv-primary/50 bg-inv-primary/5'
                                                    : 'border-border/50 hover:bg-muted/30'
                                            }`}
                                            onClick={() => setSelectedOfficeId((prev) => (prev === o.id ? null : o.id))}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setSelectedOfficeId((prev) => (prev === o.id ? null : o.id));
                                                }
                                            }}
                                        >
                                            <div className="flex-1 min-w-0 flex items-center gap-2">
                                                <span className="font-medium text-foreground text-sm truncate">{o.name}</span>
                                                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase ${o.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                                    {o.is_active ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </div>
                                            <div onClick={(e) => e.stopPropagation()} className="flex gap-1">
                                                {can.update_office && (
                                                    <Button type="button" variant="ghost" size="icon" className="cursor-pointer size-7 sm:size-8 shrink-0 text-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:text-blue-400/70 dark:hover:bg-blue-900/20 dark:hover:text-blue-300" aria-label={`Editar ${o.name}`} onClick={() => openEditOffice(o)}>
                                                        <Pencil className="size-4" />
                                                    </Button>
                                                )}
                                                {can.delete_office && (
                                                    <Button type="button" variant="ghost" size="icon" className="cursor-pointer size-7 sm:size-8 shrink-0 text-red-400 hover:bg-red-50 hover:text-red-600 dark:text-red-400/70 dark:hover:bg-red-900/20 dark:hover:text-red-300" aria-label={`Eliminar ${o.name}`} onClick={() => setDeleteTarget({ type: 'office', item: o })}>
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Panel Almacenes */}
                    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                        <div className="border-b border-border p-3 sm:p-4 flex items-center justify-between gap-2">
                            <h2 className="font-semibold text-foreground text-base">
                                Almacenes
                                {selectedOfficeId != null && (
                                    <span className="text-muted-foreground font-normal text-sm ml-1">
                                        ({offices.find((o) => o.id === selectedOfficeId)?.name})
                                    </span>
                                )}
                            </h2>
                            {can.create_warehouse && selectedOfficeId != null && (
                                <Button size="sm" onClick={openCreateWarehouse} className="cursor-pointer shrink-0 bg-inv-primary text-white hover:bg-inv-primary/90">
                                    <Plus className="size-4" />
                                    Nuevo almacén
                                </Button>
                            )}
                        </div>
                        <div className="p-3 sm:p-4">
                            {selectedZonalId == null ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-8">
                                    <Warehouse className="size-10 text-muted-foreground/60" aria-hidden />
                                    <span className="text-muted-foreground text-sm text-center">Seleccione un zonal para ver sus oficinas.</span>
                                </div>
                            ) : selectedOfficeId == null ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-8">
                                    <Warehouse className="size-10 text-muted-foreground/60" aria-hidden />
                                    <span className="text-muted-foreground text-sm text-center">Seleccione una oficina para ver sus almacenes.</span>
                                </div>
                            ) : warehousesForOffice.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-8">
                                    <Inbox className="size-10 text-muted-foreground/60" aria-hidden />
                                    <span className="text-muted-foreground text-sm">No hay almacenes en esta oficina.</span>
                                    {can.create_warehouse && (
                                        <Button size="sm" onClick={openCreateWarehouse} className="cursor-pointer mt-1 bg-inv-primary hover:bg-inv-primary/90 text-white">
                                            <Plus className="size-4 mr-1" />
                                            Crear primer almacén
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <ul className="flex flex-col gap-0.5 sm:gap-1 max-h-[min(420px,55vh)] overflow-y-auto pr-1">
                                    {warehousesForOffice.map((w) => (
                                        <li key={w.id} className="flex items-center justify-between gap-1.5 sm:gap-2 rounded-md border border-border/50 py-1.5 px-2 sm:py-2 sm:px-2.5 hover:bg-muted/30 transition-colors shrink-0">
                                            <div className="flex-1 min-w-0 flex items-center gap-2">
                                                <span className="font-medium text-foreground text-sm truncate">{w.name}</span>
                                                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase ${w.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                                    {w.is_active ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </div>
                                            <div className="flex gap-1">
                                                {can.update_warehouse && (
                                                    <Button type="button" variant="ghost" size="icon" className="cursor-pointer size-7 sm:size-8 shrink-0 text-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:text-blue-400/70 dark:hover:bg-blue-900/20 dark:hover:text-blue-300" aria-label={`Editar ${w.name}`} onClick={() => openEditWarehouse(w)}>
                                                        <Pencil className="size-4" />
                                                    </Button>
                                                )}
                                                {can.delete_warehouse && (
                                                    <Button type="button" variant="ghost" size="icon" className="cursor-pointer size-7 sm:size-8 shrink-0 text-red-400 hover:bg-red-50 hover:text-red-600 dark:text-red-400/70 dark:hover:bg-red-900/20 dark:hover:text-red-300" aria-label={`Eliminar ${w.name}`} onClick={() => setDeleteTarget({ type: 'warehouse', item: w })}>
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ZonalFormModal
                open={zonalFormOpen}
                onOpenChange={(open) => {
                    setZonalFormOpen(open);
                    if (!open) setEditingZonal(null);
                }}
                zonal={editingZonal}
                users={users}
            />
            <OfficeFormModal
                open={officeFormOpen}
                onOpenChange={(open) => {
                    setOfficeFormOpen(open);
                    if (!open) setEditingOffice(null);
                }}
                office={editingOffice}
                zonals={zonals}
                selectedZonalId={selectedZonalId}
            />
            <WarehouseFormModal
                open={warehouseFormOpen}
                onOpenChange={(open) => {
                    setWarehouseFormOpen(open);
                    if (!open) setEditingWarehouse(null);
                }}
                warehouse={editingWarehouse}
                offices={offices}
                users={users}
                selectedOfficeId={selectedOfficeId}
            />
            <DeleteConfirmModal
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title={deleteTitle}
                description={deleteDescription}
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
