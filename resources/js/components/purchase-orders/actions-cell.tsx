import { Link, usePage } from '@inertiajs/react';
import { AlertCircle, Check, Eye, Pencil, Trash2, X } from 'lucide-react';
import type React from 'react';
import { Button } from '@/components/ui/button';
import type { PurchaseOrder } from '@/types';

export type PurchaseOrderActionKind =
    | 'approve'
    | 'reject'
    | 'observe'
    | 'minor-approve'
    | 'minor-reject'
    | 'minor-observe';

type Props = {
    order: PurchaseOrder;
    canViewDetail: boolean;
    canApprove: boolean;
    canObserve: boolean;
    canMinorApprove: boolean;
    canMinorObserve: boolean;
    canDelete: boolean;
    canUpdate: boolean;
    actioningId: string | null;
    onOpenActionModal: (order: PurchaseOrder, action: PurchaseOrderActionKind) => void;
    onRequestDelete: (order: PurchaseOrder) => void;
};

function purchaseOrderOfficeId(order: PurchaseOrder): string | null {
    return order.office_id ?? order.office?.id ?? null;
}

function canActOnPurchaseOrderScope(
    order: PurchaseOrder,
    allowedOfficeIds: string[] | null | undefined,
    allowedZonalIds: string[] | null | undefined
): boolean {
    if (allowedOfficeIds === null || allowedOfficeIds === undefined) return true;
    if (allowedOfficeIds.length === 0) return false;

    const oid = purchaseOrderOfficeId(order);
    if (!oid) return false;
    if (allowedOfficeIds.includes(oid)) return true;

    const zid = order.office?.zonal_id;
    if (!zid) return false;
    if (allowedZonalIds === null || allowedZonalIds === undefined) return true;
    return allowedZonalIds.includes(zid);
}

export const PurchaseOrderActionsCell: React.FC<Props> = ({
    order,
    canViewDetail,
    canApprove,
    canObserve,
    canMinorApprove,
    canMinorObserve,
    canDelete,
    canUpdate,
    actioningId,
    onOpenActionModal,
    onRequestDelete,
}) => {
    const page = usePage();
    const allowedZonalIds = (page.props as { allowedZonalIds?: string[] | null }).allowedZonalIds;
    const allowedOfficeIds = (page.props as { allowedOfficeIds?: string[] | null }).allowedOfficeIds;

    const zonalOk = canActOnPurchaseOrderScope(order, allowedOfficeIds, allowedZonalIds);

    const isPendingMinor = order.status === 'pending_minor';
    const isObservedMinor = order.status === 'observed_minor';
    const isPendingMajor = order.status === 'pending';
    const isObservedMajor = order.status === 'observed';

    const canEdit =
        isPendingMinor || isObservedMinor || isPendingMajor || isObservedMajor;
    const canDeleteRow = isPendingMinor;
    const busy = actioningId === order.id;

    const showMinorActions = isPendingMinor && zonalOk && (canMinorApprove || canMinorObserve);
    const showMajorActions = isPendingMajor && (canApprove || canObserve);

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
            {showMinorActions && (
                <>
                    {canMinorApprove && zonalOk && (
                        <>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer shrink-0 size-8 rounded-md text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300"
                                disabled={busy}
                                aria-label="Aprobar zonal"
                                title="Aprobar zonal"
                                onClick={() => onOpenActionModal(order, 'minor-approve')}
                            >
                                {busy ? <span className="text-xs">…</span> : <Check className="size-4" />}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer shrink-0 size-8 rounded-md text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-900/30 dark:hover:text-rose-300"
                                disabled={busy}
                                aria-label="Rechazar zonal"
                                title="Rechazar zonal"
                                onClick={() => onOpenActionModal(order, 'minor-reject')}
                            >
                                {busy ? <span className="text-xs">…</span> : <X className="size-4" />}
                            </Button>
                        </>
                    )}
                    {canMinorObserve && zonalOk && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer shrink-0 size-8 rounded-md text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30 dark:hover:text-amber-300"
                            disabled={busy}
                            aria-label="Observar zonal"
                            title="Observar zonal"
                            onClick={() => onOpenActionModal(order, 'minor-observe')}
                        >
                            {busy ? <span className="text-xs">…</span> : <AlertCircle className="size-4" />}
                        </Button>
                    )}
                </>
            )}
            {showMajorActions && (
                <>
                    {canApprove && (
                        <>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer shrink-0 size-8 rounded-md text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300"
                                disabled={busy}
                                aria-label="Aprobar general"
                                title="Aprobar general"
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
                                aria-label="Rechazar general"
                                title="Rechazar general"
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
                            aria-label="Observar general"
                            title="Observar general"
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
