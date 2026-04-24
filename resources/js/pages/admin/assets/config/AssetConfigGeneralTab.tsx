import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import type { AssetConfigAsset } from './types';
import {
    CONDITION_LABELS,
    STATUS_LABELS,
    assetLocationPath,
    assetOperationalStatusKey,
    formatDateShort,
    fullDisplayName,
} from './utils';

type Props = {
    asset: AssetConfigAsset;
};

export function AssetConfigGeneralTab({ asset }: Props) {
    const [savingSpecs, setSavingSpecs] = useState(false);
    const [specRows, setSpecRows] = useState<Array<{ key: string; value: string }>>(() => {
        const entries = Object.entries(asset.specs ?? {});
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
        const original = asset.specs ?? {};
        const originalKeys = Object.keys(original);
        const newKeys = Object.keys(normalized);
        if (originalKeys.length !== newKeys.length) return true;
        for (const k of originalKeys) {
            if (!(k in normalized)) return true;
            if (String((original as Record<string, unknown>)[k] ?? '') !== String(normalized[k] ?? '')) return true;
        }
        return false;
    }, [specRows, asset.specs]);

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
        router.put(`/admin/assets/${asset.id}/specs`, { specs: payload }, {
            preserveScroll: true,
            onFinish: () => setSavingSpecs(false),
        });
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                    <p className="text-muted-foreground text-xs font-medium">Código</p>
                    <p className="text-foreground text-sm">{asset.code}</p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs font-medium">Nº serie</p>
                    <p className="text-foreground text-sm">{asset.serial_number ?? '—'}</p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs font-medium">Categoría / Subcategoría</p>
                    <p className="text-foreground text-sm">
                        {asset.model?.subcategory?.category?.name ?? '—'}{' '}
                        {asset.model?.subcategory ? ` / ${asset.model.subcategory.name}` : ''}
                    </p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs font-medium">Modelo</p>
                    <p className="text-foreground text-sm">{asset.model?.name ?? '—'}</p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs font-medium">Ubicación</p>
                    <p className="text-foreground text-sm">{assetLocationPath(asset)}</p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs font-medium">Estado</p>
                    <p className="text-foreground text-sm">
                        {STATUS_LABELS[assetOperationalStatusKey(asset.status)] ?? asset.status ?? '—'}
                    </p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs font-medium">Condición</p>
                    <p className="text-foreground text-sm">{CONDITION_LABELS[asset.condition] ?? asset.condition}</p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs font-medium">Valor adquisición</p>
                    <p className="text-foreground text-sm">{asset.acquisition_value ?? '—'}</p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs font-medium">Fecha de adquisición</p>
                    <p className="text-foreground text-sm">
                        {asset.acquisition_date ? formatDateShort(asset.acquisition_date) : '—'}
                    </p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs font-medium">Valor actual</p>
                    <p className="text-foreground text-sm">{asset.current_value ?? '—'}</p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs font-medium">Tasa depreciación (%)</p>
                    <p className="text-foreground text-sm">{asset.depreciation_rate ?? '—'}</p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs font-medium">Garantía hasta</p>
                    <p className="text-foreground text-sm">
                        {asset.warranty_until ? formatDateShort(asset.warranty_until) : '—'}
                    </p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs font-medium">Registrado por</p>
                    <p className="text-foreground text-sm">{fullDisplayName(asset.registered_by)}</p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs font-medium">Creado el</p>
                    <p className="text-foreground text-sm">{formatDateShort(asset.created_at)}</p>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs font-medium">Última actualización</p>
                    <p className="text-foreground text-sm">{formatDateShort(asset.updated_at)}</p>
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
                                    placeholder="Etiqueta (ej. Material)"
                                    className="w-full rounded-md border border-border/70 bg-background px-2 py-1 text-xs text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                                />
                                <input
                                    type="text"
                                    value={row.value}
                                    onChange={(e) => handleSpecChange(index, 'value', e.target.value)}
                                    placeholder="Valor (ej. Madera)"
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

            {asset.notes && (
                <div className="mt-2">
                    <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Notas
                    </h2>
                    <p className="whitespace-pre-wrap text-sm text-foreground">{asset.notes}</p>
                </div>
            )}
        </div>
    );
}
