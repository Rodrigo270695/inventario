import { useForm } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
import { AppModal } from '@/components/app-modal';
import { SearchableSelect } from '@/components/searchable-select';
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
import type { Zonal } from '@/types';

type UserOption = { id: string; name: string; last_name: string; document_number: string };

/** Regiones macro de Perú (para zonales). */
const REGIONES = [
    { value: 'Lima Metropolitana', label: 'Lima Metropolitana' },
    { value: 'Norte', label: 'Norte' },
    { value: 'Sur', label: 'Sur' },
    { value: 'Centro', label: 'Centro' },
    { value: 'Oriente', label: 'Oriente' },
    { value: 'Otro', label: 'Otro' },
];

/** Genera código: 1 palabra → 3 letras; 2+ palabras → 3 de la primera, 1 de cada siguiente. */
function codeFromName(name: string): string {
    const words = name
        .trim()
        .toUpperCase()
        .split(/\s+/)
        .filter(Boolean);
    if (words.length === 0) return '';
    return words
        .map((w, i) => w.slice(0, i === 0 ? 3 : 1))
        .join('');
}

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    zonal: Zonal | null;
    users: UserOption[];
};

export function ZonalFormModal({ open, onOpenChange, zonal, users }: Props) {
    const isEdit = zonal != null;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: zonal?.name ?? '',
        code: zonal?.code ?? '',
        region: zonal?.region ?? '',
        manager_id: zonal?.manager_id ?? '',
        timezone: 'America/Lima',
        is_active: zonal?.is_active ?? true,
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
            name: zonal?.name ?? '',
            code: zonal?.code ?? '',
            region: zonal?.region ?? '',
            manager_id: zonal?.manager_id ?? '',
            timezone: 'America/Lima',
            is_active: zonal?.is_active ?? true,
        });
    }, [open, zonal?.id, zonal?.name, zonal?.code, zonal?.region, zonal?.manager_id, zonal?.is_active]);

    // Al escribir en nombre, pasar a mayúsculas y actualizar código automáticamente
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
        const payload = { ...data, manager_id: data.manager_id === '' ? null : data.manager_id };
        if (isEdit && zonal) {
            put(`/admin/zonals/${zonal.id}`, {
                preserveScroll: true,
                data: payload,
                transform: () => payload,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        } else {
            post('/admin/zonals', {
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

    const canSubmit = data.name.trim() !== '' && data.code.trim() !== '';

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
            title={isEdit ? 'Editar zonal' : 'Nuevo zonal'}
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
                        placeholder="ej. LIMA SUR"
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                    <Label>Código <span className="text-red-500">*</span></Label>
                    <Input
                        value={data.code}
                        onChange={(e) => setData('code', e.target.value.toUpperCase())}
                        maxLength={20}
                        className={errors.code ? 'border-destructive' : ''}
                        placeholder="Se genera del nombre (ej. LIMS)"
                    />
                    {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
                </div>
                <div className="space-y-2">
                    <Label>Región</Label>
                    <Select
                        value={data.region === '' ? '_' : data.region}
                        onValueChange={(v) => setData('region', v === '_' ? '' : v)}
                    >
                        <SelectTrigger className="w-full border-border bg-background">
                            <SelectValue placeholder="Seleccione región" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_">Seleccione región</SelectItem>
                            {REGIONES.map((r) => (
                                <SelectItem key={r.value} value={r.value}>
                                    {r.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
                        id="zonal-is_active"
                        checked={data.is_active}
                        onChange={(e) => setData('is_active', e.target.checked)}
                        className="cursor-pointer rounded border-border size-4 accent-[var(--color-inv-primary)]"
                    />
                    <Label htmlFor="zonal-is_active" className="cursor-pointer">Activo</Label>
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
                        {processing ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear zonal'}
                    </Button>
                </div>
            </form>
        </AppModal>
    );
}
