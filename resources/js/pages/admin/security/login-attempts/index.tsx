import { Head, router } from '@inertiajs/react';
import { CheckCircle2, LayoutGrid, LogIn, ShieldAlert, XCircle } from 'lucide-react';
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

type LoginAttemptRow = {
    id: string;
    email: string;
    ip_address: string;
    user_agent: string | null;
    success: boolean;
    failure_reason: string | null;
    created_at: string | null;
};

type Filters = {
    q: string;
    success: string;
    date_from: string;
    date_to: string;
    sort_by: string;
    sort_order: SortOrder;
    per_page: number;
};

type Stats = {
    total: number;
    successful: number;
    failed: number;
};

type Props = {
    loginAttempts: {
        data: LoginAttemptRow[];
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
    { title: 'Intentos de login', href: '/admin/security/login-attempts' },
];

function buildUrl(filters: Partial<Filters> & { page?: number }): string {
    const search = new URLSearchParams();
    if (filters.q !== undefined && filters.q !== '') search.set('q', filters.q);
    if (filters.success !== undefined && filters.success !== '') search.set('success', filters.success);
    if (filters.date_from !== undefined && filters.date_from !== '') search.set('date_from', filters.date_from);
    if (filters.date_to !== undefined && filters.date_to !== '') search.set('date_to', filters.date_to);
    if (filters.sort_by !== undefined) search.set('sort_by', filters.sort_by);
    if (filters.sort_order !== undefined) search.set('sort_order', filters.sort_order);
    if (filters.per_page !== undefined) search.set('per_page', String(filters.per_page));
    if (filters.page !== undefined) search.set('page', String(filters.page));
    return `/admin/security/login-attempts?${search.toString()}`;
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

function reasonLabel(reason?: string | null): string {
    if (! reason) return '—';
    return ({
        invalid_password: 'Credenciales inválidas',
        account_locked: 'Cuenta bloqueada',
        account_inactive: 'Cuenta desactivada',
        account_deleted: 'Cuenta dada de baja',
        throttled: 'Demasiados intentos',
        twofa_failed: '2FA inválido',
    } as Record<string, string>)[reason] ?? reason;
}

export default function LoginAttemptsIndex({ loginAttempts, filters, stats }: Props) {
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

    const columns: DataTableColumn<LoginAttemptRow>[] = useMemo(() => [
        {
            key: 'created_at',
            label: 'Fecha',
            sortable: true,
            className: 'text-xs',
            render: (row) => formatDateTime(row.created_at),
        },
        {
            key: 'email',
            label: 'Usuario ingresado',
            sortable: true,
            className: 'text-xs',
            render: (row) => <span className="font-medium">{row.email}</span>,
        },
        {
            key: 'ip_address',
            label: 'IP',
            sortable: true,
            className: 'font-mono text-xs',
            render: (row) => row.ip_address,
        },
        {
            key: 'success',
            label: 'Resultado',
            sortable: true,
            className: 'text-xs',
            render: (row) => row.success
                ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        <CheckCircle2 className="size-3" /> Exitoso
                    </span>
                )
                : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                        <XCircle className="size-3" /> Fallido
                    </span>
                ),
        },
        {
            key: 'failure_reason',
            label: 'Motivo de fallo',
            sortable: false,
            className: 'text-xs',
            render: (row) => row.success ? '—' : reasonLabel(row.failure_reason),
        },
    ], []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Intentos de login" />

            <div className="flex min-w-0 flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-3">
                        <h1 className="relative inline-block pb-1 text-xl font-semibold text-foreground">
                            Intentos de login
                            <span className="absolute bottom-0 left-0 h-0.5 w-8 rounded-full bg-inv-primary" />
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Historial de accesos al sistema para seguimiento de seguridad.
                        </p>
                        <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] text-gray-700 dark:bg-blue-500/20 dark:text-gray-300">
                                <LogIn className="size-3 shrink-0 text-blue-600 dark:text-blue-400" />
                                <span>Total</span>
                                <span className="font-semibold">{stats.total}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] text-gray-700 dark:bg-emerald-500/20 dark:text-gray-300">
                                <CheckCircle2 className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <span>Exitosos</span>
                                <span className="font-semibold">{stats.successful}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] text-gray-700 dark:bg-rose-500/20 dark:text-gray-300">
                                <ShieldAlert className="size-3 shrink-0 text-rose-600 dark:text-rose-400" />
                                <span>Fallidos</span>
                                <span className="font-semibold">{stats.failed}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-gray-700 dark:bg-slate-500/20 dark:text-gray-300">
                                <LayoutGrid className="size-3 shrink-0 text-slate-600 dark:text-slate-400" />
                                <span>Página</span>
                                <span className="font-semibold">{loginAttempts.current_page}/{loginAttempts.last_page}</span>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="border-t border-border w-full shrink-0" aria-hidden />

                <div className="rounded-xl border border-border bg-card shadow-sm">
                    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <SearchFilter
                            value={searchInput}
                            onChange={setSearchInput}
                            placeholder="Buscar por usuario, IP o motivo…"
                            className="w-full [&_input]:bg-white [&_input]:border-border [&_input]:text-foreground sm:max-w-xs"
                        />
                        <Select
                            value={filters.success === '' ? '_' : filters.success}
                            onValueChange={(v) => applyFilters({ success: v === '_' ? '' : v, page: 1 })}
                        >
                            <SelectTrigger className="w-full border-border bg-background sm:w-[160px]">
                                <SelectValue placeholder="Resultado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos los resultados</SelectItem>
                                <SelectItem value="1">Exitoso</SelectItem>
                                <SelectItem value="0">Fallido</SelectItem>
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
                            data={loginAttempts.data}
                            keyExtractor={(r) => r.id}
                            sortBy={filters.sort_by}
                            sortOrder={filters.sort_order}
                            onSort={(by, order) => applyFilters({ sort_by: by, sort_order: order })}
                            emptyMessage="No hay intentos de login registrados."
                            variant="default"
                        />
                    </div>

                    <div className="md:hidden">
                        {loginAttempts.data.length === 0 ? (
                            <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                                No hay intentos de login registrados.
                            </p>
                        ) : (
                            <ul className="flex flex-col gap-3 p-3 sm:p-4">
                                {loginAttempts.data.map((row) => (
                                    <li key={row.id}>
                                        <article className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_0_rgba(15,23,42,0.05)] dark:shadow-none">
                                            <div className="space-y-2 p-4">
                                                <p className="text-base font-medium text-foreground">{row.email}</p>
                                                <dl className="grid grid-cols-1 gap-1.5 text-sm">
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Fecha:</dt>
                                                        <dd className="text-foreground">{formatDateTime(row.created_at)}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">IP:</dt>
                                                        <dd className="font-mono text-foreground">{row.ip_address}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Resultado:</dt>
                                                        <dd className={row.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
                                                            {row.success ? 'Exitoso' : 'Fallido'}
                                                        </dd>
                                                    </div>
                                                    {! row.success && (
                                                        <div className="flex flex-wrap gap-x-2">
                                                            <dt className="text-muted-foreground shrink-0">Motivo:</dt>
                                                            <dd className="text-foreground">{reasonLabel(row.failure_reason)}</dd>
                                                        </div>
                                                    )}
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
                            from={loginAttempts.from}
                            to={loginAttempts.to}
                            total={loginAttempts.total}
                            perPage={loginAttempts.per_page}
                            currentPage={loginAttempts.current_page}
                            lastPage={loginAttempts.last_page}
                            links={loginAttempts.links}
                            buildPageUrl={(page) => buildUrl({ ...filters, page })}
                            onPerPageChange={(perPage) => applyFilters({ per_page: perPage, page: 1 })}
                        />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
