export type Zonal = {
    id: string;
    name: string;
    code: string;
    region: string | null;
    manager_id: string | null;
    timezone: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    manager?: { id: string; name: string } | null;
};

export type Office = {
    id: string;
    zonal_id: string;
    name: string;
    code: string | null;
    address: string | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    zonal?: { id: string; name: string; code: string } | null;
};

export type Warehouse = {
    id: string;
    office_id: string;
    name: string;
    code: string | null;
    capacity: number | null;
    manager_id: string | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    office?: { id: string; name: string; code: string | null; zonal_id: string } | null;
    manager?: { id: string; name: string } | null;
    locations_count?: number;
};

export type GlAccount = {
    id: string;
    code: string;
    name: string;
    account_type: string | null;
    parent_id: string | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    parent?: { id: string; name: string; code: string } | null;
};

export type Department = {
    id: string;
    zonal_id: string;
    name: string;
    code: string | null;
    parent_id: string | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    zonal?: { id: string; name: string; code: string } | null;
    parent?: { id: string; name: string } | null;
};

export type RepairShop = {
    id: string;
    name: string;
    ruc: string | null;
    contact_name: string | null;
    phone: string | null;
    address: string | null;
    zonal_id: string | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    zonal?: { id: string; name: string; code: string } | null;
};

export type Supplier = {
    id: string;
    name: string;
    ruc: string | null;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    address: string | null;
    payment_conditions: string | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
};

/** Categorías tributarias SUNAT (asset_categories): technology, vehicle, furniture, building, machinery, other */
export type AssetCategory = {
    id: string;
    name: string;
    code: string;
    type: string;
    gl_account_id: string | null;
    gl_depreciation_account_id: string | null;
    default_useful_life_years: number | null;
    default_depreciation_method: string | null;
    default_residual_value_pct: number | null;
    requires_insurance: boolean;
    requires_soat: boolean;
    icon: string | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    gl_account?: { id: string; code: string; name: string } | null;
    gl_depreciation_account?: { id: string; code: string; name: string } | null;
};

export type WarehouseLocation = {
    id: string;
    warehouse_id: string;
    code: string;
    aisle: string | null;
    row: string | null;
    bin: string | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    warehouse?: { id: string; name: string; code: string | null } | null;
};

export type PurchaseItem = {
    id: string;
    purchase_order_id: string;
    description: string;
    quantity: number;
    unit_price: number | null;
    total_price: number | null;
    asset_category_id: string | null;
    asset_subcategory_id?: string | null;
    asset_brand_id?: string | null;
    created_at?: string;
    updated_at?: string;
    asset_category?: { id: string; name: string; code: string | null } | null;
    asset_subcategory?: { id: string; name: string; code: string | null; asset_category_id?: string } | null;
    asset_brand?: { id: string; name: string } | null;
};

type UserName = { id: string; name: string; last_name?: string; usuario: string };

export type PurchaseOrder = {
    id: string;
    supplier_id: string;
    office_id: string | null;
    code: string | null;
    status: string;
    requested_by: string | null;
    minor_approved_by?: string | null;
    minor_rejected_by?: string | null;
    minor_observed_by?: string | null;
    minor_approved_at?: string | null;
    minor_rejected_at?: string | null;
    minor_observed_at?: string | null;
    minor_observation_notes?: string | null;
    approved_by: string | null;
    rejected_by: string | null;
    observed_by: string | null;
    approved_at?: string | null;
    rejected_at?: string | null;
    observed_at?: string | null;
    observation_notes: string | null;
    total_amount: number | null;
    notes: string | null;
    created_at?: string;
    updated_at?: string;
    supplier?: { id: string; name: string; ruc: string | null } | null;
    office?: { id: string; name: string; code: string | null; zonal_id: string; zonal?: { id: string; name: string; code: string } | null } | null;
    requested_by_user?: UserName | null;
    minor_approved_by_user?: UserName | null;
    minor_rejected_by_user?: UserName | null;
    minor_observed_by_user?: UserName | null;
    approved_by_user?: UserName | null;
    rejected_by_user?: UserName | null;
    observed_by_user?: UserName | null;
    items?: PurchaseItem[];
};

export type Invoice = {
    id: string;
    purchase_order_id: string;
    invoice_number: string;
    invoice_date: string | null;
    pdf_path: string | null;
    amount: number | null;
    remission_guide?: string | null;
    remission_guide_path?: string | null;
    status?: 'open' | 'closed';
    registered_by?: UserName | null;
    created_at?: string;
    updated_at?: string;
    purchase_order?: {
        id: string;
        code: string | null;
        supplier_id?: string;
        supplier?: { id: string; name: string; ruc: string | null } | null;
    } | null;
};

export type Component = {
    id: string;
    code: string;
    serial_number: string | null;
    type_id: string;
    brand_id: string | null;
    subcategory_id?: string | null;
    model: string | null;
    warehouse_id: string | null;
    repair_shop_id: string | null;
    status: string;
    condition: string;
    notes: string | null;
    specs?: Record<string, unknown> | null;
    created_at?: string;
    updated_at?: string;
    type?: { id: string; name: string; code: string | null } | null;
    brand?: { id: string; name: string } | null;
    subcategory?: {
        id: string;
        name: string;
        asset_category_id?: string;
        category?: { id: string; name: string; code?: string | null } | null;
    } | null;
    warehouse?: { id: string; name: string; code: string | null } | null;
    repairShop?: { id: string; name: string } | null;
};

export type Asset = {
    id: string;
    code: string;
    serial_number: string | null;
    model_id: string | null;
    brand_id?: string | null;
    category_id: string;
    status: string;
    condition: string;
    warehouse_id: string | null;
    acquisition_value?: number | string | null;
    current_value?: number | string | null;
    depreciation_rate?: number | string | null;
    warranty_until?: string | null;
    notes: string | null;
    registered_by_id: string | null;
    updated_by_id: string | null;
    created_at?: string;
    updated_at?: string;
    model?: {
        id: string;
        name: string;
        subcategory?: { id: string; name: string; code?: string | null } | null;
        brand?: { id: string; name: string } | null;
    } | null;
    brand?: { id: string; name: string } | null;
    category?: { id: string; name: string; code: string } | null;
    warehouse?: {
        id: string;
        name: string;
        code: string | null;
        office_id?: string | null;
        office?: { id: string; zonal_id: string; name: string; code: string | null } | null;
    } | null;
    registered_by?: { id: string; name: string } | null;
    updated_by?: { id: string; name: string } | null;
};

export type StockEntry = {
    id: string;
    invoice_id: string | null;
    warehouse_id: string;
    entry_date: string;
    status: string;
    received_by: string | null;
    registered_by?: string | null;
    notes: string | null;
    created_at?: string;
    updated_at?: string;
    items_count?: number;
    invoice?: { id: string; invoice_number: string; purchase_order?: { id: string; code: string | null } | null } | null;
    warehouse?: {
        id: string;
        name: string;
        code: string | null;
        office_id?: string;
        office?: { id: string; name: string; code: string | null; zonal_id?: string; zonal?: { id: string; name: string; code: string } | null } | null;
    } | null;
    received_by_user?: UserName | null;
    registered_by_user?: UserName | null;
};

export type TransferItem = {
    id: number;
    asset_transfer_id: string;
    asset_id?: string | null;
    component_id?: string | null;
    condition_out?: string | null;
    condition_in?: string | null;
    created_at?: string;
    updated_at?: string;
    asset?: {
        id: string;
        code: string;
        serial_number?: string | null;
        condition?: string;
        category?: { id: string; name: string; code?: string | null } | null;
        model?: { id: string; name: string; brand?: { id: string; name: string } | null } | null;
    } | null;
    component?: {
        id: string;
        code: string;
        serial_number?: string | null;
        condition?: string;
        type?: { id: string; name: string; code?: string | null } | null;
        brand?: { id: string; name: string } | null;
        model?: string | null;
    } | null;
};

export type AssetTransfer = {
    id: string;
    code: string;
    origin_warehouse_id: string;
    destination_warehouse_id: string;
    status: string;
    carrier_name?: string | null;
    tracking_number?: string | null;
    carrier_reference?: string | null;
    company_guide_number?: string | null;
    company_guide_path?: string | null;
    carrier_voucher_number?: string | null;
    carrier_voucher_path?: string | null;
    ship_date?: string | null;
    received_at?: string | null;
    approved_at?: string | null;
    sent_by?: string | null;
    received_by?: string | null;
    approved_by?: string | null;
    dispatch_notes?: string | null;
    receipt_notes?: string | null;
    cancelled_by?: string | null;
    cancelled_at?: string | null;
    cancellation_reason?: string | null;
    created_at?: string;
    updated_at?: string;
    items_count?: number;
    origin_warehouse?: {
        id: string;
        name: string;
        code: string | null;
        office_id?: string;
        office?: { id: string; name: string; code: string | null; zonal_id?: string; zonal?: { id: string; name: string; code: string } | null } | null;
    } | null;
    destination_warehouse?: {
        id: string;
        name: string;
        code: string | null;
        office_id?: string;
        office?: { id: string; name: string; code: string | null; zonal_id?: string; zonal?: { id: string; name: string; code: string } | null } | null;
    } | null;
    sent_by_user?: UserName | null;
    received_by_user?: UserName | null;
    approved_by_user?: UserName | null;
    cancelled_by_user?: UserName | null;
    items?: TransferItem[];
};

export type RepairTicket = {
    id: string;
    code: string;
    asset_id?: string | null;
    component_id?: string | null;
    status: string;
    priority: string;
    failure_type?: string | null;
    maintenance_mode: string;
    estimated_cost?: number | string | null;
    approved_budget?: number | string | null;
    reported_at?: string | null;
    diagnosed_at?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    approved_at?: string | null;
    rejected_at?: string | null;
    cancelled_at?: string | null;
    issue_description: string;
    diagnosis?: string | null;
    solution?: string | null;
    condition_in?: string | null;
    condition_out?: string | null;
    opened_by?: string | null;
    technician_id?: string | null;
    approved_by?: string | null;
    rejected_by?: string | null;
    cancelled_by?: string | null;
    repair_shop_id?: string | null;
    external_reference?: string | null;
    rejection_reason?: string | null;
    cancellation_reason?: string | null;
    notes?: string | null;
    created_at?: string;
    updated_at?: string;
    asset?: {
        id: string;
        code: string;
        serial_number?: string | null;
        category?: { id: string; name: string; code?: string | null; type?: string | null } | null;
        model?: { id: string; name: string; brand?: { id: string; name: string } | null } | null;
    } | null;
    component?: {
        id: string;
        code: string;
        serial_number?: string | null;
        type?: { id: string; name: string; code?: string | null } | null;
        brand?: { id: string; name: string } | null;
        model?: string | null;
    } | null;
    repair_shop?: { id: string; name: string } | null;
    opened_by_user?: UserName | null;
    technician?: UserName | null;
    approved_by_user?: UserName | null;
    rejected_by_user?: UserName | null;
    cancelled_by_user?: UserName | null;
};
