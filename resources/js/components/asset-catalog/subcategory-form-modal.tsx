import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
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
import type { AssetCategory } from '@/types/organization';
import type { AssetSubcategory } from '@/types/asset-catalog';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    subcategory: AssetSubcategory | null;
    categories: AssetCategory[];
};

export function SubcategoryFormModal({ open, onOpenChange, subcategory, categories }: Props) {
    const isEdit = subcategory != null;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        asset_category_id: subcategory?.asset_category_id ?? '',
        name: subcategory?.name ?? '',
        code: subcategory?.code ?? '',
        is_active: subcategory?.is_active ?? true,
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
            asset_category_id: subcategory?.asset_category_id ?? '',
            name: subcategory?.name ?? '',
            code: subcategory?.code ?? '',
            is_active: subcategory?.is_active ?? true,
        });
    }, [open, subcategory?.id, subcategory?.asset_category_id, subcategory?.name, subcategory?.code, subcategory?.is_active]);

    const handleNameChange = (value: string) => {
        setData('name', value.toUpperCase());
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...data };
        if (isEdit && subcategory) {
            put(`/admin/asset-catalog/subcategories/${subcategory.id}`, {
                preserveScroll: true,
                data: payload,
                transform: () => payload,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        } else {
            post('/admin/asset-catalog/subcategories', {
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

    const canSubmit = data.name.trim() !== '' && data.asset_category_id !== '';
    const categoriesForSelect = categories.filter((c) => c.is_active);

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Editar subcategoría' : 'Nueva subcategoría'}
            contentClassName="space-y-4"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label>Categoría (SUNAT) <span className="text-red-500">*</span></Label>
                    <Select
                        value={data.asset_category_id || '_'}
                        onValueChange={(v) => setData('asset_category_id', v === '_' ? '' : v)}
                    >
                        <SelectTrigger className="w-full border-border bg-background">
                            <SelectValue placeholder="Seleccione categoría" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_">Seleccione categoría</SelectItem>
                            {categoriesForSelect.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.asset_category_id && (
                        <p className="text-sm text-destructive">{errors.asset_category_id}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>Nombre <span className="text-red-500">*</span></Label>
                    <Input
                        value={data.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        maxLength={100}
                        className={errors.name ? 'border-destructive' : ''}
                        placeholder="ej. LAPTOP, PC, MONITOR"
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                    <Label>Código (opcional)</Label>
                    <Input
                        value={data.code}
                        onChange={(e) => setData('code', e.target.value)}
                        maxLength={30}
                        className={errors.code ? 'border-destructive' : ''}
                        placeholder="ej. LAP"
                    />
                    {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
                </div>
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => setData('is_active', !data.is_active)}
                >
                    <input
                        type="checkbox"
                        id="subcategory-is_active"
                        checked={data.is_active}
                        onChange={(e) => setData('is_active', e.target.checked)}
                        className="cursor-pointer rounded border-border size-4 accent-[var(--color-inv-primary)]"
                    />
                    <Label htmlFor="subcategory-is_active" className="cursor-pointer">
                        Activo
                    </Label>
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
                        {processing ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear subcategoría'}
                    </Button>
                </div>
            </form>
        </AppModal>
    );
}
