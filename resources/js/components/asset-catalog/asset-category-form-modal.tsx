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
import type { AssetCategory } from '@/types';

type GlAccountOption = { id: string; code: string; name: string };

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category: AssetCategory | null;
    glAccountsForSelect: GlAccountOption[];
};

/** Genera código con guion: primeras 3 letras del primer término + "-" + 2 letras del último (ej. MOBILIARIO DE OFICINA → MOB-OF). */
function codeFromName(name: string): string {
    const words = name
        .trim()
        .toUpperCase()
        .split(/\s+/)
        .filter(Boolean);
    if (words.length === 0) return '';
    const first = words[0].slice(0, 3);
    const last = words.length > 1 ? words[words.length - 1].slice(0, 2) : words[0].slice(3, 5) || '';
    return last ? `${first}-${last}` : first;
}

const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'technology', label: 'Tecnología' },
    { value: 'vehicle', label: 'Vehículo' },
    { value: 'furniture', label: 'Mobiliario' },
    { value: 'building', label: 'Inmueble' },
    { value: 'machinery', label: 'Maquinaria' },
    { value: 'fixed_asset', label: 'Activo fijo' },
    { value: 'minor_asset', label: 'Activo menor' },
    { value: 'service_maintenance', label: 'Servicios y mantenimiento' },
    { value: 'other', label: 'Otro' },
];

const ICON_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'antenna', label: 'Antenas / radio bases' },
    { value: 'tower', label: 'Torres y estructuras' },
    { value: 'router', label: 'Routers / equipos de red' },
    { value: 'switch', label: 'Switches / distribución' },
    { value: 'server', label: 'Servidores y racks' },
    { value: 'desk', label: 'Escritorios / mesas de trabajo' },
    { value: 'chair', label: 'Sillas / butacas' },
    { value: 'building', label: 'Infraestructura / edificios' },
    { value: 'sofa', label: 'Muebles de sala / recepción' },
];

export function AssetCategoryFormModal({ open, onOpenChange, category, glAccountsForSelect }: Props) {
    const isEdit = category != null;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: category?.name ?? '',
        code: category?.code ?? '',
        type: category?.type ?? 'other',
        gl_account_id: category?.gl_account_id ?? '',
        gl_depreciation_account_id: category?.gl_depreciation_account_id ?? '',
        icon: category?.icon ?? '',
        default_useful_life_years: category?.default_useful_life_years?.toString() ?? '',
        default_depreciation_method: category?.default_depreciation_method ?? 'straight_line',
        default_residual_value_pct: category?.default_residual_value_pct?.toString() ?? '',
        requires_insurance: category?.requires_insurance ?? false,
        requires_soat: category?.requires_soat ?? false,
        is_active: category?.is_active ?? true,
    });

    const glAccountOptions = useMemo(
        () =>
            glAccountsForSelect.map((a) => ({
                value: a.id,
                label: `${a.code} — ${a.name}`,
                searchTerms: [a.code, a.name],
            })),
        [glAccountsForSelect]
    );

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
            type: category?.type ?? 'other',
            gl_account_id: category?.gl_account_id ?? '',
            gl_depreciation_account_id: category?.gl_depreciation_account_id ?? '',
            icon: category?.icon ?? '',
            default_useful_life_years: category?.default_useful_life_years?.toString() ?? '',
            default_depreciation_method: category?.default_depreciation_method ?? 'straight_line',
            default_residual_value_pct: category?.default_residual_value_pct?.toString() ?? '',
            requires_insurance: category?.requires_insurance ?? false,
            requires_soat: category?.requires_soat ?? false,
            is_active: category?.is_active ?? true,
        });
    }, [
        open,
        category?.id,
        category?.name,
        category?.code,
        category?.type,
        category?.gl_account_id,
        category?.gl_depreciation_account_id,
        category?.icon,
        category?.default_useful_life_years,
        category?.default_depreciation_method,
        category?.default_residual_value_pct,
        category?.requires_insurance,
        category?.requires_soat,
        category?.is_active,
        setData,
    ]);

    const handleNameChange = (value: string) => {
        const upper = value.toUpperCase();
        setData((prev) => ({
            ...prev,
            name: upper,
            code: category ? prev.code : codeFromName(upper),
        }));
    };

    const handleCodeChange = (value: string) => {
        setData((prev) => ({ ...prev, code: value.toUpperCase() }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...data,
            gl_account_id: data.gl_account_id === '' ? null : data.gl_account_id,
            gl_depreciation_account_id: data.gl_depreciation_account_id === '' ? null : data.gl_depreciation_account_id,
            default_useful_life_years:
                data.default_useful_life_years === '' ? null : Number(data.default_useful_life_years),
            default_depreciation_method: data.default_depreciation_method || null,
            default_residual_value_pct:
                data.default_residual_value_pct === '' ? null : Number(data.default_residual_value_pct),
        };
        if (isEdit && category) {
            put(`/admin/asset-categories/${category.id}`, {
                preserveScroll: true,
                data: payload,
                transform: () => payload,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        } else {
            post('/admin/asset-categories', {
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

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Editar categoría de activos' : 'Nueva categoría de activos'}
            contentClassName="space-y-4"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label>
                            Nombre <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={data.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            maxLength={150}
                            className={errors.name ? 'border-destructive' : ''}
                            placeholder="ej. MOBILIARIO DE OFICINA"
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive">{errors.name}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label>
                            Código <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={data.code}
                            onChange={(e) => handleCodeChange(e.target.value)}
                            maxLength={30}
                            className={errors.code ? 'border-destructive' : ''}
                            placeholder="ej. MOB-OF"
                        />
                        {errors.code && (
                            <p className="text-sm text-destructive">{errors.code}</p>
                        )}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Tipo <span className="text-red-500">*</span></Label>
                    <Select
                        value={data.type}
                        onValueChange={(v) => setData('type', v)}
                    >
                        <SelectTrigger className="w-full border-border bg-background">
                            <SelectValue placeholder="Seleccione tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            {TYPE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Cuenta contable (activo)</Label>
                    <SearchableSelect
                        value={data.gl_account_id}
                        onChange={(v) => setData('gl_account_id', v)}
                        options={glAccountOptions}
                        placeholder="Buscar por código o nombre…"
                        noOptionsMessage="No hay coincidencias"
                        isClearable
                    />
                </div>
                <div className="space-y-2">
                    <Label>Cuenta depreciación</Label>
                    <SearchableSelect
                        value={data.gl_depreciation_account_id}
                        onChange={(v) => setData('gl_depreciation_account_id', v)}
                        options={glAccountOptions}
                        placeholder="Buscar por código o nombre…"
                        noOptionsMessage="No hay coincidencias"
                        isClearable
                    />
                </div>
                <div className="space-y-2">
                    <Label>Icono</Label>
                    <Select
                        value={data.icon === '' ? '_' : data.icon}
                        onValueChange={(v) => setData('icon', v === '_' ? '' : v)}
                    >
                        <SelectTrigger className="w-full border-border bg-background">
                            <SelectValue placeholder="Seleccione icono (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_">Sin icono</SelectItem>
                            {ICON_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Vida útil por defecto (años)</Label>
                        <Input
                            value={data.default_useful_life_years}
                            onChange={(e) => setData('default_useful_life_years', e.target.value)}
                            inputMode="numeric"
                            placeholder="ej. 10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Valor residual % por defecto</Label>
                        <Input
                            value={data.default_residual_value_pct}
                            onChange={(e) => setData('default_residual_value_pct', e.target.value)}
                            inputMode="decimal"
                            placeholder="ej. 10"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Método de depreciación por defecto</Label>
                    <Select
                        value={data.default_depreciation_method ?? 'straight_line'}
                        onValueChange={(v) => setData('default_depreciation_method', v)}
                    >
                        <SelectTrigger className="w-full border-border bg-background">
                            <SelectValue placeholder="Seleccione método" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="straight_line">Línea recta</SelectItem>
                            <SelectItem value="sum_of_years">Suma de dígitos de los años</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setData('requires_insurance', !data.requires_insurance)}>
                    <input
                        type="checkbox"
                        id="asset-cat-requires_insurance"
                        checked={data.requires_insurance}
                        onChange={(e) => setData('requires_insurance', e.target.checked)}
                        className="cursor-pointer rounded border-border size-4 accent-inv-primary"
                    />
                    <Label htmlFor="asset-cat-requires_insurance" className="cursor-pointer">Requiere seguro</Label>
                </div>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setData('requires_soat', !data.requires_soat)}>
                    <input
                        type="checkbox"
                        id="asset-cat-requires_soat"
                        checked={data.requires_soat}
                        onChange={(e) => setData('requires_soat', e.target.checked)}
                        className="cursor-pointer rounded border-border size-4 accent-inv-primary"
                    />
                    <Label htmlFor="asset-cat-requires_soat" className="cursor-pointer">Requiere SOAT</Label>
                </div>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setData('is_active', !data.is_active)}>
                    <input
                        type="checkbox"
                        id="asset-cat-is_active"
                        checked={data.is_active}
                        onChange={(e) => setData('is_active', e.target.checked)}
                        className="cursor-pointer rounded border-border size-4 accent-inv-primary"
                    />
                    <Label htmlFor="asset-cat-is_active" className="cursor-pointer">Activa</Label>
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
