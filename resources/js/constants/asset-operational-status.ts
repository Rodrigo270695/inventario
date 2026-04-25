/**
 * Estados operativos de activos y componentes (mismo criterio que el backend / dashboard).
 * Valores vacíos o no reconocidos se tratan como en el modal: activo → almacenado por defecto.
 */

/** Malogrado (`broken`) solo aplica a condición física, no a estado operativo. */
export const ASSET_OPER_STATUS_OPTIONS = [
    { value: 'stored', label: 'Almacenado' },
    { value: 'active', label: 'En uso' },
    { value: 'in_repair', label: 'En reparación' },
    { value: 'in_transit', label: 'En tránsito' },
    { value: 'disposed', label: 'Dado de baja' },
    { value: 'sold', label: 'Vendido' },
] as const;

export const COMPONENT_OPER_STATUS_OPTIONS = [
    { value: 'stored', label: 'Almacenado' },
    { value: 'active', label: 'En uso' },
    { value: 'in_repair', label: 'En reparación' },
    { value: 'in_transit', label: 'En tránsito' },
    { value: 'disposed', label: 'Dado de baja' },
] as const;

const ASSET_STATUS_SET = new Set(ASSET_OPER_STATUS_OPTIONS.map((o) => o.value));
const COMPONENT_STATUS_SET = new Set(COMPONENT_OPER_STATUS_OPTIONS.map((o) => o.value));

export function resolveAssetOperationalStatusForForm(raw: string | null | undefined): string {
    const s = (raw ?? '').trim();
    if (s === '' || s.toLowerCase() === 'null' || s === 'broken') {
        return 'stored';
    }
    return ASSET_STATUS_SET.has(s) ? s : 'stored';
}

export function resolveComponentOperationalStatusForForm(raw: string | null | undefined): string {
    const s = (raw ?? '').trim();
    if (s === '' || s.toLowerCase() === 'null' || s === 'broken') {
        return 'stored';
    }
    return COMPONENT_STATUS_SET.has(s) ? s : 'stored';
}
