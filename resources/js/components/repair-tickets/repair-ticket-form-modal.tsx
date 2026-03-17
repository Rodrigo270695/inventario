import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { AppModal } from '@/components/app-modal';
import { SearchableSelect, type SearchableSelectOption } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type AssetOption = {
    id: string;
    code: string;
    serial_number?: string | null;
    category?: { id: string; name: string } | null;
    model?: { id: string; name: string; brand?: { id: string; name: string } | null } | null;
};

type ComponentOption = {
    id: string;
    code: string;
    serial_number?: string | null;
    type?: { id: string; name: string } | null;
    brand?: { id: string; name: string } | null;
    model?: string | null;
};

type UserOption = {
    id: string;
    name: string;
    last_name?: string | null;
    usuario?: string | null;
    zonals?: { id: string; name: string; code: string }[];
};

type RepairShopOption = {
    id: string;
    name: string;
};

type ZonalOption = { id: string; name: string; code: string };
type OfficeOption = { id: string; zonal_id: string; name: string; code: string | null };
type WarehouseOption = { id: string; name: string; code: string | null; office_id: string; office?: { id: string; zonal_id: string; name: string; code: string | null } };

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    assetsForSelect: AssetOption[];
    componentsForSelect: ComponentOption[];
    usersForSelect: UserOption[];
    repairShopsForSelect: RepairShopOption[];
    zonalsForSelect: ZonalOption[];
    officesForSelect: OfficeOption[];
    warehousesForSelect: WarehouseOption[];
};

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

function fullName(user: UserOption): string {
    return [user.name, user.last_name].filter(Boolean).join(' ').trim() || user.usuario || user.id;
}

export function RepairTicketFormModal({
    open,
    onOpenChange,
    assetsForSelect,
    componentsForSelect,
    usersForSelect,
    repairShopsForSelect,
    zonalsForSelect,
    officesForSelect,
    warehousesForSelect,
}: Props) {
    const [itemType, setItemType] = useState<'asset' | 'component'>('asset');
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        asset_id: '',
        component_id: '',
        warehouse_id: '',
        priority: 'medium',
        failure_type: '',
        maintenance_mode: 'internal',
        issue_description: '',
        technician_id: '',
        repair_shop_id: '',
        estimated_cost: '',
        condition_in: 'good',
        external_reference: '',
        notes: '',
    });

    const [cascadeZonalId, setCascadeZonalId] = useState('');
    const [cascadeOfficeId, setCascadeOfficeId] = useState('');

    useEffect(() => {
        if (open) return;
        clearErrors();
        setItemType('asset');
        reset();
        setCascadeZonalId('');
        setCascadeOfficeId('');
    }, [open, clearErrors, reset]);

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

    const assetOptions = useMemo<SearchableSelectOption[]>(
        () =>
            assetsForSelect.map((asset) => ({
                value: asset.id,
                label: asset.code,
                searchTerms: [
                    asset.serial_number ?? '',
                    asset.category?.name ?? '',
                    asset.model?.brand?.name ?? '',
                    asset.model?.name ?? '',
                ],
            })),
        [assetsForSelect]
    );

    const componentOptions = useMemo<SearchableSelectOption[]>(
        () =>
            componentsForSelect.map((component) => ({
                value: component.id,
                label: component.code,
                searchTerms: [
                    component.serial_number ?? '',
                    component.type?.name ?? '',
                    component.brand?.name ?? '',
                    component.model ?? '',
                ],
            })),
        [componentsForSelect]
    );

    const technicianOptions = useMemo<SearchableSelectOption[]>(
        () => {
            const source = cascadeZonalId
                ? usersForSelect.filter((user) =>
                      (user.zonals ?? []).some((z) => z.id === cascadeZonalId)
                  )
                : usersForSelect;

            return source.map((user) => ({
                value: user.id,
                label: fullName(user),
                searchTerms: [user.usuario ?? ''],
            }));
        },
        [usersForSelect, cascadeZonalId]
    );

    const shopOptions = useMemo<SearchableSelectOption[]>(
        () =>
            repairShopsForSelect.map((shop) => ({
                value: shop.id,
                label: shop.name,
            })),
        [repairShopsForSelect]
    );

    const formatAssetOption = (option: SearchableSelectOption, meta: { context: 'menu' | 'value' }) => {
        if (meta.context === 'value') return option.label;
        const asset = assetsForSelect.find((item) => item.id === option.value);
        return (
            <div className="flex flex-col">
                <span className="font-medium">{asset?.code ?? option.label}</span>
                <span className="text-[11px] text-muted-foreground">
                    {[asset?.category?.name, asset?.model?.brand?.name, asset?.model?.name, asset?.serial_number]
                        .filter(Boolean)
                        .join(' · ') || 'Sin detalle adicional'}
                </span>
            </div>
        );
    };

    const formatComponentOption = (option: SearchableSelectOption, meta: { context: 'menu' | 'value' }) => {
        if (meta.context === 'value') return option.label;
        const component = componentsForSelect.find((item) => item.id === option.value);
        return (
            <div className="flex flex-col">
                <span className="font-medium">{component?.code ?? option.label}</span>
                <span className="text-[11px] text-muted-foreground">
                    {[component?.type?.name, component?.brand?.name, component?.model, component?.serial_number]
                        .filter(Boolean)
                        .join(' · ') || 'Sin detalle adicional'}
                </span>
            </div>
        );
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        const payload = {
            ...data,
            asset_id: itemType === 'asset' ? data.asset_id || null : null,
            component_id: itemType === 'component' ? data.component_id || null : null,
            warehouse_id: data.warehouse_id || null,
            failure_type: data.failure_type || null,
            technician_id: data.technician_id || null,
            repair_shop_id: data.repair_shop_id || null,
            estimated_cost: data.estimated_cost === '' ? null : Number(data.estimated_cost),
            condition_in: data.condition_in || null,
            external_reference: data.external_reference.trim() || null,
            notes: data.notes.trim() || null,
        };

        post('/admin/repair-tickets', {
            preserveScroll: true,
            data: payload,
            transform: () => payload,
            onSuccess: () => {
                reset();
                setItemType('asset');
                onOpenChange(false);
            },
        });
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title="Nuevo ticket"
            description="Registrar nuevo ticket de reparación"
            width="wide"
            contentClassName="space-y-5"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Ubicación: Zonal → Oficina → Almacén */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div className="space-y-2">
                        <Label>
                            Zonal <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={cascadeZonalId === '' ? '_' : cascadeZonalId}
                            onValueChange={(value) => {
                                const id = value === '_' ? '' : value;
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
                            onValueChange={(value) => {
                                const id = value === '_' ? '' : value;
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
                            value={data.warehouse_id === '' ? '_' : data.warehouse_id}
                            onValueChange={(value) => setData('warehouse_id', value === '_' ? '' : value)}
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
                            <p className="text-xs text-destructive">{errors.warehouse_id}</p>
                        )}
                    </div>
                </div>

                {/* Datos del bien y del ticket */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                        <Label>Tipo de bien</Label>
                        <Select
                            value={itemType}
                            onValueChange={(value: 'asset' | 'component') => {
                                setItemType(value);
                                setData('asset_id', '');
                                setData('component_id', '');
                            }}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="asset">Activo</SelectItem>
                                <SelectItem value="component">Componente</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2 xl:col-span-3">
                        <Label>
                            {itemType === 'asset' ? 'Activo' : 'Componente'} <span className="text-red-500">*</span>
                        </Label>
                        {itemType === 'asset' ? (
                            <SearchableSelect
                                value={data.asset_id}
                                onChange={(value) => setData('asset_id', value)}
                                options={assetOptions}
                                placeholder="Buscar activo..."
                                noOptionsMessage="No hay coincidencias"
                                formatOptionLabel={formatAssetOption}
                            />
                        ) : (
                            <SearchableSelect
                                value={data.component_id}
                                onChange={(value) => setData('component_id', value)}
                                options={componentOptions}
                                placeholder="Buscar componente..."
                                noOptionsMessage="No hay coincidencias"
                                formatOptionLabel={formatComponentOption}
                            />
                        )}
                        {(errors.asset_id || errors.component_id) && (
                            <p className="text-xs text-destructive">{errors.asset_id || errors.component_id}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Prioridad</Label>
                        <Select value={data.priority} onValueChange={(value) => setData('priority', value)}>
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PRIORITY_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Modo</Label>
                        <Select value={data.maintenance_mode} onValueChange={(value) => setData('maintenance_mode', value)}>
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {MODE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Tipo de falla</Label>
                        <Select
                            value={data.failure_type === '' ? '_' : data.failure_type}
                            onValueChange={(value) => setData('failure_type', value === '_' ? '' : value)}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {FAILURE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value || '_'} value={option.value || '_'}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Condición de ingreso</Label>
                        <Select
                            value={data.condition_in === '' ? '_' : data.condition_in}
                            onValueChange={(value) => setData('condition_in', value === '_' ? '' : value)}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue />
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

                    <div className="space-y-2 xl:col-span-2">
                        <Label>Técnico responsable</Label>
                        <SearchableSelect
                            value={data.technician_id}
                            onChange={(value) => setData('technician_id', value)}
                            options={technicianOptions}
                            placeholder="Buscar técnico..."
                            noOptionsMessage="No hay coincidencias"
                        />
                    </div>

                    <div className="space-y-2 xl:col-span-2">
                        <Label>Taller</Label>
                        <SearchableSelect
                            value={data.repair_shop_id}
                            onChange={(value) => setData('repair_shop_id', value)}
                            options={shopOptions}
                            placeholder="Buscar taller..."
                            noOptionsMessage="No hay coincidencias"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Costo estimado</Label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={data.estimated_cost}
                            onChange={(event) => setData('estimated_cost', event.target.value)}
                            className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                        />
                    </div>

                    <div className="space-y-2 xl:col-span-3">
                        <Label>Referencia externa</Label>
                        <input
                            type="text"
                            value={data.external_reference}
                            onChange={(event) => setData('external_reference', event.target.value)}
                            maxLength={120}
                            className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>
                        Incidencia reportada <span className="text-red-500">*</span>
                    </Label>
                    <textarea
                        value={data.issue_description}
                        onChange={(event) => setData('issue_description', event.target.value)}
                        rows={5}
                        className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                        placeholder="Describa el problema detectado..."
                    />
                    {errors.issue_description && (
                        <p className="text-xs text-destructive">{errors.issue_description}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label>Notas internas</Label>
                    <textarea
                        value={data.notes}
                        onChange={(event) => setData('notes', event.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                        placeholder="Observaciones adicionales..."
                    />
                </div>

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button type="submit" className="cursor-pointer bg-inv-primary text-white hover:bg-inv-primary/90" disabled={processing}>
                        {processing ? 'Guardando...' : 'Guardar ticket'}
                    </Button>
                </div>
            </form>
        </AppModal>
    );
}
