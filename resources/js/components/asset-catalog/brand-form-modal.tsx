import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import { AppModal } from '@/components/app-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AssetBrand } from '@/types/asset-catalog';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    brand: AssetBrand | null;
};

export function BrandFormModal({ open, onOpenChange, brand }: Props) {
    const isEdit = brand != null;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: brand?.name ?? '',
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
        setData('name', brand?.name ?? '');
    }, [open, brand?.id, brand?.name]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...data };
        if (isEdit && brand) {
            put(`/admin/asset-catalog/brands/${brand.id}`, {
                preserveScroll: true,
                data: payload,
                transform: () => payload,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        } else {
            post('/admin/asset-catalog/brands', {
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
            title={isEdit ? 'Editar marca' : 'Nueva marca'}
            contentClassName="space-y-4"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label>Nombre <span className="text-red-500">*</span></Label>
                    <Input
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value.toUpperCase())}
                        maxLength={100}
                        className={errors.name ? 'border-destructive' : ''}
                        placeholder="ej. HP, Dell"
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
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
                        {processing ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear marca'}
                    </Button>
                </div>
            </form>
        </AppModal>
    );
}
