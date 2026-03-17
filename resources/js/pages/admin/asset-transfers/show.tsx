import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Boxes, Check, MessageSquareText, Pencil, Send, X } from 'lucide-react';
import { useState } from 'react';
import { AppModal } from '@/components/app-modal';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AssetTransferStatusBadge } from '@/components/asset-transfers/status-badge';
import AppLayout from '@/layouts/app-layout';
import type { AssetTransfer, BreadcrumbItem } from '@/types';

type Props = {
    assetTransfer: AssetTransfer;
    isSuperadmin?: boolean;
    currentUserId?: string | null;
};

const breadcrumbs = (id: string): BreadcrumbItem[] => [
    { title: 'Activos', href: '#' },
    { title: 'Traslados', href: '/admin/asset-transfers' },
    { title: 'Detalle traslado', href: `/admin/asset-transfers/${id}` },
];

function userName(user?: { name?: string | null; last_name?: string | null; usuario?: string | null } | null): string {
    if (!user) return '—';

    return [user.name, user.last_name].filter(Boolean).join(' ') || user.usuario || '—';
}

function warehousePath(
    warehouse?: {
        name?: string | null;
        office?: {
            name?: string | null;
            zonal?: { name?: string | null } | null;
        } | null;
    } | null
): string {
    if (!warehouse) return '—';

    return [
        warehouse.office?.zonal?.name,
        warehouse.office?.name,
        warehouse.name,
    ].filter(Boolean).join(' / ') || warehouse.name || '—';
}

function itemLabel(item: NonNullable<AssetTransfer['items']>[number]): string {
    if (item.asset) {
        return [
            item.asset.code,
            item.asset.category?.name,
            item.asset.model?.brand?.name,
            item.asset.model?.name,
        ].filter(Boolean).join(' · ');
    }

    if (item.component) {
        return [
            item.component.code,
            item.component.type?.name,
            item.component.brand?.name,
            item.component.model,
        ].filter(Boolean).join(' · ');
    }

    return '—';
}

const CONDITION_LABELS: Record<string, string> = {
    new: 'Nuevo',
    good: 'Bueno',
    regular: 'Regular',
    damaged: 'Dañado',
    obsolete: 'Obsoleto',
};

const CONDITION_OPTIONS = [
    { value: 'new', label: 'Nuevo' },
    { value: 'good', label: 'Bueno' },
    { value: 'regular', label: 'Regular' },
    { value: 'damaged', label: 'Dañado' },
    { value: 'obsolete', label: 'Obsoleto' },
];

function conditionLabel(value?: string | null): string {
    if (!value) return '—';

    return CONDITION_LABELS[value] ?? value;
}

export default function AssetTransferShow({ assetTransfer, isSuperadmin = false, currentUserId = null }: Props) {
    const { props } = usePage();
    const auth = (props as { auth?: { permissions?: string[] } }).auth;
    const permissions = auth?.permissions ?? [];
    const canUpdate = permissions.includes('asset_transfers.update');
    const canApprove = permissions.includes('asset_transfers.approve');
    const canCancel = permissions.includes('asset_transfers.cancel');
    const canDispatch = permissions.includes('asset_transfers.dispatch');
    const canReceive = permissions.includes('asset_transfers.receive');
    const canOperateTransfer =
        isSuperadmin || (currentUserId != null && assetTransfer.sent_by === currentUserId);
    const canReceiveTransfer =
        canReceive &&
        assetTransfer.status === 'in_transit' &&
        (isSuperadmin || (currentUserId != null && assetTransfer.received_by === currentUserId));
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [receiveModalOpen, setReceiveModalOpen] = useState(false);
    const [reasonModalOpen, setReasonModalOpen] = useState(false);
    const [cancelReasonText, setCancelReasonText] = useState(assetTransfer.cancellation_reason ?? '');
    const [receiptCommentText, setReceiptCommentText] = useState('');
    const [receiveItemConditions, setReceiveItemConditions] = useState<Record<string, string>>({});
    const [actionLoading, setActionLoading] = useState(false);
    const [modalError, setModalError] = useState('');

    const runAction = (action: 'approve' | 'dispatch') => {
        router.post(`/admin/asset-transfers/${assetTransfer.id}/${action}`, {}, { preserveScroll: true });
    };

    const submitCancel = () => {
        if (cancelReasonText.trim() === '') {
            setModalError('Debe indicar el motivo de cancelación.');
            return;
        }

        setActionLoading(true);
        router.post(
            `/admin/asset-transfers/${assetTransfer.id}/cancel`,
            { cancellation_reason: cancelReasonText.trim() },
            {
                preserveScroll: true,
                onFinish: () => {
                    setActionLoading(false);
                    setCancelModalOpen(false);
                    setModalError('');
                },
            }
        );
    };

    const submitReceive = () => {
        if (receiptCommentText.trim() === '') {
            setModalError('Debe registrar el comentario de recepción.');
            return;
        }

        setActionLoading(true);
        router.post(
            `/admin/asset-transfers/${assetTransfer.id}/receive`,
            {
                receipt_notes: receiptCommentText.trim(),
                items: (assetTransfer.items ?? []).map((item) => ({
                    id: item.id,
                    condition_in: receiveItemConditions[String(item.id)] || '',
                })),
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setActionLoading(false);
                    setReceiveModalOpen(false);
                    setModalError('');
                },
            }
        );
    };

    const primaryActionClass =
        'inline-flex cursor-pointer w-fit items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium shadow-sm transition-colors';
    const outlineActionClass =
        'inline-flex cursor-pointer w-fit items-center gap-2 rounded-md border bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition-colors dark:bg-slate-950';

    return (
        <AppLayout breadcrumbs={breadcrumbs(assetTransfer.id)}>
            <Head title={`Traslado ${assetTransfer.code}`} />

            <div className="min-h-[60vh] flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/asset-transfers"
                            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-inv-surface/20 bg-inv-primary/5 text-inv-primary shadow-sm transition-all hover:border-inv-primary/40 hover:bg-inv-primary/10 hover:shadow-md"
                            aria-label="Volver al listado"
                        >
                            <ArrowLeft className="size-5" />
                        </Link>
                        <div className="border-l-2 border-inv-primary/30 pl-4">
                            <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                                {assetTransfer.code}
                            </h1>
                            <p className="mt-0.5 text-muted-foreground text-xs md:text-sm">
                                Detalle del traslado y sus ítems asociados.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        {canUpdate && canOperateTransfer && (assetTransfer.status === 'approved' || (isSuperadmin && assetTransfer.status === 'pending_approval')) && (
                            <Link
                                href={`/admin/asset-transfers/${assetTransfer.id}/edit`}
                                className={`${primaryActionClass} bg-inv-primary text-white hover:bg-inv-primary/90`}
                            >
                                <Pencil className="size-4" />
                                {assetTransfer.status === 'approved' ? 'Completar datos' : 'Editar traslado'}
                            </Link>
                        )}
                        {canApprove && assetTransfer.status === 'pending_approval' && (
                            <button
                                type="button"
                                onClick={() => runAction('approve')}
                                className={`${outlineActionClass} border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-400 dark:hover:bg-emerald-950/30`}
                            >
                                <Check className="size-4" />
                                Aprobar
                            </button>
                        )}
                        {canDispatch && assetTransfer.status === 'approved' && canOperateTransfer && (
                            <button
                                type="button"
                                onClick={() => runAction('dispatch')}
                                className={`${outlineActionClass} border-sky-200 text-sky-700 hover:bg-sky-50 dark:border-sky-900/60 dark:text-sky-400 dark:hover:bg-sky-950/30`}
                            >
                                <Send className="size-4" />
                                Despachar
                            </button>
                        )}
                        {canReceiveTransfer && (
                            <button
                                type="button"
                                onClick={() => {
                                    setReceiveModalOpen(true);
                                    setReceiptCommentText('');
                                    setReceiveItemConditions(
                                        Object.fromEntries(
                                            (assetTransfer.items ?? []).map((item) => [
                                                String(item.id),
                                                item.condition_in ?? '',
                                            ])
                                        )
                                    );
                                    setModalError('');
                                }}
                                className={`${outlineActionClass} border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-900/60 dark:text-violet-400 dark:hover:bg-violet-950/30`}
                            >
                                <Check className="size-4" />
                                Recibir
                            </button>
                        )}
                        {assetTransfer.status === 'cancelled' && assetTransfer.cancellation_reason && (
                            <button
                                type="button"
                                onClick={() => setReasonModalOpen(true)}
                                className={`${outlineActionClass} border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60`}
                            >
                                <MessageSquareText className="size-4" />
                                Ver motivo
                            </button>
                        )}
                        {canCancel && !['received', 'cancelled'].includes(assetTransfer.status) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setCancelModalOpen(true);
                                    setCancelReasonText(assetTransfer.cancellation_reason ?? '');
                                    setModalError('');
                                }}
                                className={`${outlineActionClass} border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900/60 dark:text-amber-400 dark:hover:bg-amber-950/30`}
                            >
                                <X className="size-4" />
                                Rechazar
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-foreground">Encabezado</h2>
                            <AssetTransferStatusBadge status={assetTransfer.status} />
                        </div>

                        <dl className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground">Origen</dt>
                                <dd className="mt-1 text-sm text-foreground">
                                    {warehousePath(assetTransfer.origin_warehouse)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground">Destino</dt>
                                <dd className="mt-1 text-sm text-foreground">
                                    {warehousePath(assetTransfer.destination_warehouse)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground">Transportista</dt>
                                <dd className="mt-1 text-sm text-foreground">{assetTransfer.carrier_name || '—'}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground">Seguimiento</dt>
                                <dd className="mt-1 text-sm text-foreground">{assetTransfer.tracking_number || '—'}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground">Referencia courier</dt>
                                <dd className="mt-1 text-sm text-foreground">{assetTransfer.carrier_reference || '—'}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground">Guía empresa</dt>
                                <dd className="mt-1 text-sm text-foreground">{assetTransfer.company_guide_number || '—'}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground">Voucher courier</dt>
                                <dd className="mt-1 text-sm text-foreground">{assetTransfer.carrier_voucher_number || '—'}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground">Fecha de envío</dt>
                                <dd className="mt-1 text-sm text-foreground">
                                    {assetTransfer.ship_date
                                        ? new Date(assetTransfer.ship_date).toLocaleString('es', {
                                              timeZone: 'America/Lima',
                                              day: '2-digit',
                                              month: 'short',
                                              year: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                          })
                                        : '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground">Fecha de recepción</dt>
                                <dd className="mt-1 text-sm text-foreground">
                                    {assetTransfer.received_at
                                        ? new Date(assetTransfer.received_at).toLocaleDateString('es', {
                                              timeZone: 'America/Lima',
                                              day: '2-digit',
                                              month: 'short',
                                              year: 'numeric',
                                          })
                                        : '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground">Aprobado por</dt>
                                <dd className="mt-1 text-sm text-foreground">{userName(assetTransfer.approved_by_user)}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground">Despacha</dt>
                                <dd className="mt-1 text-sm text-foreground">{userName(assetTransfer.sent_by_user)}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground">Recibe</dt>
                                <dd className="mt-1 text-sm text-foreground">{userName(assetTransfer.received_by_user)}</dd>
                            </div>
                        </dl>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl bg-muted/40 px-3 py-3">
                                <p className="text-xs font-medium text-muted-foreground">Observaciones de despacho</p>
                                <p className="mt-1 text-sm text-foreground">{assetTransfer.dispatch_notes || '—'}</p>
                            </div>
                            <div className="rounded-xl bg-muted/40 px-3 py-3">
                                <p className="text-xs font-medium text-muted-foreground">Observaciones de recepción</p>
                                <p className="mt-1 text-sm text-foreground">{assetTransfer.receipt_notes || '—'}</p>
                            </div>
                        </div>
                        {assetTransfer.status === 'cancelled' && (
                            <div className="mt-3 rounded-xl bg-amber-50 px-3 py-3 dark:bg-amber-950/20">
                                <p className="text-xs font-medium text-muted-foreground">Motivo de cancelación</p>
                                <p className="mt-1 text-sm text-foreground">{assetTransfer.cancellation_reason || '—'}</p>
                                <button
                                    type="button"
                                    className="mt-3 inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-inv-primary hover:underline"
                                    onClick={() => setReasonModalOpen(true)}
                                >
                                    <MessageSquareText className="size-4" />
                                    Ver en modal
                                </button>
                            </div>
                        )}
                        <div className="mt-4 flex flex-wrap gap-3">
                            {assetTransfer.company_guide_path && (
                                <a
                                    href={`/admin/asset-transfers/${assetTransfer.id}/company-guide`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-inv-primary hover:underline"
                                >
                                    Ver guía empresa
                                </a>
                            )}
                            {assetTransfer.carrier_voucher_path && (
                                <a
                                    href={`/admin/asset-transfers/${assetTransfer.id}/carrier-voucher`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-inv-primary hover:underline"
                                >
                                    Ver voucher courier
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <div className="mb-4 flex items-center gap-2">
                            <Boxes className="size-4 text-inv-primary" />
                            <h2 className="text-sm font-semibold text-foreground">Resumen</h2>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
                                <span className="text-muted-foreground">Total de ítems</span>
                                <span className="font-semibold text-foreground">{assetTransfer.items?.length ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
                                <span className="text-muted-foreground">Activos</span>
                                <span className="font-semibold text-foreground">
                                    {assetTransfer.items?.filter((item) => !!item.asset_id).length ?? 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
                                <span className="text-muted-foreground">Componentes</span>
                                <span className="font-semibold text-foreground">
                                    {assetTransfer.items?.filter((item) => !!item.component_id).length ?? 0}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card shadow-sm">
                    <div className="border-b border-border px-5 py-4">
                        <h2 className="text-sm font-semibold text-foreground">Ítems del traslado</h2>
                    </div>
                    <div className="divide-y divide-border">
                        {(assetTransfer.items ?? []).map((item) => (
                            <div key={item.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_160px_160px]">
                                <div>
                                    <p className="text-sm font-medium text-foreground">{itemLabel(item)}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {item.asset ? 'Activo' : item.component ? 'Componente' : 'Ítem'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Condición salida</p>
                                    <p className="mt-1 text-sm text-foreground">{conditionLabel(item.condition_out)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Condición llegada</p>
                                    <p className="mt-1 text-sm text-foreground">{conditionLabel(item.condition_in)}</p>
                                </div>
                            </div>
                        ))}
                        {(assetTransfer.items ?? []).length === 0 && (
                            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                                Este traslado no tiene ítems registrados.
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <AppModal
                open={cancelModalOpen}
                onOpenChange={(open) => {
                    if (!open && !actionLoading) {
                        setCancelModalOpen(false);
                        setModalError('');
                    }
                }}
                title="Cancelar traslado"
                contentClassName="space-y-4"
            >
                <p className="text-muted-foreground text-sm">
                    Indique el motivo de la cancelación para el traslado {assetTransfer.code}.
                </p>
                <textarea
                    value={cancelReasonText}
                    onChange={(event) => {
                        setCancelReasonText(event.target.value);
                        if (modalError) setModalError('');
                    }}
                    rows={4}
                    placeholder="Escriba el motivo de la cancelación"
                    className="border-input w-full rounded-xl border bg-background/80 px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary/50 focus-visible:border-inv-primary/40"
                />
                {modalError && <p className="text-sm text-destructive">{modalError}</p>}
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" disabled={actionLoading} onClick={() => setCancelModalOpen(false)}>
                        Cerrar
                    </Button>
                    <Button type="button" disabled={actionLoading} className="cursor-pointer bg-amber-600 text-white hover:bg-amber-700" onClick={submitCancel}>
                        {actionLoading ? 'Guardando…' : 'Confirmar cancelación'}
                    </Button>
                </div>
            </AppModal>
            <AppModal
                open={receiveModalOpen}
                onOpenChange={(open) => {
                    if (!open && !actionLoading) {
                        setReceiveModalOpen(false);
                        setModalError('');
                    }
                }}
                title="Confirmar recepción"
                contentClassName="space-y-4"
            >
                <p className="text-muted-foreground text-sm">
                    Registre el comentario de recepción para el traslado {assetTransfer.code}.
                </p>
                <div className="space-y-3">
                    {(assetTransfer.items ?? []).map((item) => (
                        <div key={item.id} className="rounded-xl border border-border bg-muted/20 p-3">
                            <p className="text-sm font-medium text-foreground">{itemLabel(item)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Condición salida: {conditionLabel(item.condition_out)}
                            </p>
                            <div className="mt-3 space-y-2">
                                <label className="text-sm font-medium text-foreground">Condición de llegada</label>
                                <Select
                                    value={receiveItemConditions[String(item.id)] || ''}
                                    onValueChange={(value) =>
                                        setReceiveItemConditions((prev) => ({
                                            ...prev,
                                            [String(item.id)]: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione condición" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CONDITION_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ))}
                </div>
                <textarea
                    value={receiptCommentText}
                    onChange={(event) => {
                        setReceiptCommentText(event.target.value);
                        if (modalError) setModalError('');
                    }}
                    rows={4}
                    placeholder="Escriba el comentario de recepción"
                    className="border-input w-full rounded-xl border bg-background/80 px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary/50 focus-visible:border-inv-primary/40"
                />
                {modalError && <p className="text-sm text-destructive">{modalError}</p>}
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" disabled={actionLoading} onClick={() => setReceiveModalOpen(false)}>
                        Cerrar
                    </Button>
                    <Button type="button" disabled={actionLoading} className="cursor-pointer bg-violet-600 text-white hover:bg-violet-700" onClick={submitReceive}>
                        {actionLoading ? 'Guardando…' : 'Confirmar recepción'}
                    </Button>
                </div>
            </AppModal>
            <AppModal
                open={reasonModalOpen}
                onOpenChange={setReasonModalOpen}
                title="Motivo de cancelación"
                contentClassName="space-y-4"
            >
                <div className="rounded-xl bg-muted/40 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">Traslado {assetTransfer.code}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                        {assetTransfer.cancellation_reason || 'Sin motivo registrado.'}
                    </p>
                </div>
                <div className="flex justify-end">
                    <Button type="button" variant="outline" onClick={() => setReasonModalOpen(false)}>
                        Cerrar
                    </Button>
                </div>
            </AppModal>
        </AppLayout>
    );
}
