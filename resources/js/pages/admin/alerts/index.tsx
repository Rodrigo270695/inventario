import { Head, router, usePage } from '@inertiajs/react';
import { AlertCircle, AlertTriangle, Bell, LayoutGrid } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DataTableColumn } from '@/components/data-table';
import { DataTable } from '@/components/data-table';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type AlertRule = {
    id: string;
    name: string;
    type: string;
    channels?: unknown;
    notify_roles?: unknown;
    threshold_config?: unknown;
    is_active: boolean;
    created_at: string;
};

type AlertEvent = {
    id: string;
    alert_rule_id: string | null;
    severity: string;
    model_type: string | null;
    model_id: string | null;
    payload?: Record<string, unknown> | null;
    resolved_at: string | null;
    created_at: string;
    rule?: { id: string; name: string; type: string } | null;
};

type NotificationRow = {
    id: string;
    type: string;
    data?: Record<string, unknown> | null;
    read_at: string | null;
    created_at: string;
};

type AlertsIndexProps = {
    rules: AlertRule[];
    events: AlertEvent[];
    notifications: NotificationRow[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Alertas y reportes', href: '#' },
    { title: 'Alertas', href: '/admin/alerts' },
];

const RULE_TYPE_LABELS: Record<string, string> = {
    service_expiry: 'Vencimiento de servicio',
};

function ruleTypeLabel(type: string): string {
    return RULE_TYPE_LABELS[type] ?? type;
}

function formatDateTime(value: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('es', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function severityBadge(severity: string) {
    const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium';
    if (severity === 'critical') return <span className={`${base} bg-rose-100 text-rose-700`}>Crítica</span>;
    if (severity === 'high') return <span className={`${base} bg-amber-100 text-amber-800`}>Alta</span>;
    if (severity === 'medium') return <span className={`${base} bg-sky-100 text-sky-800`}>Media</span>;
    return <span className={`${base} bg-slate-100 text-slate-700`}>Baja</span>;
}

export default function AlertsIndex({ rules, events, notifications }: AlertsIndexProps) {
    const { props } = usePage();
    const auth = (props as { auth?: { permissions?: string[] } }).auth;
    const permissions = auth?.permissions ?? [];
    const canView = permissions.includes('alerts.view');
    const [markingAll, setMarkingAll] = useState(false);
    const [markingNotificationId, setMarkingNotificationId] = useState<string | null>(null);
    const unreadNotificationsCount = useMemo(
        () => notifications.filter((notification) => !notification.read_at).length,
        [notifications]
    );

    const getNotificationHref = (notification: NotificationRow): string | null => {
        const href = notification.data?.href;
        return typeof href === 'string' && href.trim() !== '' ? href : null;
    };

    const markAllNotificationsAsRead = () => {
        if (markingAll || unreadNotificationsCount === 0) return;

        router.post(
            '/admin/alerts/notifications/read-all',
            {},
            {
                preserveScroll: true,
                onStart: () => setMarkingAll(true),
                onFinish: () => setMarkingAll(false),
            }
        );
    };

    const openNotification = (notification: NotificationRow) => {
        if (!notification.read_at) {
            setMarkingNotificationId(notification.id);
            router.post(
                `/admin/alerts/notifications/${notification.id}/read`,
                {},
                {
                    preserveScroll: true,
                    onFinish: () => {
                        setMarkingNotificationId((current) => (current === notification.id ? null : current));
                    },
                }
            );
        }
    };

    const eventColumns: DataTableColumn<AlertEvent>[] = useMemo(
        () => [
            {
                key: 'created_at',
                label: 'Fecha',
                sortable: false,
                className: 'text-foreground text-xs whitespace-nowrap',
                render: (row) => formatDateTime(row.created_at),
            },
            {
                key: 'rule',
                label: 'Regla',
                sortable: false,
                className: 'text-foreground text-xs max-w-[220px]',
                render: (row) => (
                    <div className="min-w-0 truncate">
                        <span className="block truncate font-medium text-foreground">
                            {row.rule?.name ?? '—'}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                            {row.rule?.type ? ruleTypeLabel(row.rule.type) : row.severity ?? '—'}
                        </span>
                    </div>
                ),
            },
            {
                key: 'severity',
                label: 'Severidad',
                sortable: false,
                className: 'text-foreground text-xs',
                render: (row) => severityBadge(row.severity),
            },
            {
                key: 'status',
                label: 'Estado',
                sortable: false,
                className: 'text-foreground text-xs',
                render: (row) =>
                    row.resolved_at ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            Resuelta
                        </span>
                    ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                            Abierta
                        </span>
                    ),
            },
        ],
        []
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Alertas" />

            <div className="min-h-[60vh] flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="inline-flex size-10 items-center justify-center rounded-xl border-2 border-inv-surface/20 bg-inv-primary/5 text-inv-primary shadow-sm">
                            <LayoutGrid className="size-5" />
                        </div>
                        <div className="border-l-2 border-inv-primary/30 pl-4">
                            <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                                Centro de alertas
                            </h1>
                            <p className="mt-0.5 text-muted-foreground text-xs md:text-sm">
                                Reglas configuradas, alertas disparadas y notificaciones recientes.
                            </p>
                        </div>
                    </div>
                </div>

                {!canView ? (
                    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-4 py-6 text-sm text-amber-800 flex items-center gap-3">
                        <AlertCircle className="size-5 shrink-0" />
                        <p>Tu rol no tiene permisos para ver el centro de alertas.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="space-y-4 lg:col-span-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="size-4 text-amber-500" />
                                    <h2 className="text-sm font-semibold tracking-tight text-foreground">
                                        Alertas recientes
                                    </h2>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {events.length === 0
                                        ? 'Sin alertas registradas'
                                        : `${events.length} últimas alertas`}
                                </span>
                            </div>
                            <div className="rounded-xl border border-border/70 bg-card shadow-sm">
                                <DataTable
                                    columns={eventColumns}
                                    data={events}
                                    keyExtractor={(row) => row.id}
                                    variant="neutral"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                                <div className="mb-2 flex items-center gap-2">
                                    <AlertCircle className="size-4 text-sky-600" />
                                    <h2 className="text-sm font-semibold tracking-tight text-foreground">
                                        Reglas de alerta
                                    </h2>
                                </div>
                                {rules.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                        Aún no hay reglas configuradas.
                                    </p>
                                ) : (
                                    <ul className="space-y-2 max-h-60 overflow-y-auto">
                                        {rules.map((rule) => (
                                            <li
                                                key={rule.id}
                                                className="rounded-lg border border-border/60 px-3 py-2"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-medium text-foreground truncate">
                                                        {rule.name}
                                                    </p>
                                                    <span
                                                        className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium ${
                                                            rule.is_active
                                                                ? 'bg-emerald-100 text-emerald-700'
                                                                : 'bg-slate-100 text-slate-600'
                                                        }`}
                                                    >
                                                        {rule.is_active ? 'Activa' : 'Inactiva'}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                                                    {ruleTypeLabel(rule.type)}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <Bell className="size-4 text-inv-primary" />
                                        <h2 className="text-sm font-semibold tracking-tight text-foreground">
                                            Tus notificaciones
                                        </h2>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={markAllNotificationsAsRead}
                                        disabled={markingAll || unreadNotificationsCount === 0}
                                        className="inline-flex items-center rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Marcar todas
                                    </button>
                                </div>
                                {notifications.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                        No tienes notificaciones recientes.
                                    </p>
                                ) : (
                                    <ul className="space-y-2 max-h-60 overflow-y-auto">
                                        {notifications.map((n) => (
                                            <li
                                                key={n.id}
                                                className={`rounded-lg border border-border/60 px-3 py-2 transition ${
                                                    !n.read_at ? 'bg-inv-primary/5' : ''
                                                }`}
                                            >
                                                <button
                                                    type="button"
                                                    className="w-full cursor-pointer text-left disabled:cursor-not-allowed"
                                                    onClick={() => openNotification(n)}
                                                    disabled={markingNotificationId === n.id}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-xs font-medium text-foreground truncate">
                                                            {n.data?.title ?? n.type}
                                                        </p>
                                                        {!n.read_at && (
                                                            <span className="inline-flex h-5 items-center rounded-full bg-inv-primary/10 px-2 text-[10px] font-medium text-inv-primary">
                                                                Nueva
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                                                        {n.data?.message ?? ''}
                                                    </p>
                                                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                                                        {formatDateTime(n.created_at)}
                                                    </p>
                                                    {getNotificationHref(n) && (
                                                        <a
                                                            href={getNotificationHref(n) ?? undefined}
                                                            className="mt-1 inline-block text-[11px] font-medium text-inv-primary hover:underline"
                                                            onClick={(event) => event.stopPropagation()}
                                                        >
                                                            Ver detalle
                                                        </a>
                                                    )}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

