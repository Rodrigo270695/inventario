import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import { AppModal } from '@/components/app-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Office, Zonal } from '@/types';

/** Genera código: 1 palabra → 3 letras; 2+ palabras → 3 de la primera, 1 de cada siguiente. */
function codeFromName(name: string): string {
    const words = name.trim().toUpperCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';
    return words.map((w, i) => w.slice(0, i === 0 ? 3 : 1)).join('');
}

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    office: Office | null;
    zonals: Zonal[];
    selectedZonalId: string | null;
};

export function OfficeFormModal({ open, onOpenChange, office, zonals, selectedZonalId }: Props) {
    const isEdit = office != null;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        zonal_id: office?.zonal_id ?? selectedZonalId ?? '',
        name: office?.name ?? '',
        code: office?.code ?? '',
        address: office?.address ?? '',
        is_active: office?.is_active ?? true,
    });

    const showZonalSelect = !selectedZonalId;
    const effectiveZonalId = data.zonal_id || selectedZonalId || '';
    const canSubmit = effectiveZonalId !== '' && data.name.trim() !== '';

    useEffect(() => {
        if (!open) {
            clearErrors();
            return;
        }
        setData({
            zonal_id: office?.zonal_id ?? selectedZonalId ?? '',
            name: office?.name ?? '',
            code: office?.code ?? '',
            address: office?.address ?? '',
            is_active: office?.is_active ?? true,
        });
    }, [open, office?.id, office?.zonal_id, office?.name, office?.code, office?.address, office?.is_active, selectedZonalId, clearErrors]);

    const handleNameChange = (value: string) => {
        const upper = value.toUpperCase();
        setData((prev) => ({
            ...prev,
            name: upper,
            code: codeFromName(upper),
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...data, zonal_id: data.zonal_id || selectedZonalId };
        if (isEdit && office) {
            put(`/admin/offices/${office.id}`, {
                preserveScroll: true,
                data: payload,
                transform: () => payload,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        } else {
            post('/admin/offices', {
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

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Editar oficina' : 'Nueva oficina'}
            contentClassName="space-y-4"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {showZonalSelect && (
                    <div className="space-y-2">
                        <Label>Zonal <span className="text-red-500">*</span></Label>
                        <select
                            value={data.zonal_id}
                            onChange={(e) => setData('zonal_id', e.target.value)}
                            required
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        >
                            <option value="">Seleccione</option>
                            {zonals.map((z) => (
                                <option key={z.id} value={z.id}>{z.name} ({z.code})</option>
                            ))}
                        </select>
                        {errors.zonal_id && <p className="text-sm text-destructive">{errors.zonal_id}</p>}
                    </div>
                )}
                <div className="space-y-2">
                    <Label>Nombre <span className="text-red-500">*</span></Label>
                    <Input
                        value={data.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        maxLength={150}
                        className={errors.name ? 'border-destructive' : ''}
                        placeholder="ej. SEDE CENTRO"
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                    <Label>Código <span className="text-red-500">*</span></Label>
                    <Input
                        value={data.code}
                        onChange={(e) => setData('code', e.target.value.toUpperCase())}
                        maxLength={30}
                        className={errors.code ? 'border-destructive' : ''}
                        placeholder="Se genera del nombre (ej. SEDC)"
                    />
                    {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
                </div>
                <div className="space-y-2">
                    <Label>Dirección</Label>
                    <Input
                        value={data.address}
                        onChange={(e) => setData('address', e.target.value)}
                        maxLength={1000}
                    />
                </div>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setData('is_active', !data.is_active)}>
                    <input
                        type="checkbox"
                        id="office-is_active"
                        checked={data.is_active}
                        onChange={(e) => setData('is_active', e.target.checked)}
                        className="cursor-pointer rounded border-border size-4 accent-[var(--color-inv-primary)]"
                    />
                    <Label htmlFor="office-is_active" className="cursor-pointer">Activo</Label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={processing || !canSubmit}
                        className="cursor-pointer bg-inv-primary hover:bg-inv-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear oficina'}
                    </Button>
                </div>
            </form>
        </AppModal>
    );
}
