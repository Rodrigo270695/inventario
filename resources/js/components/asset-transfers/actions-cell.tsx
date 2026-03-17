import { Link } from '@inertiajs/react';
import { Check, Eye, MessageSquareText, Pencil, Send, Trash2, X } from 'lucide-react';
import type React from 'react';
import { Button } from '@/components/ui/button';
import type { AssetTransfer } from '@/types';

type Props = {
    transfer: AssetTransfer;
    isSuperadmin: boolean;
    currentUserId?: string | null;
    canViewDetail: boolean;
    canDelete: boolean;
    canUpdate: boolean;
    canApprove: boolean;
    canCancel: boolean;
    canDispatch: boolean;
    canReceive: boolean;
    onRequestDelete: (transfer: AssetTransfer) => void;
    onApprove: (transfer: AssetTransfer) => void;
    onCancel: (transfer: AssetTransfer) => void;
    onDispatch: (transfer: AssetTransfer) => void;
    onReceive: (transfer: AssetTransfer) => void;
    onViewCancellationReason: (transfer: AssetTransfer) => void;
};

export const AssetTransferActionsCell: React.FC<Props> = ({
    transfer,
    isSuperadmin,
    currentUserId,
    canViewDetail,
    canDelete,
    canUpdate,
    canApprove,
    canCancel,
    canDispatch,
    canReceive,
    onRequestDelete,
    onApprove,
    onCancel,
    onDispatch,
    onReceive,
    onViewCancellationReason,
}) => {
    const canOperateTransfer =
        isSuperadmin || (currentUserId != null && transfer.sent_by === currentUserId);
    const canEdit =
        canOperateTransfer &&
        (transfer.status === 'approved' ||
            (isSuperadmin && transfer.status === 'pending_approval'));
    const canDeleteRow = isSuperadmin && transfer.status === 'pending_approval';
    const showCompleteData = transfer.status === 'approved';
    const canReceiveTransfer =
        canReceive &&
        transfer.status === 'in_transit' &&
        (isSuperadmin || (currentUserId != null && transfer.received_by === currentUserId));

    return (
        <div className="flex flex-row flex-nowrap items-center justify-end gap-1">
            {canViewDetail && (
                <Link
                    href={`/admin/asset-transfers/${transfer.id}`}
                    className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Ver detalle"
                    title="Ver detalle"
                >
                    <Eye className="size-4" />
                </Link>
            )}
            {canApprove && transfer.status === 'pending_approval' && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer size-8 shrink-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                    aria-label={`Aprobar traslado ${transfer.code || transfer.id}`}
                    title="Aprobar traslado"
                    onClick={() => onApprove(transfer)}
                >
                    <Check className="size-4" />
                </Button>
            )}
            {canCancel && !['received', 'cancelled'].includes(transfer.status) && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer size-8 shrink-0 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
                    aria-label={`Cancelar traslado ${transfer.code || transfer.id}`}
                    title="Rechazar traslado"
                    onClick={() => onCancel(transfer)}
                >
                    <X className="size-4" />
                </Button>
            )}
            {canDispatch && transfer.status === 'approved' && canOperateTransfer && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer size-8 shrink-0 text-sky-600 hover:bg-sky-50 hover:text-sky-700 dark:text-sky-400 dark:hover:bg-sky-950/30"
                    aria-label={`Despachar traslado ${transfer.code || transfer.id}`}
                    title="Despachar traslado"
                    onClick={() => onDispatch(transfer)}
                >
                    <Send className="size-4" />
                </Button>
            )}
            {canReceiveTransfer && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer size-8 shrink-0 text-violet-600 hover:bg-violet-50 hover:text-violet-700 dark:text-violet-400 dark:hover:bg-violet-950/30"
                    aria-label={`Recibir traslado ${transfer.code || transfer.id}`}
                    title="Recibir traslado"
                    onClick={() => onReceive(transfer)}
                >
                    <Check className="size-4" />
                </Button>
            )}
            {transfer.status === 'cancelled' && transfer.cancellation_reason && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer size-8 shrink-0 text-slate-600 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60"
                    aria-label={`Ver motivo de cancelación ${transfer.code || transfer.id}`}
                    title="Ver motivo de cancelación"
                    onClick={() => onViewCancellationReason(transfer)}
                >
                    <MessageSquareText className="size-4" />
                </Button>
            )}
            {canEdit && canUpdate && (
                <Link
                    href={`/admin/asset-transfers/${transfer.id}/edit`}
                    className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
                    aria-label={`${showCompleteData ? 'Completar datos' : 'Editar'} traslado ${transfer.code || transfer.id}`}
                    title={showCompleteData ? 'Completar datos del traslado' : 'Editar traslado'}
                >
                    <Pencil className="size-4" />
                </Link>
            )}
            {canDeleteRow && canDelete && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer shrink-0 size-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400/80 dark:hover:bg-rose-900/20"
                    aria-label={`Eliminar traslado ${transfer.code || transfer.id}`}
                    title="Eliminar traslado"
                    onClick={() => onRequestDelete(transfer)}
                >
                    <Trash2 className="size-4" />
                </Button>
            )}
        </div>
    );
};
