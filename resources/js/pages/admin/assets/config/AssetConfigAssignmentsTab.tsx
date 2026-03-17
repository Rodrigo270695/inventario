import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { SearchableSelect } from '@/components/searchable-select';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { AssetConfigAssignment, AssetConfigAsset, AssetConfigUserOption } from './types';
import { CONDITION_LABELS, CONDITION_OPTIONS, formatDateShort, formatDateTimeShort, fullDisplayName } from './utils';

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
    assignments: AssetConfigAssignment[];
    usersForAssignment: AssetConfigUserOption[];
};

export function AssetConfigAssignmentsTab({ asset, assignments, usersForAssignment }: Props) {
    const [assignmentForm, setAssignmentForm] = useState({
        user_id: '',
        assigned_at: nowLocalForInput(),
        condition_out: '',
        notes: '',
    });
    const [savingAssignment, setSavingAssignment] = useState(false);
    const [returningId, setReturningId] = useState<string | null>(null);
    const [returnForm, setReturnForm] = useState({ returned_at: '', condition_in: '', notes: '' });
    const [savingReturn, setSavingReturn] = useState(false);

    const userSelectOptions = useMemo(
        () =>
            usersForAssignment.map((u) => {
                const fullName = [u.name, u.last_name].filter(Boolean).join(' ').trim() || u.usuario || u.id;
                return {
                    value: String(u.id),
                    label: fullName,
                    searchTerms: [u.last_name, u.usuario].filter(Boolean) as string[],
                };
            }),
        [usersForAssignment]
    );

    const handleNewAssignment = () => {
        if (!assignmentForm.user_id.trim()) return;
        setSavingAssignment(true);
        router.post(`/admin/assets/${asset.id}/assignments`, {
            user_id: assignmentForm.user_id,
            assigned_at: assignmentForm.assigned_at ? `${assignmentForm.assigned_at}:00` : undefined,
            condition_out: assignmentForm.condition_out || undefined,
            notes: assignmentForm.notes.trim() || undefined,
        }, {
            preserveScroll: true,
            onFinish: () => setSavingAssignment(false),
            onSuccess: () =>
                setAssignmentForm({
                    user_id: '',
                    assigned_at: nowLocalForInput(),
                    condition_out: '',
                    notes: '',
                }),
        });
    };

    const handleReturnAssignment = (assignmentId: string) => {
        setSavingReturn(true);
        router.put(`/admin/assets/${asset.id}/assignments/${assignmentId}/return`, {
            returned_at: returnForm.returned_at ? `${returnForm.returned_at}:00` : undefined,
            condition_in: returnForm.condition_in || undefined,
            notes: returnForm.notes.trim() || undefined,
        }, {
            preserveScroll: true,
            onFinish: () => {
                setSavingReturn(false);
                setReturningId(null);
                setReturnForm({ returned_at: '', condition_in: '', notes: '' });
            },
        });
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="rounded-xl border border-inv-primary/40 bg-inv-primary/5 p-4">
                <h2 className="mb-3 text-sm font-semibold text-foreground">Nueva asignación</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                        <label htmlFor="assign-user" className="text-muted-foreground text-xs font-medium">
                            Usuario
                        </label>
                        <SearchableSelect
                            id="assign-user"
                            value={assignmentForm.user_id}
                            onChange={(v) => setAssignmentForm((f) => ({ ...f, user_id: v }))}
                            options={userSelectOptions}
                            placeholder="Buscar usuario..."
                            noOptionsMessage="No hay coincidencias"
                        />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="assign-date" className="text-muted-foreground text-xs font-medium">
                            Fecha y hora asignación
                        </label>
                        <input
                            id="assign-date"
                            type="datetime-local"
                            value={assignmentForm.assigned_at}
                            onChange={(e) => setAssignmentForm((f) => ({ ...f, assigned_at: e.target.value }))}
                            className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                        />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="assign-condition" className="text-muted-foreground text-xs font-medium">
                            Condición al salida
                        </label>
                        <Select
                            value={assignmentForm.condition_out === '' ? '_' : assignmentForm.condition_out}
                            onValueChange={(v) =>
                                setAssignmentForm((f) => ({ ...f, condition_out: v === '_' ? '' : v }))
                            }
                        >
                            <SelectTrigger
                                id="assign-condition"
                                className="w-full border-border/70 bg-background px-3 py-2 text-sm"
                            >
                                <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">—</SelectItem>
                                {CONDITION_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={handleNewAssignment}
                            disabled={savingAssignment || !assignmentForm.user_id}
                            className="w-full cursor-pointer rounded-md bg-inv-primary px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                        >
                            {savingAssignment ? 'Guardando…' : 'Asignar'}
                        </button>
                    </div>
                </div>
                <div className="mt-3">
                    <label htmlFor="assign-notes" className="text-muted-foreground text-xs font-medium">
                        Notas (opcional)
                    </label>
                    <textarea
                        id="assign-notes"
                        value={assignmentForm.notes}
                        onChange={(e) => setAssignmentForm((f) => ({ ...f, notes: e.target.value }))}
                        rows={2}
                        placeholder="Notas de la asignación"
                        className="mt-1 w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                    />
                </div>
            </div>

            <h2 className="text-sm font-semibold text-foreground">Historial de asignaciones</h2>
            {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    Este activo aún no tiene asignaciones registradas.
                </p>
            ) : (
                <ul className="divide-y divide-border/80 rounded-lg border border-border/80 bg-muted/30">
                    {assignments.map((a) => (
                        <li key={a.id} className="flex flex-col gap-2 px-3 py-3 text-sm">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <p className="font-medium text-foreground">
                                        {a.user
                                            ? [a.user.name, a.user.last_name].filter(Boolean).join(' ') ||
                                              a.user.usuario ||
                                              '—'
                                            : '—'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Asignado: {formatDateTimeShort(a.assigned_at)}
                                        {a.condition_out &&
                                            ` · Condición salida: ${CONDITION_LABELS[a.condition_out] ?? a.condition_out}`}
                                        {a.returned_at && ` · Devuelto: ${formatDateTimeShort(a.returned_at)}`}
                                        {a.returned_at &&
                                            a.condition_in &&
                                            ` · Condición entrada: ${CONDITION_LABELS[a.condition_in] ?? a.condition_in}`}
                                    </p>
                                    {a.assigned_by && (
                                        <p className="text-[11px] text-muted-foreground">
                                            Asignado por: {fullDisplayName(a.assigned_by)}
                                        </p>
                                    )}
                                    {a.notes && (
                                        <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">
                                            {a.notes}
                                        </p>
                                    )}
                                </div>
                                {!a.returned_at && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setReturningId(a.id);
                                            setReturnForm({
                                                returned_at: nowLocalForInput(),
                                                condition_in: '',
                                                notes: '',
                                            });
                                        }}
                                        className="shrink-0 cursor-pointer rounded-md border border-amber-500/60 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
                                    >
                                        Registrar devolución
                                    </button>
                                )}
                            </div>
                            {returningId === a.id && (
                                <div className="mt-3 rounded-xl border border-inv-primary/40 bg-inv-primary/5 p-4">
                                    <h3 className="mb-3 text-sm font-semibold text-foreground">
                                        Registrar devolución
                                    </h3>
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                        <div className="space-y-1">
                                            <label htmlFor={`return-date-${a.id}`} className="text-muted-foreground text-xs font-medium">
                                                Fecha y hora devolución
                                            </label>
                                            <input
                                                id={`return-date-${a.id}`}
                                                type="datetime-local"
                                                value={returnForm.returned_at}
                                                onChange={(e) =>
                                                    setReturnForm((f) => ({ ...f, returned_at: e.target.value }))
                                                }
                                                className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label htmlFor={`return-condition-${a.id}`} className="text-muted-foreground text-xs font-medium">
                                                Condición al entrada
                                            </label>
                                            <Select
                                                value={returnForm.condition_in === '' ? '_' : returnForm.condition_in}
                                                onValueChange={(v) =>
                                                    setReturnForm((f) => ({ ...f, condition_in: v === '_' ? '' : v }))
                                                }
                                            >
                                                <SelectTrigger
                                                    id={`return-condition-${a.id}`}
                                                    className="w-full border-border/70 bg-background px-3 py-2 text-sm"
                                                >
                                                    <SelectValue placeholder="—" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="_">—</SelectItem>
                                                    {CONDITION_OPTIONS.map((o) => (
                                                        <SelectItem key={o.value} value={o.value}>
                                                            {o.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                type="button"
                                                onClick={() => handleReturnAssignment(a.id)}
                                                disabled={savingReturn}
                                                className="w-full cursor-pointer rounded-md bg-inv-primary px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                                            >
                                                {savingReturn ? 'Guardando…' : 'Guardar devolución'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <label htmlFor={`return-notes-${a.id}`} className="text-muted-foreground text-xs font-medium">
                                            Notas
                                        </label>
                                        <textarea
                                            id={`return-notes-${a.id}`}
                                            value={returnForm.notes}
                                            onChange={(e) =>
                                                setReturnForm((f) => ({ ...f, notes: e.target.value }))
                                            }
                                            rows={2}
                                            placeholder="Notas de la devolución"
                                            className="mt-1 w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setReturningId(null);
                                            setReturnForm({ returned_at: '', condition_in: '', notes: '' });
                                        }}
                                        className="mt-3 text-sm text-muted-foreground underline hover:text-foreground"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
