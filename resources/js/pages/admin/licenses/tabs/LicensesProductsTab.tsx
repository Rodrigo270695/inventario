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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { appendLicenseListQuery } from './license-query';
import type { LicenseFilters, Paginated, ProductItem, VendorOption } from './types';
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
    products: Paginated<ProductItem>;
    filters: LicenseFilters;
    vendorsForSelect: VendorOption[];
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
};

type ProductForm = {
    vendor_id: string;
    name: string;
    is_tracked: boolean;
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
    search.set('tab', 'products');
    appendLicenseListQuery(search, filters);
    if (page) search.set('products_page', String(page));
    return `/admin/licenses?${search.toString()}`;
}

export function LicensesProductsTab({ products, filters, vendorsForSelect, canCreate, canUpdate, canDelete }: Props) {
    const handleSort = useCallback(
        (key: string) => {
            const order: SortOrder =
                filters.products_sort_by === key && filters.products_sort_order === 'asc' ? 'desc' : 'asc';
            router.get(
                buildUrl({ ...filters, products_sort_by: key, products_sort_order: order }, 1),
                {},
                { preserveState: true, preserveScroll: true, replace: true }
            );
        },
        [filters]
    );

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<ProductItem | null>(null);
    const [form, setForm] = useState<ProductForm>({
        vendor_id: '',
        name: '',
        is_tracked: true,
    });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<ProductItem | null>(null);
    const [deletingLoading, setDeletingLoading] = useState(false);

    const openCreate = () => {
        setEditing(null);
        setForm({ vendor_id: '', name: '', is_tracked: true });
        setModalOpen(true);
    };

    const openEdit = (item: ProductItem) => {
        setEditing(item);
        setForm({
            vendor_id: item.vendor_id,
            name: item.name,
            is_tracked: item.is_tracked,
        });
        setModalOpen(true);
    };

    const canSubmit = form.vendor_id !== '' && form.name.trim() !== '';

    const submit = () => {
        if (!canSubmit) return;
        setSaving(true);
        const payload = {
            vendor_id: form.vendor_id,
            name: form.name.trim(),
            is_tracked: form.is_tracked,
        };
        if (editing) {
            router.put(`/admin/licenses/products/${editing.id}`, payload, {
                preserveScroll: true,
                onFinish: () => setSaving(false),
                onSuccess: () => setModalOpen(false),
            });
            return;
        }
        router.post('/admin/licenses/products', payload, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
            onSuccess: () => setModalOpen(false),
        });
    };

    const columns: DataTableColumn<ProductItem>[] = useMemo(
        () => [
            {
                key: 'name',
                label: 'Producto',
                sortable: true,
                className: 'text-foreground font-medium',
                render: (row) => row.name,
            },
            {
                key: 'vendor',
                label: 'Fabricante',
                sortable: true,
                className: 'text-foreground',
                render: (row) => row.vendor?.name ?? '—',
            },
            {
                key: 'is_tracked',
                label: 'Rastreable',
                sortable: true,
                className: 'text-foreground',
                render: (row) => (
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${row.is_tracked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {row.is_tracked ? 'Sí' : 'No'}
                    </span>
                ),
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
                        <span>Nuevo producto</span>
                    </button>
                )}
            </div>

            <div className="hidden md:block">
                <DataTable
                    className={`${LICENSES_DATA_TABLE_CLASSNAME} [&_table]:min-w-[720px]`}
                    columns={columns}
                    data={products.data}
                    keyExtractor={(row) => row.id}
                    sortBy={filters.products_sort_by}
                    sortOrder={filters.products_sort_order}
                    onSort={handleSort}
                    emptyMessage="No hay productos registrados."
                    variant="default"
                />
            </div>
            <div className="md:hidden">
                {products.data.length === 0 ? (
                    <p className="text-muted-foreground px-4 py-8 text-center text-sm">No hay productos registrados.</p>
                ) : (
                    <ul className="flex flex-col gap-3 p-3 sm:p-4">
                        {products.data.map((row) => (
                            <li key={row.id}>
                                <article className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_0_rgba(15,23,42,0.05)] dark:shadow-none">
                                    <div className="space-y-2 p-4">
                                        <p className="text-base font-medium text-foreground">{row.name}</p>
                                        <dl className="grid grid-cols-1 gap-1.5 text-sm">
                                            <div className="flex flex-wrap gap-x-2">
                                                <dt className="shrink-0 text-muted-foreground">Fabricante:</dt>
                                                <dd className="break-all text-foreground">{row.vendor?.name ?? '—'}</dd>
                                            </div>
                                            <div className="flex flex-wrap gap-x-2">
                                                <dt className="shrink-0 text-muted-foreground">Rastreable:</dt>
                                                <dd className="text-foreground">
                                                    <span
                                                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${row.is_tracked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                                                    >
                                                        {row.is_tracked ? 'Sí' : 'No'}
                                                    </span>
                                                </dd>
                                            </div>
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
                    from={products.from}
                    to={products.to}
                    total={products.total}
                    perPage={products.per_page}
                    currentPage={products.current_page}
                    lastPage={products.last_page}
                    links={products.links}
                    buildPageUrl={(page) => buildUrl(filters, page)}
                    onPerPageChange={() => {}}
                    perPageOptions={[10]}
                />
            </div>

            <AppModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                title={editing ? 'Editar producto' : 'Nuevo producto'}
                contentClassName="space-y-4"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>
                                Fabricante <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={form.vendor_id || '_'}
                                onValueChange={(v) => setForm((prev) => ({ ...prev, vendor_id: v === '_' ? '' : v }))}
                            >
                                <SelectTrigger className="w-full border-border bg-background">
                                    <SelectValue placeholder="Seleccione fabricante" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_">Seleccione fabricante</SelectItem>
                                    {vendorsForSelect.map((vendor) => (
                                        <SelectItem key={vendor.id} value={vendor.id}>
                                            {vendor.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="product_name">
                                Nombre <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="product_name"
                                value={form.name}
                                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                maxLength={200}
                                placeholder="Ej.: Office 365"
                                className="border-border bg-background"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-3">
                            <Label>Seguimiento</Label>
                            <Select
                                value={form.is_tracked ? 'yes' : 'no'}
                                onValueChange={(v) => setForm((prev) => ({ ...prev, is_tracked: v === 'yes' }))}
                            >
                                <SelectTrigger className="w-full border-border bg-background">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="yes">Rastreable</SelectItem>
                                    <SelectItem value="no">No rastreable</SelectItem>
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
                            {saving ? 'Guardando…' : editing ? 'Guardar' : 'Crear producto'}
                        </Button>
                    </div>
                </div>
            </AppModal>

            <DeleteConfirmModal
                open={!!deleting}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Eliminar producto"
                description={deleting ? `¿Eliminar el producto «${deleting.name}»?` : undefined}
                onConfirm={() => {
                    if (!deleting) return;
                    setDeletingLoading(true);
                    router.delete(`/admin/licenses/products/${deleting.id}`, {
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
