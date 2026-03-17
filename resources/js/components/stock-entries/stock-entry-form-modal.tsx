import { useForm } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
import { AppModal } from '@/components/app-modal';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type WarehouseOption = {
    id: string;
    name: string;
    code: string | null;
    office?: { id: string; zonal_id?: string; name?: string; code?: string | null; zonal?: { id: string; name?: string; code?: string } | null } | null;
};

type InvoiceOption = {
    id: string;
    invoice_number: string;
    purchase_order_id: string | null;
    purchase_order?: {
        id: string;
        code: string | null;
        office_id?: string;
        office?: { id: string; name?: string; code?: string | null; zonal?: { id: string; name?: string; code?: string } | null } | null;
    } | null;
};

type UserOption = { id: string; name: string; last_name: string; usuario: string; zonal_ids?: string[] };

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoices: InvoiceOption[];
    warehouses: WarehouseOption[];
    users: UserOption[];
};

function formatWarehouseLabel(wh: WarehouseOption | null | undefined): string {
    if (!wh) return '—';
    const parts = [
        wh.office?.zonal?.name ?? wh.office?.zonal?.code ?? null,
        wh.office?.name ?? wh.office?.code ?? null,
        wh.name ?? wh.code ?? null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' / ') : (wh.name ?? wh.code ?? '—');
}

const PERU_TZ = 'America/Lima';

function getTodayInPeru(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: PERU_TZ });
}

export function StockEntryFormModal({
    open,
    onOpenChange,
    invoices,
    warehouses,
    users,
}: Props) {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        entry_date: getTodayInPeru(),
        invoice_id: '',
        warehouse_id: '',
        received_by: '',
        notes: '',
    });

    useEffect(() => {
        if (!open) {
            clearErrors();
            return;
        }
        const timer = setTimeout(() => {
            document.body.style.pointerEvents = '';
        }, 0);
        return () => {
            clearTimeout(timer);
            document.body.style.pointerEvents = 'auto';
        };
    }, [open, clearErrors]);

    useEffect(() => {
        if (!open) return;
        setData({
            entry_date: getTodayInPeru(),
            invoice_id: '',
            warehouse_id: '',
            received_by: '',
            notes: '',
        });
    }, [open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            invoice_id: data.invoice_id,
            warehouse_id: data.warehouse_id,
            entry_date: data.entry_date,
            received_by: data.received_by === '' ? null : data.received_by,
            notes: data.notes.trim() === '' ? null : data.notes.trim(),
            status: 'draft',
        };
        post('/admin/stock-entries', {
            preserveScroll: true,
            data: payload,
            transform: () => payload,
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        });
    };

    const selectedInvoice = useMemo(
        () => invoices.find((inv) => inv.id === data.invoice_id),
        [invoices, data.invoice_id]
    );
    const selectedWarehouse = useMemo(
        () => warehouses.find((w) => w.id === data.warehouse_id),
        [warehouses, data.warehouse_id]
    );

    const zonalIdFromWarehouse = useMemo(() => {
        const office = selectedWarehouse?.office;
        return office?.zonal_id ?? office?.zonal?.id ?? null;
    }, [selectedWarehouse]);

    const usersInZonal = useMemo(() => {
        if (!zonalIdFromWarehouse) return users;
        return users.filter((u) => u.zonal_ids?.length && u.zonal_ids.includes(zonalIdFromWarehouse));
    }, [users, zonalIdFromWarehouse]);

    useEffect(() => {
        if (!zonalIdFromWarehouse || !data.received_by) return;
        const currentUser = users.find((u) => u.id === data.received_by);
        const belongsToZonal = currentUser?.zonal_ids?.includes(zonalIdFromWarehouse);
        if (!belongsToZonal) setData('received_by', '');
    }, [zonalIdFromWarehouse, data.received_by, users, setData]);

    const canSubmit =
        data.invoice_id !== '' &&
        data.warehouse_id !== '' &&
        data.entry_date !== '';

    const invoiceSelectOptions = useMemo(
        () =>
            invoices.map((inv) => {
                const label = inv.purchase_order?.code
                    ? `${inv.invoice_number} (OC #${inv.purchase_order.code})`
                    : inv.invoice_number;
                return {
                    value: String(inv.id),
                    label,
                    searchTerms: [inv.invoice_number, inv.purchase_order?.code ?? ''].filter(Boolean),
                };
            }),
        [invoices]
    );

    const warehouseSelectOptions = useMemo(
        () =>
            warehouses.map((w) => ({
                value: String(w.id),
                label: formatWarehouseLabel(w),
                searchTerms: [w.name, w.code ?? '', w.office?.name ?? '', w.office?.zonal?.name ?? ''].filter(Boolean),
            })),
        [warehouses]
    );

    const userSelectOptions = useMemo(
        () =>
            usersInZonal.map((u) => {
                const fullName = [u.name, u.last_name].filter(Boolean).join(' ').trim() || u.usuario || u.name;
                return {
                    value: String(u.id),
                    label: fullName,
                    searchTerms: [u.name, u.last_name, u.usuario].filter(Boolean),
                };
            }),
        [usersInZonal]
    );

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title="Nuevo ingreso"
            contentClassName="space-y-4"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label>Factura <span className="text-red-500">*</span></Label>
                    <SearchableSelect
                        value={data.invoice_id}
                        onChange={(v) => setData('invoice_id', v)}
                        options={invoiceSelectOptions}
                        placeholder="Buscar factura..."
                        noOptionsMessage="No hay facturas disponibles (todas ya tienen ingreso)"
                    />
                    {errors.invoice_id && (
                        <p className="text-sm text-destructive">{errors.invoice_id}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>Almacén <span className="text-red-500">*</span></Label>
                    <SearchableSelect
                        value={data.warehouse_id}
                        onChange={(v) => setData('warehouse_id', v)}
                        options={warehouseSelectOptions}
                        placeholder="Buscar almacén..."
                        noOptionsMessage="No hay almacenes"
                    />
                    {errors.warehouse_id && (
                        <p className="text-sm text-destructive">{errors.warehouse_id}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>Fecha de ingreso <span className="text-red-500">*</span></Label>
                    <Input
                        type="date"
                        value={data.entry_date}
                        onChange={(e) => setData('entry_date', e.target.value)}
                        className={errors.entry_date ? 'border-destructive' : ''}
                    />
                    {errors.entry_date && (
                        <p className="text-sm text-destructive">{errors.entry_date}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>Recibido por</Label>
                    <SearchableSelect
                        value={data.received_by}
                        onChange={(v) => setData('received_by', v)}
                        options={userSelectOptions}
                        placeholder={zonalIdFromWarehouse ? 'Buscar usuario del zonal… (opcional)' : 'Seleccione primero un almacén'}
                        noOptionsMessage={
                            zonalIdFromWarehouse
                                ? (usersInZonal.length === 0 ? 'No hay usuarios asignados a este zonal' : 'No hay coincidencias')
                                : 'Seleccione un almacén para ver usuarios del zonal'
                        }
                    />
                    {zonalIdFromWarehouse && (
                        <p className="text-muted-foreground text-xs">
                            Solo se muestran usuarios asignados al zonal del almacén seleccionado.
                        </p>
                    )}
                    {errors.received_by && (
                        <p className="text-sm text-destructive">{errors.received_by}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>Notas (opcional)</Label>
                    <textarea
                        value={data.notes}
                        onChange={(e) => setData('notes', e.target.value)}
                        maxLength={5000}
                        rows={3}
                        className={cn(
                            'flex w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                            errors.notes && 'border-destructive'
                        )}
                        placeholder="Observaciones del ingreso"
                    />
                    {errors.notes && (
                        <p className="text-sm text-destructive">{errors.notes}</p>
                    )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="cursor-pointer"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={processing || !canSubmit}
                        className="cursor-pointer bg-inv-primary hover:bg-inv-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing ? 'Guardando…' : 'Crear ingreso'}
                    </Button>
                </div>
            </form>
        </AppModal>
    );
}
