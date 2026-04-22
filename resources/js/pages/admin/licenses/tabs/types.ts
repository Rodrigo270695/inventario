import type { SortOrder } from '@/components/data-table';

export type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    from: number | null;
    to: number | null;
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
};

export type LicenseFilters = {
    q: string;
    vendor_id: string;
    product_id: string;
    asset_id: string;
    vendors_sort_by: string;
    vendors_sort_order: SortOrder;
    products_sort_by: string;
    products_sort_order: SortOrder;
    licenses_sort_by: string;
    licenses_sort_order: SortOrder;
    assignments_sort_by: string;
    assignments_sort_order: SortOrder;
    installations_sort_by: string;
    installations_sort_order: SortOrder;
};

export type VendorItem = {
    id: string;
    name: string;
    created_at: string | null;
    updated_at: string | null;
};

export type ProductItem = {
    id: string;
    vendor_id: string;
    name: string;
    is_tracked: boolean;
    created_at: string | null;
    updated_at: string | null;
    vendor?: { id: string; name: string } | null;
};

export type LicenseItem = {
    id: string;
    product_id: string;
    license_type: string | null;
    seats_total: number;
    seats_used: number;
    valid_until: string | null;
    cost: string | number | null;
    notes: string | null;
    created_at: string | null;
    product?: {
        id: string;
        name: string;
        vendor_id: string;
        vendor?: { id: string; name: string } | null;
    } | null;
};

export type AssignmentItem = {
    id: string;
    software_license_id: string;
    asset_id: string;
    assigned_at: string;
    revoked_at: string | null;
    valid_until: string | null;
    software_license?: LicenseItem | null;
    asset?: {
        id: string;
        code: string;
        serial_number: string | null;
        model?: { id: string; name: string; brand?: { id: string; name: string } | null } | null;
    } | null;
};

export type InstallationItem = {
    id: string;
    asset_id: string;
    product_id: string;
    version: string | null;
    detected_at: string;
    is_authorized: boolean;
    product?: {
        id: string;
        name: string;
        vendor_id: string;
        vendor?: { id: string; name: string } | null;
    } | null;
    asset?: {
        id: string;
        code: string;
        serial_number: string | null;
        model?: { id: string; name: string; brand?: { id: string; name: string } | null } | null;
    } | null;
};

export type VendorOption = { id: string; name: string };
export type ProductOption = { id: string; name: string; vendor_id: string; is_tracked: boolean; vendor?: { id: string; name: string } | null };
export type LicenseOption = {
    id: string;
    product_id: string;
    license_type: string | null;
    seats_total: number;
    seats_used: number;
    valid_until: string | null;
    product?: { id: string; name: string; vendor_id: string; vendor?: { id: string; name: string } | null } | null;
};
export type AssetOption = {
    id: string;
    code: string;
    serial_number: string | null;
    model_id: string | null;
    model?: { id: string; name: string; brand?: { id: string; name: string } | null } | null;
};
