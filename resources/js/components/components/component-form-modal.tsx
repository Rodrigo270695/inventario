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
import { COMPONENT_OPER_STATUS_OPTIONS, resolveComponentOperationalStatusForForm } from '@/constants/asset-operational-status';
import { CONDITION_OPTIONS, resolveConditionForForm } from '@/constants/conditions';
import type { AssetCategory, AssetSubcategory, Component } from '@/types';

type TypeOption = { id: string; name: string; code: string | null };
type BrandOption = { id: string; name: string };
type CategoryOption = AssetCategory;
type SubcategoryOption = AssetSubcategory;
type ZonalOption = { id: string; name: string; code: string };
type OfficeOption = { id: string; zonal_id: string; name: string; code: string | null };
type WarehouseOption = {
    id: string;
    name: string;
    code: string | null;
    office_id: string;
    office?: { id: string; zonal_id: string; name: string; code: string | null } | null;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    component: Component | null;
    typesForSelect: TypeOption[];
    brandsForSelect: BrandOption[];
    warehousesForSelect: WarehouseOption[];
    zonalsForSelect: ZonalOption[];
    officesForSelect: OfficeOption[];
    categoriesForSelect: CategoryOption[];
    subcategoriesForSelect: SubcategoryOption[];
};

function toDateInputValue(v: string | null | undefined): string {
    if (v == null || v === '') return '';
    const s = String(v);
    return s.length >= 10 ? s.slice(0, 10) : s;
}

const STATUS_OPTIONS = COMPONENT_OPER_STATUS_OPTIONS;

export function ComponentFormModal({
    open,
    onOpenChange,
    component,
    typesForSelect,
    brandsForSelect,
    warehousesForSelect,
    zonalsForSelect,
    officesForSelect,
    categoriesForSelect,
    subcategoriesForSelect,
}: Props) {
    const isEdit = component != null;
    const [cascadeZonalId, setCascadeZonalId] = useState('');
    const [cascadeOfficeId, setCascadeOfficeId] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [subcategoryId, setSubcategoryId] = useState('');

    const { data, setData, post, put, processing, errors, reset, clearErrors, transform } = useForm({
        serial_number: component?.serial_number ?? '',
        type_id: component?.type_id ?? '',
        brand_id: component?.brand_id ?? '',
        subcategory_id: component?.subcategory_id ?? '',
        model: component?.model ?? '',
        warehouse_id: component?.warehouse_id ?? '',
        status: resolveComponentOperationalStatusForForm(component?.status),
        condition: resolveConditionForForm(component?.condition),
        acquisition_date: toDateInputValue(component?.acquisition_date),
        notes: component?.notes ?? '',
    });

    useEffect(() => {
        if (!open) {
            clearErrors();
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

        let zonalId = '';
        let officeId = '';
        if (component?.warehouse_id) {
            const wh = warehousesForSelect.find((w) => w.id === component.warehouse_id);
            if (wh?.office) {
                zonalId = wh.office.zonal_id;
                officeId = wh.office_id;
            } else if (wh?.office_id) {
                officeId = wh.office_id;
                const off = officesForSelect.find((o) => o.id === wh.office_id);
                if (off) zonalId = off.zonal_id;
            }
        }

        queueMicrotask(() => {
            setCascadeZonalId(zonalId);
            setCascadeOfficeId(officeId);

            const sub = component?.subcategory;
            setCategoryId(sub?.category?.id ?? sub?.asset_category_id ?? '');
            setSubcategoryId(sub?.id ?? component?.subcategory_id ?? '');

            setData({
                serial_number: component?.serial_number ?? '',
                type_id: component?.type_id ?? '',
                brand_id: component?.brand_id ?? '',
                subcategory_id: component?.subcategory_id ?? '',
                model: component?.model ?? '',
                warehouse_id: component?.warehouse_id ?? '',
                status: resolveComponentOperationalStatusForForm(component?.status),
                condition: resolveConditionForForm(component?.condition),
                acquisition_date: toDateInputValue(component?.acquisition_date),
                notes: component?.notes ?? '',
            });
        });
    }, [
        open,
        component?.id,
        component?.serial_number,
        component?.type_id,
        component?.brand_id,
        component?.subcategory_id,
        component?.model,
        component?.warehouse_id,
        component?.status,
        component?.condition,
        component?.acquisition_date,
        component?.notes,
        warehousesForSelect,
        officesForSelect,
        component?.subcategory,
        setData,
    ]);

    const subcategoriesFiltered = useMemo(
        () =>
            categoryId
                ? subcategoriesForSelect.filter((s) => s.asset_category_id === categoryId)
                : [],
        [categoryId, subcategoriesForSelect]
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        transform((formData) => ({
            ...formData,
            brand_id: formData.brand_id === '' ? null : formData.brand_id,
            warehouse_id: formData.warehouse_id === '' ? null : formData.warehouse_id,
            subcategory_id: formData.subcategory_id === '' ? null : formData.subcategory_id,
            acquisition_date: formData.acquisition_date === '' ? null : formData.acquisition_date,
        }));
        if (isEdit && component) {
            put(`/admin/components/${component.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        } else {
            post('/admin/components', {
                preserveScroll: true,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        }
    };

    const canSubmit = data.type_id !== '';

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Editar componente' : 'Nuevo componente'}
            contentClassName="space-y-4"
            width="wide"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Fila 1: Tipo, Marca, Modelo */}
                    <div className="space-y-2">
                        <Label>
                            Tipo <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={data.type_id === '' ? '_' : data.type_id}
                            onValueChange={(v) => setData('type_id', v === '_' ? '' : v)}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue placeholder="Seleccione tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Seleccione tipo</SelectItem>
                                {typesForSelect.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                        {t.name} {t.code ? `(${t.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.type_id && (
                            <p className="text-sm text-destructive">{errors.type_id}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label>Marca</Label>
                        <Select
                            value={data.brand_id === '' ? '_' : data.brand_id}
                            onValueChange={(v) => setData('brand_id', v === '_' ? '' : v)}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">—</SelectItem>
                                {brandsForSelect.map((b) => (
                                    <SelectItem key={b.id} value={b.id}>
                                        {b.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Modelo</Label>
                        <Input
                            value={data.model}
                            onChange={(e) => setData('model', e.target.value)}
                            maxLength={150}
                            className={errors.model ? 'border-destructive' : ''}
                            placeholder="Ej. DDR4 8GB"
                        />
                        {errors.model && (
                            <p className="text-sm text-destructive">{errors.model}</p>
                        )}
                    </div>

                    {/* Fila 2: Nº serie, Categoría, Subcategoría */}
                    <div className="space-y-2">
                        <Label>Nº serie</Label>
                        <Input
                            value={data.serial_number}
                            onChange={(e) => setData('serial_number', e.target.value)}
                            maxLength={200}
                            className={errors.serial_number ? 'border-destructive' : ''}
                            placeholder="Opcional"
                        />
                        {errors.serial_number && (
                            <p className="text-sm text-destructive">{errors.serial_number}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label>Categoría</Label>
                        <Select
                            value={categoryId === '' ? '_' : categoryId}
                            onValueChange={(v) => {
                                const id = v === '_' ? '' : v;
                                setCategoryId(id);
                                setSubcategoryId('');
                                setData('subcategory_id', '');
                            }}
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
                    </div>
                    <div className="space-y-2">
                        <Label>Subcategoría</Label>
                        <Select
                            value={subcategoryId === '' ? '_' : subcategoryId}
                            onValueChange={(v) => {
                                const id = v === '_' ? '' : v;
                                setSubcategoryId(id);
                                setData('subcategory_id', id === '' ? '' : id);
                            }}
                            disabled={!categoryId}
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

                    {/* Fila 3: Zonal, Oficina, Almacén */}
                    <div className="space-y-2">
                        <Label>Zonal</Label>
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
                        <Label>Oficina</Label>
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
                        <Label>Almacén</Label>
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
                        <Label>Fecha de adquisición</Label>
                        <Input
                            type="date"
                            value={data.acquisition_date}
                            onChange={(e) => setData('acquisition_date', e.target.value)}
                            className={errors.acquisition_date ? 'border-destructive' : ''}
                        />
                        {errors.acquisition_date && (
                            <p className="text-sm text-destructive">{errors.acquisition_date}</p>
                        )}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Notas</Label>
                    <textarea
                        value={data.notes}
                        onChange={(e) => setData('notes', e.target.value)}
                        rows={3}
                        maxLength={5000}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                        placeholder="Opcional"
                    />
                    {errors.notes && (
                        <p className="text-sm text-destructive">{errors.notes}</p>
                    )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
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
                        className="cursor-pointer bg-inv-primary hover:bg-inv-primary/90 text-white disabled:opacity-50"
                    >
                        {processing ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear componente'}
                    </Button>
                </div>
            </form>
        </AppModal>
    );
}
