/**
 * Rol del sistema (Spatie Permission).
 */
export type Role = {
    id: number;
    name: string;
    guard_name: string;
    permissions_count?: number;
    created_at?: string;
    updated_at?: string;
};
