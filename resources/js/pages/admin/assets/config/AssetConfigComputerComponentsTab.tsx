import React from 'react';
import { router } from '@inertiajs/react';
import type { AssetComputerComponent, AssetConfigAsset, ComponentForComputerOption } from './types';
import { SearchableSelect } from '@/components/searchable-select';
import { formatDateTimeShort, fullDisplayName } from './utils';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';

const nowLocalForInput = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

type Props = {
    asset: AssetConfigAsset;
    computerComponents: AssetComputerComponent[];
    componentsForComputer: ComponentForComputerOption[];
};

export function AssetConfigComputerComponentsTab({
    asset,
    computerComponents,
    componentsForComputer,
}: Props) {
    const hasComponents = computerComponents.length > 0;

    const [form, setForm] = React.useState({
        component_id: '',
        slot: '',
        installed_at: nowLocalForInput(),
    });
    const [saving, setSaving] = React.useState(false);
    const [retiringId, setRetiringId] = React.useState<number | null>(null);
    const [retireAt, setRetireAt] = React.useState<string>('');
    const [savingRetire, setSavingRetire] = React.useState(false);

    const componentOptions = React.useMemo(
        () =>
            componentsForComputer.map((c) => {
                const titleParts: string[] = [];
                if (c.type?.name) titleParts.push(c.type.name);
                if (c.brand?.name) titleParts.push(c.brand.name);
                const title = titleParts.join(' · ') || c.code;

                const detailParts: string[] = [];
                if (c.code) detailParts.push(c.code);
                if (c.serial_number) detailParts.push(`Serie: ${c.serial_number}`);
                if (c.model) detailParts.push(c.model);

                return {
                    value: c.id,
                    label: title,
                    searchTerms: [c.code, c.serial_number ?? '', c.model ?? ''].filter(
                        Boolean
                    ) as string[],
                    _detail: detailParts.join(' · '),
                };
            }),
        [componentsForComputer]
    );

    const handleInstall = () => {
        if (!form.component_id) return;
        setSaving(true);
        router.post(
            `/admin/assets/${asset.id}/computer-components`,
            {
                component_id: form.component_id,
                slot: form.slot.trim() || undefined,
                installed_at: form.installed_at ? `${form.installed_at}:00` : undefined,
            },
            {
                preserveScroll: true,
                onFinish: () => setSaving(false),
                onSuccess: () =>
                    setForm({
                        component_id: '',
                        slot: '',
                        installed_at: nowLocalForInput(),
                    }),
            }
        );
    };

    const handleRetire = (computerComponentId: number) => {
        if (!retireAt) return;
        setSavingRetire(true);
        router.put(
            `/admin/assets/${asset.id}/computer-components/${computerComponentId}/retire`,
            {
                uninstalled_at: retireAt ? `${retireAt}:00` : undefined,
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setSavingRetire(false);
                    setRetiringId(null);
                    setRetireAt('');
                },
            }
        );
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="rounded-xl border border-inv-primary/40 bg-inv-primary/5 p-4">
                <h2 className="text-sm font-semibold text-foreground">Componentes instalados</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                    Vista y registro de los componentes de hardware asociados al activo{' '}
                    <span className="font-semibold text-foreground">{asset.code}</span>. Útil para
                    diagnosticar, rastrear upgrades y mantener el inventario técnico.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                        <label className="text-muted-foreground text-xs font-medium" htmlFor="component-select">
                            Componente
                        </label>
                        <SearchableSelect
                            id="component-select"
                            value={form.component_id}
                            onChange={(v) => setForm((f) => ({ ...f, component_id: v }))}
                            options={componentOptions}
                            placeholder="Buscar componente..."
                            noOptionsMessage="No hay componentes disponibles"
                            formatOptionLabel={(opt, meta) =>
                                meta.context === 'menu' ? (
                                    <div className="flex flex-col">
                                        <span>{opt.label}</span>
                                        {'_detail' in opt && opt._detail && (
                                            <span className="text-[11px] text-muted-foreground line-clamp-1">
                                                {opt._detail}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <span className="truncate">{opt.label}</span>
                                )
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-muted-foreground text-xs font-medium" htmlFor="component-slot">
                            Slot (opcional)
                        </label>
                        <input
                            id="component-slot"
                            type="text"
                            value={form.slot}
                            onChange={(e) => setForm((f) => ({ ...f, slot: e.target.value }))}
                            placeholder="Ej. DIMM1, M2_1, PCIe x16"
                            className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-muted-foreground text-xs font-medium" htmlFor="component-installed-at">
                            Fecha y hora instalación
                        </label>
                        <input
                            id="component-installed-at"
                            type="datetime-local"
                            value={form.installed_at}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    installed_at: e.target.value,
                                }))
                            }
                            className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={handleInstall}
                            disabled={saving || !form.component_id}
                            className="w-full cursor-pointer rounded-md bg-inv-primary px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                        >
                            {saving ? 'Guardando…' : 'Instalar componente'}
                        </button>
                    </div>
                </div>
            </div>

            {!hasComponents ? (
                <p className="rounded-lg border border-dashed border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
                    Este activo aún no tiene componentes de cómputo registrados.
                </p>
            ) : (
                <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
                    <ul className="divide-y divide-border/80">
                        {computerComponents.map((cc) => {
                            const c = cc.component;
                            const titleParts: string[] = [];
                            if (c?.type?.name) titleParts.push(c.type.name);
                            if (c?.brand?.name) titleParts.push(c.brand.name);
                            const title = titleParts.join(' · ') || c?.code || 'Componente';

                            const detailParts: string[] = [];
                            if (c?.code) detailParts.push(c.code);
                            if (c?.serial_number) detailParts.push(`Serie: ${c.serial_number}`);
                            if (c?.model) detailParts.push(c.model);
                            if (cc.slot) detailParts.push(`Slot: ${cc.slot}`);
                            const detail = detailParts.join(' · ') || '—';

                            const isRetired = !!cc.uninstalled_at;

                            return (
                                <li
                                    key={cc.id}
                                    className="flex flex-col gap-2 px-3 py-3 text-xs text-foreground sm:flex-row sm:items-center sm:justify-between sm:text-sm"
                                >
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-medium">{title}</p>
                                            {c?.type?.code && (
                                                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                    {c.type.code}
                                                </span>
                                            )}
                                            <span
                                                className={
                                                    'rounded-full px-2 py-0.5 text-[11px] font-semibold ' +
                                                    (isRetired
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-500/50'
                                                        : 'bg-blue-50 text-blue-700 border border-blue-500/50')
                                                }
                                            >
                                                {isRetired ? 'Retirado' : 'Instalado'}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground sm:text-xs">{detail}</p>
                                        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground sm:text-xs">
                                            <span>
                                                <span className="font-medium text-foreground/80">Instalado:</span>{' '}
                                                {formatDateTimeShort(cc.installed_at)}
                                            </span>
                                            <span>
                                                <span className="font-medium text-foreground/80">Retirado:</span>{' '}
                                                {cc.uninstalled_at ? formatDateTimeShort(cc.uninstalled_at) : '—'}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground sm:text-xs">
                                            <span>
                                                <span className="font-medium text-foreground/80">Instalado por:</span>{' '}
                                                {cc.installed_by ? fullDisplayName(cc.installed_by) : '—'}
                                            </span>
                                            {cc.uninstalled_by && (
                                                <span>
                                                    <span className="font-medium text-foreground/80">
                                                        Retirado por:
                                                    </span>{' '}
                                                    {fullDisplayName(cc.uninstalled_by)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end">
                                        {!isRetired && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setRetiringId(cc.id);
                                                    setRetireAt(nowLocalForInput());
                                                }}
                                                className="cursor-pointer rounded-md border border-amber-500/60 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
                                            >
                                                Retirar
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            <DeleteConfirmModal
                open={retiringId !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setRetiringId(null);
                        setRetireAt('');
                    }
                }}
                title="Retirar componente"
                description={
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            ¿Seguro que quieres marcar este componente como retirado del activo{' '}
                            <span className="font-medium text-foreground">{asset.code}</span>?
                        </p>
                        <div className="space-y-1">
                            <label
                                htmlFor="retire-date"
                                className="text-muted-foreground text-xs font-medium"
                            >
                                Fecha y hora retiro
                            </label>
                            <input
                                id="retire-date"
                                type="datetime-local"
                                value={retireAt}
                                onChange={(e) => setRetireAt(e.target.value)}
                                className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                            />
                        </div>
                    </div>
                }
                confirmLabel="Confirmar retiro"
                cancelLabel="Cancelar"
                loading={savingRetire}
                onConfirm={() => {
                    if (retiringId !== null) {
                        handleRetire(retiringId);
                    }
                }}
            />
        </div>
    );
}

