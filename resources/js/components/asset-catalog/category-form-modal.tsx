import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import { AppModal } from '@/components/app-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AssetCategory } from '@/types/asset-catalog';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category: AssetCategory | null;
};

export function CategoryFormModal({ open, onOpenChange, category }: Props) {
    const isEdit = category != null;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: category?.name ?? '',
        code: category?.code ?? '',
        is_active: category?.is_active ?? true,
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
            name: category?.name ?? '',
            code: category?.code ?? '',
            is_active: category?.is_active ?? true,
        });
    }, [open, category?.id, category?.name, category?.code, category?.is_active]);

    const handleNameChange = (value: string) => {
        setData('name', value.toUpperCase());
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...data };
        if (isEdit && category) {
            put(`/admin/asset-catalog/categories/${category.id}`, {
                preserveScroll: true,
                data: payload,
                transform: () => payload,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        } else {
            post('/admin/asset-catalog/categories', {
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

    const canSubmit = data.name.trim() !== '';

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Editar categoría' : 'Nueva categoría'}
            contentClassName="space-y-4"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label>Nombre <span className="text-red-500">*</span></Label>
                    <Input
                        value={data.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        maxLength={100}
                        className={errors.name ? 'border-destructive' : ''}
                        placeholder="ej. PC, MONITOR"
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
                        placeholder="ej. PC"
                    />
                    {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
                </div>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setData('is_active', !data.is_active)}>
                    <input
                        type="checkbox"
                        id="category-is_active"
                        checked={data.is_active}
                        onChange={(e) => setData('is_active', e.target.checked)}
                        className="cursor-pointer rounded border-border size-4 accent-[var(--color-inv-primary)]"
                    />
                    <Label htmlFor="category-is_active" className="cursor-pointer">Activo</Label>
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
                        {processing ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear categoría'}
                    </Button>
                </div>
            </form>
        </AppModal>
    );
}
