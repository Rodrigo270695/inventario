import { Head, router, usePage } from '@inertiajs/react';
import { FileText, Key, KeyRound, LayoutGrid, Pencil, Plus, Shield, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppModal } from '@/components/app-modal';
import type { DataTableColumn, SortOrder } from '@/components/data-table';
import { DataTable } from '@/components/data-table';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';
import { PermissionsModal } from '@/components/permissions-modal';
import { RoleForm } from '@/components/role-form';
import { SearchFilter } from '@/components/search-filter';
import { TablePagination } from '@/components/table-pagination';
import { Toast } from '@/components/toast';
import type { ToastMessage } from '@/components/toast';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, PaginationMeta, Role } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Roles', href: '/admin/roles' },
];

const SEARCH_DEBOUNCE_MS = 400;

type Filters = {
    q: string;
    sort_by: string;
    sort_order: SortOrder;
    per_page: number;
};

type Stats = {
    total_roles: number;
    total_permissions: number;
    roles_without_permissions: number;
    last_updated: string | null;
};

type RolesIndexProps = {
    roles: {
        data: Role[];
        links: PaginationMeta['links'];
        from: number | null;
        to: number | null;
        total: number;
        current_page: number;
        last_page: number;
        per_page: number;
    };
    filters: Filters;
    stats?: Stats;
};

function buildUrl(params: Partial<Filters> & { page?: number }) {
    const search = new URLSearchParams();
    if (params.q !== undefined) search.set('q', params.q);
    if (params.sort_by !== undefined) search.set('sort_by', params.sort_by);
    if (params.sort_order !== undefined) search.set('sort_order', params.sort_order);
    if (params.per_page !== undefined) search.set('per_page', String(params.per_page));
    if (params.page !== undefined) search.set('page', String(params.page));
    return `/admin/roles?${search.toString()}`;
}

export default function RolesIndex({ roles, filters, stats }: RolesIndexProps) {
    const { data, links, from, to, total, current_page, last_page } = roles;
    const totalPermissions = stats?.total_permissions ?? 0;
    const withoutPermissions = stats?.roles_without_permissions ?? 0;
    const [searchInput, setSearchInput] = useState(() => {
        const q = filters.q;
        if (q == null || q === 'null') return '';
        return String(q);
    });
    const [deleteRole, setDeleteRole] = useState<Role | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [formRole, setFormRole] = useState<Role | null>(null);
    const [permissionsOpen, setPermissionsOpen] = useState(false);
    const [permissionsRole, setPermissionsRole] = useState<Role | null>(null);

    const { props } = usePage();
    const auth = (props as { auth?: { permissions?: string[] } }).auth;
    const permissions = auth?.permissions ?? [];
    const canViewPermissions = permissions.includes('permissions.view');
    const canCreateRole = permissions.includes('roles.create');
    const canUpdateRole = permissions.includes('roles.update');
    const canDeleteRole = permissions.includes('roles.delete');
    const flash = props.flash as { toast?: ToastMessage } | undefined;
    const [toastQueue, setToastQueue] = useState<Array<ToastMessage & { id: number }>>([]);
    const lastFlashToastRef = useRef<ToastMessage | null>(null);

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
            router.get(buildUrl({ ...filters, ...next }), {}, { preserveState: true });
        },
        [filters]
    );

    // Búsqueda al escribir (debounce)
    const effectiveQ = filters.q == null || filters.q === 'null' ? '' : String(filters.q);
    useEffect(() => {
        const t = setTimeout(() => {
            if (searchInput !== effectiveQ) {
                applyFilters({ q: searchInput || '', page: 1 });
            }
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [searchInput, effectiveQ, applyFilters]);

    const handleSort = useCallback(
        (key: string) => {
            const order =
                filters.sort_by === key && filters.sort_order === 'asc' ? 'desc' : 'asc';
            applyFilters({ sort_by: key, sort_order: order as SortOrder });
        },
        [filters.sort_by, filters.sort_order, applyFilters]
    );

    const handlePerPage = (perPage: number) => {
        applyFilters({ per_page: perPage, page: 1 });
    };

    const handleDeleteConfirm = () => {
        if (!deleteRole) return;
        setDeleting(true);
        router.delete(`/admin/roles/${deleteRole.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteRole(null);
            },
        });
    };

    const columns: DataTableColumn<Role>[] = [
        {
            key: 'name',
            label: 'Nombre',
            sortable: true,
            render: (row) => (
                <span className="font-medium text-foreground">{row.name}</span>
            ),
        },
        {
            key: 'permissions_count',
            label: 'Permisos',
            sortable: false,
            className: 'text-foreground text-xs',
            render: (row) => (
                <span className="tabular-nums">{row.permissions_count ?? 0}</span>
            ),
        },
        {
            key: 'created_at',
            label: 'Creado',
            sortable: true,
            className: 'text-foreground text-xs',
            render: (row) =>
                row.created_at
                    ? new Date(row.created_at).toLocaleDateString('es', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                      })
                    : '—',
        },
        {
            key: 'actions',
            label: '',
            className: 'w-0 text-right',
            render: (row) => {
                // Temporalmente permitir editar/eliminar/permisos en superadmin para validar. Luego: isSuperadmin = row.name === 'superadmin'
                const isSuperadmin = false;
                return (
                    <div className="flex justify-end gap-1">
                        {canViewPermissions && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer shrink-0 size-8 text-violet-600 hover:bg-violet-50 hover:text-violet-700 dark:text-violet-400 dark:hover:bg-violet-950/30"
                                aria-label={`Permisos de ${row.name}`}
                                onClick={() => {
                                    setPermissionsRole(row);
                                    setPermissionsOpen(true);
                                }}
                            >
                                <Key className="size-4" />
                            </Button>
                        )}
                        {canUpdateRole && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer shrink-0 size-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
                                aria-label={`Editar ${row.name}`}
                                onClick={() => {
                                    setFormRole(row);
                                    setFormOpen(true);
                                }}
                            >
                                <Pencil className="size-4" />
                            </Button>
                        )}
                        {canDeleteRole && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer shrink-0 size-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400/80 dark:hover:bg-rose-900/20"
                                aria-label={`Eliminar ${row.name}`}
                                onClick={() => setDeleteRole(row)}
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
            <Head title="Roles" />

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
                                Roles
                                <span className="absolute bottom-0 left-0 h-0.5 w-8 rounded-full bg-inv-primary" />
                            </h1>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            Gestión de roles y permisos del sistema.
                        </p>
                        <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-blue-500/20 dark:text-gray-400">
                                <Shield className="size-3 shrink-0 text-blue-600 dark:text-blue-400" />
                                <span>Roles</span>
                                <span className="font-semibold">{total}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-violet-500/20 dark:text-gray-400">
                                <Key className="size-3 shrink-0 text-violet-600 dark:text-violet-400" />
                                <span>Tipos de permiso</span>
                                <span className="font-semibold">{totalPermissions}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-amber-500/20 dark:text-gray-400">
                                <FileText className="size-3 shrink-0 text-amber-600 dark:text-amber-400" />
                                <span>Página</span>
                                <span className="font-semibold">{current_page}/{last_page}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-emerald-500/20 dark:text-gray-400">
                                <LayoutGrid className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <span>En pantalla</span>
                                <span className="font-semibold">{data.length}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-slate-500/20 dark:text-gray-400">
                                <KeyRound className="size-3 shrink-0 text-slate-600 dark:text-slate-400" />
                                <span>Sin permisos</span>
                                <span className="font-semibold">{withoutPermissions}</span>
                            </span>
                        </div>
                    </div>
                    {canCreateRole && (
                        <button
                            type="button"
                            onClick={() => {
                                setFormRole(null);
                                setFormOpen(true);
                            }}
                            className="inline-flex w-fit cursor-pointer items-center gap-2 self-start rounded-md bg-inv-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-inv-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2"
                            aria-label="Nuevo rol"
                        >
                            <Plus className="size-4" />
                            <span>Nuevo rol</span>
                        </button>
                    )}
                </div>

                <div className="border-t border-border w-full shrink-0" aria-hidden />

                <div className="rounded-xl border border-border bg-card shadow-sm">
                    <div className="p-3">
                        <SearchFilter
                            value={searchInput}
                            onChange={setSearchInput}
                            placeholder="Buscar por nombre…"
                            className="max-w-xs [&_input]:bg-white [&_input]:border-border [&_input]:text-foreground"
                        />
                    </div>
                    <div className="hidden md:block">
                        <DataTable
                            columns={columns}
                            data={data}
                            keyExtractor={(r) => r.id}
                            sortBy={filters.sort_by}
                            sortOrder={filters.sort_order}
                            onSort={handleSort}
                            emptyMessage="No hay roles. Crea uno con «Nuevo rol»."
                            variant="default"
                        />
                    </div>
                    <div className="md:hidden">
                        {data.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8 px-4 text-sm">
                                No hay roles. Crea uno con «Nuevo rol».
                            </p>
                        ) : (
                            <ul className="flex flex-col gap-3 p-3 sm:p-4">
                                {data.map((row) => (
                                        <li key={row.id}>
                                            <article
                                                className="rounded-lg border border-border bg-card shadow-[0_1px_2px_0_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden"
                                            >
                                        <div className="p-4">
                                            <p className="font-medium text-foreground text-base">
                                                {row.name}
                                            </p>
                                            <p className="text-muted-foreground mt-1 text-sm">
                                                {(row.permissions_count ?? 0)} permisos
                                                {row.created_at && (
                                                    <> · {new Date(row.created_at).toLocaleDateString('es', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}</>
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-muted/30 px-4 py-3">
                                            {canViewPermissions && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="cursor-pointer shrink-0 border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-400 dark:hover:bg-violet-950/30"
                                                    aria-label={`Permisos de ${row.name}`}
                                                    onClick={() => {
                                                        setPermissionsRole(row);
                                                        setPermissionsOpen(true);
                                                    }}
                                                >
                                                    <Key className="size-3.5 shrink-0 mr-1" />
                                                    <span>Permisos</span>
                                                </Button>
                                            )}
                                            {canUpdateRole && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="cursor-pointer shrink-0 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30"
                                                    aria-label={`Editar ${row.name}`}
                                                    onClick={() => {
                                                        setFormRole(row);
                                                        setFormOpen(true);
                                                    }}
                                                >
                                                    <Pencil className="size-3.5 shrink-0 mr-1" />
                                                    <span>Editar</span>
                                                </Button>
                                            )}
                                            {canDeleteRole && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="cursor-pointer shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                                    aria-label={`Eliminar ${row.name}`}
                                                    onClick={() => setDeleteRole(row)}
                                                >
                                                    <Trash2 className="size-3.5 shrink-0 mr-1" />
                                                    <span>Eliminar</span>
                                                </Button>
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
                            buildPageUrl={(page) => buildUrl({ ...filters, page })}
                            onPerPageChange={handlePerPage}
                            perPageOptions={[5, 10, 15, 25]}
                        />
                    </div>
                </div>
            </div>

            <AppModal
                open={formOpen}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) setFormRole(null);
                }}
                title={formRole ? 'Editar rol' : 'Crear rol'}
                contentClassName="space-y-4"
            >
                <RoleForm
                    role={formRole}
                    onClose={() => {
                        setFormOpen(false);
                        setFormRole(null);
                    }}
                />
            </AppModal>

            <DeleteConfirmModal
                open={!!deleteRole}
                onOpenChange={(open) => !open && setDeleteRole(null)}
                title="Eliminar rol"
                description={
                    deleteRole
                        ? `¿Eliminar el rol «${deleteRole.name}»? Esta acción no se puede deshacer.`
                        : undefined
                }
                onConfirm={handleDeleteConfirm}
                loading={deleting}
            />

            <PermissionsModal
                open={permissionsOpen}
                onOpenChange={(open) => {
                    setPermissionsOpen(open);
                    if (!open) setPermissionsRole(null);
                }}
                role={permissionsRole}
                onSuccess={() => {
                    setToastQueue((q) => [...q, { id: Date.now(), type: 'success', message: 'Permisos actualizados correctamente.' }]);
                }}
            />
        </AppLayout>
    );
}
