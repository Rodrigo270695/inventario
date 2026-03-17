import { useForm } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
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
import type { AssetBrand, AssetModel, AssetSubcategory } from '@/types/asset-catalog';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    model: AssetModel | null;
    subcategories: AssetSubcategory[];
    brands: AssetBrand[];
    defaultSubcategoryId?: string | null;
    defaultBrandId?: string | null;
};

export function ModelFormModal({
    open,
    onOpenChange,
    model,
    subcategories,
    brands,
    defaultSubcategoryId,
    defaultBrandId,
}: Props) {
    const isEdit = model != null;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        brand_id: model?.brand_id ?? defaultBrandId ?? '',
        subcategory_id: model?.subcategory_id ?? defaultSubcategoryId ?? '',
        name: model?.name ?? '',
        is_active: model?.is_active ?? true,
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
        setData({
            brand_id: model?.brand_id ?? defaultBrandId ?? '',
            subcategory_id: model?.subcategory_id ?? defaultSubcategoryId ?? '',
            name: model?.name ?? '',
            is_active: model?.is_active ?? true,
        });
    }, [open, model?.id, model?.brand_id, model?.subcategory_id, model?.name, model?.is_active, defaultSubcategoryId, defaultBrandId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...data };
        if (isEdit && model) {
            put(`/admin/asset-catalog/models/${model.id}`, {
                preserveScroll: true,
                data: payload,
                transform: () => payload,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        } else {
            post('/admin/asset-catalog/models', {
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

    const canSubmit = data.name.trim() !== '' && data.subcategory_id !== '' && data.brand_id !== '';

    // Solo subcategorías activas en la selección; al editar, incluir la actual si está inactiva para no perder la selección
    const subcategoriesForSelect = useMemo(() => {
        const active = subcategories.filter((s) => s.is_active);
        if (model?.subcategory_id) {
            const current = subcategories.find((s) => s.id === model.subcategory_id);
            if (current && !current.is_active && !active.some((s) => s.id === current.id)) {
                return [...active, current];
            }
        }
        return active;
    }, [subcategories, model?.subcategory_id]);

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Editar modelo' : 'Nuevo modelo'}
            contentClassName="space-y-4"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label>Subcategoría <span className="text-red-500">*</span></Label>
                    <Select value={data.subcategory_id || '_'} onValueChange={(v) => setData('subcategory_id', v === '_' ? '' : v)}>
                        <SelectTrigger className="w-full border-border bg-background">
                            <SelectValue placeholder="Seleccione subcategoría" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_">Seleccione subcategoría</SelectItem>
                            {subcategoriesForSelect.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                    {s.asset_category ? ` (${s.asset_category.name})` : ''}
                                    {!s.is_active && ' (inactiva)'}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.subcategory_id && <p className="text-sm text-destructive">{errors.subcategory_id}</p>}
                </div>
                <div className="space-y-2">
                    <Label>Marca <span className="text-red-500">*</span></Label>
                    <Select value={data.brand_id || '_'} onValueChange={(v) => setData('brand_id', v === '_' ? '' : v)}>
                        <SelectTrigger className="w-full border-border bg-background">
                            <SelectValue placeholder="Seleccione marca" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_">Seleccione marca</SelectItem>
                            {brands.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                    {b.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.brand_id && <p className="text-sm text-destructive">{errors.brand_id}</p>}
                </div>
                <div className="space-y-2">
                    <Label>Nombre <span className="text-red-500">*</span></Label>
                    <Input
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value.toUpperCase())}
                        maxLength={200}
                        className={errors.name ? 'border-destructive' : ''}
                        placeholder="ej. ProBook 450 G8"
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setData('is_active', !data.is_active)}>
                    <input
                        type="checkbox"
                        id="model-is_active"
                        checked={data.is_active}
                        onChange={(e) => setData('is_active', e.target.checked)}
                        className="cursor-pointer rounded border-border size-4 accent-[var(--color-inv-primary)]"
                    />
                    <Label htmlFor="model-is_active" className="cursor-pointer">Activo</Label>
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
                        className="cursor-pointer bg-inv-primary hover:bg-inv-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear modelo'}
                    </Button>
                </div>
            </form>
        </AppModal>
    );
}
