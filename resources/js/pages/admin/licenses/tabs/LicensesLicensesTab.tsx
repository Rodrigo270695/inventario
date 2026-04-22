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
import type { LicenseFilters, LicenseItem, Paginated, ProductOption } from './types';
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
    licenses: Paginated<LicenseItem>;
    filters: LicenseFilters;
    productsForSelect: ProductOption[];
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
};

type LicenseForm = {
    product_id: string;
    license_type: string;
    seats_total: string;
    seats_used: string;
    valid_until: string;
    cost: string;
    notes: string;
};

function formatDate(value?: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMoney(value: string | number | null | undefined): string {
    if (value == null || value === '') return '—';
    const amount = typeof value === 'string' ? Number.parseFloat(value) : value;
    if (Number.isNaN(amount)) return '—';
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
}

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
    search.set('tab', 'licenses');
    appendLicenseListQuery(search, filters);
    if (page) search.set('licenses_page', String(page));
    return `/admin/licenses?${search.toString()}`;
}

export function LicensesLicensesTab({ licenses, filters, productsForSelect, canCreate, canUpdate, canDelete }: Props) {
    const handleSort = useCallback(
        (key: string) => {
            const order: SortOrder =
                filters.licenses_sort_by === key && filters.licenses_sort_order === 'asc' ? 'desc' : 'asc';
            router.get(
                buildUrl({ ...filters, licenses_sort_by: key, licenses_sort_order: order }, 1),
                {},
                { preserveState: true, preserveScroll: true, replace: true }
            );
        },
        [filters]
    );

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<LicenseItem | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<LicenseItem | null>(null);
    const [deletingLoading, setDeletingLoading] = useState(false);
    const [form, setForm] = useState<LicenseForm>({
        product_id: '',
        license_type: '',
        seats_total: '1',
        seats_used: '0',
        valid_until: '',
        cost: '',
        notes: '',
    });

    const openCreate = () => {
        setEditing(null);
        setForm({
            product_id: '',
            license_type: '',
            seats_total: '1',
            seats_used: '0',
            valid_until: '',
            cost: '',
            notes: '',
        });
        setModalOpen(true);
    };

    const openEdit = (item: LicenseItem) => {
        setEditing(item);
        setForm({
            product_id: item.product_id,
            license_type: item.license_type ?? '',
            seats_total: String(item.seats_total ?? 1),
            seats_used: String(item.seats_used ?? 0),
            valid_until: item.valid_until ?? '',
            cost: item.cost != null ? String(item.cost) : '',
            notes: item.notes ?? '',
        });
        setModalOpen(true);
    };

    const seatsTotalNum = Number.parseInt(form.seats_total, 10);
    const seatsUsedRaw = form.seats_used.trim();
    const seatsUsedNum = seatsUsedRaw === '' ? 0 : Number.parseInt(form.seats_used, 10);
    const seatsTotalValid = Number.isFinite(seatsTotalNum) && seatsTotalNum >= 1;
    const seatsUsedValid =
        seatsUsedRaw === '' ||
        (Number.isFinite(seatsUsedNum) &&
            seatsUsedNum >= 0 &&
            (!seatsTotalValid || seatsUsedNum <= seatsTotalNum));
    const canSubmit = form.product_id !== '' && seatsTotalValid && seatsUsedValid;

    const submit = () => {
        if (!canSubmit) return;
        setSaving(true);
        const payload = {
            product_id: form.product_id,
            license_type: form.license_type || null,
            seats_total: Number(form.seats_total || 0),
            seats_used: Number(form.seats_used || 0),
            valid_until: form.valid_until || null,
            cost: form.cost || null,
            notes: form.notes || null,
        };
        if (editing) {
            router.put(`/admin/licenses/software-licenses/${editing.id}`, payload, {
                preserveScroll: true,
                onFinish: () => setSaving(false),
                onSuccess: () => setModalOpen(false),
            });
            return;
        }
        router.post('/admin/licenses/software-licenses', payload, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
            onSuccess: () => setModalOpen(false),
        });
    };

    const columns: DataTableColumn<LicenseItem>[] = useMemo(
        () => [
            {
                key: 'product',
                label: 'Producto',
                sortable: true,
                className: 'text-foreground font-medium',
                render: (row) => row.product?.name ?? '—',
            },
            {
                key: 'vendor',
                label: 'Fabricante',
                sortable: true,
                className: 'text-foreground',
                render: (row) => row.product?.vendor?.name ?? '—',
            },
            {
                key: 'license_type',
                label: 'Tipo',
                sortable: true,
                className: 'text-foreground',
                render: (row) => row.license_type ?? '—',
            },
            {
                key: 'seats_total',
                label: 'Asientos',
                sortable: true,
                className: 'text-foreground',
                render: (row) => (
                    <span className="tabular-nums">{row.seats_used}/{row.seats_total}</span>
                ),
            },
            {
                key: 'valid_until',
                label: 'Vence',
                sortable: true,
                className: 'text-foreground',
                render: (row) => formatDate(row.valid_until),
            },
            {
                key: 'cost',
                label: 'Costo',
                sortable: true,
                className: 'text-foreground',
                render: (row) => formatMoney(row.cost),
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
                                aria-label="Editar licencia"
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
                                aria-label="Eliminar licencia"
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
                        <span>Nueva licencia</span>
                    </button>
                )}
            </div>

            <div className="hidden md:block">
                <DataTable
                    className={`${LICENSES_DATA_TABLE_CLASSNAME} [&_table]:min-w-[1040px]`}
                    columns={columns}
                    data={licenses.data}
                    keyExtractor={(row) => row.id}
                    sortBy={filters.licenses_sort_by}
                    sortOrder={filters.licenses_sort_order}
                    onSort={handleSort}
                    emptyMessage="No hay licencias registradas."
                    variant="default"
                />
            </div>
            <div className="md:hidden">
                {licenses.data.length === 0 ? (
                    <p className="text-muted-foreground px-4 py-8 text-center text-sm">No hay licencias registradas.</p>
                ) : (
                    <ul className="flex flex-col gap-3 p-3 sm:p-4">
                        {licenses.data.map((row) => (
                            <li key={row.id}>
                                <article className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_0_rgba(15,23,42,0.05)] dark:shadow-none">
                                    <div className="space-y-2 p-4">
                                        <p className="text-base font-medium text-foreground">
                                            {row.product?.name ?? '—'}
                                        </p>
                                        <dl className="grid grid-cols-1 gap-1.5 text-sm">
                                            <div className="flex flex-wrap gap-x-2">
                                                <dt className="shrink-0 text-muted-foreground">Fabricante:</dt>
                                                <dd className="break-all text-foreground">
                                                    {row.product?.vendor?.name ?? '—'}
                                                </dd>
                                            </div>
                                            <div className="flex flex-wrap gap-x-2">
                                                <dt className="shrink-0 text-muted-foreground">Tipo:</dt>
                                                <dd className="text-foreground">{row.license_type ?? '—'}</dd>
                                            </div>
                                            <div className="flex flex-wrap gap-x-2">
                                                <dt className="shrink-0 text-muted-foreground">Asientos:</dt>
                                                <dd className="tabular-nums text-foreground">
                                                    {row.seats_used}/{row.seats_total}
                                                </dd>
                                            </div>
                                            <div className="flex flex-wrap gap-x-2">
                                                <dt className="shrink-0 text-muted-foreground">Vence:</dt>
                                                <dd className="text-foreground">{formatDate(row.valid_until)}</dd>
                                            </div>
                                            <div className="flex flex-wrap gap-x-2">
                                                <dt className="shrink-0 text-muted-foreground">Costo:</dt>
                                                <dd className="tabular-nums text-foreground">{formatMoney(row.cost)}</dd>
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
                                                aria-label="Editar licencia"
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
                                                aria-label="Eliminar licencia"
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
                    from={licenses.from}
                    to={licenses.to}
                    total={licenses.total}
                    perPage={licenses.per_page}
                    currentPage={licenses.current_page}
                    lastPage={licenses.last_page}
                    links={licenses.links}
                    buildPageUrl={(page) => buildUrl(filters, page)}
                    onPerPageChange={() => {}}
                    perPageOptions={[10]}
                />
            </div>

            <AppModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                title={editing ? 'Editar licencia' : 'Nueva licencia'}
                contentClassName="space-y-4"
                width="wide"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-3">
                        <div className="space-y-2 md:col-span-3">
                            <Label>
                                Producto <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={form.product_id || '_'}
                                onValueChange={(v) => setForm((prev) => ({ ...prev, product_id: v === '_' ? '' : v }))}
                            >
                                <SelectTrigger className="w-full border-border bg-background">
                                    <SelectValue placeholder="Seleccione producto" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_">Seleccione producto</SelectItem>
                                    {productsForSelect.map((product) => (
                                        <SelectItem key={product.id} value={product.id}>
                                            {product.vendor?.name ? `${product.vendor.name} · ${product.name}` : product.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>
                                Tipo de licencia{' '}
                                <span className="font-normal text-muted-foreground">(opcional)</span>
                            </Label>
                            <Select
                                value={form.license_type || '_'}
                                onValueChange={(v) => setForm((prev) => ({ ...prev, license_type: v === '_' ? '' : v }))}
                            >
                                <SelectTrigger className="w-full border-border bg-background">
                                    <SelectValue placeholder="—" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_">Sin tipo</SelectItem>
                                    <SelectItem value="oem">OEM</SelectItem>
                                    <SelectItem value="retail">Retail</SelectItem>
                                    <SelectItem value="volume">Volume</SelectItem>
                                    <SelectItem value="subscription">Subscription</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="license_seats_total">
                                Asientos totales <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="license_seats_total"
                                type="number"
                                min={1}
                                value={form.seats_total}
                                onChange={(e) => setForm((prev) => ({ ...prev, seats_total: e.target.value }))}
                                className="border-border bg-background"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="license_seats_used">
                                Asientos usados{' '}
                                <span className="font-normal text-muted-foreground">(opcional)</span>
                            </Label>
                            <Input
                                id="license_seats_used"
                                type="number"
                                min={0}
                                value={form.seats_used}
                                onChange={(e) => setForm((prev) => ({ ...prev, seats_used: e.target.value }))}
                                className="border-border bg-background"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="license_valid_until">
                                Válida hasta{' '}
                                <span className="font-normal text-muted-foreground">(opcional)</span>
                            </Label>
                            <Input
                                id="license_valid_until"
                                type="date"
                                value={form.valid_until}
                                onChange={(e) => setForm((prev) => ({ ...prev, valid_until: e.target.value }))}
                                className="border-border bg-background"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="license_cost">
                                Costo (PEN){' '}
                                <span className="font-normal text-muted-foreground">(opcional)</span>
                            </Label>
                            <Input
                                id="license_cost"
                                type="number"
                                min={0}
                                step="0.01"
                                value={form.cost}
                                onChange={(e) => setForm((prev) => ({ ...prev, cost: e.target.value }))}
                                className="border-border bg-background"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-3">
                            <Label htmlFor="license_notes">
                                Notas{' '}
                                <span className="font-normal text-muted-foreground">(opcional)</span>
                            </Label>
                            <textarea
                                id="license_notes"
                                value={form.notes}
                                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                                maxLength={5000}
                                rows={3}
                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                placeholder="Notas opcionales"
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
                            {saving ? 'Guardando…' : editing ? 'Guardar' : 'Crear licencia'}
                        </Button>
                    </div>
                </div>
            </AppModal>

            <DeleteConfirmModal
                open={!!deleting}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Eliminar licencia"
                description={deleting ? `¿Eliminar la licencia de «${deleting.product?.name ?? 'producto'}»?` : undefined}
                onConfirm={() => {
                    if (!deleting) return;
                    setDeletingLoading(true);
                    router.delete(`/admin/licenses/software-licenses/${deleting.id}`, {
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
