import { router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { appendLicenseListQuery } from './license-query';
import type { AssetOption, InstallationItem, LicenseFilters, Paginated, ProductOption } from './types';
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
    installations: Paginated<InstallationItem>;
    filters: LicenseFilters;
    assetsForSelect: AssetOption[];
    productsForSelect: ProductOption[];
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
};

type InstallationForm = {
    asset_id: string;
    product_id: string;
    version: string;
    detected_at: string;
    is_authorized: boolean;
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
    search.set('tab', 'installations');
    appendLicenseListQuery(search, filters);
    if (page) search.set('installations_page', String(page));
    return `/admin/licenses?${search.toString()}`;
}

export function LicensesInstallationsTab({
    installations,
    filters,
    assetsForSelect,
    productsForSelect,
    canCreate,
    canUpdate,
    canDelete,
}: Props) {
    const handleSort = useCallback(
        (key: string) => {
            const order: SortOrder =
                filters.installations_sort_by === key && filters.installations_sort_order === 'asc' ? 'desc' : 'asc';
            router.get(
                buildUrl({ ...filters, installations_sort_by: key, installations_sort_order: order }, 1),
                {},
                { preserveState: true, preserveScroll: true, replace: true }
            );
        },
        [filters]
    );

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<InstallationItem | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<InstallationItem | null>(null);
    const [deletingLoading, setDeletingLoading] = useState(false);
    const [form, setForm] = useState<InstallationForm>({
        asset_id: '',
        product_id: '',
        version: '',
        detected_at: '',
        is_authorized: false,
    });

    const assetOptions: SearchableSelectOption[] = assetsForSelect.map((asset) => ({
        value: asset.id,
        label: asset.code,
        searchTerms: [asset.serial_number ?? '', asset.model?.brand?.name ?? '', asset.model?.name ?? ''],
    }));

    const productOptions: SearchableSelectOption[] = productsForSelect.map((product) => ({
        value: product.id,
        label: `${product.vendor?.name ?? 'Sin fabricante'} · ${product.name}`,
        searchTerms: [product.name, product.vendor?.name ?? ''],
    }));

    const openCreate = () => {
        setEditing(null);
        setForm({
            asset_id: '',
            product_id: '',
            version: '',
            detected_at: '',
            is_authorized: false,
        });
        setModalOpen(true);
    };

    const openEdit = (item: InstallationItem) => {
        setEditing(item);
        setForm({
            asset_id: item.asset_id,
            product_id: item.product_id,
            version: item.version ?? '',
            detected_at: item.detected_at ? new Date(item.detected_at).toISOString().slice(0, 16) : '',
            is_authorized: item.is_authorized,
        });
        setModalOpen(true);
    };

    const canSubmit = form.asset_id !== '' && form.product_id !== '';

    const submit = () => {
        if (!canSubmit) return;
        setSaving(true);
        const payload = {
            asset_id: form.asset_id,
            product_id: form.product_id,
            version: form.version || null,
            detected_at: form.detected_at || null,
            is_authorized: form.is_authorized,
        };
        if (editing) {
            router.put(`/admin/licenses/installations/${editing.id}`, payload, {
                preserveScroll: true,
                onFinish: () => setSaving(false),
                onSuccess: () => setModalOpen(false),
            });
            return;
        }
        router.post('/admin/licenses/installations', payload, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
            onSuccess: () => setModalOpen(false),
        });
    };

    const columns: DataTableColumn<InstallationItem>[] = useMemo(
        () => [
            {
                key: 'asset',
                label: 'Activo',
                sortable: true,
                className: 'text-foreground font-medium',
                render: (row) => row.asset?.code ?? '—',
            },
            {
                key: 'product',
                label: 'Producto',
                sortable: true,
                className: 'text-foreground',
                render: (row) => `${row.product?.vendor?.name ?? '—'} · ${row.product?.name ?? '—'}`,
            },
            {
                key: 'version',
                label: 'Versión',
                sortable: true,
                className: 'text-foreground',
                render: (row) => row.version ?? '—',
            },
            {
                key: 'detected_at',
                label: 'Detectado',
                sortable: true,
                className: 'text-foreground',
                render: (row) => formatDateTime(row.detected_at),
            },
            {
                key: 'is_authorized',
                label: 'Autorizado',
                sortable: true,
                className: 'text-foreground',
                render: (row) => (
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${row.is_authorized ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {row.is_authorized ? 'Sí' : 'No'}
                    </span>
                ),
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
                                aria-label="Editar instalación"
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
                                aria-label="Eliminar instalación"
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
                        <span>Nueva instalación</span>
                    </button>
                )}
            </div>

            <div className="hidden md:block">
                <DataTable
                    className={`${LICENSES_DATA_TABLE_CLASSNAME} [&_table]:min-w-[880px]`}
                    columns={columns}
                    data={installations.data}
                    keyExtractor={(row) => row.id}
                    sortBy={filters.installations_sort_by}
                    sortOrder={filters.installations_sort_order}
                    onSort={handleSort}
                    emptyMessage="No hay instalaciones registradas."
                    variant="default"
                />
            </div>
            <div className="md:hidden">
                {installations.data.length === 0 ? (
                    <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                        No hay instalaciones registradas.
                    </p>
                ) : (
                    <ul className="flex flex-col gap-3 p-3 sm:p-4">
                        {installations.data.map((row) => {
                            const productLine = `${row.product?.vendor?.name ?? '—'} · ${row.product?.name ?? '—'}`;
                            return (
                                <li key={row.id}>
                                    <article className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_0_rgba(15,23,42,0.05)] dark:shadow-none">
                                        <div className="space-y-2 p-4">
                                            <p className="text-base font-medium text-foreground">{row.asset?.code ?? '—'}</p>
                                            <dl className="grid grid-cols-1 gap-1.5 text-sm">
                                                <div className="flex flex-wrap gap-x-2">
                                                    <dt className="shrink-0 text-muted-foreground">Producto:</dt>
                                                    <dd className="break-all text-foreground">{productLine}</dd>
                                                </div>
                                                <div className="flex flex-wrap gap-x-2">
                                                    <dt className="shrink-0 text-muted-foreground">Versión:</dt>
                                                    <dd className="text-foreground">{row.version ?? '—'}</dd>
                                                </div>
                                                <div className="flex flex-wrap gap-x-2">
                                                    <dt className="shrink-0 text-muted-foreground">Detectado:</dt>
                                                    <dd className="text-foreground">{formatDateTime(row.detected_at)}</dd>
                                                </div>
                                                <div className="flex flex-wrap gap-x-2">
                                                    <dt className="shrink-0 text-muted-foreground">Autorizado:</dt>
                                                    <dd className="text-foreground">
                                                        <span
                                                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${row.is_authorized ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}
                                                        >
                                                            {row.is_authorized ? 'Sí' : 'No'}
                                                        </span>
                                                    </dd>
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
                                                    aria-label="Editar instalación"
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
                                                    aria-label="Eliminar instalación"
                                                    onClick={() => setDeleting(row)}
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
                    from={installations.from}
                    to={installations.to}
                    total={installations.total}
                    perPage={installations.per_page}
                    currentPage={installations.current_page}
                    lastPage={installations.last_page}
                    links={installations.links}
                    buildPageUrl={(page) => buildUrl(filters, page)}
                    onPerPageChange={() => {}}
                    perPageOptions={[10]}
                />
            </div>

            <AppModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                title={editing ? 'Editar instalación' : 'Nueva instalación'}
                contentClassName="space-y-4"
                width="wide"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                            <Label>
                                Activo <span className="text-red-500">*</span>
                            </Label>
                            <SearchableSelect
                                value={form.asset_id}
                                onChange={(value) => setForm((prev) => ({ ...prev, asset_id: value }))}
                                options={assetOptions}
                                placeholder="Buscar activo"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>
                                Producto <span className="text-red-500">*</span>
                            </Label>
                            <SearchableSelect
                                value={form.product_id}
                                onChange={(value) => setForm((prev) => ({ ...prev, product_id: value }))}
                                options={productOptions}
                                placeholder="Buscar producto"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="install_version">
                                Versión{' '}
                                <span className="font-normal text-muted-foreground">(opcional)</span>
                            </Label>
                            <Input
                                id="install_version"
                                value={form.version}
                                onChange={(e) => setForm((prev) => ({ ...prev, version: e.target.value }))}
                                maxLength={100}
                                className="border-border bg-background"
                                placeholder="Ej.: 1.0.0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="install_detected_at">
                                Detectado en{' '}
                                <span className="font-normal text-muted-foreground">(opcional)</span>
                            </Label>
                            <Input
                                id="install_detected_at"
                                type="datetime-local"
                                value={form.detected_at}
                                onChange={(e) => setForm((prev) => ({ ...prev, detected_at: e.target.value }))}
                                className="border-border bg-background"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Autorización</Label>
                            <Select
                                value={form.is_authorized ? 'yes' : 'no'}
                                onValueChange={(v) => setForm((prev) => ({ ...prev, is_authorized: v === 'yes' }))}
                            >
                                <SelectTrigger className="w-full border-border bg-background">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="yes">Autorizado</SelectItem>
                                    <SelectItem value="no">No autorizado</SelectItem>
                                </SelectContent>
                            </Select>
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
                            {saving ? 'Guardando…' : editing ? 'Guardar' : 'Crear instalación'}
                        </Button>
                    </div>
                </div>
            </AppModal>

            <DeleteConfirmModal
                open={!!deleting}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Eliminar instalación"
                description={deleting ? `¿Eliminar instalación de ${deleting.asset?.code ?? 'activo'}?` : undefined}
                onConfirm={() => {
                    if (!deleting) return;
                    setDeletingLoading(true);
                    router.delete(`/admin/licenses/installations/${deleting.id}`, {
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
