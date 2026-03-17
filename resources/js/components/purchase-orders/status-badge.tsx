import type React from 'react';

type Props = {
    status: string;
};

const STATUS_LABELS: Record<string, string> = {
    pending: 'Pendiente',
    observed: 'Observado',
    approved: 'Aprobada',
    rejected: 'Rechazada',
};

const STATUS_CLASS: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    observed: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
};

export const PurchaseOrderStatusBadge: React.FC<Props> = ({ status }) => {
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

