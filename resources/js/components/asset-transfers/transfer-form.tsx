import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, MapPinned, Plus, Trash2, Warehouse } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { AssetTransferStatusBadge } from '@/components/asset-transfers/status-badge';
import { SearchableSelect } from '@/components/searchable-select';
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
import AppLayout from '@/layouts/app-layout';
import type { AssetTransfer, BreadcrumbItem } from '@/types';

type WarehouseOption = {
    id: string;
    name: string;
    code: string | null;
    office?: {
        id: string;
        name: string;
        code: string | null;
        zonal?: { id: string; name: string; code: string } | null;
    } | null;
};

type AssetOption = {
    id: string;
    code: string;
    serial_number?: string | null;
    warehouse_id?: string | null;
    condition: string;
    category?: { id: string; name: string; code?: string | null } | null;
    model?: { id: string; name: string; brand?: { id: string; name: string } | null } | null;
};

type ComponentOption = {
    id: string;
    code: string;
    serial_number?: string | null;
    warehouse_id?: string | null;
    condition: string;
    type?: { id: string; name: string; code?: string | null } | null;
    brand?: { id: string; name: string } | null;
    model?: string | null;
};

type ItemRow = {
    item_type: 'asset' | 'component';
    asset_id: string;
    component_id: string;
    condition_out: string;
};

type LocationState = {
    zonal_id: string;
    office_id: string;
    warehouse_id: string;
};

type Props = {
    breadcrumbs: BreadcrumbItem[];
    title: string;
    subtitle: string;
    submitLabel: string;
    originWarehouses: WarehouseOption[];
    destinationWarehouses: WarehouseOption[];
    assets: AssetOption[];
    components: ComponentOption[];
    users: Array<{ id: string; name?: string | null; last_name?: string | null; usuario?: string | null; zonal_ids?: string[] }>;
    transfer?: AssetTransfer;
};

const CONDITION_OPTIONS = [
    { value: 'new', label: 'Nuevo' },
    { value: 'good', label: 'Bueno' },
    { value: 'regular', label: 'Regular' },
    { value: 'damaged', label: 'Dañado' },
    { value: 'obsolete', label: 'Obsoleto' },
];

const OTHER_CARRIER_VALUE = '__other__';

const CARRIER_OPTIONS = [
    'Olva Courier',
    'Shalom',
    'Sharf',
    'Cruz del Sur Cargo',
    'Civa',
    'DHL Express',
    'FedEx',
    'UPS',
    'Servientrega',
    'Marvisur',
    'Transportes Chiclayo',
    'Flores Cargo',
    'Jet Perú',
    'Palomino Cargo',
    'Transportes Línea',
    'ITTSA Cargo',
    'Móvil Bus Cargo',
    'Excluciva Cargo',
    'Turismo Dias Cargo',
    'Tepsa Cargo',
].map((name) => ({
    value: name,
    label: name,
    searchTerms: [name],
}));

const inputClass =
    'border-input flex h-9 w-full rounded-xl border bg-background/80 px-3 py-1.5 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary/50 focus-visible:border-inv-primary/40 aria-invalid:border-destructive aria-invalid:ring-destructive/20';

function defaultItemRow(): ItemRow {
    return {
        item_type: 'asset',
        asset_id: '',
        component_id: '',
        condition_out: '',
    };
}

function itemRowsFromTransfer(transfer?: AssetTransfer): ItemRow[] {
    if (!transfer?.items?.length) {
        return [defaultItemRow()];
    }

    return transfer.items.map((item) => ({
        item_type: item.asset_id ? 'asset' : 'component',
        asset_id: item.asset_id ?? '',
        component_id: item.component_id ?? '',
        condition_out: item.condition_out ?? '',
    }));
}

function getLocationFromWarehouse(
    warehouseId: string | null | undefined,
    warehouses: WarehouseOption[]
): LocationState {
    const warehouse = warehouses.find((item) => item.id === warehouseId);

    return {
        zonal_id: warehouse?.office?.zonal?.id ?? '',
        office_id: warehouse?.office?.id ?? '',
        warehouse_id: warehouse?.id ?? '',
    };
}

function toDateTimeLocalValue(value?: string | null): string {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date);

    const lookup = (type: string) => parts.find((part) => part.type === type)?.value ?? '';

    return `${lookup('year')}-${lookup('month')}-${lookup('day')}T${lookup('hour')}:${lookup('minute')}`;
}

export function AssetTransferForm({
    breadcrumbs,
    title,
    subtitle,
    submitLabel,
    originWarehouses,
    destinationWarehouses,
    assets,
    components,
    users,
    transfer,
}: Props) {
    const { props } = usePage();
    const backendErrors = (props as { errors?: Record<string, string> }).errors ?? {};
    const knownCarrierValues = useMemo(() => CARRIER_OPTIONS.map((option) => option.value), []);
    const allWarehouses = useMemo(() => {
        const map = new Map<string, WarehouseOption>();
        [...originWarehouses, ...destinationWarehouses].forEach((warehouse) => {
            map.set(warehouse.id, warehouse);
        });
        return Array.from(map.values());
    }, [originWarehouses, destinationWarehouses]);
    const initialOrigin = getLocationFromWarehouse(transfer?.origin_warehouse_id, allWarehouses);
    const initialDestination = getLocationFromWarehouse(transfer?.destination_warehouse_id, allWarehouses);
    const [submitting, setSubmitting] = useState(false);
    const [companyGuideFile, setCompanyGuideFile] = useState<File | null>(null);
    const [carrierVoucherFile, setCarrierVoucherFile] = useState<File | null>(null);
    const [carrierSelection, setCarrierSelection] = useState(
        transfer?.carrier_name && knownCarrierValues.includes(transfer.carrier_name)
            ? transfer.carrier_name
            : transfer?.carrier_name
              ? OTHER_CARRIER_VALUE
              : ''
    );
    const [customCarrierName, setCustomCarrierName] = useState(
        transfer?.carrier_name && !knownCarrierValues.includes(transfer.carrier_name)
            ? transfer.carrier_name
            : ''
    );
    const [data, setData] = useState({
        origin: initialOrigin,
        destination: initialDestination,
        status: transfer?.status ?? 'pending_approval',
        sent_by: transfer?.sent_by ?? '',
        received_by: transfer?.received_by ?? '',
        carrier_name: transfer?.carrier_name ?? '',
        tracking_number: transfer?.tracking_number ?? '',
        carrier_reference: transfer?.carrier_reference ?? '',
        company_guide_number: transfer?.company_guide_number ?? '',
        carrier_voucher_number: transfer?.carrier_voucher_number ?? '',
        ship_date: toDateTimeLocalValue(transfer?.ship_date),
        received_at: toDateTimeLocalValue(transfer?.received_at),
        dispatch_notes: transfer?.dispatch_notes ?? '',
        receipt_notes: transfer?.receipt_notes ?? '',
        cancellation_reason: transfer?.cancellation_reason ?? '',
        items: itemRowsFromTransfer(transfer),
    });

    const isApprovedEdit = transfer?.status === 'approved';
    const showOperationalFields = data.status !== 'pending_approval';
    const assetMap = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);
    const componentMap = useMemo(() => new Map(components.map((component) => [component.id, component])), [components]);
    const originWarehouseMap = useMemo(() => new Map(originWarehouses.map((warehouse) => [warehouse.id, warehouse])), [originWarehouses]);
    const destinationWarehouseMap = useMemo(() => new Map(destinationWarehouses.map((warehouse) => [warehouse.id, warehouse])), [destinationWarehouses]);
    const allWarehouseMap = useMemo(() => new Map(allWarehouses.map((warehouse) => [warehouse.id, warehouse])), [allWarehouses]);

    const filteredAssets = useMemo(
        () =>
            data.origin.warehouse_id
                ? assets.filter((asset) => asset.warehouse_id === data.origin.warehouse_id)
                : [],
        [assets, data.origin.warehouse_id]
    );

    const filteredComponents = useMemo(
        () =>
            data.origin.warehouse_id
                ? components.filter((component) => component.warehouse_id === data.origin.warehouse_id)
                : [],
        [components, data.origin.warehouse_id]
    );

    const zonalOptionsFor = useCallback((warehouses: WarehouseOption[]) => {
        const map = new Map<string, { id: string; name: string; code: string | null }>();

        warehouses.forEach((warehouse) => {
            const zonal = warehouse.office?.zonal;
            if (!zonal || map.has(zonal.id)) return;
            map.set(zonal.id, { id: zonal.id, name: zonal.name, code: zonal.code });
        });

        return Array.from(map.values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((zonal) => ({
                value: zonal.id,
                label: zonal.code ? `${zonal.name} (${zonal.code})` : zonal.name,
                searchTerms: [zonal.code].filter(Boolean) as string[],
            }));
    }, []);

    const officesByZonalFor = useCallback((warehouses: WarehouseOption[]) => {
        const map = new Map<string, Array<{ id: string; name: string; code: string | null }>>();

        warehouses.forEach((warehouse) => {
            const zonalId = warehouse.office?.zonal?.id;
            const office = warehouse.office;
            if (!zonalId || !office) return;

            const current = map.get(zonalId) ?? [];
            if (!current.some((item) => item.id === office.id)) {
                current.push({ id: office.id, name: office.name, code: office.code });
                current.sort((a, b) => a.name.localeCompare(b.name));
                map.set(zonalId, current);
            }
        });

        return map;
    }, []);

    const originZonalOptions = useMemo(() => zonalOptionsFor(originWarehouses), [originWarehouses, zonalOptionsFor]);
    const destinationZonalOptions = useMemo(() => zonalOptionsFor(destinationWarehouses), [destinationWarehouses, zonalOptionsFor]);
    const originOfficesByZonal = useMemo(() => officesByZonalFor(originWarehouses), [originWarehouses, officesByZonalFor]);
    const destinationOfficesByZonal = useMemo(() => officesByZonalFor(destinationWarehouses), [destinationWarehouses, officesByZonalFor]);

    const userOptions = useMemo(
        () =>
            users.map((user) => ({
                value: user.id,
                label: [user.name, user.last_name].filter(Boolean).join(' ') || user.usuario || 'Sin nombre',
                searchTerms: [user.usuario].filter(Boolean) as string[],
                zonalIds: user.zonal_ids ?? [],
            })),
        [users]
    );

    const receiverOptions = useMemo(
        () =>
            data.destination.zonal_id
                ? userOptions.filter((user) => user.zonalIds.includes(data.destination.zonal_id))
                : [],
        [data.destination.zonal_id, userOptions]
    );

    const officeOptionsFor = useCallback(
        (zonalId: string, officesByZonal: Map<string, Array<{ id: string; name: string; code: string | null }>>) =>
            (officesByZonal.get(zonalId) ?? []).map((office) => ({
                value: office.id,
                label: office.code ? `${office.name} (${office.code})` : office.name,
                searchTerms: [office.code].filter(Boolean) as string[],
            })),
        []
    );

    const warehouseOptionsFor = useCallback(
        (officeId: string, warehouses: WarehouseOption[], excludeWarehouseId?: string) =>
            warehouses
                .filter((warehouse) => warehouse.office?.id === officeId && warehouse.id !== excludeWarehouseId)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((warehouse) => ({
                    value: warehouse.id,
                    label: warehouse.code ? `${warehouse.name} (${warehouse.code})` : warehouse.name,
                    searchTerms: [
                        warehouse.office?.name,
                        warehouse.office?.zonal?.name,
                        warehouse.code,
                    ].filter(Boolean) as string[],
                })),
        []
    );

    const assetOptions = useMemo(
        () =>
            filteredAssets.map((asset) => ({
                value: asset.id,
                label: asset.code,
                meta: [
                    asset.category?.name,
                    asset.model?.brand?.name,
                    asset.model?.name,
                    asset.serial_number ? `Serie: ${asset.serial_number}` : null,
                ].filter(Boolean).join(' · '),
                searchTerms: [
                    asset.serial_number,
                    asset.category?.name,
                    asset.model?.brand?.name,
                    asset.model?.name,
                ].filter(Boolean) as string[],
            })),
        [filteredAssets]
    );

    const componentOptions = useMemo(
        () =>
            filteredComponents.map((component) => ({
                value: component.id,
                label: component.code,
                meta: [
                    component.type?.name,
                    component.brand?.name,
                    component.model,
                    component.serial_number ? `Serie: ${component.serial_number}` : null,
                ].filter(Boolean).join(' · '),
                searchTerms: [
                    component.serial_number,
                    component.type?.name,
                    component.brand?.name,
                    component.model,
                ].filter(Boolean) as string[],
            })),
        [filteredComponents]
    );

    const formatRichOption = useCallback(
        (
            option: { label: string; meta?: string },
            meta: { context: 'menu' | 'value' }
        ) => {
            if (meta.context === 'value') {
                return option.label;
            }

            return (
                <div className="min-w-0">
                    <div className="truncate font-medium">{option.label}</div>
                    {option.meta && (
                        <div className="truncate text-xs text-muted-foreground">
                            {option.meta}
                        </div>
                    )}
                </div>
            );
        },
        []
    );

    const itemError = (index: number, field: string) => backendErrors[`items.${index}.${field}`];

    const resetItemsForOrigin = useCallback(
        (items: ItemRow[]) =>
            items.map((item) => ({
                ...item,
                asset_id: '',
                component_id: '',
                condition_out: '',
            })),
        []
    );

    const updateLocation = useCallback(
        (scope: 'origin' | 'destination', field: keyof LocationState, value: string) => {
            setData((prev) => {
                const nextLocation = { ...prev[scope] };

                if (field === 'zonal_id') {
                    nextLocation.zonal_id = value;
                    nextLocation.office_id = '';
                    nextLocation.warehouse_id = '';
                } else if (field === 'office_id') {
                    nextLocation.office_id = value;
                    nextLocation.warehouse_id = '';
                } else {
                    nextLocation.warehouse_id = value;
                    const selectedWarehouse = scope === 'origin'
                        ? originWarehouseMap.get(value)
                        : destinationWarehouseMap.get(value);
                    if (selectedWarehouse?.office?.zonal?.id) {
                        nextLocation.zonal_id = selectedWarehouse.office.zonal.id;
                    }
                    if (selectedWarehouse?.office?.id) {
                        nextLocation.office_id = selectedWarehouse.office.id;
                    }
                }

                return {
                    ...prev,
                    [scope]: nextLocation,
                    items: scope === 'origin' ? resetItemsForOrigin(prev.items) : prev.items,
                };
            });
        },
        [destinationWarehouseMap, originWarehouseMap, resetItemsForOrigin]
    );

    const locationSummary = useCallback(
        (location: LocationState) => {
            const warehouse = allWarehouseMap.get(location.warehouse_id);

            return [
                warehouse?.office?.zonal?.name,
                warehouse?.office?.name,
                warehouse?.name,
            ].filter(Boolean).join(' / ') || 'Sin definir';
        },
        [allWarehouseMap]
    );

    const updateItem = useCallback(
        (index: number, field: keyof ItemRow, value: string) => {
            setData((prev) => {
                const nextItems = [...prev.items];
                const row = { ...nextItems[index] };

                if (field === 'item_type') {
                    row.item_type = value as 'asset' | 'component';
                    row.asset_id = '';
                    row.component_id = '';
                    row.condition_out = '';
                } else if (field === 'asset_id') {
                    row.asset_id = value;
                    row.component_id = '';
                    row.condition_out = assetMap.get(value)?.condition ?? '';
                } else if (field === 'component_id') {
                    row.component_id = value;
                    row.asset_id = '';
                    row.condition_out = componentMap.get(value)?.condition ?? '';
                } else {
                    row[field] = value;
                }

                nextItems[index] = row;

                return { ...prev, items: nextItems };
            });
        },
        [assetMap, componentMap]
    );

    const addRow = useCallback(() => {
        setData((prev) => ({ ...prev, items: [...prev.items, defaultItemRow()] }));
    }, []);

    const removeRow = useCallback((index: number) => {
        setData((prev) => {
            if (prev.items.length <= 1) return prev;

            return {
                ...prev,
                items: prev.items.filter((_, currentIndex) => currentIndex !== index),
            };
        });
    }, []);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        setSubmitting(true);
        const formData = new FormData();

        if (transfer) {
            formData.append('_method', 'PUT');
        }

        formData.append('origin_warehouse_id', data.origin.warehouse_id);
        formData.append('destination_warehouse_id', data.destination.warehouse_id);
        formData.append('status', data.status);
        formData.append('received_by', data.received_by || '');
        formData.append(
            'carrier_name',
            carrierSelection === OTHER_CARRIER_VALUE ? customCarrierName || '' : carrierSelection || ''
        );
        formData.append('tracking_number', data.tracking_number || '');
        formData.append('carrier_reference', data.carrier_reference || '');
        formData.append('company_guide_number', data.company_guide_number || '');
        formData.append('carrier_voucher_number', data.carrier_voucher_number || '');
        formData.append('ship_date', data.ship_date || '');
        formData.append('dispatch_notes', data.dispatch_notes || '');
        formData.append('cancellation_reason', data.cancellation_reason || '');

        if (companyGuideFile) {
            formData.append('company_guide_file', companyGuideFile);
        }
        if (carrierVoucherFile) {
            formData.append('carrier_voucher_file', carrierVoucherFile);
        }

        data.items.forEach((item, index) => {
            formData.append(`items[${index}][item_type]`, item.item_type);
            formData.append(`items[${index}][asset_id]`, item.item_type === 'asset' ? item.asset_id || '' : '');
            formData.append(`items[${index}][component_id]`, item.item_type === 'component' ? item.component_id || '' : '');
            formData.append(`items[${index}][condition_out]`, item.condition_out || '');
        });

        router.post(transfer ? `/admin/asset-transfers/${transfer.id}` : '/admin/asset-transfers', formData, {
            preserveScroll: true,
            forceFormData: true,
            onFinish: () => setSubmitting(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={title} />

            <div className="min-h-[60vh] flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/asset-transfers"
                            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-inv-surface/20 bg-inv-primary/5 text-inv-primary shadow-sm transition-all hover:border-inv-primary/40 hover:bg-inv-primary/10 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2 dark:border-inv-surface/30 dark:bg-inv-section/20 dark:text-inv-primary dark:hover:bg-inv-section/30"
                            aria-label="Volver al listado"
                        >
                            <ArrowLeft className="size-5" />
                        </Link>
                        <div className="border-l-2 border-inv-primary/30 pl-4">
                            <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                                {title}
                            </h1>
                            <p className="mt-0.5 text-muted-foreground text-xs md:text-sm">
                                {subtitle}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl">
                    <div
                        className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
                        style={{
                            background: 'linear-gradient(135deg, #447794 0%, #2d5b75 40%, #123249 100%)',
                        }}
                        aria-hidden
                    />
                    <div
                        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-30"
                        style={{ background: 'radial-gradient(circle, #447794 0%, transparent 70%)' }}
                        aria-hidden
                    />

                    <form onSubmit={handleSubmit} className="relative flex flex-col gap-0">
                        <div className="border-b border-inv-primary/50 bg-inv-primary/25 px-4 py-3 md:px-6 dark:bg-inv-section/70 dark:border-inv-surface/60">
                            <h2 className="text-sm font-semibold text-inv-primary dark:text-white">Encabezado</h2>
                        </div>
                        <div className="space-y-5 p-4 md:p-6">
                            <div className="grid gap-4 xl:grid-cols-[1fr_1fr_220px]">
                                <div className="rounded-2xl border border-border bg-background/70 p-4">
                                    <div className="mb-3 flex items-center gap-2">
                                        <Warehouse className="size-4 text-inv-primary" />
                                        <h3 className="text-sm font-semibold text-foreground">Origen</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="origin_zonal_id">Zonal <span className="text-destructive">*</span></Label>
                                            <SearchableSelect
                                                id="origin_zonal_id"
                                                value={data.origin.zonal_id}
                                                onChange={(value) => updateLocation('origin', 'zonal_id', value)}
                                                options={originZonalOptions}
                                                placeholder="Seleccione zonal"
                                                isClearable={false}
                                                disabled={isApprovedEdit}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="origin_office_id">Oficina <span className="text-destructive">*</span></Label>
                                            <SearchableSelect
                                                id="origin_office_id"
                                                value={data.origin.office_id}
                                                onChange={(value) => updateLocation('origin', 'office_id', value)}
                                                options={officeOptionsFor(data.origin.zonal_id, originOfficesByZonal)}
                                                placeholder="Seleccione oficina"
                                                isClearable={false}
                                                disabled={isApprovedEdit || !data.origin.zonal_id}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="origin_warehouse_id">Almacén <span className="text-destructive">*</span></Label>
                                            <SearchableSelect
                                                id="origin_warehouse_id"
                                                value={data.origin.warehouse_id}
                                                onChange={(value) => updateLocation('origin', 'warehouse_id', value)}
                                                options={warehouseOptionsFor(data.origin.office_id, originWarehouses, data.destination.warehouse_id)}
                                                placeholder="Seleccione almacén"
                                                isClearable={false}
                                                disabled={isApprovedEdit || !data.origin.office_id}
                                            />
                                            {backendErrors.origin_warehouse_id && (
                                                <p className="text-xs text-destructive">{backendErrors.origin_warehouse_id}</p>
                                            )}
                                        </div>
                                        <div className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                                            {locationSummary(data.origin)}
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-border bg-background/70 p-4">
                                    <div className="mb-3 flex items-center gap-2">
                                        <MapPinned className="size-4 text-inv-primary" />
                                        <h3 className="text-sm font-semibold text-foreground">Destino</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="destination_zonal_id">Zonal <span className="text-destructive">*</span></Label>
                                            <SearchableSelect
                                                id="destination_zonal_id"
                                                value={data.destination.zonal_id}
                                                onChange={(value) => updateLocation('destination', 'zonal_id', value)}
                                                options={destinationZonalOptions}
                                                placeholder="Seleccione zonal"
                                                isClearable={false}
                                                disabled={isApprovedEdit}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="destination_office_id">Oficina <span className="text-destructive">*</span></Label>
                                            <SearchableSelect
                                                id="destination_office_id"
                                                value={data.destination.office_id}
                                                onChange={(value) => updateLocation('destination', 'office_id', value)}
                                                options={officeOptionsFor(data.destination.zonal_id, destinationOfficesByZonal)}
                                                placeholder="Seleccione oficina"
                                                isClearable={false}
                                                disabled={isApprovedEdit || !data.destination.zonal_id}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="destination_warehouse_id">Almacén <span className="text-destructive">*</span></Label>
                                            <SearchableSelect
                                                id="destination_warehouse_id"
                                                value={data.destination.warehouse_id}
                                                onChange={(value) => updateLocation('destination', 'warehouse_id', value)}
                                                options={warehouseOptionsFor(data.destination.office_id, destinationWarehouses, data.origin.warehouse_id)}
                                                placeholder="Seleccione almacén"
                                                isClearable={false}
                                                disabled={isApprovedEdit || !data.destination.office_id}
                                            />
                                            {backendErrors.destination_warehouse_id && (
                                                <p className="text-xs text-destructive">{backendErrors.destination_warehouse_id}</p>
                                            )}
                                        </div>
                                        <div className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                                            {locationSummary(data.destination)}
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-border bg-background/70 p-4">
                                    <div className="space-y-2">
                                        <Label>Estado actual</Label>
                                        <div className="flex min-h-10 items-center rounded-xl border border-input bg-background/80 px-3">
                                            <AssetTransferStatusBadge status={data.status} />
                                        </div>
                                        <p className="text-xs leading-5 text-muted-foreground">
                                            El traslado se registra primero como pendiente por aprobar. Los datos de despacho y recepción aparecen después.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {showOperationalFields && (
                                <div className="rounded-2xl border border-border bg-background/70 p-4">
                                    <div className="mb-4">
                                        <h3 className="text-sm font-semibold text-foreground">Datos operativos</h3>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Aquí completas el despacho y eliges al usuario receptor del zonal destino.
                                        </p>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="received_by">Quien recibe <span className="text-destructive">*</span></Label>
                                            <SearchableSelect
                                                id="received_by"
                                                value={data.received_by}
                                                onChange={(value) => setData((prev) => ({ ...prev, received_by: value }))}
                                                options={receiverOptions}
                                                placeholder={data.destination.zonal_id ? 'Seleccione usuario del zonal destino' : 'Seleccione primero el almacén destino'}
                                                disabled={!data.destination.zonal_id}
                                            />
                                            <p className="text-xs text-muted-foreground">Solo se muestran usuarios asociados al zonal del almacén destino.</p>
                                            {backendErrors.received_by && <p className="text-xs text-destructive">{backendErrors.received_by}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="carrier_name">Transportista</Label>
                                            <SearchableSelect
                                                id="carrier_name"
                                                value={carrierSelection}
                                                onChange={(value) => {
                                                    setCarrierSelection(value);
                                                    if (value !== OTHER_CARRIER_VALUE) {
                                                        setCustomCarrierName('');
                                                    }
                                                }}
                                                options={[
                                                    ...CARRIER_OPTIONS,
                                                    { value: OTHER_CARRIER_VALUE, label: 'Otro', searchTerms: ['otro'] },
                                                ]}
                                                placeholder="Seleccione transportista"
                                            />
                                            {carrierSelection === OTHER_CARRIER_VALUE && (
                                                <Input
                                                    value={customCarrierName}
                                                    onChange={(event) => setCustomCarrierName(event.target.value)}
                                                    className={inputClass}
                                                    placeholder="Escriba el nombre del transportista"
                                                />
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                Lista inicial con principales operadores en Peru. Si no aparece, use `Otro`.
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="tracking_number">Nro. seguimiento</Label>
                                            <Input
                                                id="tracking_number"
                                                value={data.tracking_number}
                                                onChange={(event) => setData((prev) => ({ ...prev, tracking_number: event.target.value }))}
                                                className={inputClass}
                                                placeholder="Dato de seguimiento"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="carrier_reference">Referencia courier</Label>
                                            <Input
                                                id="carrier_reference"
                                                value={data.carrier_reference}
                                                onChange={(event) => setData((prev) => ({ ...prev, carrier_reference: event.target.value }))}
                                                className={inputClass}
                                                placeholder="Referencia adicional"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="company_guide_number">Nro. guía empresa</Label>
                                            <Input
                                                id="company_guide_number"
                                                value={data.company_guide_number}
                                                onChange={(event) => setData((prev) => ({ ...prev, company_guide_number: event.target.value }))}
                                                className={inputClass}
                                                placeholder="Número de guía"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="carrier_voucher_number">Nro. voucher courier</Label>
                                            <Input
                                                id="carrier_voucher_number"
                                                value={data.carrier_voucher_number}
                                                onChange={(event) => setData((prev) => ({ ...prev, carrier_voucher_number: event.target.value }))}
                                                className={inputClass}
                                                placeholder="Número de voucher"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ship_date">Fecha de envío</Label>
                                            <Input
                                                id="ship_date"
                                                type="datetime-local"
                                                value={data.ship_date}
                                                onChange={(event) => setData((prev) => ({ ...prev, ship_date: event.target.value }))}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="company_guide_file">Archivo guía empresa</Label>
                                            <Input
                                                id="company_guide_file"
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                                onChange={(event) => setCompanyGuideFile(event.target.files?.[0] ?? null)}
                                                className={inputClass}
                                            />
                                            {transfer?.company_guide_path && (
                                                <Link href={`/admin/asset-transfers/${transfer.id}/company-guide`} target="_blank" className="text-xs text-inv-primary hover:underline">
                                                    Ver archivo actual
                                                </Link>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="carrier_voucher_file">Archivo voucher courier</Label>
                                            <Input
                                                id="carrier_voucher_file"
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                                onChange={(event) => setCarrierVoucherFile(event.target.files?.[0] ?? null)}
                                                className={inputClass}
                                            />
                                            {transfer?.carrier_voucher_path && (
                                                <Link href={`/admin/asset-transfers/${transfer.id}/carrier-voucher`} target="_blank" className="text-xs text-inv-primary hover:underline">
                                                    Ver archivo actual
                                                </Link>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="dispatch_notes">Observaciones de despacho</Label>
                                            <textarea
                                                id="dispatch_notes"
                                                value={data.dispatch_notes}
                                                onChange={(event) => setData((prev) => ({ ...prev, dispatch_notes: event.target.value }))}
                                                className={`${inputClass} min-h-24 py-2`}
                                                placeholder="Notas del despacho"
                                            />
                                        </div>
                                    </div>

                                    {data.status === 'cancelled' && (
                                        <div className="mt-4 space-y-2">
                                            <Label htmlFor="cancellation_reason">Motivo de cancelación</Label>
                                            <textarea
                                                id="cancellation_reason"
                                                value={data.cancellation_reason}
                                                onChange={(event) => setData((prev) => ({ ...prev, cancellation_reason: event.target.value }))}
                                                className={`${inputClass} min-h-24 py-2`}
                                                placeholder="Detalle de la cancelación"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="border-y border-inv-primary/50 bg-inv-primary/25 px-4 py-3 md:px-6 dark:bg-inv-section/70 dark:border-inv-surface/60">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-sm font-semibold text-inv-primary dark:text-white">Ítems del traslado</h2>
                                    {isApprovedEdit && (
                                        <p className="mt-1 text-xs text-inv-primary/80 dark:text-slate-300">
                                            Los ítems y almacenes quedan bloqueados una vez aprobado el traslado.
                                        </p>
                                    )}
                                </div>
                                {!isApprovedEdit && (
                                    <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={addRow}>
                                        <Plus className="mr-1 size-4" />
                                        Añadir ítem
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4 p-4 md:p-6">
                            {data.items.map((item, index) => (
                                <div key={index} className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-xs">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">Ítem #{index + 1}</p>
                                            <p className="text-xs text-muted-foreground">Seleccione un activo o componente desde el almacén origen.</p>
                                        </div>
                                        {!isApprovedEdit && data.items.length > 1 && (
                                            <Button type="button" variant="outline" size="sm" className="cursor-pointer text-rose-600" onClick={() => removeRow(index)}>
                                                <Trash2 className="mr-1 size-4" />
                                                Quitar
                                            </Button>
                                        )}
                                    </div>

                                    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                                        <div className="space-y-2">
                                            <Label>Tipo</Label>
                                            <Select
                                                value={item.item_type}
                                                disabled={isApprovedEdit}
                                                onValueChange={(value) => updateItem(index, 'item_type', value)}
                                            >
                                                <SelectTrigger className={inputClass}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="asset">Activo</SelectItem>
                                                    <SelectItem value="component">Componente</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2 xl:col-span-2">
                                            <Label>{item.item_type === 'asset' ? 'Activo' : 'Componente'} <span className="text-destructive">*</span></Label>
                                            {item.item_type === 'asset' ? (
                                                <SearchableSelect
                                                    value={item.asset_id}
                                                    onChange={(value) => updateItem(index, 'asset_id', value)}
                                                    options={assetOptions}
                                                    placeholder={data.origin.warehouse_id ? 'Buscar activo' : 'Seleccione primero el almacén origen'}
                                                    disabled={isApprovedEdit || !data.origin.warehouse_id}
                                                    formatOptionLabel={formatRichOption}
                                                />
                                            ) : (
                                                <SearchableSelect
                                                    value={item.component_id}
                                                    onChange={(value) => updateItem(index, 'component_id', value)}
                                                    options={componentOptions}
                                                    placeholder={data.origin.warehouse_id ? 'Buscar componente' : 'Seleccione primero el almacén origen'}
                                                    disabled={isApprovedEdit || !data.origin.warehouse_id}
                                                    formatOptionLabel={formatRichOption}
                                                />
                                            )}
                                            {itemError(index, 'asset_id') && (
                                                <p className="text-xs text-destructive">{itemError(index, 'asset_id')}</p>
                                            )}
                                            {itemError(index, 'component_id') && (
                                                <p className="text-xs text-destructive">{itemError(index, 'component_id')}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Condición salida</Label>
                                            <Select
                                                value={item.condition_out || '_'}
                                                disabled={isApprovedEdit}
                                                onValueChange={(value) => updateItem(index, 'condition_out', value === '_' ? '' : value)}
                                            >
                                                <SelectTrigger className={inputClass}>
                                                    <SelectValue placeholder="Seleccione" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="_">Sin dato</SelectItem>
                                                    {CONDITION_OPTIONS.map((option) => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-2 border-t border-border bg-muted/20 px-4 py-4 md:px-6">
                            <Link
                                href="/admin/asset-transfers"
                                className="inline-flex items-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                            >
                                Cancelar
                            </Link>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="cursor-pointer bg-inv-primary text-white hover:bg-inv-primary/90"
                            >
                                {submitting ? 'Guardando…' : submitLabel}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
