import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { AppModal } from '@/components/app-modal';
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
import { CONDITION_OPTIONS } from '@/constants/conditions';
import type { Asset } from '@/types';

type CategoryOption = { id: string; name: string; code: string };
type SubcategoryOption = { id: string; asset_category_id: string; name: string; code: string | null };
type ModelOption = { id: string; subcategory_id: string; name: string; brand?: { id: string; name: string } | null };
type ZonalOption = { id: string; name: string; code: string };
type OfficeOption = { id: string; zonal_id: string; name: string; code: string | null };
type WarehouseOption = { id: string; name: string; code: string | null; office_id: string; office?: { id: string; zonal_id: string; name: string; code: string | null } };

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    asset: Asset | null;
    categoriesForSelect: CategoryOption[];
    subcategoriesForSelect: SubcategoryOption[];
    modelsForSelect: ModelOption[];
    zonalsForSelect: ZonalOption[];
    officesForSelect: OfficeOption[];
    warehousesForSelect: WarehouseOption[];
};

const STATUS_OPTIONS = [
    { value: 'stored', label: 'Almacenado' },
    { value: 'active', label: 'En uso' },
    { value: 'in_repair', label: 'En reparación' },
    { value: 'in_transit', label: 'En tránsito' },
    { value: 'disposed', label: 'Dado de baja' },
    { value: 'sold', label: 'Vendido' },
];

function toStr(v: number | string | null | undefined): string {
    if (v == null || v === '') return '';
    return String(v);
}

export function AssetFormModal({
    open,
    onOpenChange,
    asset,
    categoriesForSelect,
    subcategoriesForSelect,
    modelsForSelect,
    zonalsForSelect,
    officesForSelect,
    warehousesForSelect,
}: Props) {
    const isEdit = asset != null;
    const [subcategoryId, setSubcategoryId] = useState('');
    const [cascadeZonalId, setCascadeZonalId] = useState('');
    const [cascadeOfficeId, setCascadeOfficeId] = useState('');

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        code: asset?.code ?? '',
        serial_number: asset?.serial_number ?? '',
        model_id: asset?.model_id ?? '',
        category_id: asset?.category_id ?? '',
        status: asset?.status ?? 'stored',
        condition: asset?.condition ?? 'new',
        warehouse_id: asset?.warehouse_id ?? '',
        acquisition_value: toStr(asset?.acquisition_value),
        current_value: toStr(asset?.current_value),
        depreciation_rate: toStr(asset?.depreciation_rate),
        warranty_until: asset?.warranty_until ?? '',
        notes: asset?.notes ?? '',
    });

    const subcategoriesFiltered = useMemo(
        () => (data.category_id ? subcategoriesForSelect.filter((s) => s.asset_category_id === data.category_id) : []),
        [data.category_id, subcategoriesForSelect]
    );

    const modelsFiltered = useMemo(
        () =>
            subcategoryId
                ? modelsForSelect.filter((m) => m.subcategory_id === subcategoryId)
                : [],
        [subcategoryId, modelsForSelect]
    );

    const officesFilteredByZonal = useMemo(
        () =>
            cascadeZonalId
                ? officesForSelect.filter((o) => o.zonal_id === cascadeZonalId)
                : [],
        [cascadeZonalId, officesForSelect]
    );

    const warehousesFilteredByOffice = useMemo(
        () =>
            cascadeOfficeId
                ? warehousesForSelect.filter((w) => w.office_id === cascadeOfficeId)
                : [],
        [cascadeOfficeId, warehousesForSelect]
    );

    useEffect(() => {
        if (!open) {
            clearErrors();
            setSubcategoryId('');
            setCascadeZonalId('');
            setCascadeOfficeId('');
            return;
        }
        const timer = setTimeout(() => {
            document.body.style.pointerEvents = '';
        }, 0);
        return () => {
            clearTimeout(timer);
            document.body.style.pointerEvents = 'auto';
        };
    }, [open, clearErrors]);

    useEffect(() => {
        if (!open) return;
        const modelSubcategoryId = isEdit && asset?.model_id
            ? modelsForSelect.find((m) => m.id === asset.model_id)?.subcategory_id ?? ''
            : '';
        if (asset?.warehouse_id) {
            const wh = warehousesForSelect.find((w) => w.id === asset.warehouse_id);
            if (wh?.office) {
                setCascadeZonalId(wh.office.zonal_id);
                setCascadeOfficeId(wh.office_id);
            } else if (wh?.office_id) {
                setCascadeOfficeId(wh.office_id);
                const off = officesForSelect.find((o) => o.id === wh.office_id);
                if (off) setCascadeZonalId(off.zonal_id);
            }
        } else {
            setCascadeZonalId('');
            setCascadeOfficeId('');
        }
        setData({
            code: asset?.code ?? '',
            serial_number: asset?.serial_number ?? '',
            model_id: asset?.model_id ?? '',
            category_id: asset?.category_id ?? '',
            status: asset?.status ?? 'stored',
            condition: asset?.condition ?? 'new',
            warehouse_id: asset?.warehouse_id ?? '',
            acquisition_value: toStr(asset?.acquisition_value),
            current_value: toStr(asset?.current_value),
            depreciation_rate: toStr(asset?.depreciation_rate),
            warranty_until: asset?.warranty_until ?? '',
            notes: asset?.notes ?? '',
        });
        setSubcategoryId(modelSubcategoryId);
    }, [
        open,
        asset?.id,
        asset?.code,
        asset?.serial_number,
        asset?.model_id,
        asset?.category_id,
        asset?.status,
        asset?.condition,
        asset?.warehouse_id,
        asset?.acquisition_value,
        asset?.current_value,
        asset?.depreciation_rate,
        asset?.warranty_until,
        asset?.notes,
        isEdit,
        modelsForSelect,
        warehousesForSelect,
        officesForSelect,
    ]);

    const handleCategoryChange = (v: string) => {
        const value = v === '_' ? '' : v;
        setData((prev) => ({ ...prev, category_id: value, model_id: '' }));
        setSubcategoryId('');
    };

    const handleSubcategoryChange = (v: string) => {
        const value = v === '_' ? '' : v;
        setSubcategoryId(value);
        setData((prev) => ({ ...prev, model_id: '' }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...data,
            warehouse_id: data.warehouse_id === '' ? null : data.warehouse_id,
            acquisition_value: data.acquisition_value === '' ? null : Number(data.acquisition_value),
            current_value: data.current_value === '' ? null : Number(data.current_value),
            depreciation_rate: data.depreciation_rate === '' ? null : Number(data.depreciation_rate),
            warranty_until: data.warranty_until === '' ? null : data.warranty_until,
        };
        if (isEdit && asset) {
            put(`/admin/assets/${asset.id}`, {
                preserveScroll: true,
                data: payload,
                transform: () => payload,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        } else {
            post('/admin/assets', {
                preserveScroll: true,
                data: payload,
                transform: () => payload,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        }
    };

    const canSubmit = isEdit
        ? data.code.trim() !== '' && data.category_id !== '' && data.warehouse_id !== ''
        : data.category_id !== '' && subcategoryId !== '' && data.warehouse_id !== '';

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Editar activo' : 'Nuevo activo'}
            contentClassName="space-y-4"
            width="wide"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                    {/* Ubicación: Zonal → Oficina → Almacén (obligatorios, primero) */}
                    <div className="space-y-2">
                        <Label>
                            Zonal <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={cascadeZonalId === '' ? '_' : cascadeZonalId}
                            onValueChange={(v) => {
                                const id = v === '_' ? '' : v;
                                setCascadeZonalId(id);
                                setCascadeOfficeId('');
                                setData('warehouse_id', '');
                            }}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue placeholder="Seleccione zonal" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Seleccione zonal</SelectItem>
                                {zonalsForSelect.map((z) => (
                                    <SelectItem key={z.id} value={z.id}>
                                        {z.name} {z.code ? `(${z.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>
                            Oficina <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={cascadeOfficeId === '' ? '_' : cascadeOfficeId}
                            onValueChange={(v) => {
                                const id = v === '_' ? '' : v;
                                setCascadeOfficeId(id);
                                setData('warehouse_id', '');
                            }}
                            disabled={!cascadeZonalId}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue placeholder="Seleccione oficina" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Seleccione oficina</SelectItem>
                                {officesFilteredByZonal.map((o) => (
                                    <SelectItem key={o.id} value={o.id}>
                                        {o.name} {o.code ? `(${o.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>
                            Almacén <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={data.warehouse_id === '' ? '_' : data.warehouse_id}
                            onValueChange={(v) => setData('warehouse_id', v === '_' ? '' : v)}
                            disabled={!cascadeOfficeId}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue placeholder="Seleccione almacén" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Seleccione almacén</SelectItem>
                                {warehousesFilteredByOffice.map((w) => (
                                    <SelectItem key={w.id} value={w.id}>
                                        {w.name} {w.code ? `(${w.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.warehouse_id && (
                            <p className="text-sm text-destructive">{errors.warehouse_id}</p>
                        )}
                    </div>

                    {/* Categoría y subcategoría */}
                    <div className="space-y-2">
                        <Label>
                            Categoría <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={data.category_id === '' ? '_' : data.category_id}
                            onValueChange={handleCategoryChange}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue placeholder="Seleccione categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Seleccione categoría</SelectItem>
                                {categoriesForSelect.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.name} {c.code ? `(${c.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.category_id && (
                            <p className="text-sm text-destructive">{errors.category_id}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>
                            Subcategoría <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={subcategoryId === '' ? '_' : subcategoryId}
                            onValueChange={handleSubcategoryChange}
                            disabled={!data.category_id}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue placeholder="Seleccione subcategoría" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Seleccione subcategoría</SelectItem>
                                {subcategoriesFiltered.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.name} {s.code ? `(${s.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Modelo (opcional)</Label>
                        <Select
                            value={data.model_id === '' ? '_' : data.model_id}
                            onValueChange={(v) => setData('model_id', v === '_' ? '' : v)}
                            disabled={!subcategoryId}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue placeholder="Seleccione modelo (marca - modelo)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Seleccione modelo</SelectItem>
                                {modelsFiltered.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                        {m.brand?.name ? `${m.brand.name} - ${m.name}` : m.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.model_id && (
                            <p className="text-sm text-destructive">{errors.model_id}</p>
                        )}
                    </div>

                    {isEdit && (
                        <div className="space-y-2">
                            <Label>Código</Label>
                            <Input
                                value={data.code}
                                readOnly
                                className="bg-muted border-border"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Número de serie</Label>
                        <Input
                            value={data.serial_number}
                            onChange={(e) => setData('serial_number', e.target.value)}
                            maxLength={200}
                            className={errors.serial_number ? 'border-destructive' : ''}
                            placeholder="Serial del fabricante"
                        />
                        {errors.serial_number && (
                            <p className="text-sm text-destructive">{errors.serial_number}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Estado</Label>
                        <Select
                            value={data.status}
                            onValueChange={(v) => setData('status', v)}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Condición</Label>
                        <Select
                            value={data.condition}
                            onValueChange={(v) => setData('condition', v)}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CONDITION_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Valor adquisición</Label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={data.acquisition_value}
                            onChange={(e) => setData('acquisition_value', e.target.value)}
                            className={errors.acquisition_value ? 'border-destructive' : ''}
                            placeholder="0.00"
                        />
                        {errors.acquisition_value && (
                            <p className="text-sm text-destructive">{errors.acquisition_value}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Valor actual</Label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={data.current_value}
                            onChange={(e) => setData('current_value', e.target.value)}
                            className={errors.current_value ? 'border-destructive' : ''}
                            placeholder="0.00"
                        />
                        {errors.current_value && (
                            <p className="text-sm text-destructive">{errors.current_value}</p>
                        )}
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
                            className={errors.depreciation_rate ? 'border-destructive' : ''}
                            placeholder="20"
                        />
                        {errors.depreciation_rate && (
                            <p className="text-sm text-destructive">{errors.depreciation_rate}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Garantía hasta</Label>
                        <Input
                            type="date"
                            value={data.warranty_until}
                            onChange={(e) => setData('warranty_until', e.target.value)}
                            className={errors.warranty_until ? 'border-destructive' : ''}
                        />
                        {errors.warranty_until && (
                            <p className="text-sm text-destructive">{errors.warranty_until}</p>
                        )}
                    </div>

                    <div className="space-y-2 col-span-3">
                        <Label>Notas</Label>
                        <textarea
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            maxLength={5000}
                            rows={3}
                            className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${errors.notes ? 'border-destructive' : ''}`}
                            placeholder="Notas opcionales"
                        />
                        {errors.notes && (
                            <p className="text-sm text-destructive">{errors.notes}</p>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="cursor-pointer"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={processing || !canSubmit}
                        className="cursor-pointer bg-inv-primary hover:bg-inv-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing
                            ? 'Guardando…'
                            : isEdit
                              ? 'Guardar'
                              : 'Crear activo'}
                    </Button>
                </div>
            </form>
        </AppModal>
    );
}
