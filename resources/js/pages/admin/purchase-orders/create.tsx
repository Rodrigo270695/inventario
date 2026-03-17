import { Head, Link, router, usePage } from '@inertiajs/react';
import { useCallback, useMemo, useState } from 'react';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Compras y logística', href: '#' },
    { title: 'Órdenes de compra', href: '/admin/purchase-orders' },
    { title: 'Nueva orden', href: '/admin/purchase-orders/create' },
];

type SupplierOption = { id: string; name: string; ruc: string | null };

type CategoryOption = { id: string; name: string; code: string | null; type: string };
type SubcategoryOption = { id: string; name: string; asset_category_id: string };
type BrandOption = { id: string; name: string };

type ZonalOption = { id: string; name: string; code: string };
type OfficeOption = { id: string; zonal_id: string; name: string; code: string | null };

type QuoteRow = {
    description: string;
    file: File | null;
    is_selected: boolean;
};

type CreateProps = {
    suppliers: SupplierOption[];
    assetCategories: CategoryOption[];
    assetSubcategories?: SubcategoryOption[];
    assetBrands?: BrandOption[];
    zonals: ZonalOption[];
    offices: OfficeOption[];
};

const STATUS_OPTIONS = [
    { value: 'draft', label: 'Borrador' },
    { value: 'pending_l2', label: 'Pendiente L2' },
    { value: 'approved', label: 'Aprobada' },
    { value: 'rejected', label: 'Rechazada' },
];

type ItemRow = {
    description: string;
    quantity: number;
    unit_price: string;
    total_price: string;
    category_id: string;
    asset_subcategory_id: string;
    asset_brand_id: string;
};

function parseNum(s: string): number {
    const n = parseFloat(s);
    return Number.isNaN(n) ? 0 : n;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
}

const CATEGORY_TYPE_LABELS: Record<string, string> = {
    technology: 'Tecnología',
    fixed_asset: 'Activo fijo',
    minor_asset: 'Activo menor',
    vehicle: 'Vehículo',
    furniture: 'Mueble',
    building: 'Inmueble',
    machinery: 'Maquinaria',
    other: 'Otro',
    service_maintenance: 'Servicio / mantenimiento',
};

function formatCategoryLabel(category: CategoryOption): string {
    const typeLabel = CATEGORY_TYPE_LABELS[category.type] ?? category.type.replace(/_/g, ' ');
    return `${typeLabel} - ${category.name}`;
}

const inputClass =
    'border-input flex h-9 w-full rounded-xl border bg-background/80 px-3 py-1.5 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary/50 focus-visible:border-inv-primary/40 aria-invalid:border-destructive aria-invalid:ring-destructive/20';

const selectClass =
    'border-input flex h-9 w-full rounded-xl border bg-background/80 px-3 py-1.5 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary/50 focus-visible:border-inv-primary/40';

export default function PurchaseOrderCreate({
    suppliers,
    assetCategories,
    assetSubcategories = [],
    assetBrands = [],
    zonals,
    offices,
}: CreateProps) {
    const { props } = usePage();
    const backendErrors = (props as { errors?: Record<string, string> }).errors ?? {};
    const auth = (props as { auth?: { permissions?: string[] } }).auth;
    const permissions = auth?.permissions ?? [];
    const canSelectQuote = permissions.includes('purchase_quotes.select');
    const [data, setData] = useState({
        supplier_id: '',
        zonal_id: '',
        office_id: '',
        notes: '',
        items: [{
            description: '',
            quantity: 1,
            unit_price: '',
            total_price: '',
            category_id: '',
            asset_subcategory_id: '',
            asset_brand_id: '',
        }] as ItemRow[],
        quotes: [{ description: '', file: null, is_selected: false }] as QuoteRow[],
    });
    const [submitting, setSubmitting] = useState(false);
    const [itemToRemove, setItemToRemove] = useState<number | null>(null);
    const errors = backendErrors;

    const officesForZonal = useMemo(
        () => (data.zonal_id ? offices.filter((o) => o.zonal_id === data.zonal_id) : []),
        [offices, data.zonal_id]
    );

    const supplierSelectOptions = useMemo(
        () =>
            suppliers.map((s) => ({
                value: s.id,
                label: s.ruc ? `${s.name} (${s.ruc})` : s.name,
                searchTerms: [s.ruc].filter(Boolean) as string[],
            })),
        [suppliers]
    );

    const subcategoriesByCategory = useMemo(() => {
        const map = new Map<string, SubcategoryOption[]>();
        for (const s of assetSubcategories) {
            const key = s.asset_category_id;
            if (!key) continue;
            const list = map.get(key) ?? [];
            list.push(s);
            map.set(key, list);
        }
        return map;
    }, [assetSubcategories]);

    const updateItem = useCallback(
        (index: number, field: keyof ItemRow, value: string | number) => {
            setData((prev) => {
                const nextItems = [...prev.items];
                const current = nextItems[index] ?? {
                    description: '',
                    quantity: 1,
                    unit_price: '',
                    total_price: '',
                    category_id: '',
                    asset_subcategory_id: '',
                    asset_brand_id: '',
                };
                const row: ItemRow = { ...current, [field]: value } as ItemRow;
                if (field === 'quantity' || field === 'unit_price') {
                    const qty =
                        field === 'quantity'
                            ? typeof value === 'number'
                                ? value
                                : parseNum(String(value)) || 0
                            : row.quantity;
                    const unit =
                        field === 'unit_price'
                            ? value === ''
                                ? 0
                                : parseNum(String(value))
                            : row.unit_price === ''
                              ? 0
                              : parseNum(row.unit_price);
                    row.quantity = qty;
                    row.total_price = (qty * unit).toFixed(2);
                }
                nextItems[index] = row;
                return { ...prev, items: nextItems };
            });
        },
        []
    );

    const addRow = useCallback(() => {
        setData({
            ...data,
            items: [...data.items, { description: '', quantity: 1, unit_price: '', total_price: '', category_id: '', asset_subcategory_id: '', asset_brand_id: '' }],
        });
    }, [data]);

    const removeRow = useCallback(
        (index: number) => {
            if (data.items.length <= 1) return;
            const next = data.items.filter((_, i) => i !== index);
            setData({ ...data, items: next });
        },
        [data]
    );

    const grandTotal = data.items.reduce((sum, row) => {
        const v = row.total_price === '' ? 0 : parseFloat(row.total_price);
        return sum + (Number.isNaN(v) ? 0 : v);
    }, 0);

    const addQuoteRow = useCallback(() => {
        setData({
            ...data,
            quotes: [...data.quotes, { description: '', file: null, is_selected: false }],
        });
    }, [data]);

    const removeQuoteRow = useCallback(
        (index: number) => {
            if (data.quotes.length <= 1) return;
            const next = data.quotes.filter((_, i) => i !== index);
            setData({ ...data, quotes: next });
        },
        [data]
    );

    const updateQuote = useCallback(
        (index: number, field: keyof QuoteRow, value: string | boolean | File | null) => {
            const next = [...data.quotes];
            let row = { ...next[index] };

            if (field === 'is_selected' && value === true) {
                next.forEach((q, i) => {
                    if (i === index) return;
                    next[i] = { ...q, is_selected: false };
                });
            }

            row = { ...row, [field]: value };
            next[index] = row;
            setData({ ...data, quotes: next });
        },
        [data]
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();

        formData.append('supplier_id', data.supplier_id);
        formData.append('office_id', data.office_id);
        formData.append('status', 'pending');
        formData.append('notes', data.notes || '');

        data.items.forEach((row, index) => {
            formData.append(`items[${index}][description]`, row.description);
            formData.append(
                `items[${index}][quantity]`,
                String(Math.max(1, Number(row.quantity) || 0))
            );
            formData.append(
                `items[${index}][unit_price]`,
                row.unit_price === '' ? '' : String(Number(row.unit_price))
            );
            formData.append(
                `items[${index}][total_price]`,
                row.total_price === '' ? '' : String(Number(row.total_price))
            );
            formData.append(
                `items[${index}][category_id]`,
                row.category_id || ''
            );
            formData.append(
                `items[${index}][asset_subcategory_id]`,
                row.asset_subcategory_id || ''
            );
            formData.append(
                `items[${index}][asset_brand_id]`,
                row.asset_brand_id || ''
            );
        });

        data.quotes.forEach((row, index) => {
            if (row.file) {
                formData.append(`quotes[${index}][pdf]`, row.file);
            }
            formData.append(`quotes[${index}][description]`, row.description);
            formData.append(
                `quotes[${index}][is_selected]`,
                row.is_selected ? '1' : '0'
            );
        });

        setSubmitting(true);
        router.post('/admin/purchase-orders', formData, {
            preserveScroll: true,
            onFinish: () => setSubmitting(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nueva orden de compra" />

            <div className="min-h-[60vh] flex flex-col gap-6 p-4 md:p-6">
                {/* Header estilo configuración */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/purchase-orders"
                            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-inv-surface/20 bg-inv-primary/5 text-inv-primary shadow-sm transition-all hover:border-inv-primary/40 hover:bg-inv-primary/10 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2 dark:border-inv-surface/30 dark:bg-inv-section/20 dark:text-inv-primary dark:hover:bg-inv-section/30"
                            aria-label="Volver al listado"
                        >
                            <ArrowLeft className="size-5" />
                        </Link>
                        <div className="border-l-2 border-inv-primary/30 pl-4">
                            <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                                Nueva orden de compra
                            </h1>
                            <p className="mt-0.5 text-muted-foreground text-xs md:text-sm">
                                Complete los datos del encabezado y añada los ítems.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Contenedor principal con gradiente (estilo configuración) */}
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

                    <form onSubmit={handleSubmit} className="relative flex flex-col gap-0">
                        {/* Sección Encabezado */}
                        <div className="border-b border-inv-primary/50 bg-inv-primary/25 px-4 py-3 md:px-6 dark:bg-inv-section/70 dark:border-inv-surface/60">
                            <h2 className="text-sm font-semibold text-inv-primary dark:text-white">Encabezado</h2>
                        </div>
                        <div className="space-y-5 p-4 md:p-6">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="supplier_id" className="text-xs font-medium sm:text-sm">
                                        Proveedor <span className="text-destructive">*</span>
                                    </Label>
                                    <SearchableSelect
                                        id="supplier_id"
                                        value={data.supplier_id}
                                        onChange={(v) => setData({ ...data, supplier_id: v })}
                                        options={supplierSelectOptions}
                                        placeholder="Buscar proveedor..."
                                        noOptionsMessage="No hay coincidencias"
                                        isClearable={true}
                                        className={`rounded-xl! ${errors.supplier_id ? 'border-destructive!' : ''}`}
                                    />
                                    {errors.supplier_id && (
                                        <p className="text-destructive text-xs">{errors.supplier_id}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="zonal_id" className="text-xs font-medium sm:text-sm">
                                        Zonal <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={data.zonal_id || '_'}
                                        onValueChange={(v) => setData({ ...data, zonal_id: v === '_' ? '' : v, office_id: '' })}
                                    >
                                        <SelectTrigger className={`h-9 w-full rounded-xl ${(errors as Record<string, string>).office_id ? 'border-destructive' : ''}`}>
                                            <SelectValue placeholder="Seleccione zonal" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="_">Seleccione zonal</SelectItem>
                                            {zonals.map((z) => (
                                                <SelectItem key={z.id} value={z.id}>{z.code ? `${z.code} - ${z.name}` : z.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="office_id" className="text-xs font-medium sm:text-sm">
                                        Oficina <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={data.office_id || '_'}
                                        onValueChange={(v) => setData({ ...data, office_id: v === '_' ? '' : v })}
                                        disabled={!data.zonal_id}
                                    >
                                        <SelectTrigger className={`h-9 w-full rounded-xl disabled:opacity-60 ${(errors as Record<string, string>).office_id ? 'border-destructive' : ''}`}>
                                            <SelectValue placeholder="Seleccione oficina" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="_">Seleccione oficina</SelectItem>
                                            {officesForZonal.map((o) => (
                                                <SelectItem key={o.id} value={o.id}>{o.code ? `${o.code} - ${o.name}` : o.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="code" className="text-xs font-medium sm:text-sm">Código OC / OS</Label>
                                    <Input
                                        id="code"
                                        disabled
                                        value=""
                                        readOnly
                                        placeholder="Se genera al guardar"
                                        className={`${inputClass} cursor-not-allowed opacity-70`}
                                        aria-invalid={!!errors.code}
                                    />
                                    {errors.code && <p className="text-destructive text-xs">{errors.code}</p>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="notes" className="text-xs font-medium sm:text-sm">Notas</Label>
                                <textarea
                                    id="notes"
                                    value={data.notes}
                                    onChange={(e) => setData({ ...data, notes: e.target.value })}
                                    rows={3}
                                    className="border-input w-full rounded-xl border bg-background/80 px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary/50 focus-visible:border-inv-primary/40"
                                />
                                {errors.notes && <p className="text-destructive text-xs">{errors.notes}</p>}
                            </div>
                        </div>

                        {/* Sección Ítems */}
                        <div className="border-t border-inv-primary/50 bg-inv-primary/25 px-4 py-3 md:px-6 dark:bg-inv-section/70 dark:border-inv-surface/60">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h2 className="text-sm font-semibold text-inv-primary dark:text-white">Ítems</h2>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="cursor-pointer rounded-xl border-inv-primary/30 text-inv-primary hover:bg-inv-primary/10 dark:border-inv-section/50 dark:hover:bg-inv-section/20"
                                    onClick={addRow}
                                >
                                    <Plus className="size-4 mr-1.5" />
                                    Añadir ítem
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-4 p-4 md:p-6">
                            {/* Vista tabla: pantallas medianas y grandes */}
                            <div className="hidden md:block overflow-x-auto rounded-xl border border-border/70 bg-background/50">
                                <table className="w-full border-collapse text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                            <th className="text-left py-3 pl-4 pr-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Descripción</th>
                                            <th className="text-left w-56 py-3 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Categoría *</th>
                                            <th className="text-left w-44 py-3 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                                                Subcategoría
                                            </th>
                                            <th className="text-left w-44 py-3 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                                                Marca
                                            </th>
                                            <th className="text-right w-24 py-3 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Cant.</th>
                                            <th className="text-right w-32 py-3 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">P. unit.</th>
                                            <th className="text-right w-32 py-3 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Total</th>
                                            <th className="w-12 py-3 pr-2" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.items.map((row, index) => (
                                            <tr key={index} className="border-b border-border/60 last:border-0">
                                                <td className="py-2.5 pl-4 pr-2">
                                                    <Input
                                                        value={row.description}
                                                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                                                        placeholder="Descripción del ítem"
                                                        className={inputClass}
                                                        aria-invalid={!!(errors as Record<string, string>)[`items.${index}.description`]}
                                                    />
                                                    {(errors as Record<string, string>)[`items.${index}.description`] && (
                                                        <p className="text-destructive text-xs mt-0.5">{(errors as Record<string, string>)[`items.${index}.description`]}</p>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-2">
                                                    <Select
                                                        value={row.category_id || '_none_'}
                                                        onValueChange={(v) => {
                                                            const nextCategory = v === '_none_' ? '' : v;
                                                            updateItem(index, 'category_id', nextCategory);
                                                            if (!nextCategory) {
                                                                updateItem(index, 'asset_subcategory_id', '');
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger
                                                            className={`h-9 w-full min-w-0 rounded-xl border-border bg-background/80 shadow-xs ${(errors as Record<string, string>)[`items.${index}.category_id`] ? 'border-destructive' : ''}`}
                                                            aria-label="Categoría del ítem"
                                                        >
                                                            <SelectValue placeholder="Sin categoría" />
                                                        </SelectTrigger>
                                                        <SelectContent align="start" className="rounded-xl">
                                                            <SelectItem value="_none_">Sin categoría</SelectItem>
                                                            {assetCategories.map((c) => (
                                                                <SelectItem key={c.id} value={c.id}>
                                                                    {formatCategoryLabel(c)}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {(errors as Record<string, string>)[`items.${index}.category_id`] && (
                                                        <p className="text-destructive text-xs mt-0.5">{(errors as Record<string, string>)[`items.${index}.category_id`]}</p>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-2">
                                                    <Select
                                                        value={row.asset_subcategory_id || '_none_'}
                                                        onValueChange={(v) =>
                                                            updateItem(
                                                                index,
                                                                'asset_subcategory_id',
                                                                v === '_none_' ? '' : v
                                                            )
                                                        }
                                                        disabled={!row.category_id}
                                                    >
                                                        <SelectTrigger className="h-9 w-full min-w-0 rounded-xl border-border bg-background/80 shadow-xs">
                                                            <SelectValue placeholder="Subcategoría" />
                                                        </SelectTrigger>
                                                        <SelectContent align="start" className="rounded-xl">
                                                            <SelectItem value="_none_">Sin subcategoría</SelectItem>
                                                            {(subcategoriesByCategory.get(row.category_id) ?? []).map((s) => (
                                                                <SelectItem key={s.id} value={s.id}>
                                                                    {s.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="py-2.5 px-2">
                                                    <Select
                                                        value={row.asset_brand_id || '_none_'}
                                                        onValueChange={(v) =>
                                                            updateItem(
                                                                index,
                                                                'asset_brand_id',
                                                                v === '_none_' ? '' : v
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger className="h-9 w-full min-w-0 rounded-xl border-border bg-background/80 shadow-xs">
                                                            <SelectValue placeholder="Marca" />
                                                        </SelectTrigger>
                                                        <SelectContent align="start" className="rounded-xl">
                                                            <SelectItem value="_none_">Sin marca</SelectItem>
                                                            {assetBrands.map((b) => (
                                                                <SelectItem key={b.id} value={b.id}>
                                                                    {b.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="py-2.5 px-2 text-right">
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        value={row.quantity}
                                                        onChange={(e) => updateItem(index, 'quantity', e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
                                                        className={`${inputClass} text-right tabular-nums w-full min-w-0`}
                                                    />
                                                </td>
                                                <td className="py-2.5 px-2 text-right">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        step="0.01"
                                                        value={row.unit_price}
                                                        onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                                                        className={`${inputClass} text-right tabular-nums w-full min-w-0`}
                                                    />
                                                </td>
                                                <td className="py-2.5 px-2 text-right tabular-nums text-muted-foreground text-xs">
                                                    {row.total_price ? formatCurrency(parseFloat(row.total_price)) : '—'}
                                                </td>
                                                <td className="py-2.5 pl-2 pr-4">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="cursor-pointer size-8 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                                                        onClick={() => setItemToRemove(index)}
                                                        disabled={data.items.length <= 1}
                                                        aria-label="Quitar ítem"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Vista tarjetas: pantallas pequeñas (móvil) */}
                            <div className="md:hidden space-y-4">
                                {data.items.map((row, index) => (
                                    <div
                                        key={index}
                                        className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"
                                    >
                                        <div className="mb-3 flex items-center justify-between gap-2">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                Ítem {index + 1}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="cursor-pointer size-8 shrink-0 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                                                onClick={() => setItemToRemove(index)}
                                                disabled={data.items.length <= 1}
                                                aria-label="Quitar ítem"
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground">Descripción</Label>
                                                <Input
                                                    value={row.description}
                                                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                                                    placeholder="Descripción del ítem"
                                                    className={inputClass}
                                                    aria-invalid={!!(errors as Record<string, string>)[`items.${index}.description`]}
                                                />
                                                {(errors as Record<string, string>)[`items.${index}.description`] && (
                                                    <p className="text-destructive text-xs">{(errors as Record<string, string>)[`items.${index}.description`]}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground">Categoría <span className="text-destructive">*</span></Label>
                                                <Select
                                                    value={row.category_id || '_none_'}
                                                    onValueChange={(v) => {
                                                        const nextCategory = v === '_none_' ? '' : v;
                                                        updateItem(index, 'category_id', nextCategory);
                                                        if (!nextCategory) {
                                                            updateItem(index, 'asset_subcategory_id', '');
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger
                                                        className={`h-9 w-full rounded-xl border-border bg-background/80 shadow-xs ${(errors as Record<string, string>)[`items.${index}.category_id`] ? 'border-destructive' : ''}`}
                                                        aria-label="Categoría del ítem"
                                                    >
                                                        <SelectValue placeholder="Sin categoría" />
                                                    </SelectTrigger>
                                                    <SelectContent align="start" className="rounded-xl">
                                                        <SelectItem value="_none_">Sin categoría</SelectItem>
                                                        {assetCategories.map((c) => (
                                                            <SelectItem key={c.id} value={c.id}>
                                                                {formatCategoryLabel(c)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {(errors as Record<string, string>)[`items.${index}.category_id`] && (
                                                    <p className="text-destructive text-xs">{(errors as Record<string, string>)[`items.${index}.category_id`]}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground">Subcategoría</Label>
                                                <Select
                                                    value={row.asset_subcategory_id || '_none_'}
                                                    onValueChange={(v) =>
                                                        updateItem(
                                                            index,
                                                            'asset_subcategory_id',
                                                            v === '_none_' ? '' : v
                                                        )
                                                    }
                                                    disabled={!row.category_id}
                                                >
                                                    <SelectTrigger className="h-9 w-full rounded-xl border-border bg-background/80 shadow-xs">
                                                        <SelectValue placeholder="Subcategoría" />
                                                    </SelectTrigger>
                                                    <SelectContent align="start" className="rounded-xl">
                                                        <SelectItem value="_none_">Sin subcategoría</SelectItem>
                                                        {(subcategoriesByCategory.get(row.category_id) ?? []).map((s) => (
                                                            <SelectItem key={s.id} value={s.id}>
                                                                {s.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground">Marca</Label>
                                                <Select
                                                    value={row.asset_brand_id || '_none_'}
                                                    onValueChange={(v) =>
                                                        updateItem(
                                                            index,
                                                            'asset_brand_id',
                                                            v === '_none_' ? '' : v
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="h-9 w-full rounded-xl border-border bg-background/80 shadow-xs">
                                                        <SelectValue placeholder="Marca" />
                                                    </SelectTrigger>
                                                    <SelectContent align="start" className="rounded-xl">
                                                        <SelectItem value="_none_">Sin marca</SelectItem>
                                                        {assetBrands.map((b) => (
                                                            <SelectItem key={b.id} value={b.id}>
                                                                {b.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-muted-foreground">Cantidad</Label>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        value={row.quantity}
                                                        onChange={(e) => updateItem(index, 'quantity', e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
                                                        className={`${inputClass} text-right tabular-nums`}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-muted-foreground">P. unit.</Label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        step="0.01"
                                                        value={row.unit_price}
                                                        onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                                                        className={`${inputClass} text-right tabular-nums`}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end border-t border-border/50 pt-2">
                                                <span className="text-sm font-medium text-muted-foreground">
                                                    Total: <span className="text-foreground">{row.total_price ? formatCurrency(parseFloat(row.total_price)) : '—'}</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end rounded-xl border border-inv-primary/20 bg-inv-primary/5 px-4 py-3 dark:bg-inv-section/10">
                                <p className="text-sm font-semibold text-foreground">
                                    Total orden: <span className="text-inv-primary">{formatCurrency(grandTotal)}</span>
                                </p>
                            </div>
                            {errors.items && (
                                <p className="text-destructive text-xs">{errors.items}</p>
                            )}
                        </div>

                        {/* Sección Cotizaciones */}
                        <div className="border-t border-inv-primary/50 bg-inv-primary/25 px-4 py-3 md:px-6 dark:bg-inv-section/70 dark:border-inv-surface/60">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h2 className="text-sm font-semibold text-inv-primary dark:text-white">
                                    Cotizaciones (PDF)
                                </h2>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="cursor-pointer rounded-xl border-inv-primary/30 text-inv-primary hover:bg-inv-primary/10 dark:border-inv-section/50 dark:hover:bg-inv-section/20"
                                    onClick={addQuoteRow}
                                >
                                    <Plus className="size-4 mr-1.5" />
                                    Añadir cotización
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-4 p-4 md:p-6">
                            <div className="space-y-3">
                                {data.quotes.map((quote, index) => (
                                    <div
                                        key={index}
                                        className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"
                                    >
                                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                Cotización {index + 1}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {canSelectQuote && (
                                                    <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <input
                                                            type="radio"
                                                            name="selected_quote"
                                                            className="h-3.5 w-3.5 accent-inv-primary"
                                                            checked={quote.is_selected}
                                                            onChange={() =>
                                                                updateQuote(index, 'is_selected', true)
                                                            }
                                                        />
                                                        <span>Elegida</span>
                                                    </label>
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="cursor-pointer size-8 shrink-0 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                                                    onClick={() => removeQuoteRow(index)}
                                                    disabled={data.quotes.length <= 1}
                                                    aria-label="Quitar cotización"
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground">
                                                    Archivo PDF
                                                </Label>
                                                <input
                                                    type="file"
                                                    accept="application/pdf"
                                                    onChange={(e) =>
                                                        updateQuote(
                                                            index,
                                                            'file',
                                                            e.target.files &&
                                                                e.target.files[0]
                                                                ? e.target.files[0]
                                                                : null
                                                        )
                                                    }
                                                    className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-inv-primary/90 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-inv-primary"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground">
                                                    Descripción
                                                </Label>
                                                <Input
                                                    value={quote.description}
                                                    onChange={(e) =>
                                                        updateQuote(
                                                            index,
                                                            'description',
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder='Ej. "Proveedor X", "Opción 1"'
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex flex-wrap justify-end gap-2 border-t border-inv-primary/50 bg-inv-primary/25 px-4 py-4 dark:bg-inv-section/70 dark:border-inv-surface/60 md:px-6">
                            <Link
                                href="/admin/purchase-orders"
                                className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted/50"
                            >
                                Cancelar
                            </Link>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="cursor-pointer rounded-xl bg-inv-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-inv-surface hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ boxShadow: '0 2px 8px rgb(68 119 148 / 0.35)' }}
                            >
                                {submitting ? 'Guardando…' : 'Crear orden'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            <DeleteConfirmModal
                open={itemToRemove !== null}
                onOpenChange={(open) => !open && setItemToRemove(null)}
                title="Eliminar ítem"
                description={
                    itemToRemove !== null && data.items[itemToRemove]
                        ? `¿Eliminar el ítem${data.items[itemToRemove].description ? ` «${data.items[itemToRemove].description}»` : ''} de la orden?`
                        : '¿Eliminar este ítem de la orden?'
                }
                confirmLabel="Eliminar ítem"
                cancelLabel="Cancelar"
                onConfirm={() => {
                    if (itemToRemove !== null) {
                        removeRow(itemToRemove);
                        setItemToRemove(null);
                    }
                }}
            />
        </AppLayout>
    );
}
