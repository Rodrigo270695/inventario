import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, PackagePlus, Pencil, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';
import { RegisterStockEntryItemModal } from '@/components/stock-entries/register-stock-entry-item-modal';
import { Toast } from '@/components/toast';
import type { ToastMessage } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { BreadcrumbItem, StockEntry } from '@/types';

const breadcrumbs = (id: string): BreadcrumbItem[] => [
    { title: 'Compras y logística', href: '#' },
    { title: 'Ingresos almacén', href: '/admin/stock-entries' },
    { title: 'Ítems de ingreso', href: `/admin/stock-entries/${id}/items` },
];

const STATUS_LABELS: Record<string, string> = {
    draft: 'Borrador',
    completed: 'Completado',
};

const STATUS_CLASS: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
};

const CONDITION_OPTIONS = [
    { value: 'new', label: 'Nuevo' },
    { value: 'good', label: 'Bueno' },
    { value: 'regular', label: 'Regular' },
    { value: 'damaged', label: 'Dañado' },
    { value: 'obsolete', label: 'Obsoleto' },
];

function formatDate(s: string | null | undefined): string {
    if (!s) return '—';
    return new Date(s).toLocaleDateString('es', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function warehousePath(entry: StockEntry): string {
    const wh = entry.warehouse;
    if (!wh) return '—';
    const parts = [
        wh.office?.zonal?.name ?? wh.office?.zonal?.code ?? null,
        wh.office?.name ?? wh.office?.code ?? null,
        wh.name ?? wh.code ?? null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' / ') : (wh.name ?? '—');
}

function fullName(u: StockEntry['received_by_user']): string {
    if (!u) return '—';
    return [u.name, u.last_name].filter(Boolean).join(' ') || u.usuario || '—';
}

type CategoryRef = { id: string; name: string; code: string | null } | null;
type SubcategoryRef = { id: string; asset_category_id?: string; name: string; code: string | null } | null;
type BrandRef = { id: string; name: string } | null;

type StockEntryItemRow = {
    id: string | number;
    stock_entry_id: string;
    purchase_item_id: string | null;
    asset_id?: string | null;
    component_id?: string | null;
    quantity: number;
    condition: string;
    is_draft?: boolean;
    draft_payload?: {
        id: string;
        is_technological?: boolean;
        condition: string;
        serial_number?: string | null;
        notes?: string | null;
        model_id?: string | null;
        brand_id?: string | null;
        new_brand_name?: string | null;
        model_name?: string | null;
        subcategory_id?: string | null;
        warranty_until?: string | null;
        acquisition_value?: number | string | null;
        current_value?: number | string | null;
        depreciation_rate?: number | string | null;
        specs?: Record<string, string> | null;
    } | null;
    purchase_item?: {
        id: string;
        description: string;
        quantity: number;
        asset_category?: CategoryRef;
        assetCategory?: CategoryRef;
        asset_subcategory?: SubcategoryRef;
        assetSubcategory?: SubcategoryRef;
        asset_brand?: BrandRef;
        assetBrand?: BrandRef;
    } | null;
    purchaseItem?: {
        id: string;
        description: string;
        quantity: number;
        asset_category?: CategoryRef;
        assetCategory?: CategoryRef;
        asset_subcategory?: SubcategoryRef;
        assetSubcategory?: SubcategoryRef;
        asset_brand?: BrandRef;
        assetBrand?: BrandRef;
    } | null;
    asset?: {
        id: string;
        code: string;
        serial_number?: string | null;
        category?: CategoryRef;
        model?: { id: string; name: string; brand?: { id: string; name: string } | null } | null;
    } | null;
    component?: {
        id: string;
        code: string;
        serial_number?: string | null;
        model?: string | null;
        type?: { id: string; name: string; code: string | null } | null;
        brand?: BrandRef;
    } | null;
};

type PurchaseOrderItem = {
    id: string;
    purchase_order_id: string;
    description: string;
    quantity: number;
    unit_price?: number | null;
    total_price?: number | null;
    asset_category_id?: string | null;
    asset_subcategory_id?: string | null;
    asset_brand_id?: string | null;
    registered_quantity: number;
    remaining_quantity: number;
    asset_category?: CategoryRef;
    assetCategory?: CategoryRef;
    asset_subcategory?: SubcategoryRef;
    assetSubcategory?: SubcategoryRef;
    asset_brand?: BrandRef;
    assetBrand?: BrandRef;
};

type BrandOption = { id: string; name: string };
type SubcategoryOption = { id: string; asset_category_id: string; name: string; code: string | null };
type ModelOption = { id: string; subcategory_id: string; name: string; brand?: { id: string; name: string } | null };

type ItemsPageProps = {
    stockEntry: StockEntry & { items?: StockEntryItemRow[] };
    purchaseOrderItems: PurchaseOrderItem[];
    brandsForSelect: BrandOption[];
    subcategoriesForSelect: SubcategoryOption[];
    modelsForSelect: ModelOption[];
    canItemCreate: boolean;
    canItemUpdate: boolean;
    canItemDelete: boolean;
    canSave: boolean;
};

export default function StockEntryItemsPage({
    stockEntry,
    purchaseOrderItems,
    brandsForSelect,
    subcategoriesForSelect,
    modelsForSelect,
    canItemCreate,
    canItemUpdate,
    canItemDelete,
    canSave,
}: ItemsPageProps) {
    const entry = stockEntry;
    const items = entry.items ?? [];
    const isDraft = entry.status === 'draft';
    const canAddFromOC = isDraft && canItemCreate && purchaseOrderItems.length > 0;

    const { props } = usePage();
    const flash = props.flash as { toast?: ToastMessage } | undefined;
    const [toastQueue, setToastQueue] = useState<Array<(ToastMessage & { id: number })>>([]);
    const lastFlashToastRef = useRef<ToastMessage | null>(null);

    useEffect(() => {
        const t = flash?.toast;
        if (!t) return;
        if (t === lastFlashToastRef.current) return;
        lastFlashToastRef.current = t;
        setToastQueue((q) => [...q, { ...t, id: Date.now() }]);
    }, [flash?.toast]);

    const removeToast = useCallback((id: number) => {
        setToastQueue((q) => q.filter((item) => item.id !== id));
    }, []);

    const [itemToDelete, setItemToDelete] = useState<StockEntryItemRow | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [poItemToRegister, setPoItemToRegister] = useState<PurchaseOrderItem | null>(null);
    const [draftItemToEdit, setDraftItemToEdit] = useState<StockEntryItemRow | null>(null);
    const [savingDraft, setSavingDraft] = useState(false);

    const handleDeleteConfirm = useCallback(() => {
        if (!itemToDelete) return;
        setDeleting(true);
        router.delete(`/admin/stock-entries/${entry.id}/items/${itemToDelete.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setItemToDelete(null);
            },
        });
    }, [entry.id, itemToDelete]);

    const handleSaveDraft = useCallback(() => {
        setSavingDraft(true);
        router.post(`/admin/stock-entries/${entry.id}/save`, {}, {
            preserveScroll: true,
            onFinish: () => setSavingDraft(false),
        });
    }, [entry.id]);

    return (
        <AppLayout breadcrumbs={breadcrumbs(entry.id)}>
            <Head title={`Ítems — Ingreso ${formatDate(entry.entry_date)}`} />

            <div className="min-h-[60vh] flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/stock-entries"
                            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-inv-surface/20 bg-inv-primary/5 text-inv-primary shadow-sm transition-all hover:border-inv-primary/40 hover:bg-inv-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2"
                            aria-label="Volver al listado"
                        >
                            <ArrowLeft className="size-5" />
                        </Link>
                        <div className="border-l-2 border-inv-primary/30 pl-4">
                            <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                                Ítems del ingreso — {formatDate(entry.entry_date)}
                            </h1>
                            <p className="mt-0.5 text-muted-foreground text-xs md:text-sm">
                                {warehousePath(entry)}
                            </p>
                        </div>
                    </div>
                    {isDraft && canSave && (
                        <Button
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={savingDraft || items.length === 0}
                            className="cursor-pointer bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            <Save className="mr-2 size-4" />
                            {savingDraft ? 'Guardando…' : 'Guardar ingreso'}
                        </Button>
                    )}
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
                    <div className="border-b border-inv-primary/50 bg-inv-primary/25 px-4 py-3 md:px-6 dark:bg-inv-section/70 dark:border-inv-surface/60">
                        <h2 className="text-sm font-semibold text-inv-primary dark:text-white">Encabezado</h2>
                    </div>
                    <div className="space-y-5 p-4 md:p-6">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <p className="text-muted-foreground text-xs font-medium">Zonal / Oficina / Almacén</p>
                                <p className="text-foreground text-sm">{warehousePath(entry)}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs font-medium">Fecha de ingreso</p>
                                <p className="text-foreground text-sm">{formatDate(entry.entry_date)}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs font-medium">Estado</p>
                                <span
                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[entry.status] ?? 'bg-muted text-muted-foreground'}`}
                                >
                                    {STATUS_LABELS[entry.status] ?? entry.status}
                                </span>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs font-medium">Factura</p>
                                <p className="text-foreground text-sm">
                                    {entry.invoice
                                        ? `${entry.invoice.invoice_number}${entry.invoice.purchase_order?.code ? ` (OC #${entry.invoice.purchase_order.code})` : ''}`
                                        : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs font-medium">Recibido por</p>
                                <p className="text-foreground text-sm">{fullName(entry.received_by_user)}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs font-medium">Registrado por</p>
                                <p className="text-foreground text-sm">{fullName(entry.registered_by_user)}</p>
                            </div>
                        </div>
                        {entry.notes && (
                            <div>
                                <p className="text-muted-foreground text-xs font-medium">Notas</p>
                                <p className="text-foreground text-sm whitespace-pre-wrap">{entry.notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                {canAddFromOC && (
                    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
                        <div className="border-b border-inv-surface/60 bg-inv-surface/25 px-4 py-3 md:px-6 dark:bg-inv-section/60 dark:border-inv-section/80">
                            <h2 className="text-sm font-semibold text-inv-primary dark:text-white flex items-center gap-2">
                                <PackagePlus className="size-4" />
                                Agregar desde orden de compra
                            </h2>
                            <p className="text-muted-foreground text-xs mt-1">
                                Esta factura está vinculada a una OC. La cantidad es la de la OC y no se puede modificar.
                            </p>
                        </div>
                        <div className="p-4 md:p-6">
                            <ul className="space-y-4">
                                {purchaseOrderItems.map((poItem) => (
                                    <AddItemRow
                                        key={poItem.id}
                                        poItem={poItem}
                                        onRegister={() => setPoItemToRegister(poItem)}
                                    />
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
                    <div className="border-b border-inv-primary/50 bg-inv-primary/25 px-4 py-3 md:px-6 dark:bg-inv-section/70 dark:border-inv-surface/60">
                        <h2 className="text-sm font-semibold text-inv-primary dark:text-white">
                            {isDraft ? 'Ítems del borrador' : 'Ítems registrados'}
                        </h2>
                        <p className="text-muted-foreground text-xs mt-1">
                            {items.length === 0
                                ? 'Agrega ítems desde la orden de compra (si la factura tiene OC con ítems).'
                                : `${items.length} ítem(s)`}
                        </p>
                    </div>
                    <div className="p-4 md:p-0">
                        {items.length === 0 ? (
                            <p className="py-6 text-center text-muted-foreground text-sm">No hay ítems en este ingreso.</p>
                        ) : (
                            <>
                                {/* Tabla: pantallas medianas y grandes */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border bg-muted/30">
                                                <th className="text-left font-medium text-foreground px-4 py-3">Descripción</th>
                                                <th className="text-left font-medium text-foreground px-4 py-3 w-36">Categoría</th>
                                                <th className="text-right font-medium text-foreground px-4 py-3 w-24">Cantidad</th>
                                                <th className="text-left font-medium text-foreground px-4 py-3 w-28">Condición</th>
                                                {isDraft && (canItemUpdate || canItemDelete) && (
                                                    <th className="w-24 px-4 py-3" aria-label="Acciones" />
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item) => {
                                                const pi = item.purchase_item ?? item.purchaseItem;
                                                const cat = pi?.asset_category ?? pi?.assetCategory;
                                                return (
                                                    <tr key={item.id} className="border-b border-border/60 hover:bg-muted/20">
                                                        <td className="px-4 py-3 text-foreground">
                                                            <div className="space-y-1">
                                                                <p>{pi?.description ?? 'Ítem manual'}</p>
                                                                {item.is_draft && (
                                                                    <p className="text-xs text-amber-700 dark:text-amber-300">
                                                                        Pendiente de guardar en base de datos
                                                                    </p>
                                                                )}
                                                                {item.asset && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Activo: {item.asset.code}
                                                                        {item.asset.model?.brand?.name || item.asset.model?.name
                                                                            ? ` · ${[item.asset.model?.brand?.name, item.asset.model?.name].filter(Boolean).join(' - ')}`
                                                                            : ''}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-muted-foreground">
                                                            {cat?.name ?? cat?.code ?? '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-medium">{item.quantity}</td>
                                                        <td className="px-4 py-3">
                                                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                                                                {CONDITION_OPTIONS.find((o) => o.value === item.condition)?.label ?? item.condition}
                                                            </span>
                                                        </td>
                                                        {isDraft && (canItemUpdate || canItemDelete) && item.is_draft && (
                                                            <td className="px-4 py-2">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    {canItemUpdate && (
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="size-8 cursor-pointer text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                                                            aria-label="Editar ítem"
                                                                            onClick={() => {
                                                                                setDraftItemToEdit(item);
                                                                                const pi = item.purchase_item ?? item.purchaseItem;
                                                                                if (pi) setPoItemToRegister(pi as PurchaseOrderItem);
                                                                            }}
                                                                        >
                                                                            <Pencil className="size-4" />
                                                                        </Button>
                                                                    )}
                                                                    {canItemDelete && (
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="size-8 cursor-pointer text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                                                                            aria-label="Eliminar ítem"
                                                                            onClick={() => setItemToDelete(item)}
                                                                        >
                                                                            <Trash2 className="size-4" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Cards: pantallas pequeñas */}
                                <ul className="md:hidden flex flex-col gap-3">
                                    {items.map((item) => {
                                        const pi = item.purchase_item ?? item.purchaseItem;
                                        const cat = pi?.asset_category ?? pi?.assetCategory;
                                        return (
                                            <li
                                                key={item.id}
                                                className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden"
                                            >
                                                <div className="p-4 space-y-2">
                                                    <p className="font-medium text-foreground text-sm">
                                                        {pi?.description ?? 'Ítem manual'}
                                                    </p>
                                                    {item.is_draft && (
                                                        <p className="text-xs text-amber-700 dark:text-amber-300">
                                                            Pendiente de guardar en base de datos
                                                        </p>
                                                    )}
                                                    {item.asset && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Activo: {item.asset.code}
                                                        </p>
                                                    )}
                                                    {item.component && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Componente: {item.component.code}
                                                        </p>
                                                    )}
                                                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                                                        <dt className="text-muted-foreground">Categoría</dt>
                                                        <dd className="text-foreground">{cat?.name ?? cat?.code ?? '—'}</dd>
                                                        <dt className="text-muted-foreground">Cantidad</dt>
                                                        <dd className="text-foreground font-medium">{item.quantity}</dd>
                                                        <dt className="text-muted-foreground">Condición</dt>
                                                        <dd>
                                                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                                                                {CONDITION_OPTIONS.find((o) => o.value === item.condition)?.label ?? item.condition}
                                                            </span>
                                                        </dd>
                                                    </dl>
                                                </div>
                                                {isDraft && (canItemUpdate || canItemDelete) && item.is_draft && (
                                                    <div className="border-t border-border/60 px-4 py-2 flex justify-end bg-muted/20">
                                                        <div className="flex gap-2">
                                                            {canItemUpdate && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="cursor-pointer text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                                                    onClick={() => {
                                                                        setDraftItemToEdit(item);
                                                                        const pi = item.purchase_item ?? item.purchaseItem;
                                                                        if (pi) setPoItemToRegister(pi as PurchaseOrderItem);
                                                                    }}
                                                                >
                                                                    <Pencil className="size-4 mr-1" />
                                                                    Editar
                                                                </Button>
                                                            )}
                                                            {canItemDelete && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="cursor-pointer text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                                                                    aria-label="Eliminar ítem"
                                                                    onClick={() => setItemToDelete(item)}
                                                                >
                                                                    <Trash2 className="size-4 mr-1" />
                                                                    Eliminar
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <DeleteConfirmModal
                open={!!itemToDelete}
                onOpenChange={(open) => !open && setItemToDelete(null)}
                title="Eliminar ítem del ingreso"
                description={
                    itemToDelete
                        ? `¿Eliminar «${(itemToDelete.purchase_item ?? itemToDelete.purchaseItem)?.description ?? 'Ítem manual'}» del ingreso?`
                        : undefined
                }
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={handleDeleteConfirm}
                loading={deleting}
            />

            <RegisterStockEntryItemModal
                open={!!poItemToRegister}
                onOpenChange={(open) => {
                    if (!open) {
                        setPoItemToRegister(null);
                        setDraftItemToEdit(null);
                    }
                }}
                entryId={entry.id}
                poItem={poItemToRegister}
                brandsForSelect={brandsForSelect}
                subcategoriesForSelect={subcategoriesForSelect}
                modelsForSelect={modelsForSelect}
                draftItem={draftItemToEdit?.draft_payload ?? null}
            />

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

function AddItemRow({
    poItem,
    onRegister,
}: {
    poItem: PurchaseOrderItem;
    onRegister: () => void;
}) {
    const category = poItem.asset_category ?? poItem.assetCategory;
    const subcategory = poItem.asset_subcategory ?? poItem.assetSubcategory;
    const brand = poItem.asset_brand ?? poItem.assetBrand;

    return (
        <li className="flex flex-wrap items-end gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 sm:flex-nowrap">
            <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground text-sm">{poItem.description}</p>
                <p className="text-muted-foreground text-xs">
                    Categoría: {category?.name ?? category?.code ?? '—'}
                    {subcategory?.name ? ` · ${subcategory.name}` : ''}
                    {brand?.name ? ` · ${brand.name}` : ''}
                </p>
                <p className="text-muted-foreground text-xs">
                    OC: {poItem.quantity} · Registrados: {poItem.registered_quantity} · Pendientes: {poItem.remaining_quantity}
                </p>
            </div>
            <div className="flex flex-wrap items-end gap-3 sm:flex-nowrap">
                <Button
                    type="button"
                    onClick={onRegister}
                    className="cursor-pointer bg-inv-primary hover:bg-inv-primary/90 text-white shrink-0"
                >
                    Agregar 1 unidad
                </Button>
            </div>
        </li>
    );
}
