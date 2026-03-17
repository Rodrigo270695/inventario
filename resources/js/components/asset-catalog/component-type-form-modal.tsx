import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import { AppModal } from '@/components/app-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ComponentType } from '@/types/asset-catalog';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    componentType: ComponentType | null;
};

export function ComponentTypeFormModal({ open, onOpenChange, componentType }: Props) {
    const isEdit = componentType != null;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: componentType?.name ?? '',
        code: componentType?.code ?? '',
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
            name: componentType?.name ?? '',
            code: componentType?.code ?? '',
        });
    }, [open, componentType?.id, componentType?.name, componentType?.code]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...data };
        if (isEdit && componentType) {
            put(`/admin/asset-catalog/component-types/${componentType.id}`, {
                preserveScroll: true,
                data: payload,
                transform: () => payload,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        } else {
            post('/admin/asset-catalog/component-types', {
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
            title={isEdit ? 'Editar tipo de componente' : 'Nuevo tipo de componente'}
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
                        placeholder="ej. RAM, SSD, GPU"
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                    <Label>Código (opcional)</Label>
                    <Input
                        value={data.code}
                        onChange={(e) => setData('code', e.target.value.toUpperCase())}
                        maxLength={30}
                        className={errors.code ? 'border-destructive' : ''}
                        placeholder="ej. RAM"
                    />
                    {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
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
                        {processing ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear tipo de componente'}
                    </Button>
                </div>
            </form>
        </AppModal>
    );
}
