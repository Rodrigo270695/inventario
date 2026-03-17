import type React from 'react';

type Props = {
    status?: string | null;
};

export const InvoiceStatusBadge: React.FC<Props> = ({ status }) => {
    const isClosed = status === 'closed';
    const label = isClosed ? 'Cerrada' : 'Abierta';

    const className = isClosed
        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
        : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300';

    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>
            {label}
        </span>
    );
};

