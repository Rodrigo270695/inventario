import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';
import { SearchableSelect, type SearchableSelectOption } from '@/components/searchable-select';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { ComponentOption, RepairTicketConfigTicket, RepairTicketPart } from './types';
import { money } from './utils';

type Props = {
    repairTicket: RepairTicketConfigTicket;
    parts: RepairTicketPart[];
    componentsForSelect: ComponentOption[];
    canEdit: boolean;
};

export function RepairTicketConfigPartsTab({ repairTicket, parts, componentsForSelect, canEdit }: Props) {
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [partToDelete, setPartToDelete] = useState<RepairTicketPart | null>(null);
    const [form, setForm] = useState({
        source_type: 'stock',
        component_id: '',
        part_name: '',
        part_number: '',
        quantity: '1',
        unit_cost: '',
        notes: '',
    });

    const componentOptions = useMemo<SearchableSelectOption[]>(
        () =>
            componentsForSelect.map((component) => ({
                value: component.id,
                label: component.code,
                searchTerms: [component.serial_number ?? '', component.type?.name ?? '', component.brand?.name ?? '', component.model ?? ''],
            })),
        [componentsForSelect]
    );

    const handleSave = () => {
        setSaving(true);
        const payload = {
            ...form,
            component_id: form.source_type === 'stock' ? form.component_id || null : null,
            part_name: form.source_type === 'external' ? form.part_name.trim() || null : null,
            part_number: form.part_number.trim() || null,
            quantity: Number(form.quantity || 1),
            unit_cost: form.unit_cost === '' ? null : Number(form.unit_cost),
            notes: form.notes.trim() || null,
        };

        router.post(`/admin/repair-tickets/${repairTicket.id}/parts`, payload, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
            onSuccess: () => {
                setForm({
                    source_type: 'stock',
                    component_id: '',
                    part_name: '',
                    part_number: '',
                    quantity: '1',
                    unit_cost: '',
                    notes: '',
                });
            },
        });
    };

    const handleDelete = () => {
        if (!partToDelete) return;
        setDeleting(partToDelete.id);
        router.delete(`/admin/repair-tickets/${repairTicket.id}/parts/${partToDelete.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(null);
                setPartToDelete(null);
            },
        });
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            {canEdit && (
                <div className="space-y-4 rounded-xl border border-inv-primary/40 bg-inv-primary/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-sm font-semibold text-foreground">Añadir repuesto</h2>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="cursor-pointer rounded-md bg-inv-primary px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                        >
                            {saving ? 'Guardando...' : 'Guardar repuesto'}
                        </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Origen</label>
                            <Select value={form.source_type} onValueChange={(value) => setForm((current) => ({ ...current, source_type: value, component_id: '', part_name: '' }))}>
                                <SelectTrigger className="w-full border-border/70 bg-background">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="stock">Stock</SelectItem>
                                    <SelectItem value="external">Externo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {form.source_type === 'stock' ? (
                            <div className="space-y-2 md:col-span-2 xl:col-span-3">
                                <label className="text-xs font-medium text-muted-foreground">Componente de inventario</label>
                                <SearchableSelect
                                    value={form.component_id}
                                    onChange={(value) => setForm((current) => ({ ...current, component_id: value }))}
                                    options={componentOptions}
                                    placeholder="Buscar componente..."
                                />
                            </div>
                        ) : (
                            <div className="space-y-2 md:col-span-2 xl:col-span-3">
                                <label className="text-xs font-medium text-muted-foreground">Nombre del repuesto</label>
                                <input
                                    type="text"
                                    value={form.part_name}
                                    onChange={(event) => setForm((current) => ({ ...current, part_name: event.target.value }))}
                                    className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">N° parte</label>
                            <input
                                type="text"
                                value={form.part_number}
                                onChange={(event) => setForm((current) => ({ ...current, part_number: event.target.value }))}
                                className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Cantidad</label>
                            <input
                                type="number"
                                min="1"
                                value={form.quantity}
                                onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                                className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Costo unitario</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.unit_cost}
                                onChange={(event) => setForm((current) => ({ ...current, unit_cost: event.target.value }))}
                                className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                            />
                        </div>
                        <div className="space-y-2 xl:col-span-2">
                            <label className="text-xs font-medium text-muted-foreground">Notas</label>
                            <textarea
                                value={form.notes}
                                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                                rows={3}
                                className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">Repuestos registrados</h2>
                {parts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aún no se han agregado repuestos para este ticket.</p>
                ) : (
                    <ul className="space-y-3">
                        {parts.map((part) => (
                            <li key={part.id} className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-foreground">
                                            {part.component
                                                ? [part.component.code, part.component.type?.name, part.component.brand?.name, part.component.model].filter(Boolean).join(' · ')
                                                : part.part_name || 'Repuesto externo'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {part.part_number ? `N° parte: ${part.part_number} · ` : ''}
                                            Origen: {part.source_type === 'stock' ? 'Stock' : 'Externo'} ·
                                            Cantidad: {part.quantity} ·
                                            Unit.: {money(part.unit_cost)} ·
                                            Total: {money(part.total_cost)}
                                        </p>
                                        {part.notes && (
                                            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{part.notes}</p>
                                        )}
                                    </div>
                                    {canEdit && (
                                        <button
                                            type="button"
                                            onClick={() => setPartToDelete(part)}
                                            className="cursor-pointer rounded-md border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/30"
                                        >
                                            Eliminar
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <DeleteConfirmModal
                open={partToDelete != null}
                onOpenChange={(open) => !open && setPartToDelete(null)}
                title="Eliminar repuesto"
                description="¿Deseas eliminar este repuesto del ticket?"
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                loading={deleting != null}
                onConfirm={handleDelete}
            />
        </div>
    );
}
