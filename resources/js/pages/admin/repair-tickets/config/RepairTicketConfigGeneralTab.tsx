import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { AppModal } from '@/components/app-modal';
import { SearchableSelect, type SearchableSelectOption } from '@/components/searchable-select';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { AssetOption, ComponentOption, RepairShopOption, RepairTicketConfigTicket, UserOption } from './types';
import {
    CONDITION_LABELS,
    FAILURE_LABELS,
    MODE_LABELS,
    PRIORITY_LABELS,
    STATUS_LABELS,
    formatDateTimeShort,
    fullDisplayName,
    maintenanceItemLabel,
    maintenanceLocationPath,
    money,
} from './utils';

const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Baja' },
    { value: 'medium', label: 'Media' },
    { value: 'high', label: 'Alta' },
    { value: 'critical', label: 'Crítica' },
];

const MODE_OPTIONS = [
    { value: 'internal', label: 'Interno' },
    { value: 'external', label: 'Externo' },
    { value: 'warranty', label: 'Garantía' },
];

const FAILURE_OPTIONS = [
    { value: '', label: '—' },
    { value: 'hardware', label: 'Hardware' },
    { value: 'electrical', label: 'Eléctrica' },
    { value: 'physical', label: 'Física' },
    { value: 'cosmetic', label: 'Estética' },
    { value: 'connectivity', label: 'Conectividad' },
    { value: 'other', label: 'Otro' },
];

const CONDITION_OPTIONS = [
    { value: '', label: '—' },
    { value: 'new', label: 'Nuevo' },
    { value: 'good', label: 'Bueno' },
    { value: 'regular', label: 'Regular' },
    { value: 'damaged', label: 'Dañado' },
    { value: 'obsolete', label: 'Obsoleto' },
];

const ASSET_STATUS_OPTIONS = [
    { value: 'stored', label: 'Almacenado' },
    { value: 'active', label: 'En uso' },
    { value: 'in_repair', label: 'En reparación' },
    { value: 'in_transit', label: 'En tránsito' },
    { value: 'disposed', label: 'Dado de baja' },
    { value: 'sold', label: 'Vendido' },
];

type Props = {
    repairTicket: RepairTicketConfigTicket;
    assetsForSelect: AssetOption[];
    componentsForSelect: ComponentOption[];
    usersForSelect: UserOption[];
    repairShopsForSelect: RepairShopOption[];
    canEdit: boolean;
};

export function RepairTicketConfigGeneralTab({
    repairTicket,
    assetsForSelect,
    componentsForSelect,
    usersForSelect,
    repairShopsForSelect,
    canEdit,
}: Props) {
    const [itemType, setItemType] = useState<'asset' | 'component'>(repairTicket.asset ? 'asset' : 'component');
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        asset_id: repairTicket.asset_id ?? '',
        component_id: repairTicket.component_id ?? '',
        priority: repairTicket.priority,
        failure_type: repairTicket.failure_type ?? '',
        maintenance_mode: repairTicket.maintenance_mode,
        technician_id: repairTicket.technician_id ?? '',
        repair_shop_id: repairTicket.repair_shop_id ?? '',
        estimated_cost: repairTicket.estimated_cost == null ? '' : String(repairTicket.estimated_cost),
        approved_budget: repairTicket.approved_budget == null ? '' : String(repairTicket.approved_budget),
        issue_description: repairTicket.issue_description ?? '',
        diagnosis: repairTicket.diagnosis ?? '',
        solution: repairTicket.solution ?? '',
        condition_in: repairTicket.condition_in ?? '',
        condition_out: repairTicket.condition_out ?? '',
        external_reference: repairTicket.external_reference ?? '',
        notes: repairTicket.notes ?? '',
    });

    const assetOptions = useMemo<SearchableSelectOption[]>(
        () =>
            assetsForSelect.map((asset) => ({
                value: asset.id,
                label: asset.code,
                searchTerms: [asset.serial_number ?? '', asset.category?.name ?? '', asset.model?.brand?.name ?? '', asset.model?.name ?? ''],
            })),
        [assetsForSelect]
    );

    const componentOptions = useMemo<SearchableSelectOption[]>(
        () =>
            componentsForSelect.map((component) => ({
                value: component.id,
                label: component.code,
                searchTerms: [component.serial_number ?? '', component.type?.name ?? '', component.brand?.name ?? '', component.model ?? ''],
            })),
        [componentsForSelect]
    );

    const technicianOptions = useMemo<SearchableSelectOption[]>(
        () =>
            usersForSelect.map((user) => ({
                value: user.id,
                label: [user.name, user.last_name].filter(Boolean).join(' ').trim() || user.usuario || user.id,
                searchTerms: [user.usuario ?? ''],
            })),
        [usersForSelect]
    );

    const shopOptions = useMemo<SearchableSelectOption[]>(
        () => repairShopsForSelect.map((shop) => ({ value: shop.id, label: shop.name })),
        [repairShopsForSelect]
    );

    const canEditItemBinding = canEdit && repairTicket.status === 'pending_approval';
    const canEditLocationAndEstimate = canEdit && repairTicket.status === 'pending_approval';
    const [statusModal, setStatusModal] = useState<null | 'approve' | 'diagnosed' | 'in_progress' | 'completed'>(null);
    const [statusComment, setStatusComment] = useState('');
    const [finalStatus, setFinalStatus] = useState<string>(
        repairTicket.asset?.status || repairTicket.component?.status || 'stored'
    );
    const [conditionOutCompleted, setConditionOutCompleted] = useState<string>(
        repairTicket.condition_out ?? ''
    );

    const handleSubmit = () => {
        setSaving(true);
        const payload = {
            ...form,
            asset_id: itemType === 'asset' ? form.asset_id || null : null,
            component_id: itemType === 'component' ? form.component_id || null : null,
            failure_type: form.failure_type || null,
            technician_id: form.technician_id || null,
            repair_shop_id: form.repair_shop_id || null,
            estimated_cost: form.estimated_cost === '' ? null : Number(form.estimated_cost),
            approved_budget: form.approved_budget === '' ? null : Number(form.approved_budget),
            diagnosis: form.diagnosis.trim() || null,
            solution: form.solution.trim() || null,
            condition_in: form.condition_in || null,
            condition_out: form.condition_out || null,
            external_reference: form.external_reference.trim() || null,
            notes: form.notes.trim() || null,
        };

        router.put(`/admin/repair-tickets/${repairTicket.id}`, payload, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
        });
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                    <p className="text-xs font-medium text-muted-foreground">Código</p>
                    <p className="text-sm text-foreground">{repairTicket.code}</p>
                </div>
                <div>
                    <p className="text-xs font-medium text-muted-foreground">Estado</p>
                    <p className="text-sm text-foreground">{STATUS_LABELS[repairTicket.status] ?? repairTicket.status}</p>
                </div>
                <div>
                    <p className="text-xs font-medium text-muted-foreground">Bien afectado</p>
                    <p className="text-sm text-foreground">{maintenanceItemLabel(repairTicket)}</p>
                </div>
                <div>
                    <p className="text-xs font-medium text-muted-foreground">Ubicación</p>
                    <p className="text-sm text-foreground">{maintenanceLocationPath(repairTicket)}</p>
                </div>
                {repairTicket.warehouse && (
                    <>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Zonal</p>
                            <p className="text-sm text-foreground">
                                {repairTicket.warehouse.office?.zonal?.name ??
                                    repairTicket.warehouse.office?.zonal?.code ??
                                    '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Oficina</p>
                            <p className="text-sm text-foreground">
                                {repairTicket.warehouse.office?.name ??
                                    repairTicket.warehouse.office?.code ??
                                    '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Almacén</p>
                            <p className="text-sm text-foreground">
                                {repairTicket.warehouse.name}
                                {repairTicket.warehouse.code ? ` (${repairTicket.warehouse.code})` : ''}
                            </p>
                        </div>
                    </>
                )}
                <div>
                    <p className="text-xs font-medium text-muted-foreground">Reportado por</p>
                    <p className="text-sm text-foreground">{fullDisplayName(repairTicket.opened_by_user)}</p>
                </div>
                <div>
                    <p className="text-xs font-medium text-muted-foreground">Reportado el</p>
                    <p className="text-sm text-foreground">{formatDateTimeShort(repairTicket.reported_at)}</p>
                </div>
                <div>
                    <p className="text-xs font-medium text-muted-foreground">Aprobado por</p>
                    <p className="text-sm text-foreground">{fullDisplayName(repairTicket.approved_by_user)}</p>
                </div>
                <div>
                    <p className="text-xs font-medium text-muted-foreground">Fecha de aprobación</p>
                    <p className="text-sm text-foreground">{formatDateTimeShort(repairTicket.approved_at)}</p>
                </div>
                <div>
                    <p className="text-xs font-medium text-muted-foreground">Presupuesto aprobado</p>
                    <p className="text-sm text-foreground">{money(repairTicket.approved_budget)}</p>
                </div>
            </div>

            {(repairTicket.rejection_reason || repairTicket.cancellation_reason) && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-50/70 p-4 dark:bg-amber-900/20">
                    <h2 className="text-sm font-semibold text-foreground">Observación de cierre</h2>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                        {repairTicket.rejection_reason ?? repairTicket.cancellation_reason}
                    </p>
                </div>
            )}

            <div className="space-y-4 rounded-xl border border-inv-primary/40 bg-inv-primary/5 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <h2 className="text-sm font-semibold text-foreground">Datos generales</h2>
                    <div className="flex flex-wrap gap-2">
                        {canEdit && (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={saving}
                                className="cursor-pointer rounded-md bg-inv-primary px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                            >
                                {saving ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                        )}
                        {canEdit &&
                            repairTicket.status === 'approved' && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStatusModal('diagnosed');
                                        setStatusComment('');
                                    }}
                                    className="cursor-pointer rounded-md border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800 hover:bg-violet-100"
                                >
                                    Marcar diagnosticado
                                </button>
                            )}
                        {canEdit &&
                            (repairTicket.status === 'approved' || repairTicket.status === 'diagnosed') && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStatusModal('in_progress');
                                        setStatusComment('');
                                    }}
                                    className="cursor-pointer rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-100"
                                >
                                    Marcar en proceso
                                </button>
                            )}
                        {canEdit && repairTicket.status === 'in_progress' && (
                            <button
                                type="button"
                                onClick={() => {
                                    setStatusModal('completed');
                                    setStatusComment('');
                                }}
                                className="cursor-pointer rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                            >
                                Marcar completado
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Tipo de bien</label>
                        <Select
                            value={itemType}
                            onValueChange={(value: 'asset' | 'component') => {
                                setItemType(value);
                                setForm((current) => ({ ...current, asset_id: '', component_id: '' }));
                            }}
                            disabled={!canEditItemBinding}
                        >
                            <SelectTrigger className="w-full border-border/70 bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="asset">Activo</SelectItem>
                                <SelectItem value="component">Componente</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2 xl:col-span-3">
                        <label className="text-xs font-medium text-muted-foreground">{itemType === 'asset' ? 'Activo' : 'Componente'}</label>
                        {itemType === 'asset' ? (
                            <SearchableSelect
                                value={form.asset_id}
                                onChange={(value) => setForm((current) => ({ ...current, asset_id: value }))}
                                options={assetOptions}
                                placeholder="Buscar activo..."
                                disabled={!canEditItemBinding}
                            />
                        ) : (
                            <SearchableSelect
                                value={form.component_id}
                                onChange={(value) => setForm((current) => ({ ...current, component_id: value }))}
                                options={componentOptions}
                                placeholder="Buscar componente..."
                                disabled={!canEditItemBinding}
                            />
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Prioridad</label>
                        <Select value={form.priority} onValueChange={(value) => setForm((current) => ({ ...current, priority: value }))} disabled={!canEdit}>
                            <SelectTrigger className="w-full border-border/70 bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PRIORITY_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Modo</label>
                        <Select value={form.maintenance_mode} onValueChange={(value) => setForm((current) => ({ ...current, maintenance_mode: value }))} disabled={!canEdit}>
                            <SelectTrigger className="w-full border-border/70 bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {MODE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Tipo de falla</label>
                        <Select value={form.failure_type === '' ? '_' : form.failure_type} onValueChange={(value) => setForm((current) => ({ ...current, failure_type: value === '_' ? '' : value }))} disabled={!canEdit}>
                            <SelectTrigger className="w-full border-border/70 bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {FAILURE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value || '_'} value={option.value || '_'}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Condición ingreso</label>
                        <Select value={form.condition_in === '' ? '_' : form.condition_in} onValueChange={(value) => setForm((current) => ({ ...current, condition_in: value === '_' ? '' : value }))} disabled={!canEdit}>
                            <SelectTrigger className="w-full border-border/70 bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CONDITION_OPTIONS.map((option) => (
                                    <SelectItem key={option.value || '_'} value={option.value || '_'}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Condición salida</label>
                        <Select value={form.condition_out === '' ? '_' : form.condition_out} onValueChange={(value) => setForm((current) => ({ ...current, condition_out: value === '_' ? '' : value }))} disabled={!canEdit}>
                            <SelectTrigger className="w-full border-border/70 bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CONDITION_OPTIONS.map((option) => (
                                    <SelectItem key={option.value || '_'} value={option.value || '_'}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 xl:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">Técnico responsable</label>
                        <SearchableSelect
                            value={form.technician_id}
                            onChange={(value) => setForm((current) => ({ ...current, technician_id: value }))}
                            options={technicianOptions}
                            placeholder="Buscar técnico..."
                            disabled={!canEdit}
                        />
                    </div>

                    <div className="space-y-2 xl:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">Taller</label>
                        <SearchableSelect
                            value={form.repair_shop_id}
                            onChange={(value) => setForm((current) => ({ ...current, repair_shop_id: value }))}
                            options={shopOptions}
                            placeholder="Buscar taller..."
                            disabled={!canEdit}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Costo estimado</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.estimated_cost}
                            onChange={(event) => setForm((current) => ({ ...current, estimated_cost: event.target.value }))}
                            disabled={!canEditLocationAndEstimate}
                            className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Presupuesto aprobado</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.approved_budget}
                            onChange={(event) => setForm((current) => ({ ...current, approved_budget: event.target.value }))}
                            disabled={!canEdit}
                            className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                        />
                    </div>

                    <div className="space-y-2 xl:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">Referencia externa</label>
                        <input
                            type="text"
                            value={form.external_reference}
                            onChange={(event) => setForm((current) => ({ ...current, external_reference: event.target.value }))}
                            disabled={!canEdit}
                            className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Incidencia reportada</label>
                    <textarea
                        value={form.issue_description}
                        onChange={(event) => setForm((current) => ({ ...current, issue_description: event.target.value }))}
                        disabled={!canEdit}
                        rows={4}
                        className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                    />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Diagnóstico</label>
                        <textarea
                            value={form.diagnosis}
                            onChange={(event) => setForm((current) => ({ ...current, diagnosis: event.target.value }))}
                            disabled={!canEdit}
                            rows={5}
                            className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Solución</label>
                        <textarea
                            value={form.solution}
                            onChange={(event) => setForm((current) => ({ ...current, solution: event.target.value }))}
                            disabled={!canEdit}
                            rows={5}
                            className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Notas</label>
                    <textarea
                        value={form.notes}
                        onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                        disabled={!canEdit}
                        rows={3}
                        className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                    />
                </div>

                {!canEdit && (
                    <p className="text-xs text-muted-foreground">
                        No tienes permiso para editar este ticket. Puedes revisar la información en las demás pestañas.
                    </p>
                )}
            </div>

            <AppModal
                open={statusModal !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setStatusModal(null);
                        setStatusComment('');
                        setConditionOutCompleted(repairTicket.condition_out ?? '');
                    }
                }}
                title={
                    statusModal === 'diagnosed'
                        ? 'Comentario de diagnóstico'
                        : statusModal === 'in_progress'
                          ? 'Comentario de inicio de reparación'
                          : statusModal === 'completed'
                              ? 'Comentario de cierre'
                              : 'Comentario'
                }
                contentClassName="space-y-4"
            >
                <p className="text-sm text-muted-foreground">
                    Escribe una nota para dejar registro en el historial de este cambio de estado.
                </p>
                {statusModal === 'completed' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                Condición de salida
                            </label>
                            <Select
                                value={conditionOutCompleted === '' ? '_' : conditionOutCompleted}
                                onValueChange={(v) => setConditionOutCompleted(v === '_' ? '' : v)}
                            >
                                <SelectTrigger className="w-full border-border/70 bg-background">
                                    <SelectValue placeholder="Seleccionar condición" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CONDITION_OPTIONS.map((option) => (
                                        <SelectItem key={option.value || '_'} value={option.value || '_'}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                Estado final del bien
                            </label>
                            <Select value={finalStatus} onValueChange={setFinalStatus}>
                                <SelectTrigger className="w-full border-border/70 bg-background">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ASSET_STATUS_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
                <textarea
                    value={statusComment}
                    onChange={(event) => setStatusComment(event.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                    placeholder="Comentario opcional…"
                />
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        className="cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
                        onClick={() => {
                            setStatusModal(null);
                            setStatusComment('');
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="cursor-pointer rounded-md bg-inv-primary px-3 py-2 text-xs font-semibold text-white hover:bg-inv-primary/90"
                        onClick={() => {
                            if (!statusModal) return;
                            const comment = statusComment.trim() || undefined;
                            const payload: Record<string, unknown> = {};
                            if (comment) payload.comment = comment;
                            if (statusModal === 'completed') {
                                payload.final_status = finalStatus;
                                if (conditionOutCompleted !== '') payload.condition_out = conditionOutCompleted;
                            }
                            const url =
                                statusModal === 'diagnosed'
                                    ? `/admin/repair-tickets/${repairTicket.id}/diagnosed`
                                    : statusModal === 'in_progress'
                                        ? `/admin/repair-tickets/${repairTicket.id}/in-progress`
                                        : `/admin/repair-tickets/${repairTicket.id}/completed`;
                            router.post(url, payload, { preserveScroll: true });
                            setStatusModal(null);
                            setStatusComment('');
                        }}
                    >
                        Confirmar
                    </button>
                </div>
            </AppModal>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-border/70 bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">Prioridad actual</p>
                    <p className="mt-1 text-sm text-foreground">{PRIORITY_LABELS[repairTicket.priority] ?? repairTicket.priority}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">Modo actual</p>
                    <p className="mt-1 text-sm text-foreground">{MODE_LABELS[repairTicket.maintenance_mode] ?? repairTicket.maintenance_mode}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">Falla</p>
                    <p className="mt-1 text-sm text-foreground">{FAILURE_LABELS[repairTicket.failure_type ?? ''] ?? '—'}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">Condiciones</p>
                    <p className="mt-1 text-sm text-foreground">
                        Entrada: {CONDITION_LABELS[repairTicket.condition_in ?? ''] ?? '—'}<br />
                        Salida: {CONDITION_LABELS[repairTicket.condition_out ?? ''] ?? '—'}
                    </p>
                </div>
            </div>
        </div>
    );
}
