import { Head, Link, router, usePage } from '@inertiajs/react';
import { CheckCircle2, ClipboardCheck, Filter, LayoutGrid, Plus, Trash2, FileDown } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppModal } from '@/components/app-modal';
import { SearchableSelect, type SearchableSelectOption } from '@/components/searchable-select';
import type { DataTableColumn, SortOrder } from '@/components/data-table';
import { DataTable } from '@/components/data-table';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';
import type { ToastMessage } from '@/components/toast';
import { Toast } from '@/components/toast';
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
import type { BreadcrumbItem } from '@/types';
import { cn } from '@/lib/utils';
import { TablePagination } from '@/components/table-pagination';

type Zonal = { id: string; name: string; code: string | null };
type Office = { id: string; name: string; code: string | null; zonal_id: string };
type Warehouse = { id: string; name: string; code: string | null; office_id: string; office?: { name: string; zonal_id: string; zonal?: { name: string } } };

type MiniUser = { id: string; name: string; last_name: string | null; usuario: string | null };

type MiniAsset = {
    id: string;
    code: string;
    serial_number: string | null;
    category?: { name: string; type?: string };
    model?: { name: string; brand?: { name: string } };
};

type MiniComponent = {
    id: string;
    code: string;
    serial_number: string | null;
    type?: { name: string };
    brand?: { name: string };
    model?: string | null;
};

type AssetOption = {
    id: string;
    code: string;
    serial_number: string | null;
    category_id?: string | null;
    model_id?: string | null;
};

type ComponentOption = {
    id: string;
    code: string;
    serial_number: string | null;
    type_id: string | null;
    brand_id: string | null;
    model: string | null;
};

type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    from: number | null;
    to: number | null;
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
};

type AssetDisposalRow = {
    id: string;
    asset_id: string | null;
    component_id: string | null;
    warehouse?: Warehouse | null;
    status: string;
    reason: string;
    approved_at: string | null;
    created_at: string;
    asset?: MiniAsset | null;
    component?: MiniComponent | null;
    approved_by?: MiniUser | null;
    created_by?: MiniUser | null;
    sale?: {
        id: string;
        buyer_name: string;
        amount: string | number | null;
        sold_at: string | null;
    } | null;
};

type AssetSaleRow = {
    id: string;
    asset_disposal_id: string;
    buyer_name: string;
    buyer_dni: string | null;
    amount: string | number | null;
    payment_method: string | null;
    sold_at: string | null;
    created_at: string;
    status?: string;
    disposal?: {
        id: string;
        status: string;
        reason: string;
        asset?: MiniAsset | null;
        component?: MiniComponent | null;
        warehouse?: Warehouse | null;
    } | null;
};

type Filters = {
    status: string;
    type: string;
    date_from: string;
    date_to: string;
    zonal_id: string;
    office_id: string;
    warehouse_id: string;
};

type Props = {
    tab: 'disposals' | 'sales';
    disposals: Paginated<AssetDisposalRow>;
    sales: Paginated<AssetSaleRow>;
    filters: Filters;
    zonalsForSelect: Zonal[];
    officesForSelect: Office[];
    warehousesForSelect: Warehouse[];
    assetsForSelect: AssetOption[];
    componentsForSelect: ComponentOption[];
};

const PAYMENT_METHODS: { value: string; label: string }[] = [
    { value: 'cash', label: 'Efectivo' },
    { value: 'deposit', label: 'Depósito / transferencia' },
    { value: 'credit_card', label: 'Tarjeta de crédito' },
    { value: 'debit_card', label: 'Tarjeta de débito' },
    { value: 'yape', label: 'Yape' },
    { value: 'plin', label: 'Plin' },
    { value: 'check', label: 'Cheque' },
];

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Bajas y ventas', href: '/admin/asset-disposals' },
];

const STATUS_LABELS: Record<string, string> = {
    requested: 'Solicitado',
    approved: 'Aprobado',
    rejected: 'Rechazado',
};

function userName(user?: MiniUser | null): string {
    if (!user) return '—';
    return [user.name, user.last_name].filter(Boolean).join(' ') || user.usuario || '—';
}

function itemLabel(row: { asset?: MiniAsset | null; component?: MiniComponent | null }): string {
    if (row.asset) {
        return [
            row.asset.code,
            row.asset.category?.name,
            row.asset.model?.brand?.name,
            row.asset.model?.name,
            row.asset.serial_number,
        ].filter(Boolean).join(' · ');
    }
    if (row.component) {
        return [
            row.component.code,
            row.component.type?.name,
            row.component.brand?.name,
            row.component.model,
            row.component.serial_number,
        ].filter(Boolean).join(' · ');
    }
    return '—';
}

function warehousePath(warehouse?: Warehouse | null): string {
    if (!warehouse) return '—';
    const zonal = warehouse.office?.zonal?.name ?? '';
    const office = warehouse.office?.name ?? '';
    return [zonal, office, warehouse.name].filter(Boolean).join(' / ') || warehouse.name;
}

function formatDateTime(value?: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function buildUrl(params: Partial<Filters> & { tab?: string; disposals_page?: number; sales_page?: number }) {
    const search = new URLSearchParams();
    if (params.tab) search.set('tab', params.tab);
    if (params.status !== undefined) search.set('status', params.status);
    if (params.type !== undefined) search.set('type', params.type);
    if (params.date_from !== undefined && params.date_from !== '') search.set('date_from', params.date_from);
    if (params.date_to !== undefined && params.date_to !== '') search.set('date_to', params.date_to);
    if (params.zonal_id !== undefined) search.set('zonal_id', params.zonal_id);
    if (params.office_id !== undefined) search.set('office_id', params.office_id);
    if (params.warehouse_id !== undefined) search.set('warehouse_id', params.warehouse_id);
    if (params.disposals_page !== undefined) search.set('disposals_page', String(params.disposals_page));
    if (params.sales_page !== undefined) search.set('sales_page', String(params.sales_page));
    return `/admin/asset-disposals?${search.toString()}`;
}

export default function AssetDisposalsIndex(props: Props) {
    const {
        tab: initialTab,
        disposals,
        sales,
        filters,
        zonalsForSelect,
        officesForSelect,
        warehousesForSelect,
        assetsForSelect,
        componentsForSelect,
    } = props;

    const [tab, setTab] = useState<'disposals' | 'sales'>(initialTab || 'disposals');
    const { props: pageProps } = usePage();
    const auth = (pageProps as { auth?: { permissions?: string[] } }).auth;
    const permissions = auth?.permissions ?? [];
    const canView = permissions.includes('asset_disposals.view');
    const canCreate = permissions.includes('asset_disposals.create');
    const canApprove = permissions.includes('asset_disposals.approve');
    const canReject = permissions.includes('asset_disposals.reject');
    const canDelete = permissions.includes('asset_disposals.delete');
    const canSale = permissions.includes('asset_disposals.sale');
    const canDeleteSale = permissions.includes('asset_disposals.sale.delete');
    const canApproveSale = permissions.includes('asset_disposals.sale.approve');
    const canExport = permissions.includes('asset_disposals.export');

    const [cascadeZonalId, setCascadeZonalId] = useState<string>(filters.zonal_id ?? '');
    const [cascadeOfficeId, setCascadeOfficeId] = useState<string>(filters.office_id ?? '');
    const [modalZonalId, setModalZonalId] = useState<string>('');
    const [modalOfficeId, setModalOfficeId] = useState<string>('');
    const [modalWarehouseId, setModalWarehouseId] = useState<string>('');
    const [createOpen, setCreateOpen] = useState(false);
    const [createType, setCreateType] = useState<'asset' | 'component'>('asset');
    const [createForm, setCreateForm] = useState({ asset_id: '', component_id: '', reason: '' });
    const [approveItem, setApproveItem] = useState<AssetDisposalRow | null>(null);
    const [rejectItem, setRejectItem] = useState<AssetDisposalRow | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [saleItem, setSaleItem] = useState<AssetDisposalRow | null>(null);
    const [saleForm, setSaleForm] = useState({
        buyer_name: '',
        buyer_dni: '',
        amount: '',
        payment_method: '',
        sold_at: '',
        notes: '',
    });
    const [deleteItem, setDeleteItem] = useState<AssetDisposalRow | null>(null);
    const [deleteSale, setDeleteSale] = useState<{ disposalId: string; saleId: string } | null>(null);
    const [approveSale, setApproveSale] = useState<AssetSaleRow | null>(null);
    const [approvalNotes, setApprovalNotes] = useState('');
    const [loadingAction, setLoadingAction] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [disposalsSortBy, setDisposalsSortBy] = useState<string | undefined>();
    const [disposalsSortOrder, setDisposalsSortOrder] = useState<SortOrder>('asc');
    const [salesSortBy, setSalesSortBy] = useState<string | undefined>();
    const [salesSortOrder, setSalesSortOrder] = useState<SortOrder>('asc');

    const flash = pageProps.flash as { toast?: ToastMessage } | undefined;
    const [toastQueue, setToastQueue] = useState<Array<ToastMessage & { id: number }>>([]);
    const lastFlashRef = useRef<ToastMessage | null>(null);

    useEffect(() => {
        const t = flash?.toast;
        if (!t || t === lastFlashRef.current) return;
        lastFlashRef.current = t;
        setToastQueue((q) => [...q, { ...t, id: Date.now() }]);
    }, [flash?.toast]);

    const officesFilteredByZonal = cascadeZonalId
        ? officesForSelect.filter((office) => office.zonal_id === cascadeZonalId)
        : officesForSelect;

    const warehousesFilteredByCascade = cascadeOfficeId
        ? warehousesForSelect.filter((w) => w.office_id === cascadeOfficeId)
        : cascadeZonalId
        ? warehousesForSelect.filter((w) => w.office?.zonal_id === cascadeZonalId)
        : warehousesForSelect;

    const modalOfficesByZonal = modalZonalId
        ? officesForSelect.filter((office) => office.zonal_id === modalZonalId)
        : officesForSelect;

    const modalWarehousesByCascade = modalOfficeId
        ? warehousesForSelect.filter((w) => w.office_id === modalOfficeId)
        : modalZonalId
        ? warehousesForSelect.filter((w) => w.office?.zonal_id === modalZonalId)
        : warehousesForSelect;

    const warehouseOptions: SearchableSelectOption[] = warehousesFilteredByCascade
        .slice()
        .sort((a, b) => {
            const az = a.office?.zonal?.name ?? '';
            const bz = b.office?.zonal?.name ?? '';
            if (az !== bz) return az.localeCompare(bz);
            return a.name.localeCompare(b.name);
        })
        .map((w) => {
            const zonal = w.office?.zonal?.name ?? '';
            const office = w.office?.name ?? '';
            const label = [zonal, office, w.name].filter(Boolean).join(' / ') || w.name;
            return {
                value: w.id,
                label,
                searchTerms: [w.code ?? '', w.name, office, zonal],
            };
        });

    const assetOptions: SearchableSelectOption[] = assetsForSelect.map((asset) => ({
        value: asset.id,
        label: asset.code,
        searchTerms: [asset.serial_number ?? ''],
    }));

    const componentOptions: SearchableSelectOption[] = componentsForSelect.map((component) => ({
        value: component.id,
        label: component.code,
        searchTerms: [component.serial_number ?? component.model ?? ''],
    }));

    const modalAssetOptions: SearchableSelectOption[] = assetsForSelect
        .filter((asset) => {
            if (!modalWarehouseId) return true;
            return (asset as AssetOption & { warehouse_id?: string | null }).warehouse_id === modalWarehouseId;
        })
        .map((asset) => ({
            value: asset.id,
            label: asset.code,
            searchTerms: [asset.serial_number ?? ''],
        }));

    const modalComponentOptions: SearchableSelectOption[] = componentsForSelect
        .filter((component) => {
            if (!modalWarehouseId) return true;
            return (component as ComponentOption & { warehouse_id?: string | null }).warehouse_id === modalWarehouseId;
        })
        .map((component) => ({
            value: component.id,
            label: component.code,
            searchTerms: [component.serial_number ?? component.model ?? ''],
        }));

    const applyFilters = useCallback(
        (next: Partial<Filters> & { tab?: string }) => {
            router.get(
                buildUrl({
                    ...filters,
                    ...next,
                }),
                {},
                { preserveState: true, preserveScroll: true }
            );
        },
        [filters]
    );

    const goToTab = (newTab: 'disposals' | 'sales') => {
        setTab(newTab);
        router.get(buildUrl({ ...filters, tab: newTab }), {}, { preserveState: true, preserveScroll: true });
    };

    const submitCreate = () => {
        if (!createForm.reason.trim()) return;
        const payload: Record<string, unknown> = {
            item_type: createType,
            reason: createForm.reason.trim(),
        };
        if (createType === 'asset') {
            payload.asset_id = createForm.asset_id || null;
        } else {
            payload.component_id = createForm.component_id || null;
        }

        router.post('/admin/asset-disposals', payload, {
            preserveScroll: true,
            onSuccess: () => {
                setCreateOpen(false);
                setCreateForm({ asset_id: '', component_id: '', reason: '' });
            },
        });
    };

    const submitApprove = () => {
        if (!approveItem) return;
        setLoadingAction(true);
        router.post(`/admin/asset-disposals/${approveItem.id}/approve`, {}, {
            preserveScroll: true,
            onFinish: () => {
                setLoadingAction(false);
                setApproveItem(null);
            },
        });
    };

    const submitReject = () => {
        if (!rejectItem) return;
        if (!rejectReason.trim()) return;
        setLoadingAction(true);
        router.post(`/admin/asset-disposals/${rejectItem.id}/reject`, { reason: rejectReason.trim() }, {
            preserveScroll: true,
            onFinish: () => {
                setLoadingAction(false);
                setRejectItem(null);
                setRejectReason('');
            },
        });
    };

    const submitSale = () => {
        if (!saleItem || !saleForm.buyer_name.trim()) return;
        const payload = {
            buyer_name: saleForm.buyer_name.trim(),
            buyer_dni: saleForm.buyer_dni.trim() || null,
            amount: saleForm.amount ? Number(saleForm.amount) : null,
            payment_method: saleForm.payment_method.trim() || null,
            sold_at: saleForm.sold_at || null,
            notes: saleForm.notes.trim() || null,
        };
        setLoadingAction(true);
        router.post(`/admin/asset-disposals/${saleItem.id}/sale`, payload, {
            preserveScroll: true,
            onFinish: () => {
                setLoadingAction(false);
                setSaleItem(null);
            },
        });
    };

    const submitDelete = () => {
        if (!deleteItem) return;
        setDeleting(true);
        router.delete(`/admin/asset-disposals/${deleteItem.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteItem(null);
            },
        });
    };

    const submitDeleteSale = () => {
        if (!deleteSale) return;
        setDeleting(true);
        router.delete(`/admin/asset-disposals/${deleteSale.disposalId}/sale/${deleteSale.saleId}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteSale(null);
            },
        });
    };

    const submitApproveSale = () => {
        if (!approveSale || !approvalNotes.trim()) return;
        setLoadingAction(true);
        router.post(
            `/admin/asset-disposals/${approveSale.asset_disposal_id}/sale/${approveSale.id}/approve`,
            { approval_notes: approvalNotes.trim() },
            {
                preserveScroll: true,
                onFinish: () => {
                    setLoadingAction(false);
                    setApproveSale(null);
                    setApprovalNotes('');
                },
            }
        );
    };

    const disposalColumns: DataTableColumn<AssetDisposalRow>[] = [
        {
            key: 'item',
            label: 'Bien',
            sortable: true,
            className: 'max-w-[260px] text-xs text-foreground',
            render: (row) => <span>{itemLabel(row)}</span>,
        },
        {
            key: 'warehouse',
            label: 'Almacén',
            sortable: true,
            className: 'text-xs text-foreground',
            render: (row) => <span>{warehousePath(row.warehouse)}</span>,
        },
        {
            key: 'status',
            label: 'Estado',
            sortable: true,
            className: 'text-xs text-foreground',
            render: (row) => (
                <span
                    className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                        row.status === 'requested'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                            : row.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
                    )}
                >
                    {STATUS_LABELS[row.status] ?? row.status}
                </span>
            ),
        },
        {
            key: 'created_at',
            label: 'Solicitado',
            sortable: true,
            className: 'text-xs text-foreground',
            render: (row) => formatDateTime(row.created_at),
        },
        {
            key: 'actions',
            label: '',
            className: 'w-0 text-right',
            render: (row) => (
                <div className="flex flex-row flex-nowrap items-center justify-end gap-1">
                    {canApprove && row.status === 'requested' && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer size-8 rounded-md text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:text-emerald-200 dark:hover:bg-emerald-950/30"
                            title="Aprobar baja"
                            onClick={() => setApproveItem(row)}
                        >
                            <CheckCircle2 className="size-4" />
                        </Button>
                    )}
                    {canReject && row.status === 'requested' && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer size-8 rounded-md text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:text-amber-300 dark:hover:text-amber-200 dark:hover:bg-amber-950/30"
                            title="Rechazar baja"
                            onClick={() => {
                                setRejectItem(row);
                                setRejectReason('');
                            }}
                        >
                            <Trash2 className="size-4 rotate-45" />
                        </Button>
                    )}
                    {canSale && row.status === 'approved' && !row.sale && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer size-8 rounded-md text-blue-700 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-300 dark:hover:text-blue-200 dark:hover:bg-blue-950/30"
                            title={row.sale ? 'Editar venta' : 'Registrar venta'}
                            onClick={() => {
                                setSaleItem(row);
                                if (row.sale) {
                                    setSaleForm({
                                        buyer_name: row.sale.buyer_name ?? '',
                                        buyer_dni: '',
                                        amount: row.sale.amount != null ? String(row.sale.amount) : '',
                                        payment_method: '',
                                        sold_at: row.sale.sold_at ? row.sale.sold_at.slice(0, 10) : '',
                                    });
                                } else {
                                    setSaleForm({
                                        buyer_name: '',
                                        buyer_dni: '',
                                        amount: '',
                                        payment_method: '',
                                        sold_at: new Date().toISOString().slice(0, 10),
                                    });
                                }
                            }}
                        >
                            <ClipboardCheck className="size-4" />
                        </Button>
                    )}
                    {canDelete && row.status === 'requested' && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer size-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:text-rose-200 dark:hover:bg-rose-950/30"
                            title="Eliminar solicitud"
                            onClick={() => setDeleteItem(row)}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    const saleColumns: DataTableColumn<AssetSaleRow>[] = [
        {
            key: 'buyer_name',
            label: 'Comprador',
            sortable: true,
            className: 'text-sm text-foreground',
            render: (row) => <span className="font-medium">{row.buyer_name}</span>,
        },
        {
            key: 'item',
            label: 'Bien',
            sortable: true,
            className: 'max-w-[260px] text-xs text-foreground',
            render: (row) => <span>{itemLabel(row.disposal ?? { asset: null, component: null })}</span>,
        },
        {
            key: 'amount',
            label: 'Monto',
            sortable: true,
            className: 'text-xs text-foreground',
            render: (row) => (row.amount != null ? `S/ ${Number(row.amount).toFixed(2)}` : '—'),
        },
        {
            key: 'status',
            label: 'Estado',
            sortable: true,
            className: 'text-xs text-foreground',
            render: (row) => {
                const status = row.status ?? 'pending_approval';
                const label =
                    status === 'approved'
                        ? 'Aprobado'
                        : status === 'rejected'
                            ? 'Rechazado'
                            : 'Pendiente';
                const cls =
                    status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                        : status === 'rejected'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300';
                return (
                    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium', cls)}>
                        {label}
                    </span>
                );
            },
        },
        {
            key: 'sold_at',
            label: 'Fecha venta',
            sortable: true,
            className: 'text-xs text-foreground',
            render: (row) => formatDateTime(row.sold_at),
        },
        {
            key: 'actions',
            label: '',
            className: 'w-0 text-right',
            render: (row) =>
                canApproveSale || canDeleteSale ? (
                    <div className="flex flex-row flex-nowrap items-center justify-end gap-1">
                        {canApproveSale && (row.status ?? 'pending_approval') === 'pending_approval' && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer size-8 rounded-md text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:text-emerald-200 dark:hover:bg-emerald-950/30"
                                title="Aprobar venta"
                                onClick={() => {
                                    setApproveSale(row);
                                    setApprovalNotes('');
                                }}
                            >
                                <CheckCircle2 className="size-4" />
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer size-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:text-rose-200 dark:hover:bg-rose-950/30"
                            title="Eliminar venta"
                            disabled={row.status === 'approved'}
                            onClick={() => {
                                if (row.status === 'approved') return;
                                setDeleteSale({
                                    disposalId: row.asset_disposal_id,
                                    saleId: row.id,
                                });
                            }}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                ) : null,
        },
    ];

    const handleDisposalsSort = (key: string) => {
        setDisposalsSortBy((prevKey) => {
            const nextOrder: SortOrder =
                prevKey === key && disposalsSortOrder === 'asc' ? 'desc' : 'asc';
            setDisposalsSortOrder(nextOrder);
            return key;
        });
    };

    const handleSalesSort = (key: string) => {
        setSalesSortBy((prevKey) => {
            const nextOrder: SortOrder =
                prevKey === key && salesSortOrder === 'asc' ? 'desc' : 'asc';
            setSalesSortOrder(nextOrder);
            return key;
        });
    };

    if (!canView) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Bajas y ventas" />
                <div className="p-6">
                    <p className="text-sm text-muted-foreground">
                        No tiene permisos para ver este módulo.
                    </p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Bajas y ventas" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                {toastQueue.length > 0 && (
                    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
                        {toastQueue.map((t) => (
                            <Toast
                                key={t.id}
                                toast={t}
                                onDismiss={() => setToastQueue((q) => q.filter((item) => item.id !== t.id))}
                                duration={3000}
                            />
                        ))}
                    </div>
                )}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-3">
                        <div>
                            <h1 className="relative inline-block pb-1 text-xl font-semibold text-foreground">
                                Bajas y ventas
                                <span className="absolute bottom-0 left-0 h-0.5 w-8 rounded-full bg-inv-primary" />
                            </h1>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Gestión de solicitudes de baja de bienes y ventas asociadas.
                        </p>
                        <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] text-gray-700 dark:bg-blue-500/20 dark:text-gray-300">
                                <Trash2 className="size-3 shrink-0 text-blue-600 dark:text-blue-400" />
                                <span>Total bajas</span>
                                <span className="font-semibold">{disposals.total}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-300">
                                <CheckCircle2 className="size-3 shrink-0" />
                                <span>Con venta</span>
                                <span className="font-semibold">
                                    {disposals.data.filter((d) => d.sale != null).length}
                                </span>
                            </span>
                            {tab === 'sales' && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] text-sky-800 dark:bg-sky-500/25 dark:text-sky-200">
                                    <ClipboardCheck className="size-3 shrink-0" />
                                    <span>Ventas</span>
                                    <span className="font-semibold">{sales.total}</span>
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-500/25 dark:text-amber-300">
                                <Filter className="size-3 shrink-0" />
                                <span>Filtros</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-500/25 dark:text-amber-300">
                                <span>Página</span>
                                <span className="font-semibold">
                                    {tab === 'disposals' ? disposals.current_page : sales.current_page}/
                                    {tab === 'disposals' ? disposals.last_page : sales.last_page}
                                </span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-medium text-teal-800 dark:bg-teal-500/25 dark:text-teal-300">
                                <LayoutGrid className="size-3 shrink-0" />
                                <span>En pantalla</span>
                                <span className="font-semibold">
                                    {tab === 'disposals' ? disposals.data.length : sales.data.length}
                                </span>
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-start">
                        {canExport && (
                            <a
                                href={(() => {
                                    const search = new URLSearchParams();
                                    if (filters.status !== undefined && filters.status !== '') search.set('status', filters.status);
                                    if (filters.type !== undefined && filters.type !== '') search.set('type', filters.type);
                                    if (filters.date_from !== undefined && filters.date_from !== '') search.set('date_from', filters.date_from);
                                    if (filters.date_to !== undefined && filters.date_to !== '') search.set('date_to', filters.date_to);
                                    if (filters.zonal_id !== undefined && filters.zonal_id !== '') search.set('zonal_id', filters.zonal_id);
                                    if (filters.office_id !== undefined && filters.office_id !== '') search.set('office_id', filters.office_id);
                                    if (filters.warehouse_id !== undefined && filters.warehouse_id !== '') search.set('warehouse_id', filters.warehouse_id);
                                    return `/admin/asset-disposals/export?${search.toString()}`;
                                })()}
                                className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md bg-[#217346] text-white shadow-sm hover:bg-[#1a5c38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#217346] focus-visible:ring-offset-2"
                                aria-label="Exportar bajas y ventas a Excel"
                            >
                                <FileDown className="size-5" />
                            </a>
                        )}
                        {canCreate && (
                            <button
                                type="button"
                                onClick={() => {
                                    setCreateType('asset');
                                    setCreateForm({ asset_id: '', component_id: '', reason: '' });
                                    setModalZonalId('');
                                    setModalOfficeId('');
                                    setModalWarehouseId('');
                                    setCreateOpen(true);
                                }}
                                className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md bg-inv-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-inv-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2"
                            >
                                <Plus className="size-4" />
                                <span>Nueva baja</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="border-t border-border w-full shrink-0" aria-hidden />

                <div className="relative overflow-hidden rounded-2xl">
                    <div
                        className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
                        style={{ background: 'linear-gradient(135deg, #447794 0%, #2d5b75 40%, #123249 100%)' }}
                        aria-hidden
                    />
                    <div
                        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-30"
                        style={{ background: 'radial-gradient(circle, #447794 0%, transparent 70%)' }}
                        aria-hidden
                    />

                    <div className="relative border-b border-inv-primary/50 bg-inv-primary/25 dark:bg-inv-section/70 dark:border-inv-surface/60">
                        <nav className="flex gap-0.5 p-2 overflow-x-auto pb-3 flex-none" aria-label="Tabs">
                            <button
                                type="button"
                                onClick={() => goToTab('disposals')}
                                className={cn(
                                    'flex-none cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all sm:text-sm',
                                    tab === 'disposals'
                                        ? 'bg-inv-primary text-white shadow-md ring-2 ring-inv-surface/30'
                                        : 'text-muted-foreground hover:bg-inv-primary/10 hover:text-inv-primary'
                                )}
                            >
                                <Trash2 className="hidden size-4 sm:inline-block" />
                                <span>Solicitudes de baja</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => goToTab('sales')}
                                className={cn(
                                    'flex-none cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all sm:text-sm',
                                    tab === 'sales'
                                        ? 'bg-inv-primary text-white shadow-md ring-2 ring-inv-surface/30'
                                        : 'text-muted-foreground hover:bg-inv-primary/10 hover:text-inv-primary'
                                )}
                            >
                                <ClipboardCheck className="hidden size-4 sm:inline-block" />
                                <span>Ventas</span>
                            </button>
                        </nav>
                    </div>

                    <div className="relative rounded-b-2xl border border-t-0 border-border/80 bg-card shadow-sm">
                        {tab === 'disposals' && (
                            <>
                                <div className="flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center">
                                    <Select
                                        value={(filters.status ?? '') === '' ? '_' : filters.status}
                                        onValueChange={(value) =>
                                            applyFilters({
                                                tab: 'disposals',
                                                status: value === '_' ? '' : value,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="w-full border-border bg-background sm:w-[200px]">
                                            <SelectValue placeholder="Estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_">Todos los estados</SelectItem>
                                            <SelectItem value="requested">Solicitado</SelectItem>
                                            <SelectItem value="approved">Aprobado</SelectItem>
                                            <SelectItem value="rejected">Rechazado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={(filters.type ?? '') === '' ? '_' : filters.type}
                                        onValueChange={(value) =>
                                            applyFilters({
                                                tab: 'disposals',
                                                type: value === '_' ? '' : value,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="w-full border-border bg-background sm:w-[200px]">
                                            <SelectValue placeholder="Tipo de bien" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_">Todos</SelectItem>
                                            <SelectItem value="asset">Activo</SelectItem>
                                            <SelectItem value="component">Componente</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                                        <Select
                                            value={cascadeZonalId === '' ? '_' : cascadeZonalId}
                                            onValueChange={(value) => {
                                                const id = value === '_' ? '' : value;
                                                setCascadeZonalId(id);
                                                setCascadeOfficeId('');
                                                applyFilters({
                                                    tab: 'disposals',
                                                    zonal_id: id,
                                                    office_id: '',
                                                    warehouse_id: '',
                                                });
                                            }}
                                        >
                                            <SelectTrigger className="w-full border-border bg-background sm:w-[180px]">
                                                <SelectValue placeholder="Zonal" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="_">Todos los zonales</SelectItem>
                                                {zonalsForSelect.map((z) => (
                                                    <SelectItem key={z.id} value={z.id}>
                                                        {z.name} {z.code ? `(${z.code})` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={cascadeOfficeId === '' ? '_' : cascadeOfficeId}
                                            onValueChange={(value) => {
                                                const id = value === '_' ? '' : value;
                                                setCascadeOfficeId(id);
                                                applyFilters({
                                                    tab: 'disposals',
                                                    office_id: id,
                                                    warehouse_id: '',
                                                });
                                            }}
                                            disabled={!cascadeZonalId}
                                        >
                                            <SelectTrigger className="w-full border-border bg-background sm:w-[200px]">
                                                <SelectValue placeholder="Oficina" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="_">Todas las oficinas</SelectItem>
                                                {officesFilteredByZonal.map((office) => (
                                                    <SelectItem key={office.id} value={office.id}>
                                                        {office.name} {office.code ? `(${office.code})` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={(filters.warehouse_id ?? '') === '' ? '_' : filters.warehouse_id}
                                            onValueChange={(value) =>
                                                applyFilters({
                                                    tab: 'disposals',
                                                    warehouse_id: value === '_' ? '' : value,
                                                })
                                            }
                                            disabled={!cascadeZonalId && !cascadeOfficeId}
                                        >
                                            <SelectTrigger className="w-full border-border bg-background sm:w-[220px]">
                                                <SelectValue placeholder="Almacén" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="_">Todos los almacenes</SelectItem>
                                                {warehousesFilteredByCascade.map((w) => (
                                                    <SelectItem key={w.id} value={w.id}>
                                                        {warehousePath(w)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className="flex gap-2 sm:flex-nowrap flex-wrap">
                                            <Input
                                                type="date"
                                                value={filters.date_from ?? ''}
                                                onChange={(e) =>
                                                    applyFilters({
                                                        tab: 'disposals',
                                                        date_from: e.target.value,
                                                    })
                                                }
                                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary sm:w-auto"
                                            />
                                            <Input
                                                type="date"
                                                value={filters.date_to ?? ''}
                                                onChange={(e) =>
                                                    applyFilters({
                                                        tab: 'disposals',
                                                        date_to: e.target.value,
                                                    })
                                                }
                                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary sm:w-auto"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="hidden md:block">
                                    <div className="overflow-x-auto">
                                        <DataTable
                                            columns={disposalColumns}
                                            data={disposals.data}
                                            keyExtractor={(row) => row.id}
                                            sortBy={disposalsSortBy}
                                            sortOrder={disposalsSortOrder}
                                            onSort={handleDisposalsSort}
                                            emptyMessage="No hay solicitudes de baja registradas."
                                            variant="default"
                                        />
                                    </div>
                                </div>

                                <div className="md:hidden">
                                    {disposals.data.length === 0 ? (
                                        <p className="py-6 px-4 text-center text-sm text-muted-foreground">
                                            No hay solicitudes de baja registradas.
                                        </p>
                                    ) : (
                                        <ul className="flex flex-col gap-3 p-3">
                                            {disposals.data.map((row) => (
                                                <li key={row.id}>
                                                    <article className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
                                                        <div className="space-y-1.5 p-4">
                                                            <p className="text-sm font-semibold text-foreground">
                                                                {itemLabel(row)}
                                                            </p>
                                                            <dl className="grid grid-cols-1 gap-1 text-xs">
                                                                <div className="flex flex-wrap gap-1">
                                                                    <dt className="mr-1 font-medium text-muted-foreground">
                                                                        Almacén:
                                                                    </dt>
                                                                    <dd>{warehousePath(row.warehouse)}</dd>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1">
                                                                    <dt className="mr-1 font-medium text-muted-foreground">
                                                                        Estado:
                                                                    </dt>
                                                                    <dd>{STATUS_LABELS[row.status] ?? row.status}</dd>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1">
                                                                    <dt className="mr-1 font-medium text-muted-foreground">
                                                                        Solicitado:
                                                                    </dt>
                                                                    <dd>{formatDateTime(row.created_at)}</dd>
                                                                </div>
                                                            </dl>
                                                        </div>
                                                        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/40 px-3 py-2">
                                                            {canApprove && row.status === 'requested' && (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="cursor-pointer border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                                                    title="Aprobar baja"
                                                                    onClick={() => setApproveItem(row)}
                                                                >
                                                                    Aprobar
                                                                </Button>
                                                            )}
                                                            {canReject && row.status === 'requested' && (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="cursor-pointer border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                                                    title="Rechazar baja"
                                                                    onClick={() => {
                                                                        setRejectItem(row);
                                                                        setRejectReason('');
                                                                    }}
                                                                >
                                                                    Rechazar
                                                                </Button>
                                                            )}
                    {canSale && row.status === 'approved' && !row.sale && (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="cursor-pointer border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30"
                                                                    title={row.sale ? 'Editar venta' : 'Registrar venta'}
                                                                    onClick={() => {
                                                                        setSaleItem(row);
                                                                        if (row.sale) {
                                                                            setSaleForm({
                                                                                buyer_name: row.sale.buyer_name ?? '',
                                                                                buyer_dni: '',
                                                                                amount: row.sale.amount != null ? String(row.sale.amount) : '',
                                                                                payment_method: '',
                                                                                sold_at: row.sale.sold_at ? row.sale.sold_at.slice(0, 10) : '',
                                                                            });
                                                                        } else {
                                                                            setSaleForm({
                                                                                buyer_name: '',
                                                                                buyer_dni: '',
                                                                                amount: '',
                                                                                payment_method: '',
                                                                                sold_at: new Date().toISOString().slice(0, 10),
                                                                            });
                                                                        }
                                                                    }}
                                                                >
                                                                    Venta
                                                                </Button>
                                                            )}
                                                            {canDelete && row.status === 'requested' && (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="cursor-pointer border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                                                    onClick={() => setDeleteItem(row)}
                                                                >
                                                                    Eliminar
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </article>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                    <div className="border-t border-border p-3">
                        <TablePagination
                            from={disposals.from}
                            to={disposals.to}
                            total={disposals.total}
                            perPage={disposals.per_page}
                            currentPage={disposals.current_page}
                            lastPage={disposals.last_page}
                            links={disposals.links}
                            buildPageUrl={(page) => buildUrl({ ...filters, tab: 'disposals', disposals_page: page })}
                            onPerPageChange={() => {}}
                            perPageOptions={[25]}
                        />
                    </div>
                            </>
                        )}

                    {tab === 'sales' && (
                            <>
                                <div className="flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center">
                                    <Select
                                        value={(filters.status ?? '') === '' ? '_' : filters.status}
                                        onValueChange={(value) =>
                                            applyFilters({
                                                tab: 'sales',
                                                status: value === '_' ? '' : value,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="w-full border-border bg-background sm:w-[200px]">
                                            <SelectValue placeholder="Estado venta" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_">Todos los estados</SelectItem>
                                            <SelectItem value="pending_approval">Pendiente</SelectItem>
                                            <SelectItem value="approved">Aprobado</SelectItem>
                                            <SelectItem value="rejected">Rechazado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                                        <Select
                                            value={cascadeZonalId === '' ? '_' : cascadeZonalId}
                                            onValueChange={(value) => {
                                                const id = value === '_' ? '' : value;
                                                setCascadeZonalId(id);
                                                setCascadeOfficeId('');
                                                applyFilters({
                                                    tab: 'sales',
                                                    zonal_id: id,
                                                    office_id: '',
                                                    warehouse_id: '',
                                                });
                                            }}
                                        >
                                            <SelectTrigger className="w-full border-border bg-background sm:w-[180px]">
                                                <SelectValue placeholder="Zonal" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="_">Todos los zonales</SelectItem>
                                                {zonalsForSelect.map((z) => (
                                                    <SelectItem key={z.id} value={z.id}>
                                                        {z.name} {z.code ? `(${z.code})` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={cascadeOfficeId === '' ? '_' : cascadeOfficeId}
                                            onValueChange={(value) => {
                                                const id = value === '_' ? '' : value;
                                                setCascadeOfficeId(id);
                                                applyFilters({
                                                    tab: 'sales',
                                                    office_id: id,
                                                    warehouse_id: '',
                                                });
                                            }}
                                            disabled={!cascadeZonalId}
                                        >
                                            <SelectTrigger className="w-full border-border bg-background sm:w-[200px]">
                                                <SelectValue placeholder="Oficina" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="_">Todas las oficinas</SelectItem>
                                                {officesFilteredByZonal.map((office) => (
                                                    <SelectItem key={office.id} value={office.id}>
                                                        {office.name} {office.code ? `(${office.code})` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={(filters.warehouse_id ?? '') === '' ? '_' : filters.warehouse_id}
                                            onValueChange={(value) =>
                                                applyFilters({
                                                    tab: 'sales',
                                                    warehouse_id: value === '_' ? '' : value,
                                                })
                                            }
                                            disabled={!cascadeZonalId && !cascadeOfficeId}
                                        >
                                            <SelectTrigger className="w-full border-border bg-background sm:w-[220px]">
                                                <SelectValue placeholder="Almacén" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="_">Todos los almacenes</SelectItem>
                                                {warehousesFilteredByCascade.map((w) => (
                                                    <SelectItem key={w.id} value={w.id}>
                                                        {warehousePath(w)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className="flex gap-2 sm:flex-nowrap flex-wrap">
                                            <Input
                                                type="date"
                                                value={filters.date_from ?? ''}
                                                onChange={(e) =>
                                                    applyFilters({
                                                        tab: 'sales',
                                                        date_from: e.target.value,
                                                    })
                                                }
                                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary sm:w-auto"
                                            />
                                            <Input
                                                type="date"
                                                value={filters.date_to ?? ''}
                                                onChange={(e) =>
                                                    applyFilters({
                                                        tab: 'sales',
                                                        date_to: e.target.value,
                                                    })
                                                }
                                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary sm:w-auto"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="hidden md:block">
                                    <div className="overflow-x-auto">
                                        <DataTable
                                            columns={saleColumns}
                                            data={sales.data}
                                            keyExtractor={(row) => row.id}
                                            sortBy={salesSortBy}
                                            sortOrder={salesSortOrder}
                                            onSort={handleSalesSort}
                                            emptyMessage="No hay ventas registradas."
                                            variant="default"
                                        />
                                    </div>
                                </div>

                                <div className="md:hidden">
                                    {sales.data.length === 0 ? (
                                        <p className="py-6 px-4 text-center text-sm text-muted-foreground">
                                            No hay ventas registradas.
                                        </p>
                                    ) : (
                                        <ul className="flex flex-col gap-3 p-3">
                                            {sales.data.map((row) => (
                                                <li key={row.id}>
                                                    <article className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
                                                        <div className="space-y-1.5 p-4">
                                                            <p className="text-sm font-semibold text-foreground">
                                                                {row.buyer_name}
                                                            </p>
                                                            <dl className="grid grid-cols-1 gap-1 text-xs">
                                                                <div className="flex flex-wrap gap-1">
                                                                    <dt className="mr-1 font-medium text-muted-foreground">
                                                                        Bien:
                                                                    </dt>
                                                                    <dd>{itemLabel(row.disposal ?? { asset: null, component: null })}</dd>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1">
                                                                    <dt className="mr-1 font-medium text-muted-foreground">
                                                                        Monto:
                                                                    </dt>
                                                                    <dd>
                                                                        {row.amount != null ? `S/ ${Number(row.amount).toFixed(2)}` : '—'}
                                                                    </dd>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1">
                                                                    <dt className="mr-1 font-medium text-muted-foreground">
                                                                        Fecha venta:
                                                                    </dt>
                                                                    <dd>{formatDateTime(row.sold_at)}</dd>
                                                                </div>
                                                            </dl>
                                                        </div>
                                                    </article>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div className="border-t border-border p-3">
                                    <TablePagination
                                        from={sales.from}
                                        to={sales.to}
                                        total={sales.total}
                                        perPage={sales.per_page}
                                        currentPage={sales.current_page}
                                        lastPage={sales.last_page}
                                        links={sales.links}
                                        buildPageUrl={(page) => buildUrl({ ...filters, tab: 'sales', sales_page: page })}
                                        onPerPageChange={() => {}}
                                        perPageOptions={[25]}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <DeleteConfirmModal
                open={!!deleteItem}
                title="Eliminar solicitud de baja"
                description={
                    deleteItem ? '¿Eliminar esta solicitud de baja? No se puede deshacer.' : ''
                }
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                loading={deleting}
                onOpenChange={(open) => {
                    if (!open) setDeleteItem(null);
                }}
                onConfirm={submitDelete}
            />

            <DeleteConfirmModal
                open={!!deleteSale}
                title="Eliminar venta"
                description={
                    deleteSale ? '¿Eliminar esta venta? No se puede deshacer.' : ''
                }
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                loading={deleting}
                onOpenChange={(open) => {
                    if (!open) setDeleteSale(null);
                }}
                onConfirm={submitDeleteSale}
            />

            <AppModal
                open={!!approveSale}
                onOpenChange={(open) => {
                    if (!open) {
                        setApproveSale(null);
                        setApprovalNotes('');
                    }
                }}
                title="Aprobar venta"
                contentClassName="space-y-4"
            >
                <p className="text-sm text-muted-foreground">
                    ¿Confirma la aprobación de esta venta? El estado del bien pasará a <span className="font-semibold">vendido</span>.
                </p>
                <div>
                    <Label>
                        Nota de aprobación
                        <span className="ml-0.5 text-destructive">*</span>
                    </Label>
                    <textarea
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        rows={3}
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                        placeholder="Explique brevemente la decisión (monto aprobado, condiciones, etc.)"
                    />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer border-border bg-background text-foreground hover:bg-muted"
                        onClick={() => {
                            setApproveSale(null);
                            setApprovalNotes('');
                        }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
                        disabled={loadingAction || !approvalNotes.trim()}
                        onClick={submitApproveSale}
                    >
                        Aprobar venta
                    </Button>
                </div>
            </AppModal>

            <AppModal
                open={createOpen}
                onOpenChange={(open) => {
                    setCreateOpen(open);
                    if (!open) {
                        setCreateForm({ asset_id: '', component_id: '', reason: '' });
                    }
                }}
                title="Nueva solicitud de baja"
                contentClassName="space-y-4 max-h-[80vh] overflow-y-auto"
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <Label>
                            Zonal
                            <span className="ml-0.5 text-destructive">*</span>
                        </Label>
                        <Select
                            value={modalZonalId === '' ? '_' : modalZonalId}
                            onValueChange={(value) => {
                                const id = value === '_' ? '' : value;
                                setModalZonalId(id);
                                setModalOfficeId('');
                                setModalWarehouseId('');
                                setCreateForm({ asset_id: '', component_id: '', reason: createForm.reason });
                            }}
                        >
                            <SelectTrigger className="mt-1 w-full">
                                <SelectValue placeholder="Seleccionar zonal" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos los zonales</SelectItem>
                                {zonalsForSelect.map((z) => (
                                    <SelectItem key={z.id} value={z.id}>
                                        {z.name} {z.code ? `(${z.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>
                            Oficina
                            <span className="ml-0.5 text-destructive">*</span>
                        </Label>
                        <Select
                            value={modalOfficeId === '' ? '_' : modalOfficeId}
                            onValueChange={(value) => {
                                const id = value === '_' ? '' : value;
                                setModalOfficeId(id);
                                setModalWarehouseId('');
                                setCreateForm({ asset_id: '', component_id: '', reason: createForm.reason });
                            }}
                            disabled={!modalZonalId}
                        >
                            <SelectTrigger className="mt-1 w-full">
                                <SelectValue placeholder="Seleccionar oficina" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todas las oficinas</SelectItem>
                                {modalOfficesByZonal.map((office) => (
                                    <SelectItem key={office.id} value={office.id}>
                                        {office.name} {office.code ? `(${office.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="sm:col-span-2">
                        <Label>
                            Almacén
                            <span className="ml-0.5 text-destructive">*</span>
                        </Label>
                        <SearchableSelect
                            value={modalWarehouseId}
                            onChange={(value) => {
                                setModalWarehouseId(value);
                                setCreateForm({ asset_id: '', component_id: '', reason: createForm.reason });
                            }}
                            options={modalWarehousesByCascade
                                .slice()
                                .sort((a, b) => {
                                    const az = a.office?.zonal?.name ?? '';
                                    const bz = b.office?.zonal?.name ?? '';
                                    if (az !== bz) return az.localeCompare(bz);
                                    return a.name.localeCompare(b.name);
                                })
                                .map((w) => {
                                    const zonal = w.office?.zonal?.name ?? '';
                                    const office = w.office?.name ?? '';
                                    const label = [zonal, office, w.name].filter(Boolean).join(' / ') || w.name;
                                    return {
                                        value: w.id,
                                        label,
                                        searchTerms: [w.code ?? '', w.name, office, zonal],
                                    };
                                })}
                            placeholder="Seleccionar almacén"
                            noOptionsMessage="No se encontraron almacenes"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <Label>
                            Tipo de bien
                            <span className="ml-0.5 text-destructive">*</span>
                        </Label>
                        <Select
                            value={createType}
                            onValueChange={(v: 'asset' | 'component') => {
                                setCreateType(v);
                                setCreateForm({ asset_id: '', component_id: '', reason: createForm.reason });
                            }}
                        >
                            <SelectTrigger className="mt-1 w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="asset">Activo</SelectItem>
                                <SelectItem value="component">Componente</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="sm:col-span-2">
                        <Label>
                            {createType === 'asset' ? 'Activo' : 'Componente'}
                            <span className="ml-0.5 text-destructive">*</span>
                        </Label>
                        {createType === 'asset' ? (
                            <SearchableSelect
                                value={createForm.asset_id}
                                onChange={(value) => setCreateForm((p) => ({ ...p, asset_id: value, component_id: '' }))}
                                options={modalAssetOptions}
                                placeholder="Seleccionar activo"
                                noOptionsMessage="No se encontraron activos"
                            />
                        ) : (
                            <SearchableSelect
                                value={createForm.component_id}
                                onChange={(value) => setCreateForm((p) => ({ ...p, component_id: value, asset_id: '' }))}
                                options={modalComponentOptions}
                                placeholder="Seleccionar componente"
                                noOptionsMessage="No se encontraron componentes"
                            />
                        )}
                    </div>
                    <div className="sm:col-span-2">
                        <Label>
                            Motivo de la baja
                            <span className="ml-0.5 text-destructive">*</span>
                        </Label>
                        <textarea
                            value={createForm.reason}
                            onChange={(e) => setCreateForm((p) => ({ ...p, reason: e.target.value }))}
                            rows={3}
                            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                            placeholder="Explique brevemente el motivo (obsolescencia, robo, pérdida, sin uso, etc.)"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer border-border bg-background text-foreground hover:bg-muted"
                        onClick={() => setCreateOpen(false)}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        className="cursor-pointer bg-inv-primary text-white hover:bg-inv-primary/90"
                        onClick={submitCreate}
                        disabled={
                            !createForm.reason.trim() ||
                            (createType === 'asset' ? !createForm.asset_id : !createForm.component_id)
                        }
                    >
                        Guardar
                    </Button>
                </div>
            </AppModal>

            <AppModal
                open={!!approveItem}
                onOpenChange={(open) => {
                    if (!open) {
                        setApproveItem(null);
                    }
                }}
                title="Aprobar baja"
                contentClassName="space-y-4"
            >
                <p className="text-sm text-muted-foreground">
                    ¿Confirma la aprobación de la baja para este bien? El estado del bien pasará a{' '}
                    <span className="font-semibold">dado de baja</span>.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer border-border bg-background text-foreground hover:bg-muted"
                        onClick={() => setApproveItem(null)}
                    >
                        Cerrar
                    </Button>
                    <Button
                        type="button"
                        className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
                        disabled={loadingAction}
                        onClick={submitApprove}
                    >
                        Aprobar
                    </Button>
                </div>
            </AppModal>

            <AppModal
                open={!!rejectItem}
                onOpenChange={(open) => {
                    if (!open) {
                        setRejectItem(null);
                        setRejectReason('');
                    }
                }}
                title="Rechazar baja"
                contentClassName="space-y-4"
            >
                <p className="text-sm text-muted-foreground">
                    Indique el motivo por el cual se rechaza la solicitud de baja.
                </p>
                <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                    placeholder="Motivo del rechazo…"
                />
                <div className="flex justify-end gap-2 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer border-border bg-background text-foreground hover:bg-muted"
                        onClick={() => {
                            setRejectItem(null);
                            setRejectReason('');
                        }}
                    >
                        Cerrar
                    </Button>
                    <Button
                        type="button"
                        className="cursor-pointer bg-amber-600 text-white hover:bg-amber-700"
                        disabled={loadingAction || !rejectReason.trim()}
                        onClick={submitReject}
                    >
                        Rechazar
                    </Button>
                </div>
            </AppModal>

            <AppModal
                open={!!saleItem}
                onOpenChange={(open) => {
                    if (!open) {
                        setSaleItem(null);
                    }
                }}
                title="Registrar venta"
                contentClassName="space-y-4 max-h-[80vh] overflow-y-auto"
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <Label>
                            Comprador
                            <span className="ml-0.5 text-destructive">*</span>
                        </Label>
                        <Input
                            value={saleForm.buyer_name}
                            onChange={(e) => setSaleForm((p) => ({ ...p, buyer_name: e.target.value }))}
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label>DNI/RUC</Label>
                        <Input
                            value={saleForm.buyer_dni}
                            onChange={(e) => setSaleForm((p) => ({ ...p, buyer_dni: e.target.value }))}
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label>Monto</Label>
                        <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={saleForm.amount}
                            onChange={(e) => setSaleForm((p) => ({ ...p, amount: e.target.value }))}
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label>Forma de pago</Label>
                        <Select
                            value={saleForm.payment_method || '_'}
                            onValueChange={(v) =>
                                setSaleForm((p) => ({
                                    ...p,
                                    payment_method: v === '_' ? '' : v,
                                }))
                            }
                        >
                            <SelectTrigger className="mt-1 w-full">
                                <SelectValue placeholder="Seleccionar forma de pago" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">—</SelectItem>
                                {PAYMENT_METHODS.map((m) => (
                                    <SelectItem key={m.value} value={m.value}>
                                        {m.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Fecha de venta</Label>
                        <Input
                            type="date"
                            value={saleForm.sold_at}
                            onChange={(e) => setSaleForm((p) => ({ ...p, sold_at: e.target.value }))}
                            className="mt-1"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <Label>Notas</Label>
                        <textarea
                            value={saleForm.notes}
                            onChange={(e) => setSaleForm((p) => ({ ...p, notes: e.target.value }))}
                            rows={2}
                            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                            placeholder="Notas internas sobre la venta (opcional)"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer border-border bg-background text-foreground hover:bg-muted"
                        onClick={() => setSaleItem(null)}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        className="cursor-pointer bg-inv-primary text-white hover:bg-inv-primary/90"
                        onClick={submitSale}
                        disabled={!saleForm.buyer_name.trim() || loadingAction}
                    >
                        Guardar
                    </Button>
                </div>
            </AppModal>
        </AppLayout>
    );
}

