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
import type { RepairTicketConfigTicket, RepairTicketCost, SupplierOption } from './types';
import { COST_TYPE_LABELS, formatDateTimeShort, money } from './utils';

const COST_OPTIONS = [
    { value: 'labour', label: 'Mano de obra' },
    { value: 'transport', label: 'Transporte' },
    { value: 'external_service', label: 'Servicio externo' },
    { value: 'miscellaneous', label: 'Misceláneo' },
];

const DOCUMENT_OPTIONS = [
    { value: '', label: '—' },
    { value: 'factura', label: 'Factura' },
    { value: 'recibo_honorarios', label: 'Recibo por honorarios' },
    { value: 'boleta', label: 'Boleta' },
    { value: 'ticket', label: 'Ticket' },
];

type Props = {
    repairTicket: RepairTicketConfigTicket;
    costs: RepairTicketCost[];
    suppliersForSelect: SupplierOption[];
    canEdit: boolean;
};

function nowLocalForInput() {
    const date = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function RepairTicketConfigCostsTab({ repairTicket, costs, suppliersForSelect, canEdit }: Props) {
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [costToDelete, setCostToDelete] = useState<RepairTicketCost | null>(null);
    const [form, setForm] = useState({
        type: 'labour',
        amount: '',
        supplier_id: '',
        document_type: '',
        document_number: '',
        description: '',
        incurred_at: nowLocalForInput(),
    });

    const supplierOptions = useMemo<SearchableSelectOption[]>(
        () =>
            suppliersForSelect.map((supplier) => ({
                value: supplier.id,
                label: supplier.name,
                searchTerms: [supplier.ruc ?? ''],
            })),
        [suppliersForSelect]
    );

    const totalCosts = useMemo(
        () => costs.reduce((sum, cost) => sum + Number(cost.amount ?? 0), 0),
        [costs]
    );

    const handleSave = () => {
        setSaving(true);
        const payload = {
            ...form,
            amount: Number(form.amount || 0),
            supplier_id: form.supplier_id || null,
            document_type: form.document_type || null,
            document_number: form.document_number.trim() || null,
            description: form.description.trim() || null,
            incurred_at: form.incurred_at ? `${form.incurred_at}:00` : null,
        };

        router.post(`/admin/repair-tickets/${repairTicket.id}/costs`, payload, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
            onSuccess: () => {
                setForm({
                    type: 'labour',
                    amount: '',
                    supplier_id: '',
                    document_type: '',
                    document_number: '',
                    description: '',
                    incurred_at: nowLocalForInput(),
                });
            },
        });
    };

    const handleDelete = () => {
        if (!costToDelete) return;
        setDeleting(costToDelete.id);
        router.delete(`/admin/repair-tickets/${repairTicket.id}/costs/${costToDelete.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(null);
                setCostToDelete(null);
            },
        });
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-border/80 bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">Costos registrados</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{costs.length}</p>
                </div>
                <div className="rounded-xl border border-border/80 bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">Total acumulado</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{money(totalCosts)}</p>
                </div>
                <div className="rounded-xl border border-border/80 bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">Presupuesto aprobado</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{money(repairTicket.approved_budget)}</p>
                </div>
            </div>

            {canEdit && (
                <div className="space-y-4 rounded-xl border border-inv-primary/40 bg-inv-primary/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-sm font-semibold text-foreground">Registrar costo</h2>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="cursor-pointer rounded-md bg-inv-primary px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                        >
                            {saving ? 'Guardando...' : 'Guardar costo'}
                        </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                            <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value }))}>
                                <SelectTrigger className="w-full border-border/70 bg-background">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {COST_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Monto</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.amount}
                                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                                className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                            />
                        </div>
                        <div className="space-y-2 xl:col-span-2">
                            <label className="text-xs font-medium text-muted-foreground">Proveedor</label>
                            <SearchableSelect
                                value={form.supplier_id}
                                onChange={(value) => setForm((current) => ({ ...current, supplier_id: value }))}
                                options={supplierOptions}
                                placeholder="Buscar proveedor..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Tipo documento</label>
                            <Select value={form.document_type === '' ? '_' : form.document_type} onValueChange={(value) => setForm((current) => ({ ...current, document_type: value === '_' ? '' : value }))}>
                                <SelectTrigger className="w-full border-border/70 bg-background">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DOCUMENT_OPTIONS.map((option) => (
                                        <SelectItem key={option.value || '_'} value={option.value || '_'}>{option.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">N° documento</label>
                            <input
                                type="text"
                                value={form.document_number}
                                onChange={(event) => setForm((current) => ({ ...current, document_number: event.target.value }))}
                                className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Fecha y hora</label>
                            <input
                                type="datetime-local"
                                value={form.incurred_at}
                                onChange={(event) => setForm((current) => ({ ...current, incurred_at: event.target.value }))}
                                className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                            />
                        </div>
                        <div className="space-y-2 xl:col-span-4">
                            <label className="text-xs font-medium text-muted-foreground">Descripción</label>
                            <textarea
                                value={form.description}
                                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                                rows={3}
                                className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">Costos registrados</h2>
                {costs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aún no se han registrado costos para este ticket.</p>
                ) : (
                    <ul className="space-y-3">
                        {costs.map((cost) => (
                            <li key={cost.id} className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-foreground">
                                            {COST_TYPE_LABELS[cost.type] ?? cost.type} · {money(cost.amount)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {cost.supplier?.name ?? 'Sin proveedor'} · {formatDateTimeShort(cost.incurred_at)}
                                            {cost.document_type ? ` · ${cost.document_type}` : ''}
                                            {cost.document_number ? ` · ${cost.document_number}` : ''}
                                        </p>
                                        {cost.description && (
                                            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{cost.description}</p>
                                        )}
                                    </div>
                                    {canEdit && (
                                        <button
                                            type="button"
                                            onClick={() => setCostToDelete(cost)}
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
                open={costToDelete != null}
                onOpenChange={(open) => !open && setCostToDelete(null)}
                title="Eliminar costo"
                description="¿Deseas eliminar este costo del ticket?"
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                loading={deleting != null}
                onConfirm={handleDelete}
            />
        </div>
    );
}
