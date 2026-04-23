import { Head, router, usePage } from '@inertiajs/react';
import { CheckCircle2, DatabaseBackup, LayoutGrid, ShieldCheck, XCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DataTableColumn, SortOrder } from '@/components/data-table';
import { DataTable } from '@/components/data-table';
import { DateRangeFilter, type DateRangeFilterValue } from '@/components/date-range-filter';
import { SearchFilter } from '@/components/search-filter';
import { TablePagination } from '@/components/table-pagination';
import { Toast } from '@/components/toast';
import type { ToastMessage } from '@/components/toast';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

type BackupLogRow = {
    id: string;
    type: string;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    verified_at: string | null;
    path_or_ref: string | null;
    created_at: string | null;
};

type Filters = {
    q: string;
    status: string;
    date_from: string;
    date_to: string;
    sort_by: string;
    sort_order: SortOrder;
    per_page: number;
};

type Stats = {
    total: number;
    completed: number;
    failed: number;
    verified: number;
};

type Props = {
    backupLogs: {
        data: BackupLogRow[];
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
    { title: 'Backups', href: '/admin/security/backups' },
];

function buildUrl(filters: Partial<Filters> & { page?: number }): string {
    const search = new URLSearchParams();
    if (filters.q !== undefined && filters.q !== '') search.set('q', filters.q);
    if (filters.status !== undefined && filters.status !== '') search.set('status', filters.status);
    if (filters.date_from !== undefined && filters.date_from !== '') search.set('date_from', filters.date_from);
    if (filters.date_to !== undefined && filters.date_to !== '') search.set('date_to', filters.date_to);
    if (filters.sort_by !== undefined) search.set('sort_by', filters.sort_by);
    if (filters.sort_order !== undefined) search.set('sort_order', filters.sort_order);
    if (filters.per_page !== undefined) search.set('per_page', String(filters.per_page));
    if (filters.page !== undefined) search.set('page', String(filters.page));
    return `/admin/security/backups?${search.toString()}`;
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

function statusBadge(status: string): React.ReactNode {
    const normalized = status.toLowerCase();
    if (normalized === 'completed') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                <CheckCircle2 className="size-3" /> Completado
            </span>
        );
    }
    if (normalized === 'failed') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                <XCircle className="size-3" /> Fallido
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            <DatabaseBackup className="size-3" /> En proceso
        </span>
    );
}

export default function BackupsIndex({ backupLogs, filters, stats }: Props) {
    const [searchInput, setSearchInput] = useState(filters.q ?? '');
    const [runningBackup, setRunningBackup] = useState(false);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const [toastQueue, setToastQueue] = useState<Array<ToastMessage & { id: number }>>([]);
    const lastFlashToastRef = useRef<ToastMessage | null>(null);

    const pageProps = usePage().props as {
        auth?: { permissions?: string[] };
        flash?: { toast?: ToastMessage };
    };
    const permissions = pageProps.auth?.permissions ?? [];
    const canCreate = permissions.includes('security.backups.create');
    const canVerify = permissions.includes('security.backups.verify');
    const flash = pageProps.flash;

    useEffect(() => {
        const t = flash?.toast;
        if (! t || t === lastFlashToastRef.current) return;
        lastFlashToastRef.current = t;
        const id = Date.now();
        queueMicrotask(() => setToastQueue((q) => [...q, { ...t, id }]));
    }, [flash?.toast]);

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

    const runBackup = () => {
        if (runningBackup) return;
        setRunningBackup(true);
        router.post('/admin/security/backups', {}, {
            preserveScroll: true,
            onFinish: () => setRunningBackup(false),
        });
    };

    const verifyBackup = (id: string) => {
        if (verifyingId) return;
        setVerifyingId(id);
        router.post(`/admin/security/backups/${id}/verify`, {}, {
            preserveScroll: true,
            onFinish: () => setVerifyingId(null),
        });
    };

    const columns: DataTableColumn<BackupLogRow>[] = useMemo(() => [
        {
            key: 'started_at',
            label: 'Inicio',
            sortable: true,
            className: 'text-xs',
            render: (row) => formatDateTime(row.started_at),
        },
        {
            key: 'type',
            label: 'Tipo',
            sortable: true,
            className: 'text-xs',
            render: (row) => row.type,
        },
        {
            key: 'status',
            label: 'Estado',
            sortable: true,
            className: 'text-xs',
            render: (row) => statusBadge(row.status),
        },
        {
            key: 'path_or_ref',
            label: 'Archivo / referencia',
            sortable: false,
            className: 'text-xs',
            render: (row) => (
                <span className="block max-w-[420px] truncate font-mono text-[11px]" title={row.path_or_ref ?? ''}>
                    {row.path_or_ref ?? '—'}
                </span>
            ),
        },
        {
            key: 'verified_at',
            label: 'Verificado',
            sortable: false,
            className: 'text-xs',
            render: (row) => row.verified_at
                ? formatDateTime(row.verified_at)
                : <span className="text-muted-foreground">No</span>,
        },
        {
            key: 'actions',
            label: '',
            sortable: false,
            className: 'text-right',
            render: (row) => (
                canVerify && row.status === 'completed' && ! row.verified_at ? (
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="cursor-pointer border-emerald-400/70 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/35"
                        disabled={verifyingId === row.id}
                        onClick={() => verifyBackup(row.id)}
                    >
                        {verifyingId === row.id ? 'Verificando…' : 'Marcar verificado'}
                    </Button>
                ) : null
            ),
        },
    ], [canVerify, verifyingId]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Backups" />

            {toastQueue.length > 0 && (
                <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
                    {toastQueue.map((t) => (
                        <Toast
                            key={t.id}
                            toast={t}
                            onDismiss={() => setToastQueue((q) => q.filter((x) => x.id !== t.id))}
                            duration={3500}
                        />
                    ))}
                </div>
            )}

            <div className="flex min-w-0 flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-3">
                        <h1 className="relative inline-block pb-1 text-xl font-semibold text-foreground">
                            Backups
                            <span className="absolute bottom-0 left-0 h-0.5 w-8 rounded-full bg-inv-primary" />
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Generación manual de respaldos y trazabilidad del historial.
                        </p>
                        <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] text-gray-700 dark:bg-blue-500/20 dark:text-gray-300">
                                <DatabaseBackup className="size-3 shrink-0 text-blue-600 dark:text-blue-400" />
                                <span>Total</span>
                                <span className="font-semibold">{stats.total}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] text-gray-700 dark:bg-emerald-500/20 dark:text-gray-300">
                                <CheckCircle2 className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <span>Completados</span>
                                <span className="font-semibold">{stats.completed}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] text-gray-700 dark:bg-rose-500/20 dark:text-gray-300">
                                <XCircle className="size-3 shrink-0 text-rose-600 dark:text-rose-400" />
                                <span>Fallidos</span>
                                <span className="font-semibold">{stats.failed}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] text-gray-700 dark:bg-teal-500/20 dark:text-gray-300">
                                <ShieldCheck className="size-3 shrink-0 text-teal-600 dark:text-teal-400" />
                                <span>Verificados</span>
                                <span className="font-semibold">{stats.verified}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-gray-700 dark:bg-slate-500/20 dark:text-gray-300">
                                <LayoutGrid className="size-3 shrink-0 text-slate-600 dark:text-slate-400" />
                                <span>Página</span>
                                <span className="font-semibold">{backupLogs.current_page}/{backupLogs.last_page}</span>
                            </span>
                        </div>
                    </div>
                    {canCreate && (
                        <Button
                            type="button"
                            className={cn(
                                'w-full cursor-pointer sm:w-auto',
                                'bg-inv-primary text-white hover:bg-inv-primary/90'
                            )}
                            disabled={runningBackup}
                            onClick={runBackup}
                        >
                            {runningBackup ? 'Generando backup…' : 'Generar backup'}
                        </Button>
                    )}
                </div>

                <div className="border-t border-border w-full shrink-0" aria-hidden />

                <div className="rounded-xl border border-border bg-card shadow-sm">
                    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <SearchFilter
                            value={searchInput}
                            onChange={setSearchInput}
                            placeholder="Buscar por tipo, estado o ruta…"
                            className="w-full [&_input]:bg-white [&_input]:border-border [&_input]:text-foreground sm:max-w-xs"
                        />
                        <Select
                            value={filters.status === '' ? '_' : filters.status}
                            onValueChange={(v) => applyFilters({ status: v === '_' ? '' : v, page: 1 })}
                        >
                            <SelectTrigger className="w-full border-border bg-background sm:w-[160px]">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos los estados</SelectItem>
                                <SelectItem value="started">En proceso</SelectItem>
                                <SelectItem value="completed">Completado</SelectItem>
                                <SelectItem value="failed">Fallido</SelectItem>
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
                            data={backupLogs.data}
                            keyExtractor={(row) => row.id}
                            sortBy={filters.sort_by}
                            sortOrder={filters.sort_order}
                            onSort={(by, order) => applyFilters({ sort_by: by, sort_order: order })}
                            emptyMessage="No hay backups en el historial."
                            variant="default"
                        />
                    </div>

                    <div className="md:hidden">
                        {backupLogs.data.length === 0 ? (
                            <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                                No hay backups en el historial.
                            </p>
                        ) : (
                            <ul className="flex flex-col gap-3 p-3 sm:p-4">
                                {backupLogs.data.map((row) => (
                                    <li key={row.id}>
                                        <article className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_0_rgba(15,23,42,0.05)] dark:shadow-none">
                                            <div className="space-y-2 p-4">
                                                <p className="text-base font-medium text-foreground">
                                                    Backup {row.type}
                                                </p>
                                                <dl className="grid grid-cols-1 gap-1.5 text-sm">
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Inicio:</dt>
                                                        <dd className="text-foreground">{formatDateTime(row.started_at)}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Estado:</dt>
                                                        <dd>{statusBadge(row.status)}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Ruta:</dt>
                                                        <dd className="max-w-full break-all font-mono text-[11px] text-foreground">
                                                            {row.path_or_ref ?? '—'}
                                                        </dd>
                                                    </div>
                                                </dl>
                                                {canVerify && row.status === 'completed' && !row.verified_at && (
                                                    <div className="pt-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            className="w-full cursor-pointer border-emerald-400/70 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/35"
                                                            disabled={verifyingId === row.id}
                                                            onClick={() => verifyBackup(row.id)}
                                                        >
                                                            {verifyingId === row.id ? 'Verificando…' : 'Marcar verificado'}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </article>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="border-t border-border px-3 py-2">
                        <TablePagination
                            from={backupLogs.from}
                            to={backupLogs.to}
                            total={backupLogs.total}
                            perPage={backupLogs.per_page}
                            currentPage={backupLogs.current_page}
                            lastPage={backupLogs.last_page}
                            links={backupLogs.links}
                            buildPageUrl={(page) => buildUrl({ ...filters, page })}
                            onPerPageChange={(perPage) => applyFilters({ per_page: perPage, page: 1 })}
                        />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
