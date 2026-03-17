import type React from 'react';

type Props = {
    status: string;
};

const STATUS_LABELS: Record<string, string> = {
    pending_approval: 'Por aprobar',
    approved: 'Aprobado',
    in_transit: 'En tránsito',
    received: 'Recibido',
    cancelled: 'Cancelado',
};

const STATUS_CLASS: Record<string, string> = {
    pending_approval: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    approved: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400',
    in_transit: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400',
    received: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
};

export const AssetTransferStatusBadge: React.FC<Props> = ({ status }) => {
    const label = STATUS_LABELS[status] ?? status ?? '—';
    const className =
        STATUS_CLASS[status] ??
        'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400';

    return (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${className}`}>
            {label}
        </span>
    );
};
