import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, ChevronDown, ChevronRight, MapPin, Search, Shield } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getDisplayLabelForPermission, getModuleForPermission, MODULE_ORDER } from '@/config/permission-tree';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toast } from '@/components/toast';
import type { ToastMessage } from '@/components/toast';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { cn } from '@/lib/utils';

type OfficeRow = { id: string; name: string; code: string | null };

type ZonalWithOffices = { id: string; name: string; code: string; offices: OfficeRow[] };

type PermissionItem = { id: number; name: string };

type ConfigureProps = {
    user: { id: string; name: string; last_name: string; usuario: string };
    zonals: ZonalWithOffices[];
    userOfficeIds: string[];
    permissions: PermissionItem[];
    rolePermissionIds: number[];
    directPermissionIds: number[];
    revokedPermissionIds: number[];
};

type TabId = 'offices' | 'permissions';

export default function UserConfigure({
    user,
    zonals,
    userOfficeIds,
    permissions,
    rolePermissionIds,
    directPermissionIds,
    revokedPermissionIds,
}: ConfigureProps) {
    const [tab, setTab] = useState<TabId>('offices');
    const [selectedOfficeIds, setSelectedOfficeIds] = useState<Set<string>>(() => new Set(userOfficeIds));
    const [zonalSearch, setZonalSearch] = useState('');
    const [openZonalIds, setOpenZonalIds] = useState<Set<string>>(() => new Set(zonals.map((z) => z.id)));
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

    const allOfficeIds = useMemo(() => zonals.flatMap((z) => z.offices.map((o) => o.id)), [zonals]);

    useEffect(() => {
        setSelectedOfficeIds(new Set(userOfficeIds));
    }, [user.id, userOfficeIds]);

    useEffect(() => {
        setOpenZonalIds(new Set(zonals.map((z) => z.id)));
    }, [user.id]);

    useEffect(() => {
        setSelectedPermissionIds(new Set(effectivePermissionIds));
    }, [user.id, effectivePermissionIds]);

    const toggleOffice = useCallback((officeId: string, checked: boolean) => {
        setSelectedOfficeIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(officeId);
            else next.delete(officeId);
            return next;
        });
    }, []);

    const handleSelectAllOffices = useCallback((checked: boolean) => {
        if (checked) {
            setSelectedOfficeIds(new Set(allOfficeIds));
        } else {
            setSelectedOfficeIds(new Set());
        }
    }, [allOfficeIds]);

    const toggleZonalOffices = useCallback((z: ZonalWithOffices, checked: boolean) => {
        setSelectedOfficeIds((prev) => {
            const next = new Set(prev);
            const ids = z.offices.map((o) => o.id);
            if (checked) {
                ids.forEach((id) => next.add(id));
            } else {
                ids.forEach((id) => next.delete(id));
            }
            return next;
        });
    }, []);

    const handleSaveOffices = useCallback(() => {
        setSaving(true);
        router.put(`/admin/users/${user.id}/offices`, {
            office_ids: Array.from(selectedOfficeIds),
        }, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
        });
    }, [user.id, selectedOfficeIds]);

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

    const zonalSearchNorm = zonalSearch.trim().toLowerCase();

    const filteredZonals = useMemo(() => {
        if (!zonalSearchNorm) return zonals;
        return zonals.filter((z) => {
            const zMatch =
                z.name.toLowerCase().includes(zonalSearchNorm) ||
                (z.code && z.code.toLowerCase().includes(zonalSearchNorm));
            const oMatch = z.offices.some(
                (o) =>
                    o.name.toLowerCase().includes(zonalSearchNorm) ||
                    (o.code && o.code.toLowerCase().includes(zonalSearchNorm))
            );
            return zMatch || oMatch;
        });
    }, [zonals, zonalSearchNorm]);

    const officeSelectionStats = useMemo(() => {
        const total = allOfficeIds.length;
        const selected = selectedOfficeIds.size;
        const zonalsWithPick = zonals.filter((z) =>
            z.offices.some((o) => selectedOfficeIds.has(o.id))
        ).length;
        const pct = total > 0 ? Math.round((selected / total) * 100) : 0;
        return { total, selected, zonalsWithPick, pct };
    }, [allOfficeIds.length, selectedOfficeIds, zonals]);

    const setZonalOpen = useCallback((zonalId: string, open: boolean) => {
        setOpenZonalIds((prev) => {
            const next = new Set(prev);
            if (open) next.add(zonalId);
            else next.delete(zonalId);
            return next;
        });
    }, []);

    const expandAllZonals = useCallback(() => {
        setOpenZonalIds(new Set(zonals.map((z) => z.id)));
    }, [zonals]);

    const collapseAllZonals = useCallback(() => {
        setOpenZonalIds(new Set());
    }, []);

    const expandZonalsWithSelection = useCallback(() => {
        const next = new Set<string>();
        zonals.forEach((z) => {
            if (z.offices.some((o) => selectedOfficeIds.has(o.id))) {
                next.add(z.id);
            }
        });
        setOpenZonalIds(next.size > 0 ? next : new Set(zonals.map((z) => z.id)));
    }, [zonals, selectedOfficeIds]);

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

            <div className="flex min-h-[50vh] flex-col gap-4 p-3 md:p-5">
                {/* Header con paleta navy */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                                onClick={() => setTab('offices')}
                                className={cn(
                                    'cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all sm:text-sm',
                                    tab === 'offices'
                                        ? 'bg-inv-primary text-white shadow-md ring-2 ring-inv-surface/30 dark:ring-inv-section/50'
                                        : 'text-muted-foreground hover:bg-inv-primary/10 hover:text-inv-primary dark:hover:bg-inv-section/30'
                                )}
                            >
                                <MapPin className="size-3.5 shrink-0 sm:size-4" />
                                Oficinas
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

                    <div className="relative p-3 md:p-4">
                        {tab === 'offices' && (
                            <div className="space-y-3">
                                <p className="text-muted-foreground max-w-3xl text-[11px] leading-snug sm:text-xs">
                                    Alcance geográfico: el usuario solo verá datos de las oficinas marcadas (por zonal).
                                </p>

                                {/* Resumen + progreso */}
                                <div
                                    className="overflow-hidden rounded-xl border shadow-sm"
                                    style={{
                                        borderColor: 'rgb(68 119 148 / 0.22)',
                                        backgroundColor: 'rgb(68 119 148 / 0.05)',
                                    }}
                                >
                                    <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                        <div className="min-w-0 space-y-1.5">
                                            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                                                <span className="text-foreground text-xl font-semibold tabular-nums tracking-tight">
                                                    {officeSelectionStats.selected}
                                                </span>
                                                <span className="text-muted-foreground text-xs">
                                                    / {officeSelectionStats.total} oficinas
                                                </span>
                                            </div>
                                            <p className="text-muted-foreground text-[10px] leading-tight sm:text-[11px]">
                                                {officeSelectionStats.zonalsWithPick === 0
                                                    ? 'Ningún zonal con selección.'
                                                    : `${officeSelectionStats.zonalsWithPick} zonal${officeSelectionStats.zonalsWithPick === 1 ? '' : 'es'} con al menos una oficina`}
                                            </p>
                                            <div
                                                className="h-1.5 max-w-md overflow-hidden rounded-full bg-background/80 dark:bg-background/40"
                                                role="progressbar"
                                                aria-valuenow={officeSelectionStats.selected}
                                                aria-valuemin={0}
                                                aria-valuemax={officeSelectionStats.total}
                                                aria-label="Progreso de selección de oficinas"
                                            >
                                                <div
                                                    className="h-full rounded-full bg-inv-primary transition-[width] duration-300 ease-out"
                                                    style={{ width: `${officeSelectionStats.pct}%` }}
                                                />
                                            </div>
                                        </div>
                                        <label
                                            className={cn(
                                                'flex cursor-pointer items-center gap-2 self-stretch rounded-lg border px-2.5 py-2 sm:max-w-[min(100%,14rem)] sm:self-center sm:shrink-0',
                                                'border-inv-primary/25 bg-background/70 hover:bg-background dark:bg-card/60'
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                id="offices-select-all"
                                                checked={
                                                    allOfficeIds.length > 0 &&
                                                    selectedOfficeIds.size === allOfficeIds.length
                                                }
                                                onChange={(e) => handleSelectAllOffices(e.target.checked)}
                                                className="cursor-pointer rounded border-border size-3.5 accent-inv-primary"
                                            />
                                            <span className="text-foreground text-[11px] font-medium leading-tight sm:text-xs">
                                                Todas las oficinas del sistema
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* Búsqueda y vista */}
                                <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
                                    <div className="relative w-full sm:max-w-xs">
                                        <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            value={zonalSearch}
                                            onChange={(e) => setZonalSearch(e.target.value)}
                                            placeholder="Buscar zonal u oficina…"
                                            className="h-8 border-border bg-background py-1 pl-8 text-xs shadow-sm"
                                            aria-label="Filtrar zonales y oficinas"
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-7 cursor-pointer px-2 text-[11px]"
                                            onClick={expandAllZonals}
                                        >
                                            Expandir todo
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-7 cursor-pointer px-2 text-[11px]"
                                            onClick={collapseAllZonals}
                                        >
                                            Contraer todo
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            className="h-7 cursor-pointer px-2 text-[11px]"
                                            onClick={expandZonalsWithSelection}
                                        >
                                            Solo con selección
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {filteredZonals.map((z) => {
                                        const officeIds = z.offices.map((o) => o.id);
                                        const selectedInZonal = officeIds.filter((id) => selectedOfficeIds.has(id)).length;
                                        const allSelected =
                                            officeIds.length > 0 && selectedInZonal === officeIds.length;
                                        const someSelected = selectedInZonal > 0 && !allSelected;
                                        const isOpen = openZonalIds.has(z.id);

                                        return (
                                            <Collapsible
                                                key={z.id}
                                                open={isOpen}
                                                onOpenChange={(open) => setZonalOpen(z.id, open)}
                                                className="overflow-hidden rounded-xl border border-border/80 bg-card/90 shadow-sm dark:bg-card/40"
                                            >
                                                <div className="flex border-b border-border/50 bg-muted/25 dark:bg-muted/10">
                                                    <CollapsibleTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className="flex min-h-0 flex-1 cursor-pointer items-center gap-1.5 px-2 py-2 text-left outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inv-primary/40 focus-visible:ring-offset-1 dark:hover:bg-muted/20 sm:gap-2 sm:px-2.5"
                                                            aria-expanded={isOpen}
                                                        >
                                                            <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border/50 bg-background text-muted-foreground sm:size-7">
                                                                {isOpen ? (
                                                                    <ChevronDown className="size-3.5" />
                                                                ) : (
                                                                    <ChevronRight className="size-3.5" />
                                                                )}
                                                            </span>
                                                            <span className="min-w-0 flex-1">
                                                                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0">
                                                                    <span className="text-foreground text-xs font-semibold tracking-tight sm:text-[13px]">
                                                                        {z.name}
                                                                    </span>
                                                                    {z.code ? (
                                                                        <span className="rounded bg-inv-primary/10 px-1 py-px font-mono text-[10px] font-medium text-inv-primary sm:text-[11px]">
                                                                            {z.code}
                                                                        </span>
                                                                    ) : null}
                                                                </span>
                                                                <span className="block text-muted-foreground text-[10px] leading-tight sm:text-[11px]">
                                                                    {z.offices.length === 0
                                                                        ? 'Sin oficinas'
                                                                        : `${selectedInZonal}/${z.offices.length} seleccionadas`}
                                                                </span>
                                                            </span>
                                                        </button>
                                                    </CollapsibleTrigger>
                                                    {z.offices.length > 0 && (
                                                        <div className="flex items-center gap-1.5 border-l border-border/40 px-1.5 py-1 sm:px-2">
                                                            <input
                                                                type="checkbox"
                                                                id={`zonal-offices-${z.id}`}
                                                                checked={allSelected}
                                                                ref={(el) => {
                                                                    if (el) el.indeterminate = someSelected;
                                                                }}
                                                                onChange={(e) => toggleZonalOffices(z, e.target.checked)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="cursor-pointer rounded border-border size-3.5 accent-inv-primary"
                                                                aria-label={`Seleccionar todas las oficinas de ${z.name}`}
                                                            />
                                                            <Label
                                                                htmlFor={`zonal-offices-${z.id}`}
                                                                title="Marcar todas las oficinas de este zonal"
                                                                className="hidden cursor-pointer text-[10px] font-medium leading-none text-foreground sm:block sm:max-w-24 lg:max-w-none"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                Todas
                                                            </Label>
                                                        </div>
                                                    )}
                                                </div>

                                                <CollapsibleContent>
                                                    {z.offices.length === 0 ? (
                                                        <p className="px-3 py-4 text-center text-muted-foreground text-xs">
                                                            No hay oficinas registradas en este zonal.
                                                        </p>
                                                    ) : (
                                                        <ul className="grid grid-cols-1 gap-1 p-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                                            {z.offices.map((o) => {
                                                                const on = selectedOfficeIds.has(o.id);
                                                                return (
                                                                    <li key={o.id}>
                                                                        <label
                                                                            className={cn(
                                                                                'flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-all',
                                                                                on
                                                                                    ? 'border-inv-primary/40 bg-inv-primary/10 ring-1 ring-inv-primary/15'
                                                                                    : 'border-border/60 bg-background/70 hover:border-inv-primary/30 hover:bg-inv-primary/4 dark:bg-background/30'
                                                                            )}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={on}
                                                                                onChange={(e) =>
                                                                                    toggleOffice(o.id, e.target.checked)
                                                                                }
                                                                                className="size-3.5 shrink-0 cursor-pointer rounded border-border accent-inv-primary"
                                                                            />
                                                                            <span className="min-w-0 flex-1 leading-tight">
                                                                                <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0">
                                                                                    {o.code ? (
                                                                                        <span className="shrink-0 font-mono text-[10px] font-semibold text-inv-primary sm:text-[11px]">
                                                                                            {o.code}
                                                                                        </span>
                                                                                    ) : null}
                                                                                    <span className="min-w-0 truncate text-[11px] font-medium text-foreground sm:text-xs">
                                                                                        {o.name}
                                                                                    </span>
                                                                                </span>
                                                                            </span>
                                                                        </label>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    )}
                                                </CollapsibleContent>
                                            </Collapsible>
                                        );
                                    })}
                                </div>
                                {zonals.length === 0 && (
                                    <p
                                        className="rounded-xl border border-dashed py-8 text-center text-muted-foreground text-xs sm:text-sm"
                                        style={{
                                            borderColor: 'rgb(68 119 148 / 0.2)',
                                            backgroundColor: 'rgb(68 119 148 / 0.03)',
                                        }}
                                    >
                                        No hay zonales registrados.
                                    </p>
                                )}
                                {zonals.length > 0 && filteredZonals.length === 0 && (
                                    <p className="rounded-lg border border-dashed border-border/70 py-6 text-center text-muted-foreground text-sm">
                                        No hay resultados para «{zonalSearch.trim()}». Prueba con otro nombre o código.
                                    </p>
                                )}
                                <div className="sticky bottom-0 z-10 -mx-3 flex justify-end border-t border-border/60 bg-linear-to-t from-background via-background/95 to-transparent px-3 pt-2 pb-0 md:-mx-4 md:px-4">
                                    <Button
                                        type="button"
                                        disabled={saving}
                                        onClick={handleSaveOffices}
                                        className="cursor-pointer rounded-lg bg-inv-primary px-4 py-2 text-xs font-semibold text-white shadow-md transition-all hover:bg-inv-surface hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                                        style={{ boxShadow: '0 2px 6px rgb(68 119 148 / 0.3)' }}
                                    >
                                        {saving ? 'Guardando…' : 'Guardar oficinas'}
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
                                        Seleccionar todos los permisos
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
                                                            <span className="truncate">{getDisplayLabelForPermission(p.name)}</span>
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
