import { Head, Link, router, usePage } from '@inertiajs/react';
import { AlertCircle, ArrowLeft, Check, CheckCircle2, FileText, X } from 'lucide-react';
import { useState } from 'react';
import { AppModal } from '@/components/app-modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { PurchaseOrder, PurchaseItem } from '@/types';

const breadcrumbs = (id: string): BreadcrumbItem[] => [
    { title: 'Compras y logística', href: '#' },
    { title: 'Órdenes de compra', href: '/admin/purchase-orders' },
    { title: 'Ver orden', href: `/admin/purchase-orders/${id}` },
];

const STATUS_LABELS: Record<string, string> = {
    pending_minor: 'Pendiente zonal',
    pending: 'Pendiente general',
    observed_minor: 'Observado zonal',
    observed: 'Observado',
    approved: 'Aprobada',
    rejected: 'Rechazada',
};

const STATUS_CLASS: Record<string, string> = {
    pending_minor: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    observed_minor: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400',
    observed: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
};

type QuoteDisplay = { id: string; description: string | null; pdf_path: string | null; is_selected: boolean };

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

type ActionModalType =
    | 'approve'
    | 'reject'
    | 'observe'
    | 'minor-approve'
    | 'minor-reject'
    | 'minor-observe'
    | null;

type ShowProps = {
    purchaseOrder: PurchaseOrder & {
        items: (PurchaseItem & { asset_category?: { id: string; name: string; code: string | null } | null })[];
        approved_by_user?: { id: string; name: string; last_name?: string; usuario: string } | null;
        rejected_by_user?: { id: string; name: string; last_name?: string; usuario: string } | null;
        observed_by_user?: { id: string; name: string; last_name?: string; usuario: string } | null;
        minor_approved_by_user?: { id: string; name: string; last_name?: string; usuario: string } | null;
        minor_rejected_by_user?: { id: string; name: string; last_name?: string; usuario: string } | null;
        minor_observed_by_user?: { id: string; name: string; last_name?: string; usuario: string } | null;
        quotes?: QuoteDisplay[];
    };
    canApprove: boolean;
    canObserve: boolean;
    canMinorApprove: boolean;
    canMinorObserve: boolean;
    canSelectQuote: boolean;
};

function formatCurrency(value: number | null | undefined): string {
    if (value == null) return '—';
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
}

function formatDate(s: string | null | undefined): string {
    if (!s) return '—';
    return new Date(s).toLocaleString('es', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function fullName(u: { name?: string; last_name?: string; usuario?: string } | null | undefined): string {
    if (!u) return '—';
    return [u.name, u.last_name].filter(Boolean).join(' ') || u.usuario || '—';
}

function officePath(order: PurchaseOrder): string {
    const office = order.office;
    if (!office) return '—';
    const parts = [
        office.zonal?.name ?? office.zonal?.code ?? null,
        office.name ?? office.code ?? null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' / ') : (office.name ?? '—');
}

const MODAL_CONFIG: Record<
    NonNullable<ActionModalType>,
    { title: string; placeholder: string; endpoint: string; description: string; confirmLabel: string; confirmClassName: string }
> = {
    approve: {
        title: 'Confirmar aprobación (general)',
        placeholder: 'Indique la observación o nota (ej. Se procede con la orden, conforme…)',
        endpoint: 'approve',
        description: 'Aprobará la orden en nivel general.',
        confirmLabel: 'Aprobar orden',
        confirmClassName: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
    reject: {
        title: 'Rechazar orden (general)',
        placeholder: 'Indique el motivo del rechazo…',
        endpoint: 'reject',
        description: 'La orden será rechazada en nivel general.',
        confirmLabel: 'Rechazar orden',
        confirmClassName: 'bg-rose-600 hover:bg-rose-700 text-white',
    },
    observe: {
        title: 'Observación (general)',
        placeholder: 'Indique el motivo de la observación…',
        endpoint: 'observe',
        description: 'La orden quedará en estado Observado hasta que el solicitante revise y corrija.',
        confirmLabel: 'Guardar observación',
        confirmClassName: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    'minor-approve': {
        title: 'Aprobar en zonal',
        placeholder: 'Nota opcional…',
        endpoint: 'minor-approve',
        description: 'La orden pasará a cola de aprobación general.',
        confirmLabel: 'Aprobar zonal',
        confirmClassName: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
    'minor-reject': {
        title: 'Rechazar en zonal',
        placeholder: 'Indique el motivo del rechazo…',
        endpoint: 'minor-reject',
        description: 'La orden quedará rechazada.',
        confirmLabel: 'Rechazar zonal',
        confirmClassName: 'bg-rose-600 hover:bg-rose-700 text-white',
    },
    'minor-observe': {
        title: 'Observación zonal',
        placeholder: 'Indique la observación…',
        endpoint: 'minor-observe',
        description: 'El solicitante podrá corregir y la orden volverá a pendiente zonal.',
        confirmLabel: 'Guardar observación',
        confirmClassName: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
};

export default function PurchaseOrderShow({
    purchaseOrder,
    canApprove,
    canObserve,
    canMinorApprove,
    canMinorObserve,
    canSelectQuote,
}: ShowProps) {
    const [actioning, setActioning] = useState(false);
    const [modalAction, setModalAction] = useState<ActionModalType>(null);
    const [observationText, setObservationText] = useState('');

    const po = purchaseOrder;
    const isPendingMajor = po.status === 'pending';
    const isPendingMinor = po.status === 'pending_minor';
    const { props: pageProps } = usePage();
    const allowedZonalIds = (pageProps as { allowedZonalIds?: string[] | null }).allowedZonalIds;
    const allowedOfficeIds = (pageProps as { allowedOfficeIds?: string[] | null }).allowedOfficeIds;
    const zonalOk = canActOnPurchaseOrderScope(po, allowedOfficeIds, allowedZonalIds);

    const quotes = po.quotes ?? [];

    const openModal = (action: NonNullable<ActionModalType>) => {
        setModalAction(action);
        setObservationText('');
    };

    const closeModal = () => {
        setModalAction(null);
        setObservationText('');
    };

    const submitModal = () => {
        if (!modalAction) return;
        const config = MODAL_CONFIG[modalAction];
        setActioning(true);
        router.post(`/admin/purchase-orders/${po.id}/${config.endpoint}`, { observation_notes: observationText }, {
            preserveScroll: true,
            onFinish: () => {
                setActioning(false);
                closeModal();
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs(po.id)}>
            <Head title={po.code ? `Orden #${po.code}` : `Orden ${po.id}`} />

            <div className="min-h-[60vh] flex flex-col gap-6 p-4 md:p-6">
                {/* Header mismo estilo que create */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/purchase-orders"
                            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-inv-surface/20 bg-inv-primary/5 text-inv-primary shadow-sm transition-all hover:border-inv-primary/40 hover:bg-inv-primary/10 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2 dark:border-inv-surface/30 dark:bg-inv-section/20 dark:text-inv-primary dark:hover:bg-inv-section/30"
                            aria-label="Volver al listado"
                        >
                            <ArrowLeft className="size-5" />
                        </Link>
                        <div className="border-l-2 border-inv-primary/30 pl-4">
                            <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                                Orden de compra {po.code ? `#${po.code}` : 'Sin código'}
                            </h1>
                            <p className="mt-0.5 text-muted-foreground text-xs md:text-sm">
                                Detalle de la solicitud (solo lectura)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Contenedor principal con gradiente (estilo create) */}
                <div className="relative overflow-hidden rounded-2xl">
                    <div
                        className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
                        style={{
                            background: 'linear-gradient(135deg, #447794 0%, #2d5b75 40%, #123249 100%)',
                        }}
                        aria-hidden
                    />
                    <div
                        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-30"
                        style={{ background: 'radial-gradient(circle, #447794 0%, transparent 70%)' }}
                        aria-hidden
                    />

                    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
                        {/* Sección Encabezado */}
                        <div className="border-b border-inv-primary/50 bg-inv-primary/25 px-4 py-3 md:px-6 dark:bg-inv-section/70 dark:border-inv-surface/60">
                            <h2 className="text-sm font-semibold text-inv-primary dark:text-white">Encabezado</h2>
                        </div>
                        <div className="space-y-5 p-4 md:p-6">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <div>
                                    <p className="text-muted-foreground text-xs font-medium">Proveedor</p>
                                    <p className="text-foreground text-sm">{po.supplier?.name ?? '—'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs font-medium">Zonal / Oficina</p>
                                    <p className="text-foreground text-sm">{officePath(po)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs font-medium">Código OC / OS</p>
                                    <p className="text-foreground text-sm">{po.code ?? '—'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs font-medium">Estado</p>
                                    <span
                                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_CLASS[po.status] ?? ''}`}
                                    >
                                        {STATUS_LABELS[po.status] ?? po.status}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs font-medium">Solicitado por</p>
                                    <p className="text-foreground text-sm">{fullName(po.requested_by_user)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs font-medium">Apr. zonal</p>
                                    <p className="text-foreground text-sm">
                                        {po.minor_approved_at && po.minor_approved_by_user
                                            ? `Apr. ${fullName(po.minor_approved_by_user)} (${formatDate(po.minor_approved_at)})`
                                            : po.minor_rejected_at && po.minor_rejected_by_user
                                              ? `Rech. ${fullName(po.minor_rejected_by_user)} (${formatDate(po.minor_rejected_at)})`
                                              : po.minor_observed_at && po.minor_observed_by_user
                                                ? `Obs. ${fullName(po.minor_observed_by_user)} (${formatDate(po.minor_observed_at)})`
                                                : '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs font-medium">Ger. Oper.</p>
                                    <p className="text-foreground text-sm">
                                        {po.approved_at && po.approved_by_user
                                            ? `Apr. ${fullName(po.approved_by_user)} (${formatDate(po.approved_at)})`
                                            : po.rejected_at && po.rejected_by_user
                                              ? `Rech. ${fullName(po.rejected_by_user)} (${formatDate(po.rejected_at)})`
                                              : po.observed_at && po.observed_by_user
                                                ? `Obs. ${fullName(po.observed_by_user)} (${formatDate(po.observed_at)})`
                                                : '—'}
                                    </p>
                                </div>
                            </div>
                            {po.minor_observation_notes && (
                                <div>
                                    <p className="text-muted-foreground text-xs font-medium">Observación zonal</p>
                                    <p className="text-foreground text-sm whitespace-pre-wrap">{po.minor_observation_notes}</p>
                                </div>
                            )}
                            {po.observation_notes && (
                                <div>
                                    <p className="text-muted-foreground text-xs font-medium">Nota / Observación</p>
                                    <p className="text-foreground text-sm whitespace-pre-wrap">{po.observation_notes}</p>
                                    {(po.observed_at || po.approved_at || po.rejected_at) && (
                                        <p className="text-muted-foreground text-xs mt-1">
                                            {formatDate(po.observed_at ?? po.approved_at ?? po.rejected_at ?? null)}
                                        </p>
                                    )}
                                </div>
                            )}
                            {po.notes && (
                                <div>
                                    <p className="text-muted-foreground text-xs font-medium">Notas</p>
                                    <p className="text-foreground text-sm whitespace-pre-wrap">{po.notes}</p>
                                </div>
                            )}
                        </div>

                        {/* Sección Ítems */}
                        <div className="border-t border-inv-primary/50 bg-inv-primary/25 px-4 py-3 md:px-6 dark:bg-inv-section/70 dark:border-inv-surface/60">
                            <h2 className="text-sm font-semibold text-inv-primary dark:text-white">Ítems</h2>
                        </div>
                    <div className="space-y-4 p-4 md:p-6">
                        {/* Vista tabla: pantallas medianas y grandes */}
                        <div className="hidden md:block overflow-x-auto rounded-xl border border-border/70 bg-background/50">
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        <th className="text-left py-2 pl-4 pr-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Descripción</th>
                                        <th className="text-left w-44 py-2 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Categoría</th>
                                        <th className="text-right w-24 py-2 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Cant.</th>
                                        <th className="text-right w-32 py-2 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">P. unit.</th>
                                        <th className="text-right w-32 py-2 pr-4 pl-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(po.items ?? []).map((item, i) => (
                                        <tr key={item.id ?? i} className="border-b border-border/60 last:border-0">
                                            <td className="py-2.5 pl-4 pr-2 text-foreground">{item.description || '—'}</td>
                                            <td className="py-2.5 px-2 text-foreground">{item.asset_category?.name ?? item.asset_category?.code ?? '—'}</td>
                                            <td className="py-2.5 px-2 text-right tabular-nums">{item.quantity ?? '—'}</td>
                                            <td className="py-2.5 px-2 text-right tabular-nums">{item.unit_price != null ? formatCurrency(item.unit_price) : '—'}</td>
                                            <td className="py-2.5 pr-4 pl-2 text-right tabular-nums">{item.total_price != null ? formatCurrency(item.total_price) : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Vista tarjetas: pantallas pequeñas (móvil) */}
                        <div className="md:hidden space-y-4">
                            {(po.items ?? []).map((item, i) => (
                                <div
                                    key={item.id ?? i}
                                    className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"
                                >
                                    <div className="mb-3">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Ítem {i + 1}
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-muted-foreground text-xs font-medium">Descripción</p>
                                            <p className="text-foreground text-sm">{item.description || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-xs font-medium">Categoría</p>
                                            <p className="text-foreground text-sm">{item.asset_category?.name ?? item.asset_category?.code ?? '—'}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-muted-foreground text-xs font-medium">Cantidad</p>
                                                <p className="text-foreground text-sm tabular-nums">{item.quantity ?? '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground text-xs font-medium">P. unit.</p>
                                                <p className="text-foreground text-sm tabular-nums">{item.unit_price != null ? formatCurrency(item.unit_price) : '—'}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-end border-t border-border/50 pt-2">
                                            <span className="text-sm font-medium text-muted-foreground">
                                                Total: <span className="text-foreground">{item.total_price != null ? formatCurrency(item.total_price) : '—'}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end rounded-xl border border-inv-primary/20 bg-inv-primary/5 px-4 py-3 dark:bg-inv-section/10">
                            <p className="text-sm font-semibold text-foreground">
                                Total orden: <span className="text-inv-primary">{formatCurrency(po.total_amount)}</span>
                            </p>
                        </div>
                    </div>

                    {/* Sección Cotizaciones (PDF) - misma estructura que create */}
                    <div className="border-t border-inv-primary/50 bg-inv-primary/25 px-4 py-3 md:px-6 dark:bg-inv-section/70 dark:border-inv-surface/60">
                        <h2 className="text-sm font-semibold text-inv-primary dark:text-white">Cotizaciones (PDF)</h2>
                    </div>
                    <div className="space-y-4 p-4 md:p-6">
                        {quotes.length === 0 ? (
                            <p className="text-muted-foreground text-sm">Sin cotizaciones.</p>
                        ) : (
                            <div className="space-y-3">
                                {quotes.map((quote, index) => (
                                    <div
                                        key={quote.id}
                                        className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"
                                    >
                                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                Cotización {index + 1}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {quote.is_selected && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                        Elegida
                                                    </span>
                                                )}
                                                {canSelectQuote && (isPendingMajor || isPendingMinor) && !quote.is_selected && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="cursor-pointer rounded-full border-emerald-300 px-2 py-0.5 text-[11px] text-emerald-700 hover:bg-emerald-50 h-7"
                                                        onClick={() => {
                                                            router.post(
                                                                `/admin/purchase-orders/${po.id}/quotes/${quote.id}/select`,
                                                                {},
                                                                { preserveScroll: true }
                                                            );
                                                        }}
                                                    >
                                                        Elegir
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-sm">
                                            {quote.description && (
                                                <span className="text-foreground">{quote.description}</span>
                                            )}
                                            {quote.pdf_path && (
                                                <a
                                                    href={`/storage/${quote.pdf_path}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-inv-primary hover:underline"
                                                >
                                                    <FileText className="size-4 shrink-0" />
                                                    Ver PDF
                                                </a>
                                            )}
                                            {!quote.description && !quote.pdf_path && (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {isPendingMinor && zonalOk && (canMinorApprove || canMinorObserve) ? (
                        <div className="flex flex-row flex-nowrap justify-end gap-1 border-t border-border/80 bg-muted/20 px-4 py-4 md:px-6 min-h-[52px] items-center">
                            <div className="hidden md:flex flex-row flex-nowrap items-center justify-end gap-1">
                                {canMinorApprove && zonalOk && (
                                    <>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="cursor-pointer shrink-0 size-8 rounded-md text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300"
                                            disabled={actioning}
                                            aria-label="Aprobar zonal"
                                            onClick={() => openModal('minor-approve')}
                                        >
                                            <Check className="size-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="cursor-pointer shrink-0 size-8 rounded-md text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-900/30 dark:hover:text-rose-300"
                                            disabled={actioning}
                                            aria-label="Rechazar zonal"
                                            onClick={() => openModal('minor-reject')}
                                        >
                                            <X className="size-4" />
                                        </Button>
                                    </>
                                )}
                                {canMinorObserve && zonalOk && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="cursor-pointer shrink-0 size-8 rounded-md text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30 dark:hover:text-amber-300"
                                        disabled={actioning}
                                        aria-label="Observar zonal"
                                        onClick={() => openModal('minor-observe')}
                                    >
                                        <AlertCircle className="size-4" />
                                    </Button>
                                )}
                            </div>
                            <div className="flex md:hidden flex-wrap justify-end gap-2">
                                {canMinorApprove && zonalOk && (
                                    <>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="cursor-pointer rounded-xl border-emerald-400/80 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                                            disabled={actioning}
                                            onClick={() => openModal('minor-approve')}
                                        >
                                            <CheckCircle2 className="size-4 mr-1.5 inline" />
                                            Aprobar zonal
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="cursor-pointer rounded-xl border-rose-400/80 bg-rose-50/80 text-rose-700 hover:bg-rose-100 dark:border-rose-600 dark:bg-rose-900/20 dark:text-rose-400"
                                            disabled={actioning}
                                            onClick={() => openModal('minor-reject')}
                                        >
                                            <X className="size-4 mr-1.5 inline" />
                                            Rechazar zonal
                                        </Button>
                                    </>
                                )}
                                {canMinorObserve && zonalOk && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="cursor-pointer rounded-xl border-amber-400/80 bg-amber-50/80 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                                        disabled={actioning}
                                        onClick={() => openModal('minor-observe')}
                                    >
                                        <AlertCircle className="size-4 mr-1.5 inline" />
                                        Observar zonal
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : null}
                    {isPendingMajor && (canApprove || canObserve) ? (
                        <div className="flex flex-row flex-nowrap justify-end gap-1 border-t border-border/80 bg-muted/20 px-4 py-4 md:px-6 min-h-[52px] items-center">
                            <div className="hidden md:flex flex-row flex-nowrap items-center justify-end gap-1">
                                {canApprove && (
                                    <>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="cursor-pointer shrink-0 size-8 rounded-md text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300"
                                            disabled={actioning}
                                            aria-label="Confirmar"
                                            onClick={() => openModal('approve')}
                                        >
                                            <Check className="size-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="cursor-pointer shrink-0 size-8 rounded-md text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-900/30 dark:hover:text-rose-300"
                                            disabled={actioning}
                                            aria-label="Rechazar"
                                            onClick={() => openModal('reject')}
                                        >
                                            <X className="size-4" />
                                        </Button>
                                    </>
                                )}
                                {canObserve && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="cursor-pointer shrink-0 size-8 rounded-md text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30 dark:hover:text-amber-300"
                                        disabled={actioning}
                                        aria-label="Poner en observación"
                                        onClick={() => openModal('observe')}
                                    >
                                        <AlertCircle className="size-4" />
                                    </Button>
                                )}
                            </div>
                            <div className="flex md:hidden flex-wrap justify-end gap-2">
                                {canApprove && (
                                    <>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="cursor-pointer rounded-xl border-emerald-400/80 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                                            disabled={actioning}
                                            onClick={() => openModal('approve')}
                                        >
                                            <CheckCircle2 className="size-4 mr-1.5 inline" />
                                            Confirmar
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="cursor-pointer rounded-xl border-rose-400/80 bg-rose-50/80 text-rose-700 hover:bg-rose-100 dark:border-rose-600 dark:bg-rose-900/20 dark:text-rose-400"
                                            disabled={actioning}
                                            onClick={() => openModal('reject')}
                                        >
                                            <X className="size-4 mr-1.5 inline" />
                                            Rechazar
                                        </Button>
                                    </>
                                )}
                                {canObserve && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="cursor-pointer rounded-xl border-amber-400/80 bg-amber-50/80 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                                        disabled={actioning}
                                        onClick={() => openModal('observe')}
                                    >
                                        <AlertCircle className="size-4 mr-1.5 inline" />
                                        Observar
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : null}
                    </div>
                </div>
            </div>

            {modalAction && (
                <AppModal
                    open={!!modalAction}
                    onOpenChange={(open) => !open && closeModal()}
                    title={MODAL_CONFIG[modalAction].title}
                    contentClassName="space-y-4"
                >
                    <div className="space-y-2">
                        <p className="text-muted-foreground text-sm">
                            {MODAL_CONFIG[modalAction].description}
                        </p>
                        <Label htmlFor="observation_notes" className="text-sm">
                            Observación
                        </Label>
                        <textarea
                            id="observation_notes"
                            value={observationText}
                            onChange={(e) => setObservationText(e.target.value)}
                            placeholder={MODAL_CONFIG[modalAction].placeholder}
                            rows={4}
                            className="border-input w-full rounded-xl border bg-background/80 px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary/50 focus-visible:border-inv-primary/40"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={actioning}
                            onClick={closeModal}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            disabled={actioning}
                            className={`cursor-pointer ${MODAL_CONFIG[modalAction].confirmClassName}`}
                            onClick={submitModal}
                        >
                            {actioning ? 'Enviando…' : MODAL_CONFIG[modalAction].confirmLabel}
                        </Button>
                    </div>
                </AppModal>
            )}
        </AppLayout>
    );
}
