type UserMini = {
    id: string;
    name: string;
    last_name?: string | null;
    usuario?: string | null;
};

export type RepairTicketConfigTicket = {
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
    external_reference?: string | null;
    rejection_reason?: string | null;
    cancellation_reason?: string | null;
    notes?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    asset?: {
        id: string;
        code: string;
        serial_number?: string | null;
        status?: string | null;
        category?: { id: string; name: string } | null;
        model?: { id: string; name: string; brand?: { id: string; name: string } | null } | null;
        warehouse?: {
            id: string;
            name: string;
            code?: string | null;
            office?: {
                id: string;
                name: string;
                code?: string | null;
                zonal?: { id: string; name: string; code?: string | null } | null;
            } | null;
        } | null;
    } | null;
    component?: {
        id: string;
        code: string;
        serial_number?: string | null;
        status?: string | null;
        type?: { id: string; name: string } | null;
        brand?: { id: string; name: string } | null;
        model?: string | null;
        warehouse?: {
            id: string;
            name: string;
            code?: string | null;
            office?: {
                id: string;
                name: string;
                code?: string | null;
                zonal?: { id: string; name: string; code?: string | null } | null;
            } | null;
        } | null;
    } | null;
    repair_shop?: { id: string; name: string } | null;
    warehouse?: {
        id: string;
        name: string;
        code?: string | null;
        office?: {
            id: string;
            name: string;
            code?: string | null;
            zonal?: { id: string; name: string; code?: string | null } | null;
        } | null;
    } | null;
    opened_by_user?: UserMini | null;
    technician?: UserMini | null;
    approved_by_user?: UserMini | null;
    rejected_by_user?: UserMini | null;
    cancelled_by_user?: UserMini | null;
};

export type RepairTicketPart = {
    id: string;
    component_id?: string | null;
    part_name?: string | null;
    part_number?: string | null;
    source_type: string;
    quantity: number;
    unit_cost?: number | string | null;
    total_cost?: number | string | null;
    notes?: string | null;
    created_at?: string | null;
    component?: {
        id: string;
        code: string;
        serial_number?: string | null;
        type?: { id: string; name: string } | null;
        brand?: { id: string; name: string } | null;
        model?: string | null;
    } | null;
};

export type RepairTicketCost = {
    id: string;
    type: string;
    amount: number | string;
    supplier_id?: string | null;
    document_type?: string | null;
    document_number?: string | null;
    description?: string | null;
    incurred_at?: string | null;
    supplier?: { id: string; name: string; ruc?: string | null } | null;
};

export type RepairTicketDocument = {
    id: string;
    type: string;
    issuer_type?: string | null;
    document_number?: string | null;
    title?: string | null;
    file_name: string;
    file_path: string;
    mime_type?: string | null;
    file_size?: number | null;
    issued_at?: string | null;
    notes?: string | null;
    created_at?: string | null;
    repair_cost?: {
        id: string;
        type: string;
        amount: number | string;
        document_number?: string | null;
    } | null;
    uploaded_by?: UserMini | null;
};

export type RepairTicketStatusLog = {
    id: string;
    event_type: string;
    from_status?: string | null;
    to_status?: string | null;
    comment?: string | null;
    created_at?: string | null;
    performed_by?: UserMini | null;
};

export type AssetOption = {
    id: string;
    code: string;
    serial_number?: string | null;
    category?: { id: string; name: string } | null;
    model?: { id: string; name: string; brand?: { id: string; name: string } | null } | null;
};

export type ComponentOption = {
    id: string;
    code: string;
    serial_number?: string | null;
    type?: { id: string; name: string } | null;
    brand?: { id: string; name: string } | null;
    model?: string | null;
};

export type UserOption = {
    id: string;
    name: string;
    last_name?: string | null;
    usuario?: string | null;
};

export type RepairShopOption = {
    id: string;
    name: string;
};

export type SupplierOption = {
    id: string;
    name: string;
    ruc?: string | null;
};

export type TabId = 'general' | 'parts' | 'costs' | 'documents' | 'history';
