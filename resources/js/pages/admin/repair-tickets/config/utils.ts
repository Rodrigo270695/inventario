import type { RepairTicketConfigTicket } from './types';

export const STATUS_LABELS: Record<string, string> = {
    pending_approval: 'Pendiente aprobación',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    diagnosed: 'Diagnosticado',
    in_progress: 'En proceso',
    completed: 'Completado',
    cancelled: 'Cancelado',
};

export const PRIORITY_LABELS: Record<string, string> = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    critical: 'Crítica',
};

export const MODE_LABELS: Record<string, string> = {
    internal: 'Interno',
    external: 'Externo',
    warranty: 'Garantía',
};

export const FAILURE_LABELS: Record<string, string> = {
    hardware: 'Hardware',
    electrical: 'Eléctrica',
    physical: 'Física',
    cosmetic: 'Estética',
    connectivity: 'Conectividad',
    other: 'Otro',
};

export const CONDITION_LABELS: Record<string, string> = {
    new: 'Nuevo',
    good: 'Bueno',
    regular: 'Regular',
    damaged: 'Dañado',
    obsolete: 'Obsoleto',
};

export const COST_TYPE_LABELS: Record<string, string> = {
    labour: 'Mano de obra',
    transport: 'Transporte',
    external_service: 'Servicio externo',
    miscellaneous: 'Misceláneo',
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
    invoice: 'Factura',
    receipt: 'Recibo',
    fee_receipt: 'Recibo por honorarios',
    quote: 'Cotización',
    report: 'Informe',
    evidence_photo: 'Foto evidencia',
    before_photo: 'Foto antes',
    after_photo: 'Foto después',
    warranty_doc: 'Documento de garantía',
    other: 'Otro',
};

export const ISSUER_TYPE_LABELS: Record<string, string> = {
    company: 'Empresa',
    supplier: 'Proveedor',
    technician: 'Técnico',
    other: 'Otro',
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
    status_change: 'Cambio de estado',
    approval: 'Aprobación',
    cancellation: 'Rechazo / cancelación',
    note: 'Actualización',
};

export function fullDisplayName(user?: { name?: string | null; last_name?: string | null; usuario?: string | null } | null): string {
    if (!user) return '—';
    return [user.name, user.last_name].filter(Boolean).join(' ').trim() || user.usuario || '—';
}

export function formatDateShort(value?: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export function formatDateTimeShort(value?: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function maintenanceItemLabel(ticket: RepairTicketConfigTicket): string {
    if (ticket.asset) {
        return [ticket.asset.code, ticket.asset.category?.name, ticket.asset.model?.brand?.name, ticket.asset.model?.name]
            .filter(Boolean)
            .join(' · ');
    }

    if (ticket.component) {
        return [ticket.component.code, ticket.component.type?.name, ticket.component.brand?.name, ticket.component.model]
            .filter(Boolean)
            .join(' · ');
    }

    return '—';
}

export function maintenanceLocationPath(ticket: RepairTicketConfigTicket): string {
    const warehouse = ticket.asset?.warehouse ?? ticket.component?.warehouse;
    if (!warehouse) return '—';

    return [
        warehouse.office?.zonal?.name,
        warehouse.office?.name,
        warehouse.name,
    ].filter(Boolean).join(' / ');
}

export function money(value?: number | string | null): string {
    if (value == null || value === '') return '—';
    const amount = typeof value === 'string' ? Number(value) : value;
    if (Number.isNaN(amount)) return '—';

    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2,
    }).format(amount);
}
