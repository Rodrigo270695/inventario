import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { AppModal } from '@/components/app-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect, type SearchableSelectOption } from '@/components/searchable-select';

type WarehouseOption = { id: string; name: string; code: string | null; office_id: string };
type OfficeOption = { id: string; name: string; code: string | null; zonal_id: string };
type ZonalOption = { id: string; name: string; code: string | null };
type CategoryOption = { id: string; name: string; code: string | null; type?: string | null };
type SubcategoryOption = { id: string; name: string; category_id: string };
type UserOption = { id: string; name: string; last_name: string | null; usuario: string | null };
type SupplierOption = { id: string; name: string };

type ServiceForEdit = {
    id: string;
    name: string;
    type: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    renewal: string | null;
    amount: string | null;
    notes: string | null;
    warehouse_id: string;
    asset_subcategory_id: string | null;
    requested_by: string | null;
    supplier_id?: string | null;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    service: ServiceForEdit | null;
    warehousesForSelect: WarehouseOption[];
    assetCategoriesForSelect: CategoryOption[];
    assetSubcategoriesForSelect: SubcategoryOption[];
    zonalsForSelect: ZonalOption[];
    officesForSelect: OfficeOption[];
    usersForSelect: UserOption[];
    suppliersForSelect: SupplierOption[];
};

const TYPE_PRESET_OPTIONS = [
    { value: 'vps', label: 'VPS' },
    { value: 'hosting', label: 'Hosting' },
    { value: 'rental', label: 'Alquiler' },
    { value: 'insurance', label: 'Seguro' },
    { value: 'soat', label: 'SOAT' },
    { value: 'other', label: 'Otro (especificar)' },
];

const RENEWAL_OPTIONS = [
    { value: 'monthly', label: 'Mensual' },
    { value: 'bimonthly', label: 'Bimestral' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'semiannual', label: 'Semestral' },
    { value: 'annual', label: 'Anual' },
    { value: 'none', label: 'Ninguno' },
];

const STATUS_OPTIONS = [
    { value: 'active', label: 'Activo' },
    { value: 'about_to_expire', label: 'Por vencer' },
    { value: 'expired', label: 'Vencido' },
    { value: 'cancelled', label: 'Cancelado' },
];

const inputClass =
    'border-input flex h-9 w-full rounded-xl border bg-background/80 px-3 py-1.5 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary/50 focus-visible:border-inv-primary/40';

function toInputDate(d: string | null | undefined): string {
    if (!d) return '';
    const date = new Date(d);
    return date.toISOString().slice(0, 10);
}

export function ServiceFormModal({
    open,
    onOpenChange,
    service,
    warehousesForSelect = [],
    assetCategoriesForSelect = [],
    assetSubcategoriesForSelect = [],
    zonalsForSelect = [],
    officesForSelect = [],
    usersForSelect = [],
    suppliersForSelect = [],
}: Props) {
    const isEdit = service != null;
    const [cascadeZonalId, setCascadeZonalId] = useState('');
    const [cascadeOfficeId, setCascadeOfficeId] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [typeOther, setTypeOther] = useState('');

    const { data, setData, post, put, processing, errors, reset } = useForm({
        asset_subcategory_id: service?.asset_subcategory_id ?? '',
        warehouse_id: service?.warehouse_id ?? '',
        name: service?.name ?? '',
        type: service?.type ?? 'vps',
        requested_by: service?.requested_by ?? '',
        start_date: toInputDate(service?.start_date ?? null),
        end_date: toInputDate(service?.end_date ?? null),
        renewal: service?.renewal ?? '',
        amount: service?.amount ?? '',
        status: service?.status ?? 'active',
        notes: service?.notes ?? '',
        supplier_id: service?.supplier_id ?? null,
    });

    const officesFilteredByZonal = useMemo(
        () =>
            cascadeZonalId
                ? officesForSelect.filter((o) => o.zonal_id === cascadeZonalId)
                : [],
        [cascadeZonalId, officesForSelect]
    );

    const warehousesFilteredByOffice = useMemo(
        () =>
            cascadeOfficeId
                ? warehousesForSelect.filter((w) => w.office_id === cascadeOfficeId)
                : [],
        [cascadeOfficeId, warehousesForSelect]
    );

    const subcategoriesFilteredByCategory = useMemo(
        () =>
            categoryId
                ? assetSubcategoriesForSelect.filter((s) => s.category_id === categoryId)
                : [],
        [categoryId, assetSubcategoriesForSelect]
    );

    useEffect(() => {
        if (!open) return;

        setData({
            asset_subcategory_id: service?.asset_subcategory_id ?? '',
            warehouse_id: service?.warehouse_id ?? '',
            name: service?.name ?? '',
            type: service?.type ?? 'vps',
            requested_by: service?.requested_by ?? '',
            start_date: toInputDate(service?.start_date ?? null),
            end_date: toInputDate(service?.end_date ?? null),
            renewal: service?.renewal ?? '',
            amount: service?.amount ?? '',
            status: service?.status ?? 'active',
            notes: service?.notes ?? '',
            supplier_id: service?.supplier_id ?? null,
        });

        if (service?.warehouse_id) {
            const wh = warehousesForSelect.find((w) => w.id === service.warehouse_id);
            if (wh) {
                setCascadeOfficeId(wh.office_id);
                const off = officesForSelect.find((o) => o.id === wh.office_id);
                if (off) setCascadeZonalId(off.zonal_id);
            }
        } else {
            setCascadeZonalId('');
            setCascadeOfficeId('');
        }

        if (service?.asset_subcategory_id) {
            const sub = assetSubcategoriesForSelect.find((s) => s.id === service.asset_subcategory_id);
            if (sub) setCategoryId(sub.category_id);
        } else {
            setCategoryId('');
        }

        if (service?.type && !TYPE_PRESET_OPTIONS.some((t) => t.value === service.type)) {
            setTypeOther(service.type);
        } else {
            setTypeOther('');
        }
    }, [open, service?.id, service?.warehouse_id, service?.asset_subcategory_id, service?.type, warehousesForSelect, officesForSelect, assetSubcategoriesForSelect]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...data,
            type: data.type === 'other' && typeOther.trim() !== '' ? typeOther.trim() : data.type,
        };
        if (isEdit && service) {
            put(`/admin/services/${service.id}`, {
                preserveScroll: true,
                data: payload,
                transform: () => payload,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        } else {
            post('/admin/services', {
                preserveScroll: true,
                data: payload,
                transform: () => payload,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        }
    };

    const canSubmit = data.warehouse_id.trim() !== '' && data.name.trim() !== '';

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Editar servicio' : 'Nuevo servicio'}
            contentClassName="space-y-4"
            width="wide"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                    {/* Ubicación: Zonal -> Oficina -> Almacén */}
                    <div className="space-y-2">
                        <Label>
                            Zonal <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={cascadeZonalId === '' ? '_' : cascadeZonalId}
                            onValueChange={(v) => {
                                const id = v === '_' ? '' : v;
                                setCascadeZonalId(id);
                                setCascadeOfficeId('');
                                setData('warehouse_id', '');
                            }}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue placeholder="Seleccione zonal" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Seleccione zonal</SelectItem>
                                {zonalsForSelect.map((z) => (
                                    <SelectItem key={z.id} value={z.id}>
                                        {z.name} {z.code ? `(${z.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>
                            Oficina <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={cascadeOfficeId === '' ? '_' : cascadeOfficeId}
                            onValueChange={(v) => {
                                const id = v === '_' ? '' : v;
                                setCascadeOfficeId(id);
                                setData('warehouse_id', '');
                            }}
                            disabled={!cascadeZonalId}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue placeholder="Seleccione oficina" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Seleccione oficina</SelectItem>
                                {officesFilteredByZonal.map((o) => (
                                    <SelectItem key={o.id} value={o.id}>
                                        {o.name} {o.code ? `(${o.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>
                            Almacén <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={data.warehouse_id || '_'}
                            onValueChange={(v) => setData('warehouse_id', v === '_' ? '' : v)}
                            disabled={!cascadeOfficeId}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue placeholder="Seleccione almacén" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Seleccione almacén</SelectItem>
                                {warehousesFilteredByOffice.map((w) => (
                                    <SelectItem key={w.id} value={w.id}>
                                        {w.name} {w.code ? `(${w.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.warehouse_id && (
                            <p className="mt-1 text-sm text-destructive">{errors.warehouse_id}</p>
                        )}
                    </div>

                    {/* Categoría / Subcategoría */}
                    <div className="space-y-2">
                        <Label>Categoría</Label>
                        <Select
                            value={categoryId === '' ? '_' : categoryId}
                            onValueChange={(v) => {
                                const id = v === '_' ? '' : v;
                                setCategoryId(id);
                                setData('asset_subcategory_id', '');
                            }}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue placeholder="Opcional" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Ninguna</SelectItem>
                                {assetCategoriesForSelect.map((c) => {
                                    const typeLabel =
                                        c.type === 'technology'
                                            ? 'Tecnología'
                                            : c.type === 'vehicle'
                                                ? 'Vehículos'
                                                : c.type === 'furniture'
                                                    ? 'Muebles'
                                                    : c.type === 'building'
                                                        ? 'Edificaciones'
                                                        : c.type === 'machinery'
                                                            ? 'Maquinaria'
                                                            : c.type === 'minor_asset'
                                                                ? 'Activo menor'
                                                                : c.type === 'fixed_asset'
                                                                    ? 'Activo fijo'
                                                                    : c.type === 'service_maintenance'
                                                                        ? 'Servicio / mantenimiento'
                                                                        : c.type === 'other'
                                                                            ? 'Otros'
                                                                            : '';
                                    return (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name} {typeLabel ? `(${typeLabel})` : ''}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Subcategoría</Label>
                        <Select
                            value={data.asset_subcategory_id || '_'}
                            onValueChange={(v) => setData('asset_subcategory_id', v === '_' ? '' : v)}
                            disabled={!categoryId}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue placeholder="Opcional" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Ninguna</SelectItem>
                                {subcategoriesFilteredByCategory.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">
                            Nombre <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className={inputClass}
                            placeholder="Ej. VPS Producción"
                            maxLength={200}
                        />
                        {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
                    </div>

                    {/* Tipo y Estado */}
                    <div className="space-y-2">
                        <Label htmlFor="type">
                            Tipo <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={
                                TYPE_PRESET_OPTIONS.some((t) => t.value === data.type)
                                    ? data.type
                                    : 'other'
                            }
                            onValueChange={(v) => {
                                if (v === 'other') {
                                    setData('type', 'other');
                                } else {
                                    setData('type', v);
                                    setTypeOther('');
                                }
                            }}
                        >
                            <SelectTrigger id="type" className={inputClass}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TYPE_PRESET_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {data.type === 'other' && (
                            <Input
                                className={inputClass + ' mt-2'}
                                placeholder="Especifique el tipo de servicio"
                                value={typeOther}
                                onChange={(e) => setTypeOther(e.target.value)}
                            />
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="status">
                            Estado <span className="text-red-500">*</span>
                        </Label>
                        <Select value={data.status} onValueChange={(v) => setData('status', v)}>
                            <SelectTrigger id="status" className={inputClass}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Solicitado por */}
                    <div className="space-y-2">
                        <Label htmlFor="requested_by">Solicitado por</Label>
                        <Select
                            value={data.requested_by || '_'}
                            onValueChange={(v) => setData('requested_by', v === '_' ? '' : v)}
                        >
                            <SelectTrigger id="requested_by" className={inputClass}>
                                <SelectValue placeholder="Opcional" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Ninguno</SelectItem>
                                {usersForSelect.map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                        {[u.name, u.last_name].filter(Boolean).join(' ') || u.usuario}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Fechas y renovación */}
                    <div className="space-y-2">
                        <Label htmlFor="start_date">Fecha inicio</Label>
                        <Input
                            id="start_date"
                            type="date"
                            value={data.start_date}
                            onChange={(e) => setData('start_date', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="end_date">Fecha fin</Label>
                        <Input
                            id="end_date"
                            type="date"
                            value={data.end_date}
                            onChange={(e) => setData('end_date', e.target.value)}
                            className={inputClass}
                        />
                        {errors.end_date && (
                            <p className="mt-1 text-sm text-destructive">{errors.end_date}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="renewal">Renovación</Label>
                        <Select
                            value={data.renewal || '_'}
                            onValueChange={(v) => setData('renewal', v === '_' ? '' : v)}
                        >
                            <SelectTrigger id="renewal" className={inputClass}>
                                <SelectValue placeholder="Opcional" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">—</SelectItem>
                                {RENEWAL_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Monto (fila de arriba, donde estaba proveedor) */}
                    <div className="space-y-2">
                        <Label htmlFor="amount">Monto</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={data.amount}
                            onChange={(e) => setData('amount', e.target.value)}
                            className={inputClass}
                            placeholder="0.00"
                        />
                    </div>

                    {/* Proveedor ocupando 2 columnas */}
                    <div className="space-y-2 col-span-2">
                        <Label htmlFor="supplier_id">Proveedor</Label>
                        <SearchableSelect
                            id="supplier_id"
                            value={data.supplier_id ?? ''}
                            onChange={(value) => setData('supplier_id', value === '' ? null : value)}
                            options={
                                suppliersForSelect.map((s): SearchableSelectOption => ({
                                    value: s.id,
                                    label: s.ruc ? `${s.name} (${s.ruc})` : s.name,
                                    searchTerms: [s.ruc ?? ''],
                                }))
                            }
                            placeholder="Seleccione proveedor (opcional si viene de OC)…"
                            noOptionsMessage="No se encontraron proveedores"
                        />
                        {errors.supplier_id && (
                            <p className="mt-1 text-sm text-destructive">{errors.supplier_id}</p>
                        )}
                    </div>

                    <div className="space-y-2 col-span-3">
                        <Label htmlFor="notes">Notas</Label>
                        <Textarea
                            id="notes"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            className="min-h-[80px] rounded-xl border-border"
                            placeholder="Opcional"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={processing || !canSubmit}
                        className="cursor-pointer bg-inv-primary hover:bg-inv-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear servicio'}
                    </Button>
                </div>
            </form>
        </AppModal>
    );
}

