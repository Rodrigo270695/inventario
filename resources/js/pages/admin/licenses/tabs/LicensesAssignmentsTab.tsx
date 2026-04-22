import { router } from '@inertiajs/react';
import { Ban, Plus, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { AppModal } from '@/components/app-modal';
import type { DataTableColumn, SortOrder } from '@/components/data-table';
import { DataTable } from '@/components/data-table';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';
import type { SearchableSelectOption } from '@/components/searchable-select';
import { SearchableSelect } from '@/components/searchable-select';
import { TablePagination } from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { appendLicenseListQuery } from './license-query';
import type { AssetOption, AssignmentItem, LicenseFilters, LicenseOption, Paginated } from './types';
import {
    LICENSES_DATA_TABLE_CLASSNAME,
    LICENSES_ICON_BTN_DELETE,
    LICENSES_ICON_BTN_REVOKE,
    LICENSES_MOBILE_BTN_DELETE,
    LICENSES_MOBILE_BTN_REVOKE,
    LICENSES_MODAL_SUBMIT_BTN,
    LICENSES_PRIMARY_ACTION_BTN,
} from './ui-classes';

type Props = {
    assignments: Paginated<AssignmentItem>;
    filters: LicenseFilters;
    licensesForSelect: LicenseOption[];
    assetsForSelect: AssetOption[];
    canAssign: boolean;
    canRevoke: boolean;
    canDelete: boolean;
};

function formatDateTime(value?: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatDateOnly(value?: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function buildUrl(filters: LicenseFilters, page?: number): string {
    const search = new URLSearchParams();
    search.set('tab', 'assignments');
    appendLicenseListQuery(search, filters);
    if (page) search.set('assignments_page', String(page));
    return `/admin/licenses?${search.toString()}`;
}

export function LicensesAssignmentsTab({
    assignments,
    filters,
    licensesForSelect,
    assetsForSelect,
    canAssign,
    canRevoke,
    canDelete,
}: Props) {
    const handleSort = useCallback(
        (key: string) => {
            const order: SortOrder =
                filters.assignments_sort_by === key && filters.assignments_sort_order === 'asc' ? 'desc' : 'asc';
            router.get(
                buildUrl({ ...filters, assignments_sort_by: key, assignments_sort_order: order }, 1),
                {},
                { preserveState: true, preserveScroll: true, replace: true }
            );
        },
        [filters]
    );

    const [modalOpen, setModalOpen] = useState(false);
    const [softwareLicenseId, setSoftwareLicenseId] = useState('');
    const [assetId, setAssetId] = useState('');
    const [assignedAt, setAssignedAt] = useState('');
    const [validUntil, setValidUntil] = useState('');
    const [saving, setSaving] = useState(false);
    const [revokeItem, setRevokeItem] = useState<AssignmentItem | null>(null);
    const [deleteItem, setDeleteItem] = useState<AssignmentItem | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const licenseOptions: SearchableSelectOption[] = licensesForSelect.map((license) => ({
        value: license.id,
        label: `${license.product?.vendor?.name ?? 'Sin fabricante'} · ${license.product?.name ?? 'Sin producto'} (${license.seats_used}/${license.seats_total})`,
        searchTerms: [license.license_type ?? '', license.valid_until ?? ''],
    }));

    const assetOptions: SearchableSelectOption[] = assetsForSelect.map((asset) => ({
        value: asset.id,
        label: asset.code,
        searchTerms: [asset.serial_number ?? '', asset.model?.brand?.name ?? '', asset.model?.name ?? ''],
    }));

    const openCreate = () => {
        setSoftwareLicenseId('');
        setAssetId('');
        setAssignedAt('');
        setValidUntil('');
        setModalOpen(true);
    };

    const canSubmit = softwareLicenseId !== '' && assetId !== '';

    const createAssignment = () => {
        if (!canSubmit) return;
        setSaving(true);
        router.post(
            '/admin/licenses/assignments',
            {
                software_license_id: softwareLicenseId,
                asset_id: assetId,
                assigned_at: assignedAt || null,
                valid_until: validUntil || null,
            },
            {
                preserveScroll: true,
                onFinish: () => setSaving(false),
                onSuccess: () => setModalOpen(false),
            }
        );
    };

    const columns: DataTableColumn<AssignmentItem>[] = useMemo(
        () => [
            {
                key: 'product',
                label: 'Licencia',
                sortable: true,
                className: 'text-foreground font-medium',
                render: (row) =>
                    `${row.software_license?.product?.vendor?.name ?? '—'} · ${row.software_license?.product?.name ?? '—'}`,
            },
            {
                key: 'asset',
                label: 'Activo',
                sortable: true,
                className: 'text-foreground',
                render: (row) => row.asset?.code ?? '—',
            },
            {
                key: 'assigned_at',
                label: 'Asignado',
                sortable: true,
                className: 'text-foreground',
                render: (row) => formatDateTime(row.assigned_at),
            },
            {
                key: 'revoked_at',
                label: 'Revocado',
                sortable: true,
                className: 'text-foreground',
                render: (row) => formatDateTime(row.revoked_at),
            },
            {
                key: 'valid_until',
                label: 'Válida hasta',
                sortable: true,
                className: 'text-foreground',
                render: (row) => formatDateOnly(row.valid_until),
            },
            {
                key: 'status',
                label: 'Estado',
                className: 'text-foreground',
                render: (row) => (
                    <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            row.revoked_at
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-emerald-100 text-emerald-700'
                        }`}
                    >
                        {row.revoked_at ? 'Revocada' : 'Activa'}
                    </span>
                ),
            },
            {
                key: 'actions',
                label: '',
                className: 'w-0 text-right',
                render: (row) => (
                    <div className="flex justify-end gap-0.5">
                        {canRevoke && !row.revoked_at && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={LICENSES_ICON_BTN_REVOKE}
                                aria-label="Revocar asignación"
                                onClick={() => setRevokeItem(row)}
                            >
                                <Ban className="size-3.5" />
                            </Button>
                        )}
                        {canDelete && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={LICENSES_ICON_BTN_DELETE}
                                aria-label="Eliminar asignación"
                                onClick={() => setDeleteItem(row)}
                            >
                                <Trash2 className="size-3.5" />
                            </Button>
                        )}
                    </div>
                ),
            },
        ],
        [canDelete, canRevoke]
    );

    return (
        <div className="space-y-0">
            <div className="flex justify-end border-b border-border bg-card px-3 py-2">
                {canAssign && (
                    <button type="button" className={LICENSES_PRIMARY_ACTION_BTN} onClick={openCreate}>
                        <Plus className="size-4 shrink-0" />
                        <span>Nueva asignación</span>
                    </button>
                )}
            </div>

            <div className="hidden md:block">
                <DataTable
                    className={`${LICENSES_DATA_TABLE_CLASSNAME} [&_table]:min-w-[960px]`}
                    columns={columns}
                    data={assignments.data}
                    keyExtractor={(row) => row.id}
                    sortBy={filters.assignments_sort_by}
                    sortOrder={filters.assignments_sort_order}
                    onSort={handleSort}
                    emptyMessage="No hay asignaciones registradas."
                    variant="default"
                />
            </div>
            <div className="md:hidden">
                {assignments.data.length === 0 ? (
                    <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                        No hay asignaciones registradas.
                    </p>
                ) : (
                    <ul className="flex flex-col gap-3 p-3 sm:p-4">
                        {assignments.data.map((row) => {
                            const licenseTitle = `${row.software_license?.product?.vendor?.name ?? '—'} · ${row.software_license?.product?.name ?? '—'}`;
                            return (
                                <li key={row.id}>
                                    <article className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_0_rgba(15,23,42,0.05)] dark:shadow-none">
                                        <div className="space-y-2 p-4">
                                            <p className="text-base font-medium text-foreground break-words">
                                                {licenseTitle}
                                            </p>
                                            <dl className="grid grid-cols-1 gap-1.5 text-sm">
                                                <div className="flex flex-wrap gap-x-2">
                                                    <dt className="shrink-0 text-muted-foreground">Activo:</dt>
                                                    <dd className="text-foreground">{row.asset?.code ?? '—'}</dd>
                                                </div>
                                                <div className="flex flex-wrap gap-x-2">
                                                    <dt className="shrink-0 text-muted-foreground">Asignado:</dt>
                                                    <dd className="text-foreground">{formatDateTime(row.assigned_at)}</dd>
                                                </div>
                                                <div className="flex flex-wrap gap-x-2">
                                                    <dt className="shrink-0 text-muted-foreground">Revocado:</dt>
                                                    <dd className="text-foreground">{formatDateTime(row.revoked_at)}</dd>
                                                </div>
                                                <div className="flex flex-wrap gap-x-2">
                                                    <dt className="shrink-0 text-muted-foreground">Válida hasta:</dt>
                                                    <dd className="text-foreground">{formatDateOnly(row.valid_until)}</dd>
                                                </div>
                                                <div className="flex flex-wrap gap-x-2">
                                                    <dt className="shrink-0 text-muted-foreground">Estado:</dt>
                                                    <dd className="text-foreground">
                                                        <span
                                                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                                row.revoked_at
                                                                    ? 'bg-slate-100 text-slate-600'
                                                                    : 'bg-emerald-100 text-emerald-700'
                                                            }`}
                                                        >
                                                            {row.revoked_at ? 'Revocada' : 'Activa'}
                                                        </span>
                                                    </dd>
                                                </div>
                                            </dl>
                                        </div>
                                        <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-muted/30 px-4 py-3">
                                            {canRevoke && !row.revoked_at && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className={LICENSES_MOBILE_BTN_REVOKE}
                                                    aria-label="Revocar asignación"
                                                    onClick={() => setRevokeItem(row)}
                                                >
                                                    <Ban className="mr-1 size-3.5 shrink-0" />
                                                    <span>Revocar</span>
                                                </Button>
                                            )}
                                            {canDelete && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className={LICENSES_MOBILE_BTN_DELETE}
                                                    aria-label="Eliminar asignación"
                                                    onClick={() => setDeleteItem(row)}
                                                >
                                                    <Trash2 className="mr-1 size-3.5 shrink-0" />
                                                    <span>Eliminar</span>
                                                </Button>
                                            )}
                                        </div>
                                    </article>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <div className="px-3 py-3">
                <TablePagination
                    from={assignments.from}
                    to={assignments.to}
                    total={assignments.total}
                    perPage={assignments.per_page}
                    currentPage={assignments.current_page}
                    lastPage={assignments.last_page}
                    links={assignments.links}
                    buildPageUrl={(page) => buildUrl(filters, page)}
                    onPerPageChange={() => {}}
                    perPageOptions={[10]}
                />
            </div>

            <AppModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                title="Nueva asignación"
                contentClassName="space-y-4"
                width="wide"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                            <Label>
                                Licencia <span className="text-red-500">*</span>
                            </Label>
                            <SearchableSelect
                                value={softwareLicenseId}
                                onChange={setSoftwareLicenseId}
                                options={licenseOptions}
                                placeholder="Buscar licencia"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>
                                Activo <span className="text-red-500">*</span>
                            </Label>
                            <SearchableSelect
                                value={assetId}
                                onChange={setAssetId}
                                options={assetOptions}
                                placeholder="Buscar activo"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="assignment_assigned_at">
                                Fecha asignación{' '}
                                <span className="font-normal text-muted-foreground">(opcional)</span>
                            </Label>
                            <Input
                                id="assignment_assigned_at"
                                type="datetime-local"
                                value={assignedAt}
                                onChange={(e) => setAssignedAt(e.target.value)}
                                className="border-border bg-background"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="assignment_valid_until">
                                Válida hasta{' '}
                                <span className="font-normal text-muted-foreground">(opcional)</span>
                            </Label>
                            <Input
                                id="assignment_valid_until"
                                type="date"
                                value={validUntil}
                                onChange={(e) => setValidUntil(e.target.value)}
                                className="border-border bg-background"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 border-t border-border pt-2">
                        <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            className={LICENSES_MODAL_SUBMIT_BTN}
                            disabled={saving || !canSubmit}
                            onClick={createAssignment}
                        >
                            {saving ? 'Guardando…' : 'Crear asignación'}
                        </Button>
                    </div>
                </div>
            </AppModal>

            <DeleteConfirmModal
                open={!!revokeItem}
                onOpenChange={(open) => !open && setRevokeItem(null)}
                title="Revocar asignación"
                description={revokeItem ? `¿Revocar asignación de ${revokeItem.asset?.code ?? 'activo'}?` : undefined}
                onConfirm={() => {
                    if (!revokeItem) return;
                    setActionLoading(true);
                    router.post(`/admin/licenses/assignments/${revokeItem.id}/revoke`, {}, {
                        preserveScroll: true,
                        onFinish: () => {
                            setActionLoading(false);
                            setRevokeItem(null);
                        },
                    });
                }}
                loading={actionLoading}
                confirmText="Revocar"
            />

            <DeleteConfirmModal
                open={!!deleteItem}
                onOpenChange={(open) => !open && setDeleteItem(null)}
                title="Eliminar asignación"
                description={deleteItem ? `¿Eliminar asignación de ${deleteItem.asset?.code ?? 'activo'}?` : undefined}
                onConfirm={() => {
                    if (!deleteItem) return;
                    setActionLoading(true);
                    router.delete(`/admin/licenses/assignments/${deleteItem.id}`, {
                        preserveScroll: true,
                        onFinish: () => {
                            setActionLoading(false);
                            setDeleteItem(null);
                        },
                    });
                }}
                loading={actionLoading}
            />
        </div>
    );
}
