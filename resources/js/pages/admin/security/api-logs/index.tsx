import { Head, router } from '@inertiajs/react';
import { Cable, CheckCircle2, LayoutGrid, ShieldAlert, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { DataTableColumn, SortOrder } from '@/components/data-table';
import { DataTable } from '@/components/data-table';
import { DateRangeFilter, type DateRangeFilterValue } from '@/components/date-range-filter';
import { SearchFilter } from '@/components/search-filter';
import { TablePagination } from '@/components/table-pagination';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type ApiLogRow = {
    id: string;
    token_id: string;
    token_name: string | null;
    endpoint: string | null;
    ip_address: string | null;
    status_code: number | null;
    created_at: string | null;
};

type Filters = {
    q: string;
    status_group: string;
    date_from: string;
    date_to: string;
    sort_by: string;
    sort_order: SortOrder;
    per_page: number;
};

type Stats = {
    total: number;
    success: number;
    unauthorized: number;
    errors: number;
};

type Props = {
    apiLogs: {
        data: ApiLogRow[];
        links: { url: string | null; label: string; active: boolean }[];
        from: number | null;
        to: number | null;
        total: number;
        current_page: number;
        last_page: number;
        per_page: number;
    };
    filters: Filters;
    stats: Stats;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Administración', href: '#' },
    { title: 'Seguridad', href: '#' },
    { title: 'Logs de API', href: '/admin/security/api-logs' },
];

function buildUrl(filters: Partial<Filters> & { page?: number }): string {
    const search = new URLSearchParams();
    if (filters.q !== undefined && filters.q !== '') search.set('q', filters.q);
    if (filters.status_group !== undefined && filters.status_group !== '') search.set('status_group', filters.status_group);
    if (filters.date_from !== undefined && filters.date_from !== '') search.set('date_from', filters.date_from);
    if (filters.date_to !== undefined && filters.date_to !== '') search.set('date_to', filters.date_to);
    if (filters.sort_by !== undefined) search.set('sort_by', filters.sort_by);
    if (filters.sort_order !== undefined) search.set('sort_order', filters.sort_order);
    if (filters.per_page !== undefined) search.set('per_page', String(filters.per_page));
    if (filters.page !== undefined) search.set('page', String(filters.page));
    return `/admin/security/api-logs?${search.toString()}`;
}

function formatDateTime(value?: string | null): string {
    if (! value) return '—';
    return new Date(value).toLocaleString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function statusBadge(code?: number | null): React.ReactNode {
    if (code == null) return '—';
    if (code >= 200 && code < 300) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                <CheckCircle2 className="size-3" /> {code}
            </span>
        );
    }
    if (code === 401 || code === 403) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                <ShieldAlert className="size-3" /> {code}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
            <XCircle className="size-3" /> {code}
        </span>
    );
}

export default function ApiLogsIndex({ apiLogs, filters, stats }: Props) {
    const [searchInput, setSearchInput] = useState(filters.q ?? '');

    useEffect(() => {
        const q = filters.q ?? '';
        queueMicrotask(() => setSearchInput(q));
    }, [filters.q]);

    useEffect(() => {
        const t = setTimeout(() => {
            const nextQ = (searchInput ?? '').trim();
            const currentQ = (filters.q ?? '').trim();
            if (nextQ === currentQ) return;
            router.get(buildUrl({ ...filters, q: nextQ, page: 1 }), {}, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 400);
        return () => clearTimeout(t);
    }, [searchInput, filters]);

    const applyFilters = (patch: Partial<Filters> & { page?: number }) => {
        router.get(buildUrl({ ...filters, ...patch }), {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const columns: DataTableColumn<ApiLogRow>[] = useMemo(() => [
        {
            key: 'created_at',
            label: 'Fecha',
            sortable: true,
            className: 'text-xs',
            render: (row) => formatDateTime(row.created_at),
        },
        {
            key: 'token_id',
            label: 'Token',
            sortable: false,
            className: 'text-xs',
            render: (row) => (
                <div className="min-w-0">
                    <span className="block truncate font-medium">
                        {row.token_name ?? 'Sin nombre'}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">
                        {row.token_id}
                    </span>
                </div>
            ),
        },
        {
            key: 'endpoint',
            label: 'Endpoint',
            sortable: true,
            className: 'text-xs',
            render: (row) => (
                <span className="font-mono text-[11px]">
                    {row.endpoint ?? '—'}
                </span>
            ),
        },
        {
            key: 'ip_address',
            label: 'IP',
            sortable: true,
            className: 'font-mono text-xs',
            render: (row) => row.ip_address ?? '—',
        },
        {
            key: 'status_code',
            label: 'Estado',
            sortable: true,
            className: 'text-xs',
            render: (row) => statusBadge(row.status_code),
        },
    ], []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Logs de API" />

            <div className="flex min-w-0 flex-col gap-4 p-4 md:p-6">
                <div className="space-y-3">
                    <h1 className="relative inline-block pb-1 text-xl font-semibold text-foreground">
                        Logs de API
                        <span className="absolute bottom-0 left-0 h-0.5 w-8 rounded-full bg-inv-primary" />
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Historial de llamadas del agente con estado HTTP y origen.
                    </p>
                    <div className="flex flex-wrap gap-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] text-gray-700 dark:bg-blue-500/20 dark:text-gray-300">
                            <Cable className="size-3 shrink-0 text-blue-600 dark:text-blue-400" />
                            <span>Total</span>
                            <span className="font-semibold">{stats.total}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] text-gray-700 dark:bg-emerald-500/20 dark:text-gray-300">
                            <CheckCircle2 className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span>OK</span>
                            <span className="font-semibold">{stats.success}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] text-gray-700 dark:bg-amber-500/20 dark:text-gray-300">
                            <ShieldAlert className="size-3 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span>401/403</span>
                            <span className="font-semibold">{stats.unauthorized}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] text-gray-700 dark:bg-rose-500/20 dark:text-gray-300">
                            <XCircle className="size-3 shrink-0 text-rose-600 dark:text-rose-400" />
                            <span>Errores</span>
                            <span className="font-semibold">{stats.errors}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-gray-700 dark:bg-slate-500/20 dark:text-gray-300">
                            <LayoutGrid className="size-3 shrink-0 text-slate-600 dark:text-slate-400" />
                            <span>Página</span>
                            <span className="font-semibold">{apiLogs.current_page}/{apiLogs.last_page}</span>
                        </span>
                    </div>
                </div>

                <div className="border-t border-border w-full shrink-0" aria-hidden />

                <div className="rounded-xl border border-border bg-card shadow-sm">
                    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <SearchFilter
                            value={searchInput}
                            onChange={setSearchInput}
                            placeholder="Buscar por token, endpoint, IP o código…"
                            className="w-full [&_input]:bg-white [&_input]:border-border [&_input]:text-foreground sm:max-w-xs"
                        />
                        <Select
                            value={filters.status_group === '' ? '_' : filters.status_group}
                            onValueChange={(v) => applyFilters({ status_group: v === '_' ? '' : v, page: 1 })}
                        >
                            <SelectTrigger className="w-full border-border bg-background sm:w-[180px]">
                                <SelectValue placeholder="Estado HTTP" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos</SelectItem>
                                <SelectItem value="success">2xx</SelectItem>
                                <SelectItem value="unauthorized">401/403</SelectItem>
                                <SelectItem value="client_error">4xx</SelectItem>
                                <SelectItem value="server_error">5xx</SelectItem>
                            </SelectContent>
                        </Select>
                        <DateRangeFilter
                            value={(filters.date_from !== '' || filters.date_to !== '')
                                ? { date_from: filters.date_from, date_to: filters.date_to }
                                : null}
                            onChange={(range: DateRangeFilterValue) => applyFilters({
                                date_from: range?.date_from ?? '',
                                date_to: range?.date_to ?? '',
                                page: 1,
                            })}
                            className="w-full sm:w-auto"
                        />
                    </div>

                    <div className="hidden md:block">
                        <DataTable
                            columns={columns}
                            data={apiLogs.data}
                            keyExtractor={(r) => r.id}
                            sortBy={filters.sort_by}
                            sortOrder={filters.sort_order}
                            onSort={(by, order) => applyFilters({ sort_by: by, sort_order: order })}
                            emptyMessage="No hay logs de API registrados."
                            variant="default"
                        />
                    </div>

                    <div className="md:hidden">
                        {apiLogs.data.length === 0 ? (
                            <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                                No hay logs de API registrados.
                            </p>
                        ) : (
                            <ul className="flex flex-col gap-3 p-3 sm:p-4">
                                {apiLogs.data.map((row) => (
                                    <li key={row.id}>
                                        <article className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_0_rgba(15,23,42,0.05)] dark:shadow-none">
                                            <div className="space-y-2 p-4">
                                                <p className="text-base font-medium text-foreground">
                                                    {row.token_name ?? 'Token sin nombre'}
                                                </p>
                                                <dl className="grid grid-cols-1 gap-1.5 text-sm">
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Fecha:</dt>
                                                        <dd className="text-foreground">{formatDateTime(row.created_at)}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Endpoint:</dt>
                                                        <dd className="font-mono text-foreground text-xs">{row.endpoint ?? '—'}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">IP:</dt>
                                                        <dd className="font-mono text-foreground">{row.ip_address ?? '—'}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Estado:</dt>
                                                        <dd>{statusBadge(row.status_code)}</dd>
                                                    </div>
                                                </dl>
                                            </div>
                                        </article>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="border-t border-border px-3 py-2">
                        <TablePagination
                            from={apiLogs.from}
                            to={apiLogs.to}
                            total={apiLogs.total}
                            perPage={apiLogs.per_page}
                            currentPage={apiLogs.current_page}
                            lastPage={apiLogs.last_page}
                            links={apiLogs.links}
                            buildPageUrl={(page) => buildUrl({ ...filters, page })}
                            onPerPageChange={(perPage) => applyFilters({ per_page: perPage, page: 1 })}
                        />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
