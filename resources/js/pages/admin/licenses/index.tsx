import { Head, router, usePage } from '@inertiajs/react';
import { FileKey2, Filter, LayoutGrid } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SearchableSelectOption } from '@/components/searchable-select';
import { SearchableSelect } from '@/components/searchable-select';
import { Toast } from '@/components/toast';
import type { ToastMessage } from '@/components/toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import {
    LicensesAssignmentsTab,
    LicensesInstallationsTab,
    LicensesLicensesTab,
    LicensesProductsTab,
    LicensesVendorsTab,
} from './tabs';
import type {
    AssetOption,
    AssignmentItem,
    InstallationItem,
    LicenseFilters,
    LicenseItem,
    LicenseOption,
    Paginated,
    ProductItem,
    ProductOption,
    VendorItem,
    VendorOption,
} from './tabs';
import { appendLicenseListQuery, defaultLicenseListFilters } from './tabs/license-query';

type TabId = 'vendors' | 'products' | 'licenses' | 'assignments' | 'installations';

type Props = {
    tab: TabId;
    filters: LicenseFilters;
    vendors: Paginated<VendorItem>;
    products: Paginated<ProductItem>;
    licenses: Paginated<LicenseItem>;
    assignments: Paginated<AssignmentItem>;
    installations: Paginated<InstallationItem>;
    vendorsForSelect: VendorOption[];
    productsForSelect: ProductOption[];
    licensesForSelect: LicenseOption[];
    assetsForSelect: AssetOption[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Licencias', href: '/admin/licenses' },
];

function buildUrl(tab: TabId, filters: LicenseFilters): string {
    const search = new URLSearchParams();
    search.set('tab', tab);
    appendLicenseListQuery(search, filters);
    return `/admin/licenses?${search.toString()}`;
}

export default function LicensesIndex({
    tab: initialTab,
    filters,
    vendors,
    products,
    licenses,
    assignments,
    installations,
    vendorsForSelect,
    productsForSelect,
    licensesForSelect,
    assetsForSelect,
}: Props) {
    const tab: TabId = initialTab || 'vendors';
    const [searchInput, setSearchInput] = useState(filters.q ?? '');
    const [toastQueue, setToastQueue] = useState<Array<ToastMessage & { id: number }>>([]);
    const lastFlashToastRef = useRef<ToastMessage | null>(null);

    const { props } = usePage();
    const auth = (props as { auth?: { permissions?: string[] } }).auth;
    const permissions = auth?.permissions ?? [];
    const flash = (props as { flash?: { toast?: ToastMessage } }).flash;
    const canCreate = permissions.includes('licenses.create');
    const canUpdate = permissions.includes('licenses.update');
    const canDelete = permissions.includes('licenses.delete');
    const canAssign = permissions.includes('licenses.assign');
    const canRevoke = permissions.includes('licenses.revoke');

    useEffect(() => {
        const t = flash?.toast;
        if (!t || t === lastFlashToastRef.current) return;
        lastFlashToastRef.current = t;
        const id = Date.now();
        queueMicrotask(() => setToastQueue((q) => [...q, { ...t, id }]));
    }, [flash?.toast]);

    useEffect(() => {
        const q = filters.q ?? '';
        queueMicrotask(() => setSearchInput(q));
    }, [filters.q]);

    useEffect(() => {
        const t = setTimeout(() => {
            const nextQ = (searchInput ?? '').trim();
            const currentQ = (filters.q ?? '').trim();
            if (nextQ === currentQ) return;
            router.get(buildUrl(tab, { ...filters, q: nextQ }), {}, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 400);
        return () => clearTimeout(t);
    }, [filters, searchInput, tab]);

    const vendorOptions: SearchableSelectOption[] = useMemo(
        () => vendorsForSelect.map((v) => ({ value: v.id, label: v.name })),
        [vendorsForSelect]
    );

    const productOptions: SearchableSelectOption[] = useMemo(
        () => productsForSelect.map((p) => ({
            value: p.id,
            label: `${p.vendor?.name ?? 'Sin fabricante'} · ${p.name}`,
            searchTerms: [p.name, p.vendor?.name ?? ''],
        })),
        [productsForSelect]
    );

    const assetOptions: SearchableSelectOption[] = useMemo(
        () => assetsForSelect.map((a) => ({
            value: a.id,
            label: a.code,
            searchTerms: [a.serial_number ?? '', a.model?.brand?.name ?? '', a.model?.name ?? ''],
        })),
        [assetsForSelect]
    );

    const tabCount = {
        vendors: vendors.total,
        products: products.total,
        licenses: licenses.total,
        assignments: assignments.total,
        installations: installations.total,
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Licencias" />

            {toastQueue.length > 0 && (
                <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
                    {toastQueue.map((toast) => (
                        <Toast key={toast.id} toast={toast} onDismiss={() => setToastQueue((q) => q.filter((item) => item.id !== toast.id))} duration={3000} />
                    ))}
                </div>
            )}

            <div className="flex flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-3">
                        <div>
                            <h1 className="relative inline-block pb-1 text-xl font-semibold text-foreground">
                                Licencias de software
                                <span className="absolute bottom-0 left-0 h-0.5 w-8 rounded-full bg-inv-primary" />
                            </h1>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            Control de fabricantes, productos, licencias, asignaciones e instalaciones detectadas.
                        </p>
                        <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-medium text-indigo-800">
                                <FileKey2 className="size-3 shrink-0" />
                                <span>Licencias</span>
                                <span className="font-semibold">{licenses.total}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800">
                                <span>Asignaciones</span>
                                <span className="font-semibold">{assignments.total}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
                                <span>Instalaciones</span>
                                <span className="font-semibold">{installations.total}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-medium text-teal-800">
                                <LayoutGrid className="size-3 shrink-0" />
                                <span>Tab actual</span>
                                <span className="font-semibold">{tabCount[tab]}</span>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="border-t border-border w-full shrink-0" aria-hidden />

                <div className="rounded-xl border border-border bg-card shadow-sm">
                    <div className="border-b border-border/70 bg-muted/20 p-3">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Buscar</Label>
                                <Input
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Buscar por nombre..."
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Fabricante</Label>
                                <SearchableSelect
                                    value={filters.vendor_id}
                                    onChange={(value) =>
                                        router.get(
                                            buildUrl(tab, { ...filters, vendor_id: value, product_id: '' }),
                                            {},
                                            { preserveState: true, preserveScroll: true, replace: true }
                                        )
                                    }
                                    options={vendorOptions}
                                    placeholder="Todos los fabricantes"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Producto</Label>
                                <SearchableSelect
                                    value={filters.product_id}
                                    onChange={(value) =>
                                        router.get(
                                            buildUrl(tab, { ...filters, product_id: value }),
                                            {},
                                            { preserveState: true, preserveScroll: true, replace: true }
                                        )
                                    }
                                    options={productOptions}
                                    placeholder="Todos los productos"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Activo</Label>
                                <SearchableSelect
                                    value={filters.asset_id}
                                    onChange={(value) =>
                                        router.get(
                                            buildUrl(tab, { ...filters, asset_id: value }),
                                            {},
                                            { preserveState: true, preserveScroll: true, replace: true }
                                        )
                                    }
                                    options={assetOptions}
                                    placeholder="Todos los activos"
                                />
                            </div>
                        </div>
                        <div className="mt-2 flex items-center justify-end">
                            <button
                                type="button"
                                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
                                onClick={() =>
                                    router.get(buildUrl(tab, defaultLicenseListFilters()), {}, {
                                        preserveState: true,
                                        preserveScroll: true,
                                        replace: true,
                                    })
                                }
                            >
                                <Filter className="size-3.5" />
                                Limpiar filtros
                            </button>
                        </div>
                    </div>

                    <div className="border-b border-inv-primary/20 bg-inv-primary/5 p-2">
                        <nav
                            className="-mx-1 flex flex-nowrap gap-1 overflow-x-auto px-1 pb-0.5 sm:flex-wrap sm:overflow-visible"
                            aria-label="Tabs de licencias"
                        >
                            {([
                                ['vendors', 'Fabricantes'],
                                ['products', 'Productos'],
                                ['licenses', 'Licencias'],
                                ['assignments', 'Asignaciones'],
                                ['installations', 'Instalaciones'],
                            ] as Array<[TabId, string]>).map(([tabId, label]) => (
                                <button
                                    key={tabId}
                                    type="button"
                                    className={cn(
                                        'shrink-0 cursor-pointer whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm',
                                        tab === tabId
                                            ? 'bg-inv-primary text-white shadow-sm'
                                            : 'text-muted-foreground hover:bg-inv-primary/10 hover:text-inv-primary'
                                    )}
                                    onClick={() =>
                                        router.get(
                                            buildUrl(tabId, filters),
                                            {},
                                            { preserveState: true, preserveScroll: true, replace: true }
                                        )
                                    }
                                >
                                    {label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {tab === 'vendors' && (
                        <LicensesVendorsTab
                            vendors={vendors}
                            filters={filters}
                            canCreate={canCreate}
                            canUpdate={canUpdate}
                            canDelete={canDelete}
                        />
                    )}
                    {tab === 'products' && (
                        <LicensesProductsTab
                            products={products}
                            filters={filters}
                            vendorsForSelect={vendorsForSelect}
                            canCreate={canCreate}
                            canUpdate={canUpdate}
                            canDelete={canDelete}
                        />
                    )}
                    {tab === 'licenses' && (
                        <LicensesLicensesTab
                            licenses={licenses}
                            filters={filters}
                            productsForSelect={productsForSelect}
                            canCreate={canCreate}
                            canUpdate={canUpdate}
                            canDelete={canDelete}
                        />
                    )}
                    {tab === 'assignments' && (
                        <LicensesAssignmentsTab
                            assignments={assignments}
                            filters={filters}
                            licensesForSelect={licensesForSelect}
                            assetsForSelect={assetsForSelect}
                            canAssign={canAssign}
                            canRevoke={canRevoke}
                            canDelete={canDelete}
                        />
                    )}
                    {tab === 'installations' && (
                        <LicensesInstallationsTab
                            installations={installations}
                            filters={filters}
                            assetsForSelect={assetsForSelect}
                            productsForSelect={productsForSelect}
                            canCreate={canCreate}
                            canUpdate={canUpdate}
                            canDelete={canDelete}
                        />
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
