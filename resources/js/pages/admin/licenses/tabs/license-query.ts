import type { LicenseFilters } from './types';

export function defaultLicenseListFilters(): LicenseFilters {
    return {
        q: '',
        vendor_id: '',
        product_id: '',
        asset_id: '',
        vendors_sort_by: 'name',
        vendors_sort_order: 'asc',
        products_sort_by: 'name',
        products_sort_order: 'asc',
        licenses_sort_by: 'created_at',
        licenses_sort_order: 'desc',
        assignments_sort_by: 'assigned_at',
        assignments_sort_order: 'desc',
        installations_sort_by: 'detected_at',
        installations_sort_order: 'desc',
    };
}

/** Parámetros compartidos de filtros y ordenación (todas las listas). */
export function appendLicenseListQuery(search: URLSearchParams, filters: LicenseFilters): void {
    if (filters.q) search.set('q', filters.q);
    if (filters.vendor_id) search.set('vendor_id', filters.vendor_id);
    if (filters.product_id) search.set('product_id', filters.product_id);
    if (filters.asset_id) search.set('asset_id', filters.asset_id);
    search.set('vendors_sort_by', filters.vendors_sort_by);
    search.set('vendors_sort_order', filters.vendors_sort_order);
    search.set('products_sort_by', filters.products_sort_by);
    search.set('products_sort_order', filters.products_sort_order);
    search.set('licenses_sort_by', filters.licenses_sort_by);
    search.set('licenses_sort_order', filters.licenses_sort_order);
    search.set('assignments_sort_by', filters.assignments_sort_by);
    search.set('assignments_sort_order', filters.assignments_sort_order);
    search.set('installations_sort_by', filters.installations_sort_by);
    search.set('installations_sort_order', filters.installations_sort_order);
}
