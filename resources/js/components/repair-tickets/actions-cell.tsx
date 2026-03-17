import { Link } from '@inertiajs/react';
import { Check, Pencil, Settings, Trash2, X } from 'lucide-react';
import type React from 'react';
import { Button } from '@/components/ui/button';
import type { RepairTicket } from '@/types';

type Props = {
    ticket: RepairTicket;
    canUpdate: boolean;
    canDelete: boolean;
    canApprove: boolean;
    canCancel: boolean;
    onApprove: (ticket: RepairTicket) => void;
    onCancel: (ticket: RepairTicket) => void;
    onDelete: (ticket: RepairTicket) => void;
};

export const RepairTicketActionsCell: React.FC<Props> = ({
    ticket,
    canUpdate,
    canDelete,
    canApprove,
    canCancel,
    onApprove,
    onCancel,
    onDelete,
}) => {
    const canApproveTicket = canApprove && ticket.status === 'pending_approval';
    const canCancelTicket =
        canCancel && !['completed', 'rejected', 'cancelled'].includes(ticket.status);
    const canDeleteTicket = canDelete && ticket.status === 'pending_approval';

    return (
        <div className="flex flex-row flex-nowrap items-center justify-end gap-1">
            {canApproveTicket && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer size-8 shrink-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                    aria-label={`Aprobar ticket ${ticket.code}`}
                    title="Aprobar ticket"
                    onClick={() => onApprove(ticket)}
                >
                    <Check className="size-4" />
                </Button>
            )}
            {canCancelTicket && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer size-8 shrink-0 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
                    aria-label={`${ticket.status === 'pending_approval' ? 'Rechazar' : 'Cancelar'} ticket ${ticket.code}`}
                    title={ticket.status === 'pending_approval' ? 'Rechazar ticket' : 'Cancelar ticket'}
                    onClick={() => onCancel(ticket)}
                >
                    <X className="size-4" />
                </Button>
            )}
            {canUpdate && (
                <Link
                    href={`/admin/repair-tickets/${ticket.id}/config?tab=general`}
                    className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
                    aria-label={`Editar ${ticket.code}`}
                    title="Editar ticket"
                >
                    <Pencil className="size-4" />
                </Link>
            )}
            {canDeleteTicket && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer shrink-0 size-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400/80 dark:hover:bg-rose-900/20"
                    aria-label={`Eliminar ${ticket.code}`}
                    title="Eliminar ticket"
                    onClick={() => onDelete(ticket)}
                >
                    <Trash2 className="size-4" />
                </Button>
            )}
        </div>
    );
};
