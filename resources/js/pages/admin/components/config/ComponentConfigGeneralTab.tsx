import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import type { Component } from '@/types';
import { formatDateShort } from '../../assets/config/utils';

type Props = {
    component: Component & {
        specs?: Record<string, unknown> | null;
        warehouse?: {
            id: string;
            name: string;
            code: string | null;
            office?: {
                id: string;
                name: string;
                code: string | null;
                zonal?: { id: string; name: string; code: string | null } | null;
            } | null;
        } | null;
    };
};

const STATUS_LABELS: Record<string, string> = {
    stored: 'Almacenado',
    active: 'En uso',
    in_repair: 'En reparación',
    in_transit: 'En tránsito',
    broken: 'Malogrado',
    disposed: 'Dado de baja',
};

const CONDITION_LABELS: Record<string, string> = {
    new: 'Nuevo',
    good: 'Bueno',
    regular: 'Regular',
    damaged: 'Dañado',
    obsolete: 'Obsoleto',
};

function componentLocationPath(component: Props['component']): string {
    const wh = component.warehouse;
    if (!wh) return '—';
    const office = wh.office;
    const zonal = office?.zonal;
    const parts: string[] = [];
    if (zonal) parts.push(zonal.name);
    if (office) parts.push(office.name);
    parts.push(wh.name + (wh.code ? ` (${wh.code})` : ''));
    return parts.join(' / ');
}

export function ComponentConfigGeneralTab({ component }: Props) {
    const [savingSpecs, setSavingSpecs] = useState(false);
    const [specRows, setSpecRows] = useState<Array<{ key: string; value: string }>>(() => {
        const entries = Object.entries(component.specs ?? {});
        if (entries.length === 0) return [{ key: '', value: '' }];
        return entries.map(([k, v]) => ({
            key: k,
            value: v == null ? '' : String(v),
        }));
    });

    const specsChanged = useMemo(() => {
        const normalized: Record<string, string> = {};
        for (const row of specRows) {
            const k = row.key.trim();
            if (!k) continue;
            normalized[k] = row.value;
        }
        const original = (component.specs ?? {}) as Record<string, unknown>;
        const originalKeys = Object.keys(original);
        const newKeys = Object.keys(normalized);
        if (originalKeys.length !== newKeys.length) return true;
        for (const k of originalKeys) {
            if (!(k in normalized)) return true;
            if (String(original[k] ?? '') !== String(normalized[k] ?? '')) return true;
        }
        return false;
    }, [specRows, component.specs]);

    const handleSpecChange = (index: number, field: 'key' | 'value', value: string) => {
        setSpecRows((rows) =>
            rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
        );
    };

    const handleAddSpecRow = () => {
        setSpecRows((rows) => [...rows, { key: '', value: '' }]);
    };

    const handleRemoveSpecRow = (index: number) => {
        setSpecRows((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)));
    };

    const handleSaveSpecs = () => {
        const payload: Record<string, string> = {};
        for (const row of specRows) {
            const k = row.key.trim();
            if (!k) continue;
            payload[k] = row.value;
        }
        setSavingSpecs(true);
        router.put(`/admin/components/${component.id}/specs`, { specs: payload }, {
            preserveScroll: true,
            onFinish: () => setSavingSpecs(false),
        });
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                    <p className="text-muted-foreground text-xs font-medium">Código</p>
                    <p className="text-foreground text-sm">{component.code}</p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs font-medium">Nº serie</p>
                    <p className="text-foreground text-sm">{component.serial_number ?? '—'}</p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs font-medium">Tipo</p>
                    <p className="text-foreground text-sm">{component.type?.name ?? '—'}</p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs font-medium">Marca / Modelo</p>
                    <p className="text-foreground text-sm">
                        {[component.brand?.name ?? '', component.model ?? ''].filter(Boolean).join(' · ') || '—'}
                    </p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs font-medium">Ubicación</p>
                    <p className="text-foreground text-sm">{componentLocationPath(component)}</p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs font-medium">Estado</p>
                    <p className="text-foreground text-sm">
                        {STATUS_LABELS[component.status] ?? component.status}
                    </p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs font-medium">Condición</p>
                    <p className="text-foreground text-sm">
                        {CONDITION_LABELS[component.condition] ?? component.condition}
                    </p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs font-medium">Fecha de adquisición</p>
                    <p className="text-foreground text-sm">
                        {component.acquisition_date
                            ? formatDateShort(component.acquisition_date)
                            : '—'}
                    </p>
                </div>
            </div>

            <div className="mt-4 space-y-3 rounded-xl border border-inv-primary/40 bg-inv-primary/5 p-3 md:p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-inv-primary dark:text-inv-primary">
                        Especificaciones (clave / valor)
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleAddSpecRow}
                            className="cursor-pointer rounded-md border border-inv-primary/40 bg-white px-2 py-1 text-[11px] font-medium text-inv-primary shadow-sm hover:bg-inv-primary/5 dark:bg-inv-section dark:text-inv-primary"
                        >
                            + Añadir fila
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveSpecs}
                            disabled={savingSpecs || !specsChanged}
                            className="cursor-pointer rounded-md bg-inv-primary px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm disabled:cursor-default disabled:bg-inv-primary/40"
                        >
                            {savingSpecs ? 'Guardando…' : 'Guardar specs'}
                        </button>
                    </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {specRows.map((row, index) => (
                        <div
                            key={index}
                            className="flex items-start gap-2 rounded-lg border border-border/80 bg-white/90 px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.08)] dark:bg-inv-section"
                        >
                            <div className="flex-1 space-y-1">
                                <input
                                    type="text"
                                    value={row.key}
                                    onChange={(e) => handleSpecChange(index, 'key', e.target.value)}
                                    placeholder="Etiqueta (ej. Capacidad)"
                                    className="w-full rounded-md border border-border/70 bg-background px-2 py-1 text-xs text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                                />
                                <input
                                    type="text"
                                    value={row.value}
                                    onChange={(e) => handleSpecChange(index, 'value', e.target.value)}
                                    placeholder="Valor (ej. 8GB)"
                                    className="w-full rounded-md border border-border/70 bg-background px-2 py-1 text-xs text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemoveSpecRow(index)}
                                className="mt-1 cursor-pointer rounded-full px-2 py-1 text-[13px] font-semibold text-rose-500 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-900/30"
                                aria-label="Eliminar fila"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {component.notes && (
                <div className="mt-2">
                    <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Notas
                    </h2>
                    <p className="whitespace-pre-wrap text-sm text-foreground">{component.notes}</p>
                </div>
            )}
        </div>
    );
}

