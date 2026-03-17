import { router, useForm } from '@inertiajs/react';
import { Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppModal } from '@/components/app-modal';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type CategoryRef = { id: string; name: string; code: string | null; type?: string | null } | null;
type SubcategoryRef = { id: string; asset_category_id?: string; name: string; code: string | null } | null;
type BrandRef = { id: string; name: string } | null;

type PurchaseOrderItem = {
    id: string;
    description: string;
    quantity: number;
    registered_quantity: number;
    remaining_quantity: number;
    unit_price?: number | null;
    total_price?: number | null;
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
type DraftItem = {
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
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entryId: string;
    poItem: PurchaseOrderItem | null;
    brandsForSelect: BrandOption[];
    subcategoriesForSelect: SubcategoryOption[];
    modelsForSelect: ModelOption[];
    draftItem?: DraftItem | null;
};

const CONDITION_OPTIONS = [
    { value: 'new', label: 'Nuevo' },
    { value: 'good', label: 'Bueno' },
    { value: 'regular', label: 'Regular' },
    { value: 'damaged', label: 'Dañado' },
    { value: 'obsolete', label: 'Obsoleto' },
];

function getUnitValue(poItem: PurchaseOrderItem | null): string {
    if (!poItem) return '';
    if (typeof poItem.unit_price === 'number') return String(poItem.unit_price);
    if (typeof poItem.total_price === 'number' && poItem.quantity > 0) {
        return (poItem.total_price / poItem.quantity).toFixed(2);
    }
    return '';
}

export function RegisterStockEntryItemModal({
    open,
    onOpenChange,
    entryId,
    poItem,
    brandsForSelect,
    subcategoriesForSelect,
    modelsForSelect,
    draftItem = null,
}: Props) {
    const category = poItem?.asset_category ?? poItem?.assetCategory ?? null;
    const fixedSubcategory = poItem?.asset_subcategory ?? poItem?.assetSubcategory ?? null;
    const fixedBrand = poItem?.asset_brand ?? poItem?.assetBrand ?? null;
    const categoryCode = (category?.code ?? '').toUpperCase();
    const defaultIsTechnological = categoryCode.includes('COMP') || fixedBrand != null;
    const [tab, setTab] = useState<'general' | 'details'>('general');
    const [specRows, setSpecRows] = useState<Array<{ key: string; value: string }>>([{ key: '', value: '' }]);
    const defaultUnitValue = useMemo(() => getUnitValue(poItem), [poItem]);
    const isEditing = draftItem != null;

    const { data, setData, processing, errors, reset, clearErrors } = useForm({
        purchase_item_id: poItem?.id ?? '',
        is_technological: draftItem?.is_technological ?? defaultIsTechnological,
        condition: draftItem?.condition ?? 'new',
        serial_number: draftItem?.serial_number ?? '',
        notes: draftItem?.notes ?? '',
        model_id: draftItem?.model_id ?? '',
        brand_id: draftItem?.brand_id ?? '',
        new_brand_name: draftItem?.new_brand_name ?? '',
        model_name: draftItem?.model_name ?? '',
        subcategory_id: draftItem?.subcategory_id ?? fixedSubcategory?.id ?? '',
        warranty_until: draftItem?.warranty_until ?? '',
        acquisition_value: draftItem?.acquisition_value != null ? String(draftItem.acquisition_value) : defaultUnitValue,
        current_value: draftItem?.current_value != null ? String(draftItem.current_value) : defaultUnitValue,
        depreciation_rate: draftItem?.depreciation_rate != null ? String(draftItem.depreciation_rate) : '',
    });

    useEffect(() => {
        if (!open) {
            clearErrors();
            return;
        }
        setTab('general');
        setSpecRows(
            draftItem?.specs && Object.keys(draftItem.specs).length > 0
                ? Object.entries(draftItem.specs).map(([key, value]) => ({ key, value: String(value ?? '') }))
                : [{ key: '', value: '' }]
        );
        setData({
            purchase_item_id: poItem?.id ?? '',
            is_technological: draftItem?.is_technological ?? defaultIsTechnological,
            condition: draftItem?.condition ?? 'new',
            serial_number: draftItem?.serial_number ?? '',
            notes: draftItem?.notes ?? '',
            model_id: draftItem?.model_id ?? '',
            brand_id: draftItem?.brand_id ?? '',
            new_brand_name: draftItem?.new_brand_name ?? '',
            model_name: draftItem?.model_name ?? '',
            subcategory_id: draftItem?.subcategory_id ?? fixedSubcategory?.id ?? '',
            warranty_until: draftItem?.warranty_until ?? '',
            acquisition_value: draftItem?.acquisition_value != null ? String(draftItem.acquisition_value) : defaultUnitValue,
            current_value: draftItem?.current_value != null ? String(draftItem.current_value) : defaultUnitValue,
            depreciation_rate: draftItem?.depreciation_rate != null ? String(draftItem.depreciation_rate) : '',
        });
    }, [open, poItem?.id, fixedSubcategory?.id, defaultUnitValue, defaultIsTechnological, draftItem, clearErrors, setData]);

    const availableSubcategories = useMemo(() => {
        if (!category?.id) return [];
        return subcategoriesForSelect.filter((item) => item.asset_category_id === category.id);
    }, [category?.id, subcategoriesForSelect]);

    const selectedSubcategoryId = data.subcategory_id || fixedSubcategory?.id || '';

    const modelOptions = useMemo(
        () =>
            modelsForSelect
                .filter((item) => item.subcategory_id === selectedSubcategoryId)
                .map((item) => ({
                    value: item.id,
                    label: item.brand?.name ? `${item.brand.name} - ${item.name}` : item.name,
                    searchTerms: [item.name, item.brand?.name ?? ''].filter(Boolean),
                })),
        [modelsForSelect, selectedSubcategoryId]
    );

    const brandOptions = useMemo(
        () =>
            brandsForSelect.map((item) => ({
                value: item.id,
                label: item.name,
                searchTerms: [item.name],
            })),
        [brandsForSelect]
    );

    const canSubmit = useMemo(() => {
        if (!poItem) return false;
        if (!data.is_technological) return true;
        if (!selectedSubcategoryId) return false;
        if (data.model_id !== '') return true;
        const hasBrand = !!fixedBrand?.id || data.brand_id !== '' || data.new_brand_name.trim() !== '';
        return hasBrand && data.model_name.trim() !== '';
    }, [
        poItem,
        data.is_technological,
        selectedSubcategoryId,
        data.model_id,
        data.brand_id,
        data.new_brand_name,
        data.model_name,
        fixedBrand?.id,
    ]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!poItem) return;

        const specs: Record<string, string> = {};
        for (const row of specRows) {
            const key = row.key.trim();
            if (!key) continue;
            specs[key] = row.value.trim();
        }

        const payload = {
            purchase_item_id: poItem.id,
            is_technological: data.is_technological,
            condition: data.condition,
            serial_number: data.serial_number.trim() === '' ? null : data.serial_number.trim(),
            notes: data.notes.trim() === '' ? null : data.notes.trim(),
            model_id: data.is_technological && data.model_id !== '' ? data.model_id : null,
            brand_id: data.is_technological && !fixedBrand?.id && data.brand_id !== '' ? data.brand_id : null,
            new_brand_name: data.is_technological && !fixedBrand?.id && data.new_brand_name.trim() !== '' ? data.new_brand_name.trim() : null,
            model_name: data.is_technological && data.model_name.trim() !== '' ? data.model_name.trim() : null,
            subcategory_id: data.is_technological && selectedSubcategoryId !== '' ? selectedSubcategoryId : null,
            warranty_until: data.warranty_until === '' ? null : data.warranty_until,
            acquisition_value: data.acquisition_value === '' ? null : Number(data.acquisition_value),
            current_value: data.current_value === '' ? null : Number(data.current_value),
            depreciation_rate: data.depreciation_rate === '' ? null : Number(data.depreciation_rate),
            specs,
        };

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        };

        if (isEditing && draftItem) {
            router.put(`/admin/stock-entries/${entryId}/items/${draftItem.id}`, payload, options);
            return;
        }

        router.post(`/admin/stock-entries/${entryId}/items`, payload, options);
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEditing ? 'Editar ítem del borrador' : 'Registrar ítem del ingreso'}
            width="wide"
            contentClassName="space-y-4"
        >
            {!poItem ? null : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                        <p className="text-sm font-medium text-foreground">{poItem.description}</p>
                        <p className="text-xs text-muted-foreground">
                            Pendientes: {poItem.remaining_quantity} de {poItem.quantity}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Categoría: {category?.name ?? category?.code ?? '—'}
                            {fixedSubcategory?.name ? ` · ${fixedSubcategory.name}` : ''}
                            {fixedBrand?.name ? ` · ${fixedBrand.name}` : ''}
                        </p>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-background/40 p-1">
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => setTab('general')}
                                className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition ${
                                    tab === 'general' ? 'bg-inv-primary text-white' : 'text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                General
                            </button>
                            <button
                                type="button"
                                onClick={() => setTab('details')}
                                className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition ${
                                    tab === 'details' ? 'bg-inv-primary text-white' : 'text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                Detalles
                            </button>
                        </div>
                    </div>

                    {tab === 'general' && (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Condición <span className="text-red-500">*</span></Label>
                                <Select value={data.condition} onValueChange={(value) => setData('condition', value)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CONDITION_OPTIONS.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.condition && <p className="text-sm text-destructive">{errors.condition}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label>Número de serie</Label>
                                <Input
                                    value={data.serial_number}
                                    onChange={(e) => setData('serial_number', e.target.value)}
                                    placeholder="Opcional"
                                    maxLength={200}
                                />
                                {errors.serial_number && <p className="text-sm text-destructive">{errors.serial_number}</p>}
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
                                    <Checkbox
                                        id="is_technological"
                                        checked={data.is_technological}
                                        onCheckedChange={(checked) => {
                                            const next = checked === true;
                                            setData('is_technological', next);
                                            if (!next) {
                                                setData('model_id', '');
                                                setData('brand_id', '');
                                                setData('new_brand_name', '');
                                                setData('model_name', '');
                                            }
                                        }}
                                        className="data-[state=checked]:bg-inv-primary data-[state=checked]:border-inv-primary"
                                    />
                                    <Label htmlFor="is_technological" className="cursor-pointer">
                                        Es bien tecnológico
                                    </Label>
                                </div>
                            </div>

                            {data.is_technological && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Subcategoría <span className="text-red-500">*</span></Label>
                                        {fixedSubcategory ? (
                                            <div className="flex h-10 items-center rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
                                                {fixedSubcategory.name}
                                            </div>
                                        ) : (
                                            <Select
                                                value={selectedSubcategoryId === '' ? '_' : selectedSubcategoryId}
                                                onValueChange={(value) => {
                                                    setData('subcategory_id', value === '_' ? '' : value);
                                                    setData('model_id', '');
                                                }}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Seleccione subcategoría" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="_">Seleccione subcategoría</SelectItem>
                                                    {availableSubcategories.map((item) => (
                                                        <SelectItem key={item.id} value={item.id}>
                                                            {item.name} {item.code ? `(${item.code})` : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        {errors.subcategory_id && <p className="text-sm text-destructive">{errors.subcategory_id}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Modelo existente</Label>
                                        <SearchableSelect
                                            value={data.model_id}
                                            onChange={(value) => setData('model_id', value)}
                                            options={modelOptions}
                                            placeholder="Buscar modelo..."
                                            noOptionsMessage="No hay modelos para la subcategoría"
                                        />
                                        {errors.model_id && <p className="text-sm text-destructive">{errors.model_id}</p>}
                                    </div>

                                    {data.model_id === '' && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>Marca</Label>
                                                {fixedBrand ? (
                                                    <div className="flex h-10 items-center rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
                                                        {fixedBrand.name}
                                                    </div>
                                                ) : (
                                                    <SearchableSelect
                                                        value={data.brand_id}
                                                        onChange={(value) => setData('brand_id', value)}
                                                        options={brandOptions}
                                                        placeholder="Buscar marca..."
                                                        noOptionsMessage="No hay marcas"
                                                    />
                                                )}
                                                {errors.brand_id && <p className="text-sm text-destructive">{errors.brand_id}</p>}
                                            </div>

                                            {!fixedBrand && (
                                                <div className="space-y-2">
                                                    <Label>Nueva marca</Label>
                                                    <Input
                                                        value={data.new_brand_name}
                                                        onChange={(e) => setData('new_brand_name', e.target.value)}
                                                        maxLength={100}
                                                        placeholder="Solo si la marca no existe"
                                                    />
                                                    {errors.new_brand_name && <p className="text-sm text-destructive">{errors.new_brand_name}</p>}
                                                </div>
                                            )}

                                            <div className="space-y-2 md:col-span-2">
                                                <Label>Nuevo modelo <span className="text-red-500">*</span></Label>
                                                <Input
                                                    value={data.model_name}
                                                    onChange={(e) => setData('model_name', e.target.value)}
                                                    maxLength={200}
                                                    placeholder="Ej. ThinkPad T14 Gen 5"
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Si el modelo no existe, se creará automáticamente.
                                                </p>
                                                {errors.model_name && <p className="text-sm text-destructive">{errors.model_name}</p>}
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {tab === 'details' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <div className="space-y-2">
                                    <Label>Valor adquisición</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={data.acquisition_value}
                                        onChange={(e) => setData('acquisition_value', e.target.value)}
                                        placeholder="0.00"
                                    />
                                    {errors.acquisition_value && <p className="text-sm text-destructive">{errors.acquisition_value}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Valor actual</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={data.current_value}
                                        onChange={(e) => setData('current_value', e.target.value)}
                                        placeholder="0.00"
                                    />
                                    {errors.current_value && <p className="text-sm text-destructive">{errors.current_value}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Tasa depreciación (%)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={data.depreciation_rate}
                                        onChange={(e) => setData('depreciation_rate', e.target.value)}
                                        placeholder="20"
                                    />
                                    {errors.depreciation_rate && <p className="text-sm text-destructive">{errors.depreciation_rate}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Garantía hasta</Label>
                                    <Input
                                        type="date"
                                        value={data.warranty_until}
                                        onChange={(e) => setData('warranty_until', e.target.value)}
                                    />
                                    {errors.warranty_until && <p className="text-sm text-destructive">{errors.warranty_until}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Notas</Label>
                                <textarea
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    rows={3}
                                    maxLength={5000}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    placeholder="Observaciones del bien recibido"
                                />
                                {errors.notes && <p className="text-sm text-destructive">{errors.notes}</p>}
                            </div>

                            <div className="space-y-3 rounded-xl border border-inv-primary/30 bg-inv-primary/5 p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <h3 className="text-sm font-semibold text-inv-primary">Especificaciones</h3>
                                        <p className="text-xs text-muted-foreground">Agrega detalles clave/valor si los tienes.</p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="cursor-pointer"
                                        onClick={() => setSpecRows((rows) => [...rows, { key: '', value: '' }])}
                                    >
                                        <Plus className="mr-1 size-4" />
                                        Añadir fila
                                    </Button>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2">
                                    {specRows.map((row, index) => (
                                        <div key={index} className="flex items-start gap-2 rounded-lg border border-border/70 bg-background p-3">
                                            <div className="grid flex-1 gap-2">
                                                <Input
                                                    value={row.key}
                                                    onChange={(e) => {
                                                        const next = [...specRows];
                                                        next[index] = { ...next[index], key: e.target.value };
                                                        setSpecRows(next);
                                                    }}
                                                    placeholder="Etiqueta"
                                                />
                                                <Input
                                                    value={row.value}
                                                    onChange={(e) => {
                                                        const next = [...specRows];
                                                        next[index] = { ...next[index], value: e.target.value };
                                                        setSpecRows(next);
                                                    }}
                                                    placeholder="Valor"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (specRows.length <= 1) {
                                                        setSpecRows([{ key: '', value: '' }]);
                                                        return;
                                                    }
                                                    setSpecRows((rows) => rows.filter((_, i) => i !== index));
                                                }}
                                                className="mt-1 inline-flex cursor-pointer rounded-md p-1 text-rose-500 hover:bg-rose-50"
                                                aria-label="Eliminar fila"
                                            >
                                                <X className="size-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing || !canSubmit}
                            className="cursor-pointer bg-inv-primary hover:bg-inv-primary/90 text-white disabled:opacity-50"
                        >
                            {processing ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Agregar al borrador'}
                        </Button>
                    </div>
                </form>
            )}
        </AppModal>
    );
}
