export type UserMini = {
    id: string;
    name: string;
    last_name?: string | null;
    usuario?: string | null;
};

export type AssetComputerData = {
    id: string;
    asset_id: string;
    hostname: string | null;
    bios_serial: string | null;
    ip_address: string | null;
    mac_address: string | null;
    last_seen_at: string | null;
} | null;

export type AssetComputerComponent = {
    id: number;
    asset_id: string;
    component_id: string;
    slot: string | null;
    installed_at: string;
    uninstalled_at: string | null;
    installed_by?: UserMini | null;
    uninstalled_by?: UserMini | null;
    component?: {
        id: string;
        code: string;
        serial_number?: string | null;
        type?: { id: string; name: string; code?: string | null } | null;
        brand?: { id: string; name: string } | null;
        model?: string | null;
    } | null;
};

export type ComponentForComputerOption = {
    id: string;
    code: string;
    serial_number: string | null;
    model: string | null;
    type?: { id: string; name: string; code?: string | null } | null;
    brand?: { id: string; name: string } | null;
};

export type AssetConfigAsset = {
    id: string;
    code: string;
    serial_number: string | null;
    status: string;
    condition: string;
    acquisition_value?: number | string | null;
    acquisition_date?: string | null;
    current_value?: number | string | null;
    depreciation_rate?: number | string | null;
    warranty_until?: string | null;
    specs: Record<string, unknown> | null;
    notes: string | null;
    created_at: string | null;
    updated_at: string | null;
    model?: {
        id: string;
        name: string;
        subcategory?: {
            id: string;
            name: string;
            code?: string | null;
            category?: { id: string; name: string } | null;
        } | null;
    } | null;
    warehouse?: {
        id: string;
        name: string;
        code: string | null;
        office?: {
            id: string;
            name: string;
            code: string | null;
            zonal?: { id: string; name: string; code: string | null } | null;
        } | null;
    } | null;
    registered_by?: UserMini | null;
    updated_by?: UserMini | null;
    computer?: AssetComputerData;
};

export type AssetConfigAssignment = {
    id: string;
    assigned_at: string;
    returned_at: string | null;
    condition_out: string | null;
    condition_in: string | null;
    notes: string | null;
    user: UserMini | null;
    assigned_by: UserMini | null;
};

export type AssetConfigPhoto = {
    id: string;
    path: string;
    caption: string | null;
    type: string | null;
    created_at: string | null;
};

export type AssetConfigUserOption = {
    id: string;
    name: string;
    last_name?: string | null;
    usuario?: string | null;
};

export type TabId = 'general' | 'assignments' | 'photos' | 'computer' | 'computer_components';
