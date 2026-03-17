import { Link, router } from '@inertiajs/react';
import { AlertCircle, Check, Eye, Pencil, Trash2, X } from 'lucide-react';
import type React from 'react';
import { Button } from '@/components/ui/button';
import type { PurchaseOrder } from '@/types';

export type PurchaseOrderActionKind = 'approve' | 'reject' | 'observe';

type Props = {
    order: PurchaseOrder;
    canViewDetail: boolean;
    canApprove: boolean;
    canObserve: boolean;
    canDelete: boolean;
    canUpdate: boolean;
    actioningId: string | null;
    onOpenActionModal: (order: PurchaseOrder, action: PurchaseOrderActionKind) => void;
    onRequestDelete: (order: PurchaseOrder) => void;
};

export const PurchaseOrderActionsCell: React.FC<Props> = ({
    order,
    canViewDetail,
    canApprove,
    canObserve,
    canDelete,
    canUpdate,
    actioningId,
    onOpenActionModal,
    onRequestDelete,
}) => {
    const isPending = order.status === 'pending';
    const isObserved = order.status === 'observed';
    const canEdit = isPending || isObserved;
    const canDeleteRow = isPending;
    const busy = actioningId === order.id;

    return (
        <div className="flex flex-row flex-nowrap items-center justify-end gap-1">
            {canViewDetail && (
                <Link
                    href={`/admin/purchase-orders/${order.id}`}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Ver detalle"
                >
                    <Eye className="size-4" />
                </Link>
            )}
            {isPending && (canApprove || canObserve) && (
                <>
                    {canApprove && (
                        <>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer shrink-0 size-8 rounded-md text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300"
                                disabled={busy}
                                aria-label="Aprobar"
                                onClick={() => onOpenActionModal(order, 'approve')}
                            >
                                {busy ? <span className="text-xs">…</span> : <Check className="size-4" />}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer shrink-0 size-8 rounded-md text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-900/30 dark:hover:text-rose-300"
                                disabled={busy}
                                aria-label="Rechazar"
                                onClick={() => onOpenActionModal(order, 'reject')}
                            >
                                {busy ? <span className="text-xs">…</span> : <X className="size-4" />}
                            </Button>
                        </>
                    )}
                    {canObserve && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer shrink-0 size-8 rounded-md text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30 dark:hover:text-amber-300"
                            disabled={busy}
                            aria-label="Poner en observación"
                            onClick={() => onOpenActionModal(order, 'observe')}
                        >
                            {busy ? <span className="text-xs">…</span> : <AlertCircle className="size-4" />}
                        </Button>
                    )}
                </>
            )}
            {canEdit && canUpdate && (
                <Link
                    href={`/admin/purchase-orders/${order.id}/edit`}
                    className="inline-flex shrink-0 items-center justify-center rounded-md size-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
                    aria-label={`Editar orden ${order.code || order.id}`}
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
                    aria-label={`Eliminar orden ${order.code || order.id}`}
                    onClick={() => onRequestDelete(order)}
                >
                    <Trash2 className="size-4" />
                </Button>
            )}
        </div>
    );
};

