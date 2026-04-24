import type { AssetConfigAsset, UserMini } from './types';

export const STATUS_LABELS: Record<string, string> = {
    stored: 'Almacenado',
    active: 'En uso',
    in_repair: 'En reparación',
    in_transit: 'En tránsito',
    broken: 'Malogrado',
    disposed: 'Dado de baja',
    sold: 'Vendido',
};

export const CONDITION_LABELS: Record<string, string> = {
    new: 'Nuevo',
    good: 'Bueno',
    regular: 'Regular',
    damaged: 'Dañado',
    obsolete: 'Obsoleto',
};

export const CONDITION_OPTIONS = [
    { value: 'new', label: 'Nuevo' },
    { value: 'good', label: 'Bueno' },
    { value: 'regular', label: 'Regular' },
    { value: 'damaged', label: 'Dañado' },
    { value: 'obsolete', label: 'Obsoleto' },
];

function parseUtcToLima(value: string): Date {
    // Si el valor ya viene con zona horaria (ej. termina en Z), usamos tal cual.
    const hasZone = /[zZ]|[+\-]\d\d:?\d\d$/.test(value);
    const iso = hasZone ? value : `${value.replace(' ', 'T')}Z`;
    return new Date(iso);
}

export function formatDateShort(value: string | null | undefined): string {
    if (!value) return '—';
    const d = parseUtcToLima(value);
    return d.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'America/Lima',
    });
}

export function formatDateTimeShort(value: string | null | undefined): string {
    if (!value) return '—';
    const d = parseUtcToLima(value);
    return d.toLocaleString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Lima',
    });
}

export function assetLocationPath(asset: AssetConfigAsset): string {
    const office = asset.warehouse?.office;
    if (!office) return asset.warehouse?.name ?? '—';
    const parts = [
        office.zonal?.name ?? office.zonal?.code ?? null,
        office.name ?? office.code ?? null,
        asset.warehouse?.name ?? asset.warehouse?.code ?? null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' / ') : (office.name ?? '—');
}

export function fullDisplayName(u: UserMini | null | undefined): string {
    if (!u) return '—';
    const name = [u.name, u.last_name].filter(Boolean).join(' ');
    return name || u.usuario || '—';
}
