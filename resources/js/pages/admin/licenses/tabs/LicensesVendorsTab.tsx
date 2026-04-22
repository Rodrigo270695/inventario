import { router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { AppModal } from '@/components/app-modal';
import type { DataTableColumn, SortOrder } from '@/components/data-table';
import { DataTable } from '@/components/data-table';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';
import { TablePagination } from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { appendLicenseListQuery } from './license-query';
import type { LicenseFilters, Paginated, VendorItem } from './types';
import {
    LICENSES_DATA_TABLE_CLASSNAME,
    LICENSES_ICON_BTN_DELETE,
    LICENSES_ICON_BTN_EDIT,
    LICENSES_MOBILE_BTN_DELETE,
    LICENSES_MOBILE_BTN_EDIT,
    LICENSES_MODAL_SUBMIT_BTN,
    LICENSES_PRIMARY_ACTION_BTN,
} from './ui-classes';

type Props = {
    vendors: Paginated<VendorItem>;
    filters: LicenseFilters;
    canCreate: boolean;
    canUpdate: boolean;
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

function buildUrl(filters: LicenseFilters, page?: number): string {
    const search = new URLSearchParams();
    search.set('tab', 'vendors');
    appendLicenseListQuery(search, filters);
    if (page) search.set('vendors_page', String(page));
    return `/admin/licenses?${search.toString()}`;
}

export function LicensesVendorsTab({ vendors, filters, canCreate, canUpdate, canDelete }: Props) {
    const handleSort = useCallback(
        (key: string) => {
            const order: SortOrder =
                filters.vendors_sort_by === key && filters.vendors_sort_order === 'asc' ? 'desc' : 'asc';
            router.get(
                buildUrl({ ...filters, vendors_sort_by: key, vendors_sort_order: order }, 1),
                {},
                { preserveState: true, preserveScroll: true, replace: true }
            );
        },
        [filters]
    );

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<VendorItem | null>(null);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<VendorItem | null>(null);
    const [deletingLoading, setDeletingLoading] = useState(false);

    const openCreate = () => {
        setEditing(null);
        setName('');
        setModalOpen(true);
    };

    const openEdit = (item: VendorItem) => {
        setEditing(item);
        setName(item.name);
        setModalOpen(true);
    };

    const canSubmit = name.trim() !== '';

    const submit = () => {
        if (!canSubmit) return;
        setSaving(true);
        const payload = { name: name.trim() };
        if (editing) {
            router.put(`/admin/licenses/vendors/${editing.id}`, payload, {
                preserveScroll: true,
                onFinish: () => setSaving(false),
                onSuccess: () => setModalOpen(false),
            });
            return;
        }
        router.post('/admin/licenses/vendors', payload, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
            onSuccess: () => setModalOpen(false),
        });
    };

    const columns: DataTableColumn<VendorItem>[] = useMemo(
        () => [
            {
                key: 'name',
                label: 'Fabricante',
                sortable: true,
                className: 'text-foreground font-medium',
                render: (row) => row.name,
            },
            {
                key: 'created_at',
                label: 'Creado',
                sortable: true,
                className: 'text-foreground',
                render: (row) => formatDateTime(row.created_at),
            },
            {
                key: 'actions',
                label: '',
                className: 'w-0 text-right',
                render: (row) => (
                    <div className="flex justify-end gap-0.5">
                        {canUpdate && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={LICENSES_ICON_BTN_EDIT}
                                aria-label={`Editar ${row.name}`}
                                onClick={() => openEdit(row)}
                            >
                                <Pencil className="size-3.5" />
                            </Button>
                        )}
                        {canDelete && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={LICENSES_ICON_BTN_DELETE}
                                aria-label={`Eliminar ${row.name}`}
                                onClick={() => setDeleting(row)}
                            >
                                <Trash2 className="size-3.5" />
                            </Button>
                        )}
                    </div>
                ),
            },
        ],
        [canDelete, canUpdate]
    );

    return (
        <div className="space-y-0">
            <div className="flex justify-end border-b border-border bg-card px-3 py-2">
                {canCreate && (
                    <button type="button" className={LICENSES_PRIMARY_ACTION_BTN} onClick={openCreate}>
                        <Plus className="size-4 shrink-0" />
                        <span>Nuevo fabricante</span>
                    </button>
                )}
            </div>

            <div className="hidden md:block">
                <DataTable
                    className={`${LICENSES_DATA_TABLE_CLASSNAME} [&_table]:min-w-[520px]`}
                    columns={columns}
                    data={vendors.data}
                    keyExtractor={(row) => row.id}
                    sortBy={filters.vendors_sort_by}
                    sortOrder={filters.vendors_sort_order}
                    onSort={handleSort}
                    emptyMessage="No hay fabricantes registrados."
                    variant="default"
                />
            </div>
            <div className="md:hidden">
                {vendors.data.length === 0 ? (
                    <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                        No hay fabricantes registrados.
                    </p>
                ) : (
                    <ul className="flex flex-col gap-3 p-3 sm:p-4">
                        {vendors.data.map((row) => (
                            <li key={row.id}>
                                <article className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_0_rgba(15,23,42,0.05)] dark:shadow-none">
                                    <div className="space-y-2 p-4">
                                        <p className="text-base font-medium text-foreground">{row.name}</p>
                                        <dl className="grid grid-cols-1 gap-1.5 text-sm">
                                            <div className="flex flex-wrap gap-x-2">
                                                <dt className="shrink-0 text-muted-foreground">Creado:</dt>
                                                <dd className="text-foreground">{formatDateTime(row.created_at)}</dd>
                                            </div>
                                        </dl>
                                    </div>
                                    <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-muted/30 px-4 py-3">
                                        {canUpdate && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className={LICENSES_MOBILE_BTN_EDIT}
                                                aria-label={`Editar ${row.name}`}
                                                onClick={() => openEdit(row)}
                                            >
                                                <Pencil className="mr-1 size-3.5 shrink-0" />
                                                <span>Editar</span>
                                            </Button>
                                        )}
                                        {canDelete && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className={LICENSES_MOBILE_BTN_DELETE}
                                                aria-label={`Eliminar ${row.name}`}
                                                onClick={() => setDeleting(row)}
                                            >
                                                <Trash2 className="mr-1 size-3.5 shrink-0" />
                                                <span>Eliminar</span>
                                            </Button>
                                        )}
                                    </div>
                                </article>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="px-3 py-3">
                <TablePagination
                    from={vendors.from}
                    to={vendors.to}
                    total={vendors.total}
                    perPage={vendors.per_page}
                    currentPage={vendors.current_page}
                    lastPage={vendors.last_page}
                    links={vendors.links}
                    buildPageUrl={(page) => buildUrl(filters, page)}
                    onPerPageChange={() => {}}
                    perPageOptions={[10]}
                />
            </div>

            <AppModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                title={editing ? 'Editar fabricante' : 'Nuevo fabricante'}
                contentClassName="space-y-4"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-3">
                        <div className="space-y-2 md:col-span-3">
                            <Label htmlFor="vendor_name">
                                Nombre <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="vendor_name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={200}
                                placeholder="Ej.: Microsoft"
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
                            onClick={submit}
                        >
                            {saving ? 'Guardando…' : editing ? 'Guardar' : 'Crear fabricante'}
                        </Button>
                    </div>
                </div>
            </AppModal>

            <DeleteConfirmModal
                open={!!deleting}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Eliminar fabricante"
                description={
                    deleting
                        ? `¿Eliminar el fabricante «${deleting.name}»?`
                        : undefined
                }
                onConfirm={() => {
                    if (!deleting) return;
                    setDeletingLoading(true);
                    router.delete(`/admin/licenses/vendors/${deleting.id}`, {
                        preserveScroll: true,
                        onFinish: () => {
                            setDeletingLoading(false);
                            setDeleting(null);
                        },
                    });
                }}
                loading={deletingLoading}
            />
        </div>
    );
}
