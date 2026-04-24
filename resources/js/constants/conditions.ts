/**
 * Condiciones unificadas para activos, componentes e inventario físico.
 * Mismas opciones en todo el sistema (catálogo, conteo, reparaciones, traslados).
 */

export const CONDITION_OPTIONS = [
    { value: 'new', label: 'Nuevo' },
    { value: 'good', label: 'Bueno' },
    { value: 'regular', label: 'Regular' },
    { value: 'damaged', label: 'Dañado' },
    { value: 'obsolete', label: 'Obsoleto' },
    { value: 'broken', label: 'Malogrado' },
    { value: 'in_repair', label: 'En reparación' },
    { value: 'pending_disposal', label: 'Con baja pendiente' },
] as const;

export type ConditionValue = (typeof CONDITION_OPTIONS)[number]['value'];

/** Mapa valor → etiqueta en español (acepta valores en inglés y español para compatibilidad) */
const LABELS: Record<string, string> = {
    new: 'Nuevo',
    nuevo: 'Nuevo',
    good: 'Bueno',
    bueno: 'Bueno',
    regular: 'Regular',
    fair: 'Regular',
    damaged: 'Dañado',
    malo: 'Malo',
    bad: 'Malo',
    obsolete: 'Obsoleto',
    obsoleto: 'Obsoleto',
    broken: 'Malogrado',
    malogrado: 'Malogrado',
    in_repair: 'En reparación',
    en_reparacion: 'En reparación',
    pending_disposal: 'Con baja pendiente',
    baja_pendiente: 'Con baja pendiente',
};

/**
 * Devuelve la etiqueta en español para un valor de condición.
 * Acepta valores en inglés (new, good, damaged...) o español (nuevo, bueno, malogrado...).
 */
export function conditionToLabel(raw?: string | null): string {
    if (raw == null || raw === '') return '—';
    const key = raw.toLowerCase().trim().replace(/\s+/g, '_');
    return LABELS[key] ?? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

/**
 * Normaliza un valor de condición al formato canónico (inglés) para guardar.
 * Si el valor viene en español o antiguo, devuelve el equivalente en inglés.
 */
export function normalizeConditionValue(raw?: string | null): string {
    if (raw == null || raw === '') return '';
    const v = raw.toLowerCase().trim();
    const map: Record<string, string> = {
        new: 'new',
        nuevo: 'new',
        good: 'good',
        bueno: 'good',
        regular: 'regular',
        fair: 'regular',
        damaged: 'damaged',
        malo: 'damaged',
        bad: 'damaged',
        obsolete: 'obsolete',
        obsoleto: 'obsolete',
        broken: 'broken',
        malogrado: 'broken',
        in_repair: 'in_repair',
        en_reparacion: 'in_repair',
        'en reparación': 'in_repair',
        pending_disposal: 'pending_disposal',
        baja_pendiente: 'pending_disposal',
    };
    return map[v] ?? raw;
}

/** Valor inicial del select de condición (mismo criterio que el modal: vacío → nuevo). */
export function resolveConditionForForm(raw: string | null | undefined): string {
    const n = normalizeConditionValue(raw ?? '');
    if (n === '' || n.toLowerCase() === 'null') {
        return 'new';
    }
    return CONDITION_OPTIONS.some((o) => o.value === n) ? n : 'new';
}
