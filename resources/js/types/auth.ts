export type User = {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

/** Usuario en listado admin (con roles, creator, updater). */
export type AdminUser = {
    id: string;
    name: string;
    last_name: string;
    usuario: string;
    email: string;
    document_type: string;
    document_number: string;
    phone: string | null;
    is_active: boolean;
    created_at?: string;
    /** Fecha de última modificación (listado admin). */
    updated_at?: string;
    creator?: { id: string; name: string; last_name?: string } | null;
    updater?: { id: string; name: string; last_name?: string } | null;
    zonals?: Array<{ id: string; name: string; code: string }>;
    roles?: Array<{ id: number; name: string }>;
    /** Primer zonal (por nombre) y cuántos más tiene (pivot + gestión). */
    zonal_summary?: { first: string | null; rest_count: number };
};

export type Auth = {
    user: User | null;
    permissions: string[];
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
