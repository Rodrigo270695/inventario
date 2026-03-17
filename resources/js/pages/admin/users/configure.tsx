import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, MapPin, Shield } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getModuleForPermission, MODULE_ORDER } from '@/config/permission-tree';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Toast } from '@/components/toast';
import type { ToastMessage } from '@/components/toast';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { cn } from '@/lib/utils';

type Zonal = { id: string; name: string; code: string };

type PermissionItem = { id: number; name: string };

type ConfigureProps = {
    user: { id: string; name: string; last_name: string; usuario: string };
    zonals: Zonal[];
    userZonalIds: string[];
    permissions: PermissionItem[];
    rolePermissionIds: number[];
    directPermissionIds: number[];
    revokedPermissionIds: number[];
};

type TabId = 'zonals' | 'permissions';

export default function UserConfigure({
    user,
    zonals,
    userZonalIds,
    permissions,
    rolePermissionIds,
    directPermissionIds,
    revokedPermissionIds,
}: ConfigureProps) {
    const [tab, setTab] = useState<TabId>('zonals');
    const [selectedZonalIds, setSelectedZonalIds] = useState<Set<string>>(() => new Set(userZonalIds));
    const effectivePermissionIds = useMemo(() => {
        const set = new Set<number>([...rolePermissionIds, ...directPermissionIds]);
        revokedPermissionIds.forEach((id) => set.delete(id));
        return set;
    }, [rolePermissionIds, directPermissionIds, revokedPermissionIds]);

    const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<number>>(() => new Set(effectivePermissionIds));
    const [saving, setSaving] = useState(false);

    const { props } = usePage();
    const flash = (props.flash as { toast?: ToastMessage } | undefined);
    const [toastQueue, setToastQueue] = useState<Array<ToastMessage & { id: number }>>([]);
    const lastFlashToastRef = useRef<ToastMessage | null>(null);

    useEffect(() => {
        const t = flash?.toast;
        if (!t) return;
        if (t === lastFlashToastRef.current) return;
        lastFlashToastRef.current = t;
        const id = Date.now();
        const payload = { ...t, id };
        queueMicrotask(() => setToastQueue((q) => [...q, payload]));
    }, [flash?.toast]);

    const dismissToast = useCallback((id: number) => {
        setToastQueue((q) => q.filter((item) => item.id !== id));
    }, []);

    const permissionsByModule = useMemo(() => {
        const map = new Map<string, PermissionItem[]>();
        for (const p of permissions) {
            const moduleLabel = getModuleForPermission(p.name);
            if (!map.has(moduleLabel)) map.set(moduleLabel, []);
            map.get(moduleLabel)!.push(p);
        }
        const orderSet = new Set(MODULE_ORDER);
        return Array.from(map.entries()).sort(([a], [b]) => {
            const ia = orderSet.has(a) ? MODULE_ORDER.indexOf(a) : MODULE_ORDER.length;
            const ib = orderSet.has(b) ? MODULE_ORDER.indexOf(b) : MODULE_ORDER.length;
            if (ia !== ib) return ia - ib;
            return a.localeCompare(b);
        });
    }, [permissions]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Usuarios', href: '/admin/users' },
        { title: `Configurar: ${[user.name, user.last_name].filter(Boolean).join(' ')}`, href: '#' },
    ];

    useEffect(() => {
        setSelectedZonalIds(new Set(userZonalIds));
    }, [user.id, userZonalIds]);

    useEffect(() => {
        setSelectedPermissionIds(new Set(effectivePermissionIds));
    }, [user.id, effectivePermissionIds]);

    const toggleZonal = useCallback((zonalId: string, checked: boolean) => {
        setSelectedZonalIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(zonalId);
            else next.delete(zonalId);
            return next;
        });
    }, []);

    const handleSelectAllZonals = useCallback((checked: boolean) => {
        if (checked) {
            setSelectedZonalIds(new Set(zonals.map((z) => z.id)));
        } else {
            setSelectedZonalIds(new Set());
        }
    }, [zonals]);

    const handleSaveZonals = useCallback(() => {
        setSaving(true);
        router.put(`/admin/users/${user.id}/zonals`, {
            zonal_ids: Array.from(selectedZonalIds),
        }, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
        });
    }, [user.id, selectedZonalIds]);

    const togglePermission = useCallback((permissionId: number, checked: boolean) => {
        setSelectedPermissionIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(permissionId);
            else next.delete(permissionId);
            return next;
        });
    }, []);

    const handleSelectAllPermissions = useCallback((checked: boolean) => {
        if (checked) {
            setSelectedPermissionIds(new Set(permissions.map((p) => p.id)));
        } else {
            setSelectedPermissionIds(new Set());
        }
    }, [permissions]);

    const handleSavePermissions = useCallback(() => {
        setSaving(true);
        router.put(`/admin/users/${user.id}/permissions`, {
            permission_ids: Array.from(selectedPermissionIds),
        }, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
        });
    }, [user.id, selectedPermissionIds]);

    const userName = [user.name, user.last_name].filter(Boolean).join(' ');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Configurar: ${userName}`} />

            {toastQueue.length > 0 && (
                <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
                    {toastQueue.map((toast) => (
                        <Toast
                            key={toast.id}
                            toast={toast}
                            onDismiss={() => dismissToast(toast.id)}
                            duration={3000}
                        />
                    ))}
                </div>
            )}

            <div className="min-h-[60vh] flex flex-col gap-6 p-4 md:p-6">
                {/* Header con paleta navy */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/users"
                            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-inv-surface/20 bg-inv-primary/5 text-inv-primary shadow-sm transition-all hover:border-inv-primary/40 hover:bg-inv-primary/10 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2 dark:border-inv-surface/30 dark:bg-inv-section/20 dark:text-inv-primary dark:hover:bg-inv-section/30"
                            aria-label="Volver a usuarios"
                        >
                            <ArrowLeft className="size-5" />
                        </Link>
                        <div className="border-l-2 border-inv-primary/30 pl-4">
                            <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                                Configurar usuario
                            </h1>
                            <p className="mt-0.5 text-muted-foreground text-xs md:text-sm">
                                <span className="font-medium text-foreground/90">{userName}</span>
                                <span className="text-muted-foreground/80"> · </span>
                                <span className="text-inv-primary font-medium">{user.usuario}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Contenedor principal sin card (zonales sobre el fondo de la página) */}
                <div className="relative overflow-hidden rounded-2xl">
                    {/* Gradiente decorativo: inv-primary → inv-surface */}
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

                    {/* Tabs */}
                    <div className="relative border-b border-inv-primary/50 bg-inv-primary/25 dark:bg-inv-section/70 dark:border-inv-surface/60">
                        <nav className="flex gap-0.5 p-2" aria-label="Tabs">
                            <button
                                type="button"
                                onClick={() => setTab('zonals')}
                                className={cn(
                                    'cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all sm:text-sm',
                                    tab === 'zonals'
                                        ? 'bg-inv-primary text-white shadow-md ring-2 ring-inv-surface/30 dark:ring-inv-section/50'
                                        : 'text-muted-foreground hover:bg-inv-primary/10 hover:text-inv-primary dark:hover:bg-inv-section/30'
                                )}
                            >
                                <MapPin className="size-3.5 shrink-0 sm:size-4" />
                                Zonales
                            </button>
                            <button
                                type="button"
                                onClick={() => setTab('permissions')}
                                className={cn(
                                    'cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all sm:text-sm',
                                    tab === 'permissions'
                                        ? 'bg-inv-primary text-white shadow-md ring-2 ring-inv-surface/30 dark:ring-inv-section/50'
                                        : 'text-muted-foreground hover:bg-inv-primary/10 hover:text-inv-primary dark:hover:bg-inv-section/30'
                                )}
                            >
                                <Shield className="size-3.5 shrink-0 sm:size-4" />
                                Permisos
                            </button>
                        </nav>
                    </div>

                    <div className="relative p-4 md:p-6">
                        {tab === 'zonals' && (
                            <div className="space-y-5">
                                <p className="text-muted-foreground text-xs leading-relaxed sm:text-sm">
                                    Marca los zonales a los que este usuario tendrá acceso.
                                </p>
                                <div
                                    className="flex items-center gap-2 rounded-xl border px-3 py-2.5"
                                    style={{
                                        borderColor: 'rgb(68 119 148 / 0.25)',
                                        backgroundColor: 'rgb(68 119 148 / 0.06)',
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        id="zonals-select-all"
                                        checked={zonals.length > 0 && selectedZonalIds.size === zonals.length}
                                        onChange={(e) => handleSelectAllZonals(e.target.checked)}
                                        className="cursor-pointer rounded border-border size-3.5 accent-inv-primary sm:size-4"
                                    />
                                    <Label htmlFor="zonals-select-all" className="cursor-pointer text-xs font-medium text-foreground sm:text-sm">
                                        Seleccionar todos
                                    </Label>
                                </div>
                                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {zonals.map((z) => (
                                        <li key={z.id}>
                                            <label
                                                className={cn(
                                                    'flex cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 py-2 text-xs transition-all sm:py-2.5 sm:text-sm',
                                                    selectedZonalIds.has(z.id)
                                                        ? 'border-inv-primary/50 shadow-sm ring-1 ring-inv-primary/25'
                                                        : 'border-border/70 hover:border-inv-surface/30 hover:bg-inv-primary/5 dark:hover:bg-inv-section/10'
                                                )}
                                                style={
                                                    selectedZonalIds.has(z.id)
                                                        ? { backgroundColor: 'rgb(68 119 148 / 0.08)' }
                                                        : undefined
                                                }
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedZonalIds.has(z.id)}
                                                    onChange={(e) => toggleZonal(z.id, e.target.checked)}
                                                    className="cursor-pointer rounded border-border size-3.5 shrink-0 accent-inv-primary sm:size-4"
                                                />
                                                <span className="min-w-0 truncate font-medium text-foreground">{z.name}</span>
                                                {z.code && (
                                                    <span className="shrink-0 text-muted-foreground text-[10px] sm:text-xs">({z.code})</span>
                                                )}
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                                {zonals.length === 0 && (
                                    <p
                                        className="rounded-xl border border-dashed py-8 text-center text-muted-foreground text-xs sm:text-sm"
                                        style={{ borderColor: 'rgb(68 119 148 / 0.2)', backgroundColor: 'rgb(68 119 148 / 0.03)' }}
                                    >
                                        No hay zonales registrados.
                                    </p>
                                )}
                                <div className="flex justify-end border-t border-border/60 pt-5">
                                    <Button
                                        type="button"
                                        disabled={saving}
                                        onClick={handleSaveZonals}
                                        className="cursor-pointer rounded-xl bg-inv-primary px-5 py-2.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-inv-surface hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed sm:text-sm"
                                        style={{ boxShadow: '0 2px 8px rgb(68 119 148 / 0.35)' }}
                                    >
                                        {saving ? 'Guardando…' : 'Guardar'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {tab === 'permissions' && (
                            <div className="space-y-3">
                                <p className="text-muted-foreground text-xs">
                                    Marca los permisos que tendrá este usuario (solo afecta a este usuario, no al rol).
                                </p>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="permissions-select-all"
                                        checked={permissions.length > 0 && selectedPermissionIds.size === permissions.length}
                                        onChange={(e) => handleSelectAllPermissions(e.target.checked)}
                                        className="cursor-pointer rounded border-border size-3.5 accent-inv-primary"
                                    />
                                    <Label htmlFor="permissions-select-all" className="cursor-pointer text-xs text-foreground">
                                        Seleccionar todos
                                    </Label>
                                </div>
                                <div className="space-y-3">
                                    {permissionsByModule.map(([moduleLabel, perms]) => (
                                        <div key={moduleLabel}>
                                            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                {moduleLabel}
                                            </h3>
                                            <ul className="columns-2 gap-x-4 space-y-0.5 sm:columns-3 md:columns-4 lg:columns-5">
                                                {perms.map((p) => (
                                                    <li key={p.id} className="break-inside-avoid">
                                                        <label className="flex cursor-pointer items-center gap-1.5 py-0.5 text-xs text-foreground hover:text-inv-primary">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedPermissionIds.has(p.id)}
                                                                onChange={(e) => togglePermission(p.id, e.target.checked)}
                                                                className="cursor-pointer rounded border-border size-3 accent-inv-primary"
                                                            />
                                                            <span className="truncate">{p.name}</span>
                                                        </label>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                                {permissions.length === 0 && (
                                    <p className="py-4 text-center text-muted-foreground text-xs">
                                        No hay permisos registrados.
                                    </p>
                                )}
                                <div className="flex justify-end border-t border-border/60 pt-3">
                                    <Button
                                        type="button"
                                        disabled={saving}
                                        onClick={handleSavePermissions}
                                        className="cursor-pointer rounded-xl bg-inv-primary px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-inv-surface disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{ boxShadow: '0 2px 8px rgb(68 119 148 / 0.35)' }}
                                    >
                                        {saving ? 'Guardando…' : 'Guardar permisos'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
