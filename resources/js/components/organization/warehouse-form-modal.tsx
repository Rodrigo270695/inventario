import { useForm } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
import { AppModal } from '@/components/app-modal';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Office, Warehouse } from '@/types';

type UserOption = { id: string; name: string; last_name: string; document_number: string };

/** Genera código: 1 palabra → 3 letras; 2+ palabras → 3 de la primera, 1 de cada siguiente. */
function codeFromName(name: string): string {
    const words = name.trim().toUpperCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';
    return words.map((w, i) => w.slice(0, i === 0 ? 3 : 1)).join('');
}

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    warehouse: Warehouse | null;
    offices: Office[];
    users: UserOption[];
    selectedOfficeId: string | null;
};

export function WarehouseFormModal({ open, onOpenChange, warehouse, offices, users, selectedOfficeId }: Props) {
    const isEdit = warehouse != null;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        office_id: warehouse?.office_id ?? selectedOfficeId ?? '',
        name: warehouse?.name ?? '',
        code: warehouse?.code ?? '',
        capacity: warehouse?.capacity ?? '',
        manager_id: warehouse?.manager_id ?? '',
        is_active: warehouse?.is_active ?? true,
    });

    const showOfficeSelect = !selectedOfficeId;
    const effectiveOfficeId = data.office_id || selectedOfficeId || '';
    const canSubmit = effectiveOfficeId !== '' && data.name.trim() !== '';

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
            office_id: warehouse?.office_id ?? selectedOfficeId ?? '',
            name: warehouse?.name ?? '',
            code: warehouse?.code ?? '',
            capacity: warehouse?.capacity ?? '',
            manager_id: warehouse?.manager_id ?? '',
            is_active: warehouse?.is_active ?? true,
        });
    }, [open, warehouse?.id, warehouse?.office_id, warehouse?.name, warehouse?.code, warehouse?.capacity, warehouse?.manager_id, warehouse?.is_active, selectedOfficeId]);

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
        const payload = {
            ...data,
            office_id: data.office_id || selectedOfficeId,
            capacity: data.capacity === '' ? null : Number(data.capacity),
            manager_id: data.manager_id === '' ? null : data.manager_id,
        };
        if (isEdit && warehouse) {
            put(`/admin/warehouses/${warehouse.id}`, {
                preserveScroll: true,
                data: payload,
                transform: () => payload,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        } else {
            post('/admin/warehouses', {
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

    const userSelectOptions = useMemo(
        () =>
            users.map((u) => {
                const fullName = [u.name, u.last_name].filter(Boolean).join(' ').trim() || u.name;
                return {
                    value: String(u.id),
                    label: fullName,
                    searchTerms: [u.last_name, u.document_number].filter(Boolean),
                };
            }),
        [users]
    );

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Editar almacén' : 'Nuevo almacén'}
            contentClassName="space-y-4"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {showOfficeSelect && (
                    <div className="space-y-2">
                        <Label>Oficina <span className="text-red-500">*</span></Label>
                        <select
                            value={data.office_id}
                            onChange={(e) => setData('office_id', e.target.value)}
                            required
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        >
                            <option value="">Seleccione</option>
                            {offices.map((o) => (
                                <option key={o.id} value={o.id}>{o.name} {o.code ? `(${o.code})` : ''}</option>
                            ))}
                        </select>
                        {errors.office_id && <p className="text-sm text-destructive">{errors.office_id}</p>}
                    </div>
                )}
                <div className="space-y-2">
                    <Label>Nombre <span className="text-red-500">*</span></Label>
                    <Input
                        value={data.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        maxLength={150}
                        className={errors.name ? 'border-destructive' : ''}
                        placeholder="ej. ALMACÉN PRINCIPAL"
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
                        placeholder="Se genera del nombre (ej. ALMP)"
                    />
                    {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
                </div>
                <div className="space-y-2">
                    <Label>Capacidad</Label>
                    <Input
                        type="number"
                        min={0}
                        value={data.capacity === '' ? '' : data.capacity}
                        onChange={(e) => setData('capacity', e.target.value === '' ? '' : e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Responsable</Label>
                    <SearchableSelect
                        value={data.manager_id === '' ? '' : String(data.manager_id)}
                        onChange={(v) => setData('manager_id', v)}
                        options={userSelectOptions}
                        placeholder="Buscar usuario..."
                        noOptionsMessage="No hay coincidencias"
                    />
                </div>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setData('is_active', !data.is_active)}>
                    <input
                        type="checkbox"
                        id="warehouse-is_active"
                        checked={data.is_active}
                        onChange={(e) => setData('is_active', e.target.checked)}
                        className="cursor-pointer rounded border-border size-4 accent-[var(--color-inv-primary)]"
                    />
                    <Label htmlFor="warehouse-is_active" className="cursor-pointer">Activo</Label>
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
                        {processing ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear almacén'}
                    </Button>
                </div>
            </form>
        </AppModal>
    );
}
