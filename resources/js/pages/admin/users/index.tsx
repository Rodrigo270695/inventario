import { Head, router, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    LayoutGrid,
    Pencil,
    Plus,
    RotateCcw,
    Settings,
    Trash2,
    Users,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataTableColumn, SortOrder } from '@/components/data-table';
import { DataTable } from '@/components/data-table';
import { AppModal } from '@/components/app-modal';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';
import { UserFormModal } from '@/components/admin/user-form-modal';
import { SearchFilter } from '@/components/search-filter';
import { TablePagination } from '@/components/table-pagination';
import { Toast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { AdminUser, BreadcrumbItem, PaginationMeta } from '@/types';
import type { ToastMessage } from '@/components/toast';
import { Link } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Usuarios', href: '/admin/users' },
];

const SEARCH_DEBOUNCE_MS = 400;

type Filters = {
    q: string;
    is_active: string;
    trashed: string;
    role_id: string;
    sort_by: string;
    sort_order: SortOrder;
    per_page: number;
};

type Stats = {
    total: number;
    total_active: number;
    total_trashed?: number;
};

type RoleOption = { id: number; name: string };

type UsersIndexProps = {
    users: {
        data: AdminUser[];
        links: PaginationMeta['links'];
        from: number | null;
        to: number | null;
        total: number;
        current_page: number;
        last_page: number;
        per_page: number;
    };
    roles: RoleOption[];
    filters: Filters;
    stats?: Stats;
};

function buildUrl(params: Partial<Filters> & { page?: number }) {
    const search = new URLSearchParams();
    if (params.q !== undefined) search.set('q', params.q);
    if (params.is_active !== undefined) search.set('is_active', params.is_active);
    if (params.trashed !== undefined) search.set('trashed', params.trashed);
    if (params.role_id !== undefined) search.set('role_id', params.role_id);
    if (params.sort_by !== undefined) search.set('sort_by', params.sort_by);
    if (params.sort_order !== undefined)
        search.set('sort_order', params.sort_order);
    if (params.per_page !== undefined)
        search.set('per_page', String(params.per_page));
    if (params.page !== undefined) search.set('page', String(params.page));
    return `/admin/users?${search.toString()}`;
}

export default function UsersIndex({
    users,
    roles,
    filters,
    stats,
}: UsersIndexProps) {
    const { data, links, from, to, total, current_page, last_page } = users;
    const totalActive = stats?.total_active ?? 0;
    const totalTrashed = stats?.total_trashed ?? 0;
    const viewingTrashed = filters.trashed === '1';
    const [searchInput, setSearchInput] = useState(() => {
        const q = filters.q;
        if (q == null || q === 'null') return '';
        return String(q);
    });
    const { props } = usePage();
    const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [formUser, setFormUser] = useState<AdminUser | null>(null);

    type RestoreUserFlash = { id: string; name: string; last_name: string; usuario: string };
    const [restoreUserFlash, setRestoreUserFlash] = useState<RestoreUserFlash | null>(() => {
        const ru = (props as { flash?: { restore_user?: RestoreUserFlash } }).flash?.restore_user;
        return ru ?? null;
    });
    const [restoring, setRestoring] = useState(false);
    const [restoreUser, setRestoreUser] = useState<AdminUser | null>(null);
    const auth = (props as { auth?: { permissions?: string[] } }).auth;
    const permissions = auth?.permissions ?? [];
    const canCreate = permissions.includes('users.create');
    const canUpdate = permissions.includes('users.update');
    const canDelete = permissions.includes('users.delete');
    const canRestore = permissions.includes('users.restore');
    const canConfigure = permissions.includes('users.configure');
    const flash = props.flash as { toast?: ToastMessage } | undefined;
    const [toastQueue, setToastQueue] = useState<
        Array<ToastMessage & { id: number }>
    >([]);
    const lastFlashToastRef = useRef<ToastMessage | null>(null);

    useEffect(() => {
        const ru = (props as { flash?: { restore_user?: RestoreUserFlash } }).flash?.restore_user;
        if (ru) setRestoreUserFlash(ru);
    }, [(props as { flash?: { restore_user?: RestoreUserFlash } }).flash?.restore_user?.id]);

    useEffect(() => {
        const t = flash?.toast;
        if (!t) return;
        if (t === lastFlashToastRef.current) return;
        lastFlashToastRef.current = t;
        const id = Date.now();
        const item = { ...t, id };
        queueMicrotask(() => {
            setToastQueue((q) => [...q, item]);
        });
    }, [flash?.toast]);

    const removeToast = useCallback((id: number) => {
        setToastQueue((q) => q.filter((item) => item.id !== id));
    }, []);

    const applyFilters = useCallback(
        (next: Partial<Filters> & { page?: number }) => {
            router.get(buildUrl({ ...filters, ...next }), {}, {
                preserveState: true,
            });
        },
        [filters]
    );

    useEffect(() => {
        const t = setTimeout(() => {
            const effectiveQ =
                filters.q == null || filters.q === 'null'
                    ? ''
                    : String(filters.q);
            if (searchInput !== effectiveQ) {
                applyFilters({ q: searchInput || '', page: 1 });
            }
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [searchInput, filters.q, applyFilters]);

    const handleSort = useCallback(
        (key: string) => {
            const order =
                filters.sort_by === key && filters.sort_order === 'asc'
                    ? 'desc'
                    : 'asc';
            applyFilters({
                sort_by: key,
                sort_order: order as SortOrder,
            });
        },
        [filters.sort_by, filters.sort_order, applyFilters]
    );

    const handlePerPage = (perPage: number) => {
        applyFilters({ per_page: perPage, page: 1 });
    };

    const handleDeleteConfirm = () => {
        if (!deleteUser) return;
        setDeleting(true);
        router.delete(`/admin/users/${deleteUser.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteUser(null);
            },
        });
    };

    const handleRestoreFromFlash = () => {
        if (!restoreUserFlash) return;
        setRestoring(true);
        router.post(`/admin/users/restore/${restoreUserFlash.id}`, {}, {
            preserveScroll: true,
            onFinish: () => {
                setRestoring(false);
                setRestoreUserFlash(null);
            },
        });
    };

    const handleRestoreConfirm = () => {
        if (!restoreUser) return;
        setRestoring(true);
        router.post(`/admin/users/restore/${restoreUser.id}`, {}, {
            preserveScroll: true,
            onFinish: () => {
                setRestoring(false);
                setRestoreUser(null);
            },
        });
    };

    const documentLabel: Record<string, string> = {
        dni: 'DNI',
        ce: 'CE',
        passport: 'Pasaporte',
        ruc: 'RUC',
    };

    const formatDocumentLine = (row: AdminUser) => {
        const type = documentLabel[row.document_type] ?? row.document_type ?? '';
        const num = row.document_number?.trim() ?? '';
        return [type, num].filter(Boolean).join(' ') || '—';
    };

    const formatShortDate = (iso?: string) =>
        iso
            ? new Date(iso).toLocaleDateString('es', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
              })
            : '—';

    const formatPersonName = (
        p: { name?: string; last_name?: string } | null | undefined
    ) => (p ? [p.name, p.last_name].filter(Boolean).join(' ') : '—');

    const renderCreatedByCell = (row: AdminUser) => (
        <div className="flex flex-col gap-0.5">
            <span className="font-medium text-foreground">{formatPersonName(row.creator)}</span>
            <span className="text-muted-foreground text-[11px] tabular-nums leading-tight">
                {formatShortDate(row.created_at)}
            </span>
        </div>
    );

    const renderUpdatedByCell = (row: AdminUser) => (
        <div className="flex flex-col gap-0.5">
            <span className="font-medium text-foreground">{formatPersonName(row.updater)}</span>
            <span className="text-muted-foreground text-[11px] tabular-nums leading-tight">
                {formatShortDate(row.updated_at)}
            </span>
        </div>
    );

    const renderZonalCell = (row: AdminUser) => {
        const s = row.zonal_summary;
        if (!s?.first) {
            return (
                <span className="inline-flex rounded-full border border-dashed border-muted-foreground/35 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                    —
                </span>
            );
        }
        return (
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-inv-primary/35 bg-inv-primary/10 px-2.5 py-1 text-[11px] font-semibold text-inv-primary shadow-sm dark:border-inv-primary/45 dark:bg-inv-primary/15 dark:text-inv-primary dark:shadow-inv-primary/10">
                <span className="min-w-0 truncate">{s.first}</span>
                {s.rest_count > 0 ? (
                    <span className="shrink-0 rounded-md bg-inv-primary/25 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-inv-primary ring-1 ring-inv-primary/20 dark:bg-inv-primary/35 dark:ring-inv-primary/30">
                        +{s.rest_count}
                    </span>
                ) : null}
            </span>
        );
    };

    const columns: DataTableColumn<AdminUser>[] = [
        {
            key: 'name',
            label: 'Nombre completo',
            sortable: true,
            className: 'text-foreground text-xs',
            render: (row) => (
                <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-foreground">
                        {[row.name, row.last_name].filter(Boolean).join(' ')}
                    </span>
                    <span className="text-muted-foreground text-[11px] tabular-nums leading-tight">
                        {formatDocumentLine(row)}
                    </span>
                </div>
            ),
        },
        {
            key: 'usuario',
            label: 'Usuario',
            sortable: true,
            className: 'text-foreground text-xs',
            render: (row) => (
                <div className="flex flex-col gap-0.5">
                    <span className="tabular-nums">{row.usuario}</span>
                    <span className="text-muted-foreground text-[11px] leading-tight">
                        {row.roles?.length ? row.roles.map((r) => r.name).join(', ') : '—'}
                    </span>
                </div>
            ),
        },
        {
            key: 'zonals',
            label: 'Zonales',
            sortable: false,
            className: 'text-foreground text-xs max-w-[240px]',
            render: (row) => renderZonalCell(row),
        },
        {
            key: 'is_active',
            label: 'Activo',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => {
                if (viewingTrashed) {
                    return (
                        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                            Eliminado
                        </span>
                    );
                }
                return (
                    <span
                        className={
                            row.is_active
                                ? 'inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                                : 'inline-flex rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                        }
                    >
                        {row.is_active ? 'Sí' : 'No'}
                    </span>
                );
            },
        },
        {
            key: 'created_at',
            label: 'Creado por',
            sortable: true,
            className: 'text-foreground text-xs min-w-[120px]',
            render: (row) => renderCreatedByCell(row),
        },
        {
            key: 'updated_at',
            label: 'Actualizado por',
            sortable: true,
            className: 'text-foreground text-xs min-w-[120px]',
            render: (row) => renderUpdatedByCell(row),
        },
        {
            key: 'actions',
            label: '',
            className: 'w-0 text-right',
            render: (row) => {
                const isSuperadmin = row.usuario?.toLowerCase() === 'superadmin';
                if (viewingTrashed) {
                    return (
                        <div className="flex justify-end gap-1">
                            {canRestore && !isSuperadmin && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="cursor-pointer shrink-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                    aria-label={`Restaurar ${row.usuario}`}
                                    onClick={() => setRestoreUser(row)}
                                >
                                    <RotateCcw className="size-4 shrink-0 mr-1" />
                                    <span>Restaurar</span>
                                </Button>
                            )}
                        </div>
                    );
                }
                return (
                    <div className="flex justify-end gap-1">
                        {canConfigure && !isSuperadmin && (
                            <Link
                                href={`/admin/users/${row.id}/configure`}
                                className="inline-flex shrink-0 items-center justify-center rounded-md size-8 text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                aria-label={`Configurar ${row.usuario}`}
                            >
                                <Settings className="size-4" />
                            </Link>
                        )}
                        {canUpdate && !isSuperadmin && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer shrink-0 size-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
                                aria-label={`Editar ${row.usuario}`}
                                onClick={() => {
                                    setFormUser(row);
                                    setFormOpen(true);
                                }}
                            >
                                <Pencil className="size-4" />
                            </Button>
                        )}
                        {canDelete && !isSuperadmin && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer shrink-0 size-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400/80 dark:hover:bg-rose-900/20"
                                aria-label={`Eliminar ${row.usuario}`}
                                onClick={() => setDeleteUser(row)}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        )}
                    </div>
                );
            },
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Usuarios" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                {toastQueue.length > 0 && (
                    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
                        {toastQueue.map((t) => (
                            <Toast
                                key={t.id}
                                toast={t}
                                onDismiss={() => removeToast(t.id)}
                                duration={3000}
                            />
                        ))}
                    </div>
                )}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-3">
                        <div>
                            <h1 className="relative inline-block pb-1 text-xl font-semibold text-foreground">
                                Usuarios
                                <span className="absolute bottom-0 left-0 h-0.5 w-8 rounded-full bg-inv-primary" />
                            </h1>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            Gestión de usuarios del sistema.
                        </p>
                        <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-blue-500/20 dark:text-gray-400">
                                <Users className="size-3 shrink-0 text-blue-600 dark:text-blue-400" />
                                <span>Total</span>
                                <span className="font-semibold">{total}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-emerald-500/20 dark:text-gray-400">
                                <CheckCircle2 className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <span>Activos</span>
                                <span className="font-semibold">{totalActive}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-amber-500/20 dark:text-gray-400">
                                <span>Página</span>
                                <span className="font-semibold">
                                    {current_page}/{last_page}
                                </span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-slate-500/20 dark:text-gray-400">
                                <LayoutGrid className="size-3 shrink-0 text-slate-600 dark:text-slate-400" />
                                <span>En pantalla</span>
                                <span className="font-semibold">{data.length}</span>
                            </span>
                            {!viewingTrashed && totalTrashed > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-amber-500/20 dark:text-gray-400">
                                    <RotateCcw className="size-3 shrink-0 text-amber-600 dark:text-amber-400" />
                                    <span>Eliminados</span>
                                    <span className="font-semibold">{totalTrashed}</span>
                                </span>
                            )}
                        </div>
                    </div>
                    {canCreate && !viewingTrashed && (
                        <button
                            type="button"
                            onClick={() => {
                                setFormUser(null);
                                setFormOpen(true);
                            }}
                            className="inline-flex w-fit cursor-pointer items-center gap-2 self-start rounded-md bg-inv-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-inv-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2"
                            aria-label="Nuevo usuario"
                        >
                            <Plus className="size-4" />
                            <span>Nuevo usuario</span>
                        </button>
                    )}
                </div>

                <div
                    className="border-t border-border w-full shrink-0"
                    aria-hidden
                />

                <div className="rounded-xl border border-border bg-card shadow-sm">
                    <div className="flex flex-wrap items-center gap-3 p-3">
                        <SearchFilter
                            value={searchInput}
                            onChange={setSearchInput}
                            placeholder="Buscar por nombre, usuario, email o documento…"
                            className="max-w-xs [&_input]:bg-white [&_input]:border-border [&_input]:text-foreground"
                        />
                        <Select
                            value={(filters.is_active ?? '') === '' ? '_' : filters.is_active}
                            onValueChange={(v) =>
                                applyFilters({
                                    is_active: v === '_' ? '' : v,
                                    page: 1,
                                })
                            }
                        >
                            <SelectTrigger className="w-[140px] border-border bg-background">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos</SelectItem>
                                <SelectItem value="1">Activos</SelectItem>
                                <SelectItem value="0">Inactivos</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={filters.trashed === '1' ? '1' : '0'}
                            onValueChange={(v) =>
                                applyFilters({
                                    trashed: v,
                                    page: 1,
                                })
                            }
                        >
                            <SelectTrigger className="w-[160px] border-border bg-background">
                                <SelectValue placeholder="Lista" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0">Activos</SelectItem>
                                <SelectItem value="1">Eliminados</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={
                                (filters.role_id ?? '') === '' ? '_' : String(filters.role_id)
                            }
                            onValueChange={(v) =>
                                applyFilters({
                                    role_id: v === '_' ? '' : v,
                                    page: 1,
                                })
                            }
                        >
                            <SelectTrigger className="min-w-[200px] max-w-[280px] border-border bg-background">
                                <SelectValue placeholder="Rol" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Todos los roles</SelectItem>
                                {roles.map((r) => (
                                    <SelectItem key={r.id} value={String(r.id)}>
                                        {r.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="hidden md:block">
                        <DataTable
                            columns={columns}
                            data={data}
                            keyExtractor={(r) => r.id}
                            sortBy={filters.sort_by}
                            sortOrder={filters.sort_order}
                            onSort={handleSort}
                            emptyMessage={
                                viewingTrashed
                                    ? 'No hay usuarios eliminados.'
                                    : 'No hay usuarios. Crea uno con «Nuevo usuario».'
                            }
                            variant="default"
                        />
                    </div>
                    <div className="md:hidden">
                        {data.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8 px-4 text-sm">
                                {viewingTrashed
                                    ? 'No hay usuarios eliminados.'
                                    : 'No hay usuarios. Crea uno con «Nuevo usuario».'}
                            </p>
                        ) : (
                            <ul className="flex flex-col gap-3 p-3 sm:p-4">
                                {data.map((row) => (
                                    <li key={row.id}>
                                        <article className="rounded-lg border border-border bg-card shadow-[0_1px_2px_0_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                                            <div className="space-y-2 p-4">
                                                <div className="space-y-0.5">
                                                    <p className="font-medium text-foreground text-base">
                                                        {row.name} {row.last_name}
                                                    </p>
                                                    <p className="text-muted-foreground text-xs tabular-nums">
                                                        {formatDocumentLine(row)}
                                                    </p>
                                                </div>
                                                <dl className="grid grid-cols-1 gap-1.5 text-sm">
                                                    {viewingTrashed && (
                                                        <div className="flex flex-wrap gap-x-2">
                                                            <dt className="text-muted-foreground shrink-0">Estado:</dt>
                                                            <dd className="text-amber-600 dark:text-amber-400 font-medium">Eliminado</dd>
                                                        </div>
                                                    )}
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Usuario:</dt>
                                                        <dd className="text-foreground">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span>{row.usuario}</span>
                                                                <span className="text-muted-foreground text-xs leading-tight">
                                                                    {row.roles?.length
                                                                        ? row.roles.map((r) => r.name).join(', ')
                                                                        : '—'}
                                                                </span>
                                                            </div>
                                                        </dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Zonales:</dt>
                                                        <dd className="text-foreground">{renderZonalCell(row)}</dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Creado por:</dt>
                                                        <dd className="text-foreground w-full min-w-0">
                                                            {renderCreatedByCell(row)}
                                                        </dd>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-2">
                                                        <dt className="text-muted-foreground shrink-0">Actualizado por:</dt>
                                                        <dd className="text-foreground w-full min-w-0">
                                                            {renderUpdatedByCell(row)}
                                                        </dd>
                                                    </div>
                                                </dl>
                                            </div>
                                            <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-muted/30 px-4 py-3">
                                                {viewingTrashed ? (
                                                    canRestore &&
                                                    row.usuario?.toLowerCase() !== 'superadmin' && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="cursor-pointer shrink-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                                            aria-label={`Restaurar ${row.usuario}`}
                                                            onClick={() => setRestoreUser(row)}
                                                        >
                                                            <RotateCcw className="size-3.5 shrink-0 mr-1" />
                                                            <span>Restaurar</span>
                                                        </Button>
                                                    )
                                                ) : (
                                                    <>
                                                        {canConfigure && row.usuario?.toLowerCase() !== 'superadmin' && (
                                                            <Link
                                                                href={`/admin/users/${row.id}/configure`}
                                                                className="inline-flex shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                                                            >
                                                                <Settings className="size-3.5 shrink-0 mr-1" />
                                                                <span>Configurar</span>
                                                            </Link>
                                                        )}
                                                        {canUpdate && row.usuario?.toLowerCase() !== 'superadmin' && (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="cursor-pointer shrink-0 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30"
                                                                aria-label={`Editar ${row.usuario}`}
                                                                onClick={() => {
                                                                    setFormUser(row);
                                                                    setFormOpen(true);
                                                                }}
                                                            >
                                                                <Pencil className="size-3.5 shrink-0 mr-1" />
                                                                <span>Editar</span>
                                                            </Button>
                                                        )}
                                                        {canDelete && row.usuario?.toLowerCase() !== 'superadmin' && (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="cursor-pointer shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/20"
                                                                aria-label={`Eliminar ${row.usuario}`}
                                                                onClick={() => setDeleteUser(row)}
                                                            >
                                                                <Trash2 className="size-3.5 shrink-0 mr-1" />
                                                                <span>Eliminar</span>
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </article>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="px-3 py-3">
                        <TablePagination
                            from={from}
                            to={to}
                            total={total}
                            perPage={filters.per_page}
                            currentPage={current_page}
                            lastPage={last_page}
                            links={links}
                            buildPageUrl={(page) =>
                                buildUrl({ ...filters, page })
                            }
                            onPerPageChange={handlePerPage}
                            perPageOptions={[5, 10, 15, 25, 50, 100]}
                        />
                    </div>
                </div>
            </div>

            <UserFormModal
                open={formOpen}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) setFormUser(null);
                }}
                user={formUser}
                roles={roles}
            />

            <DeleteConfirmModal
                open={!!deleteUser}
                onOpenChange={(open) => !open && setDeleteUser(null)}
                title="Eliminar usuario"
                description={
                    deleteUser
                        ? `¿Eliminar al usuario «${deleteUser.usuario}»? Esta acción no se puede deshacer.`
                        : undefined
                }
                onConfirm={handleDeleteConfirm}
                loading={deleting}
            />

            <DeleteConfirmModal
                open={!!restoreUser}
                onOpenChange={(open) => !open && setRestoreUser(null)}
                title="Restaurar usuario"
                description={
                    restoreUser
                        ? `¿Restaurar al usuario «${[restoreUser.name, restoreUser.last_name].filter(Boolean).join(' ')}» (${restoreUser.usuario})? Volverá a aparecer en la lista de activos.`
                        : undefined
                }
                confirmLabel="Restaurar"
                cancelLabel="Cancelar"
                onConfirm={handleRestoreConfirm}
                loading={restoring}
            />

            <AppModal
                open={!!restoreUserFlash}
                onOpenChange={(open) => !open && setRestoreUserFlash(null)}
                title="Usuario eliminado con este documento"
                contentClassName="space-y-4"
            >
                {restoreUserFlash && (
                    <>
                        <p className="text-muted-foreground text-sm">
                            Ya existe un usuario eliminado con el mismo tipo y número de documento:{' '}
                            <strong>{[restoreUserFlash.name, restoreUserFlash.last_name].filter(Boolean).join(' ')}</strong>
                            {' '}({restoreUserFlash.usuario}). ¿Deseas restaurarlo?
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={restoring}
                                onClick={() => setRestoreUserFlash(null)}
                            >
                                Cancelar
                            </Button>
                            {canRestore && (
                                <Button
                                    type="button"
                                    disabled={restoring}
                                    onClick={handleRestoreFromFlash}
                                    className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                    {restoring ? 'Restaurando…' : 'Restaurar'}
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </AppModal>
        </AppLayout>
    );
}
