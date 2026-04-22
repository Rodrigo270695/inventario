import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ClipboardCopy, ScrollText, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TablePagination } from '@/components/table-pagination';
import { Toast } from '@/components/toast';
import type { ToastMessage } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import { LICENSES_ICON_BTN_DELETE } from '../licenses/tabs/ui-classes';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Auditoría', href: '/admin/audit' }];

type SortOrder = 'asc' | 'desc';

type AuditFilters = {
    logs_sort_by: string;
    logs_sort_order: SortOrder;
    reports_sort_by: string;
    reports_sort_order: SortOrder;
    tokens_sort_by: string;
    tokens_sort_order: SortOrder;
};

type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    from: number | null;
    to: number | null;
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
};

type AuditLogRow = {
    id: string;
    action: string;
    model_type: string;
    model_type_short: string;
    model_id: string;
    user_display: string;
    ip_address: string | null;
    created_at: string | null;
    old_values_preview: string | null;
    new_values_preview: string | null;
};

type AgentReportRow = {
    id: string;
    asset_id: string;
    asset_code: string;
    reported_at: string | null;
    created_at: string | null;
    is_full_snapshot: boolean;
    payload_preview: string;
};

type AgentTokenRow = {
    id: string;
    name: string | null;
    expires_at: string | null;
    last_used_at: string | null;
    created_at: string | null;
    ip_whitelist_count: number;
    is_expired: boolean;
};

type TabId = 'logs' | 'reports' | 'tokens';

type Props = {
    tab: TabId;
    canViewLogs: boolean;
    canViewReports: boolean;
    canManageTokens: boolean;
    filters: AuditFilters;
    auditLogs: Paginated<AuditLogRow>;
    agentReports: Paginated<AgentReportRow>;
    agentTokens: Paginated<AgentTokenRow>;
};

function buildAuditUrl(tab: TabId, f: AuditFilters, pageParam?: { name: string; value: number }): string {
    const p = new URLSearchParams();
    p.set('tab', tab);
    p.set('logs_sort_by', f.logs_sort_by);
    p.set('logs_sort_order', f.logs_sort_order);
    p.set('reports_sort_by', f.reports_sort_by);
    p.set('reports_sort_order', f.reports_sort_order);
    p.set('tokens_sort_by', f.tokens_sort_by);
    p.set('tokens_sort_order', f.tokens_sort_order);
    if (pageParam) {
        p.set(pageParam.name, String(pageParam.value));
    }
    return `/admin/audit?${p.toString()}`;
}

function toggleSort(
    currentCol: string,
    currentOrder: SortOrder,
    column: string
): { sort_by: string; sort_order: SortOrder } {
    if (currentCol === column) {
        return { sort_by: column, sort_order: currentOrder === 'desc' ? 'asc' : 'desc' };
    }
    return { sort_by: column, sort_order: 'desc' };
}

function formatDateTime(value?: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AuditIndex({
    tab,
    canViewLogs,
    canViewReports,
    canManageTokens,
    filters,
    auditLogs,
    agentReports,
    agentTokens,
}: Props) {
    const [toastQueue, setToastQueue] = useState<Array<ToastMessage & { id: number }>>([]);
    const lastFlashToastRef = useRef<ToastMessage | null>(null);
    const [plainTokenBanner, setPlainTokenBanner] = useState<string | null>(null);
    const lastPlainTokenRef = useRef<string | null>(null);

    const { props } = usePage();
    const flash = (props as { flash?: { toast?: ToastMessage; created_agent_token?: string | null } }).flash;

    const tokenForm = useForm({
        name: '',
        expires_at: '',
        ip_whitelist: '',
    });

    useEffect(() => {
        const t = flash?.toast;
        if (!t || t === lastFlashToastRef.current) return;
        lastFlashToastRef.current = t;
        const id = Date.now();
        queueMicrotask(() => setToastQueue((q) => [...q, { ...t, id }]));
    }, [flash?.toast]);

    useEffect(() => {
        const tok = flash?.created_agent_token;
        if (!tok || tok === lastPlainTokenRef.current) return;
        lastPlainTokenRef.current = tok;
        queueMicrotask(() => setPlainTokenBanner(tok));
    }, [flash?.created_agent_token]);

    const removeToast = useCallback((id: number) => {
        setToastQueue((q) => q.filter((item) => item.id !== id));
    }, []);

    const allowedTabs: TabId[] = [];
    if (canViewLogs) allowedTabs.push('logs');
    if (canViewReports) allowedTabs.push('reports');
    if (canManageTokens) allowedTabs.push('tokens');

    const effectiveTab: TabId = allowedTabs.includes(tab) ? tab : (allowedTabs[0] ?? 'logs');

    const submitToken = (e: React.FormEvent) => {
        e.preventDefault();
        tokenForm.post('/admin/audit/agent-tokens', {
            preserveScroll: true,
            onSuccess: () => {
                tokenForm.reset();
                tokenForm.clearErrors();
            },
        });
    };

    const copyPlain = async () => {
        if (!plainTokenBanner) return;
        try {
            await navigator.clipboard.writeText(plainTokenBanner);
        } catch {
            /* ignore */
        }
    };

    const logsPagination = (
        <TablePagination
            from={auditLogs.from}
            to={auditLogs.to}
            total={auditLogs.total}
            perPage={auditLogs.per_page}
            currentPage={auditLogs.current_page}
            lastPage={auditLogs.last_page}
            links={auditLogs.links}
            buildPageUrl={(page) => buildAuditUrl('logs', filters, { name: 'logs_page', value: page })}
            onPerPageChange={() => {}}
            perPageOptions={[15]}
            className="border-t border-border px-2 py-2 sm:px-3"
        />
    );

    const reportsPagination = (
        <TablePagination
            from={agentReports.from}
            to={agentReports.to}
            total={agentReports.total}
            perPage={agentReports.per_page}
            currentPage={agentReports.current_page}
            lastPage={agentReports.last_page}
            links={agentReports.links}
            buildPageUrl={(page) => buildAuditUrl('reports', filters, { name: 'reports_page', value: page })}
            onPerPageChange={() => {}}
            perPageOptions={[15]}
            className="border-t border-border px-2 py-2 sm:px-3"
        />
    );

    const tokensPagination = (
        <TablePagination
            from={agentTokens.from}
            to={agentTokens.to}
            total={agentTokens.total}
            perPage={agentTokens.per_page}
            currentPage={agentTokens.current_page}
            lastPage={agentTokens.last_page}
            links={agentTokens.links}
            buildPageUrl={(page) => buildAuditUrl('tokens', filters, { name: 'tokens_page', value: page })}
            onPerPageChange={() => {}}
            perPageOptions={[15]}
            className="border-t border-border px-2 py-2 sm:px-3"
        />
    );

    const sortLogsHeader = (label: string, column: string) => {
        const active = filters.logs_sort_by === column;
        const next = toggleSort(filters.logs_sort_by, filters.logs_sort_order, column);
        const nextFilters: AuditFilters = {
            ...filters,
            logs_sort_by: next.sort_by,
            logs_sort_order: next.sort_order,
        };
        return (
            <th className="px-2 py-1.5 text-left sm:px-3 sm:py-2">
                <button
                    type="button"
                    className={cn(
                        'cursor-pointer text-left text-[10px] font-semibold uppercase tracking-wide sm:text-xs',
                        active ? 'text-inv-primary' : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() =>
                        router.get(buildAuditUrl('logs', nextFilters), {}, { preserveState: true, preserveScroll: true })
                    }
                >
                    {label}
                    {active ? (filters.logs_sort_order === 'desc' ? ' ↓' : ' ↑') : ''}
                </button>
            </th>
        );
    };

    const sortReportsHeader = (label: string, column: string) => {
        const active = filters.reports_sort_by === column;
        const next = toggleSort(filters.reports_sort_by, filters.reports_sort_order, column);
        const nextFilters: AuditFilters = {
            ...filters,
            reports_sort_by: next.sort_by,
            reports_sort_order: next.sort_order,
        };
        return (
            <th className="px-2 py-1.5 text-left sm:px-3 sm:py-2">
                <button
                    type="button"
                    className={cn(
                        'cursor-pointer text-left text-[10px] font-semibold uppercase tracking-wide sm:text-xs',
                        active ? 'text-inv-primary' : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() =>
                        router.get(buildAuditUrl('reports', nextFilters), {}, { preserveState: true, preserveScroll: true })
                    }
                >
                    {label}
                    {active ? (filters.reports_sort_order === 'desc' ? ' ↓' : ' ↑') : ''}
                </button>
            </th>
        );
    };

    const sortTokensHeader = (label: string, column: string) => {
        const active = filters.tokens_sort_by === column;
        const next = toggleSort(filters.tokens_sort_by, filters.tokens_sort_order, column);
        const nextFilters: AuditFilters = {
            ...filters,
            tokens_sort_by: next.sort_by,
            tokens_sort_order: next.sort_order,
        };
        return (
            <th className="px-2 py-1.5 text-left sm:px-3 sm:py-2">
                <button
                    type="button"
                    className={cn(
                        'cursor-pointer text-left text-[10px] font-semibold uppercase tracking-wide sm:text-xs',
                        active ? 'text-inv-primary' : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() =>
                        router.get(buildAuditUrl('tokens', nextFilters), {}, { preserveState: true, preserveScroll: true })
                    }
                >
                    {label}
                    {active ? (filters.tokens_sort_order === 'desc' ? ' ↓' : ' ↑') : ''}
                </button>
            </th>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Auditoría" />

            {toastQueue.length > 0 && (
                <div className="fixed top-4 right-4 left-4 z-50 flex max-w-md flex-col gap-2 sm:left-auto">
                    {toastQueue.map((t) => (
                        <Toast key={t.id} toast={t} onDismiss={() => removeToast(t.id)} duration={4000} />
                    ))}
                </div>
            )}

            <div className="flex min-w-0 flex-col gap-4 p-3 sm:p-4 md:p-6">
                <div className="space-y-2">
                    <h1 className="relative inline-block pb-1 text-xl font-semibold text-foreground">
                        Auditoría
                        <span className="absolute bottom-0 left-0 h-0.5 w-8 rounded-full bg-inv-primary" />
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Registro de cambios en el sistema, reportes enviados por el agente y tokens de acceso del agente.
                    </p>
                </div>

                {plainTokenBanner && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
                        <p className="mb-2 font-medium text-amber-900 dark:text-amber-100">Token nuevo (guárdelo en un lugar seguro)</p>
                        <code className="mb-3 block max-w-full break-all rounded bg-background/80 px-2 py-2 text-xs">{plainTokenBanner}</code>
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="w-full gap-1 border-inv-primary/50 text-inv-primary hover:bg-inv-primary/10 hover:text-inv-primary sm:w-auto"
                                onClick={() => void copyPlain()}
                            >
                                <ClipboardCopy className="size-3.5" />
                                Copiar
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="w-full border-border sm:w-auto"
                                onClick={() => setPlainTokenBanner(null)}
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>
                )}

                <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                    <div className="border-b border-inv-primary/20 bg-inv-primary/5 p-2 sm:p-2.5">
                        <nav
                            className="flex flex-col gap-1.5 sm:flex-row sm:flex-nowrap sm:gap-1 sm:overflow-x-auto sm:px-1 sm:pb-0.5"
                            aria-label="Pestañas de auditoría"
                        >
                            {canViewLogs && (
                                <button
                                    type="button"
                                    className={cn(
                                        'flex w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-medium transition sm:w-auto sm:justify-start sm:py-2 sm:text-sm',
                                        effectiveTab === 'logs'
                                            ? 'bg-inv-primary text-white shadow-sm'
                                            : 'text-muted-foreground hover:bg-inv-primary/10 hover:text-inv-primary'
                                    )}
                                    onClick={() =>
                                        router.get(buildAuditUrl('logs', filters), {}, { preserveState: true, preserveScroll: true })
                                    }
                                >
                                    Registro de cambios
                                </button>
                            )}
                            {canViewReports && (
                                <button
                                    type="button"
                                    className={cn(
                                        'flex w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-medium transition sm:w-auto sm:justify-start sm:py-2 sm:text-sm',
                                        effectiveTab === 'reports'
                                            ? 'bg-inv-primary text-white shadow-sm'
                                            : 'text-muted-foreground hover:bg-inv-primary/10 hover:text-inv-primary'
                                    )}
                                    onClick={() =>
                                        router.get(buildAuditUrl('reports', filters), {}, { preserveState: true, preserveScroll: true })
                                    }
                                >
                                    Reportes del agente
                                </button>
                            )}
                            {canManageTokens && (
                                <button
                                    type="button"
                                    className={cn(
                                        'flex w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-medium transition sm:w-auto sm:justify-start sm:py-2 sm:text-sm',
                                        effectiveTab === 'tokens'
                                            ? 'bg-inv-primary text-white shadow-sm'
                                            : 'text-muted-foreground hover:bg-inv-primary/10 hover:text-inv-primary'
                                    )}
                                    onClick={() =>
                                        router.get(buildAuditUrl('tokens', filters), {}, { preserveState: true, preserveScroll: true })
                                    }
                                >
                                    Tokens del agente
                                </button>
                            )}
                        </nav>
                    </div>

                    {effectiveTab === 'logs' && canViewLogs && (
                        <div className="min-w-0 overflow-x-auto overscroll-x-contain">
                            <table className="w-full min-w-[720px] text-xs sm:text-sm">
                                <thead className="border-b border-border bg-muted/40">
                                    <tr>
                                        {sortLogsHeader('Fecha', 'created_at')}
                                        {sortLogsHeader('Acción', 'action')}
                                        {sortLogsHeader('Modelo', 'model_type')}
                                        <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-3 sm:py-2 sm:text-xs">
                                            Usuario
                                        </th>
                                        <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-3 sm:py-2 sm:text-xs">
                                            IP
                                        </th>
                                        <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-3 sm:py-2 sm:text-xs">
                                            Antes (vista)
                                        </th>
                                        <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-3 sm:py-2 sm:text-xs">
                                            Después (vista)
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-2 py-8 text-center text-muted-foreground sm:px-3">
                                                No hay registros de auditoría.
                                            </td>
                                        </tr>
                                    ) : (
                                        auditLogs.data.map((row) => (
                                            <tr key={row.id} className="border-b border-border/60 hover:bg-muted/20">
                                                <td className="px-2 py-2 whitespace-nowrap text-muted-foreground sm:px-3">
                                                    {formatDateTime(row.created_at)}
                                                </td>
                                                <td className="px-2 py-2 font-mono text-[11px] sm:px-3 sm:text-xs">{row.action}</td>
                                                <td className="max-w-[140px] px-2 py-2 text-[11px] sm:max-w-none sm:px-3 sm:text-xs" title={row.model_type}>
                                                    <span className="font-medium">{row.model_type_short}</span>
                                                    <span className="text-muted-foreground"> · {row.model_id.slice(0, 8)}…</span>
                                                </td>
                                                <td className="max-w-[120px] truncate px-2 py-2 text-[11px] sm:max-w-none sm:px-3 sm:text-xs">{row.user_display}</td>
                                                <td className="px-2 py-2 font-mono text-[11px] sm:px-3 sm:text-xs">{row.ip_address ?? '—'}</td>
                                                <td className="max-w-[120px] truncate px-2 py-2 font-mono text-[10px] text-muted-foreground sm:max-w-[200px] sm:px-3 sm:text-[11px]" title={row.old_values_preview ?? ''}>
                                                    {row.old_values_preview ?? '—'}
                                                </td>
                                                <td className="max-w-[120px] truncate px-2 py-2 font-mono text-[10px] text-muted-foreground sm:max-w-[200px] sm:px-3 sm:text-[11px]" title={row.new_values_preview ?? ''}>
                                                    {row.new_values_preview ?? '—'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                            {logsPagination}
                        </div>
                    )}

                    {effectiveTab === 'reports' && canViewReports && (
                        <div className="min-w-0 overflow-x-auto overscroll-x-contain">
                            <table className="w-full min-w-[640px] text-xs sm:text-sm">
                                <thead className="border-b border-border bg-muted/40">
                                    <tr>
                                        {sortReportsHeader('Recibido', 'created_at')}
                                        {sortReportsHeader('Reportado', 'reported_at')}
                                        {sortReportsHeader('Activo', 'asset')}
                                        <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-3 sm:py-2 sm:text-xs">
                                            Snapshot
                                        </th>
                                        <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-3 sm:py-2 sm:text-xs">
                                            Payload (vista)
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agentReports.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-2 py-8 text-center text-muted-foreground sm:px-3">
                                                No hay reportes del agente.
                                            </td>
                                        </tr>
                                    ) : (
                                        agentReports.data.map((row) => (
                                            <tr key={row.id} className="border-b border-border/60 hover:bg-muted/20">
                                                <td className="px-2 py-2 whitespace-nowrap text-muted-foreground sm:px-3">
                                                    {formatDateTime(row.created_at)}
                                                </td>
                                                <td className="px-2 py-2 whitespace-nowrap text-muted-foreground sm:px-3">
                                                    {formatDateTime(row.reported_at)}
                                                </td>
                                                <td className="px-2 py-2 font-medium sm:px-3">{row.asset_code}</td>
                                                <td className="px-2 py-2 sm:px-3">{row.is_full_snapshot ? 'Completo' : 'Parcial'}</td>
                                                <td
                                                    className="max-w-[200px] truncate px-2 py-2 font-mono text-[10px] text-muted-foreground sm:max-w-md sm:px-3 sm:text-[11px]"
                                                    title={row.payload_preview}
                                                >
                                                    {row.payload_preview}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                            {reportsPagination}
                        </div>
                    )}

                    {effectiveTab === 'tokens' && canManageTokens && (
                        <div className="divide-y divide-border">
                            <form onSubmit={submitToken} className="min-w-0 space-y-3 p-3 sm:p-4">
                                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                    <ScrollText className="size-4 shrink-0 text-inv-primary" />
                                    Crear token
                                </div>
                                <p className="text-muted-foreground text-xs leading-relaxed">
                                    El valor mostrado una sola vez tiene formato{' '}
                                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{'{id}'}</code>
                                    <span className="font-mono">|</span>
                                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{'{secreto}'}</code>.
                                    Envíelo en la API del agente como{' '}
                                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Authorization: Bearer …</code> o cabecera{' '}
                                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">X-Agent-Token</code>. Endpoint:{' '}
                                    <code className="break-all rounded bg-muted px-1 py-0.5 font-mono text-[10px]">POST /api/agent/reports</code> (JSON:{' '}
                                    <code className="font-mono text-[10px]">asset_id</code>,{' '}
                                    <code className="font-mono text-[10px]">payload</code>, opcional{' '}
                                    <code className="font-mono text-[10px]">reported_at</code>,{' '}
                                    <code className="font-mono text-[10px]">is_full_snapshot</code>).
                                </p>
                                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="min-w-0 space-y-1.5">
                                        <Label htmlFor="token-name" className="text-xs">
                                            Nombre (opcional)
                                        </Label>
                                        <Input
                                            id="token-name"
                                            className="min-w-0 w-full max-w-full"
                                            value={tokenForm.data.name}
                                            onChange={(e) => tokenForm.setData('name', e.target.value)}
                                            maxLength={100}
                                            disabled={tokenForm.processing}
                                        />
                                    </div>
                                    <div className="min-w-0 space-y-1.5">
                                        <Label htmlFor="token-expires" className="text-xs">
                                            Caducidad (opcional)
                                        </Label>
                                        <Input
                                            id="token-expires"
                                            type="datetime-local"
                                            className="min-w-0 w-full max-w-full"
                                            value={toDatetimeLocalValue(tokenForm.data.expires_at || null)}
                                            onChange={(e) => tokenForm.setData('expires_at', e.target.value)}
                                            disabled={tokenForm.processing}
                                        />
                                    </div>
                                </div>
                                <div className="min-w-0 space-y-1.5">
                                    <Label htmlFor="token-ips" className="text-xs">
                                        IPs permitidas (opcional, separadas por coma o salto de línea)
                                    </Label>
                                    <textarea
                                        id="token-ips"
                                        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring box-border flex min-h-[72px] w-full min-w-0 max-w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                        value={tokenForm.data.ip_whitelist}
                                        onChange={(e) => tokenForm.setData('ip_whitelist', e.target.value)}
                                        disabled={tokenForm.processing}
                                    />
                                </div>
                                {tokenForm.errors.name && (
                                    <p className="text-destructive text-xs">{tokenForm.errors.name}</p>
                                )}
                                {tokenForm.errors.expires_at && (
                                    <p className="text-destructive text-xs">{tokenForm.errors.expires_at}</p>
                                )}
                                {tokenForm.errors.ip_whitelist && (
                                    <p className="text-destructive text-xs">{tokenForm.errors.ip_whitelist}</p>
                                )}
                                <Button
                                    type="submit"
                                    disabled={tokenForm.processing}
                                    className={cn(
                                        'w-full justify-center shadow-sm sm:w-auto',
                                        'bg-inv-primary text-white hover:bg-inv-primary/90',
                                        'focus-visible:ring-2 focus-visible:ring-inv-primary/50 focus-visible:ring-offset-2'
                                    )}
                                >
                                    {tokenForm.processing ? 'Creando…' : 'Generar token'}
                                </Button>
                            </form>

                            <div className="min-w-0 overflow-x-auto overscroll-x-contain">
                                <table className="w-full min-w-[560px] text-xs sm:text-sm">
                                    <thead className="border-b border-border bg-muted/40">
                                        <tr>
                                            {sortTokensHeader('Creado', 'created_at')}
                                            {sortTokensHeader('Nombre', 'name')}
                                            {sortTokensHeader('Caduca', 'expires_at')}
                                            <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-3 sm:py-2 sm:text-xs">
                                                Último uso
                                            </th>
                                            <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-3 sm:py-2 sm:text-xs">
                                                IPs
                                            </th>
                                            <th className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-3 sm:py-2 sm:text-xs">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {agentTokens.data.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-2 py-8 text-center text-muted-foreground sm:px-3">
                                                    No hay tokens. Cree uno con el formulario superior.
                                                </td>
                                            </tr>
                                        ) : (
                                            agentTokens.data.map((row) => (
                                                <tr key={row.id} className="border-b border-border/60 hover:bg-muted/20">
                                                    <td className="px-2 py-2 whitespace-nowrap text-muted-foreground sm:px-3">
                                                        {formatDateTime(row.created_at)}
                                                    </td>
                                                    <td className="max-w-[100px] truncate px-2 py-2 sm:max-w-none sm:px-3">{row.name ?? '—'}</td>
                                                    <td className="px-2 py-2 whitespace-nowrap text-muted-foreground sm:px-3">
                                                        {formatDateTime(row.expires_at)}
                                                    </td>
                                                    <td className="px-2 py-2 whitespace-nowrap text-muted-foreground sm:px-3">
                                                        {formatDateTime(row.last_used_at)}
                                                    </td>
                                                    <td className="px-2 py-2 sm:px-3">{row.ip_whitelist_count}</td>
                                                    <td className="px-2 py-2 text-right sm:px-3">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            className={LICENSES_ICON_BTN_DELETE}
                                                            title="Revocar token"
                                                            onClick={() => {
                                                                if (
                                                                    !confirm(
                                                                        '¿Revocar este token? Los clientes que lo usen dejarán de poder autenticarse.'
                                                                    )
                                                                ) {
                                                                    return;
                                                                }
                                                                router.delete(`/admin/audit/agent-tokens/${row.id}`, {
                                                                    preserveScroll: true,
                                                                });
                                                            }}
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                                {tokensPagination}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
