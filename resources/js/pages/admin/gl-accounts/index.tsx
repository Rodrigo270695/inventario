import { Head, router, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    FolderOpen,
    LayoutGrid,
    Pencil,
    Plus,
    Trash2,
    XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GlAccountFormModal } from '@/components/catalog/gl-account-form-modal';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';
import { Toast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, GlAccount } from '@/types';
import type { ToastMessage } from '@/components/toast';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Cuentas contables', href: '/admin/gl-accounts' },
];

type GlAccountOption = { id: string; code: string; name: string };

/** Cuenta con profundidad en el árbol (0 = raíz, 1 = hijo, …). */
export type GlAccountWithDepth = GlAccount & { depth: number };

type GlAccountsIndexProps = {
    glAccounts: { data: GlAccountWithDepth[] };
    glAccountsForSelect: GlAccountOption[];
};

/** Tipo de cuenta (valor en BD) → etiqueta en español para mostrar en lista. */
const ACCOUNT_TYPE_LABELS: Record<string, string> = {
    asset: 'Activo',
    depreciation: 'Depreciación',
    expense: 'Gasto',
    income: 'Ingreso',
    other: 'Otro',
};

/** Estilos de texto por nivel (paleta). Tamaño responsive: un punto más que antes. */
function depthTextClass(depth: number): string {
    const size = 'text-sm sm:text-base lg:text-sm';
    if (depth === 0) return `font-semibold text-inv-primary ${size}`;
    if (depth === 1) return `font-medium text-inv-surface dark:text-inv-surface ${size}`;
    return `font-normal text-inv-section dark:text-inv-section ${size}`;
}

export default function GlAccountsIndex({
    glAccounts,
    glAccountsForSelect,
}: GlAccountsIndexProps) {
    const { data } = glAccounts;
    const [deleteAccount, setDeleteAccount] = useState<GlAccount | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [formAccount, setFormAccount] = useState<GlAccount | null>(null);
    const [initialParentId, setInitialParentId] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const { props } = usePage();
    const auth = (props as { auth?: { permissions?: string[] } }).auth;
    const permissions = auth?.permissions ?? [];
    const canCreate = permissions.includes('gl_accounts.create');
    const canUpdate = permissions.includes('gl_accounts.update');
    const canDelete = permissions.includes('gl_accounts.delete');
    const flash = props.flash as { toast?: ToastMessage } | undefined;
    const [toastQueue, setToastQueue] = useState<
        Array<ToastMessage & { id: number }>
    >([]);
    const lastFlashToastRef = useRef<ToastMessage | null>(null);

    useEffect(() => {
        const t = flash?.toast;
        if (!t) return;
        if (t === lastFlashToastRef.current) return;
        lastFlashToastRef.current = t;
        const id = Date.now();
        const item = { ...t, id };
        queueMicrotask(() => setToastQueue((q) => [...q, item]));
    }, [flash?.toast]);

    const removeToast = useCallback((id: number) => {
        setToastQueue((q) => q.filter((item) => item.id !== id));
    }, []);

    const handleDeleteConfirm = () => {
        if (!deleteAccount) return;
        setDeleting(true);
        router.delete(`/admin/gl-accounts/${deleteAccount.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteAccount(null);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cuentas contables" />

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

                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1.5">
                        <h1 className="relative inline-block pb-1.5 text-2xl font-semibold tracking-tight text-foreground">
                            Cuentas contables
                            <span className="absolute bottom-0 left-0 h-0.5 w-10 rounded-full bg-inv-primary" />
                        </h1>
                        <p className="max-w-xl text-muted-foreground text-sm leading-relaxed">
                            Plan de cuentas (PCGE). Catálogo de cuentas para activos y depreciación.
                        </p>
                    </div>
                    {canCreate && (
                        <button
                            type="button"
                            onClick={() => {
                                setFormAccount(null);
                                setInitialParentId(null);
                                setFormOpen(true);
                            }}
                            className="inline-flex w-fit cursor-pointer items-center gap-2 self-start rounded-lg bg-inv-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-inv-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2"
                            aria-label="Nueva cuenta contable"
                        >
                            <Plus className="size-4" />
                            <span>Nueva cuenta contable</span>
                        </button>
                    )}
                </div>

                {data.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/30 px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-gray-700 shadow-sm dark:bg-white/10 dark:text-gray-300">
                            <FolderOpen className="size-3.5 shrink-0 text-inv-primary" />
                            <span>Total</span>
                            <span className="tabular-nums font-semibold">{data.length}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="size-3.5 shrink-0" />
                            <span>Activas</span>
                            <span className="tabular-nums font-semibold">{data.filter((r) => r.is_active).length}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                            <XCircle className="size-3.5 shrink-0" />
                            <span>Inactivas</span>
                            <span className="tabular-nums font-semibold">{data.filter((r) => !r.is_active).length}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-3 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                            <LayoutGrid className="size-3.5 shrink-0" />
                            <span>En pantalla</span>
                            <span className="tabular-nums font-semibold">{data.length}</span>
                        </span>
                    </div>
                )}

                <div className="border-t border-border/80 w-full shrink-0" aria-hidden />

                {data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/10 py-16 px-6 text-center">
                        <FolderOpen className="size-12 text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground text-sm font-medium">
                            No hay cuentas contables
                        </p>
                        <p className="mt-1 max-w-sm text-muted-foreground/80 text-sm">
                            Crea la primera con el botón «Nueva cuenta contable».
                        </p>
                    </div>
                ) : (
                    <ul className="rounded-lg border border-border/60 bg-muted/5 py-1 shadow-sm">
                        {data.map((row) => {
                            const depth = row.depth ?? 0;
                            const isInactive = !row.is_active;
                            const textClass = depthTextClass(depth);
                            const isSelected = selectedId === row.id;
                            return (
                                <li
                                    key={row.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setSelectedId((id) => (id === row.id ? null : row.id))}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setSelectedId((id) => (id === row.id ? null : row.id));
                                        }
                                    }}
                                    className={`flex flex-wrap items-center gap-x-3 gap-y-2 border-l-2 py-2.5 px-4 transition-all duration-150 cursor-pointer ${
                                        isSelected
                                            ? 'border-l-inv-primary bg-inv-primary/5 dark:bg-inv-primary/10'
                                            : 'border-l-transparent hover:bg-muted/25'
                                    }`}
                                    style={{ paddingLeft: 16 + depth * 24 }}
                                >
                                    <div className="min-w-0 flex-1">
                                        <span
                                            className={`tabular-nums tracking-tight ${textClass} ${isInactive ? 'text-red-600 dark:text-red-400' : ''}`}
                                        >
                                            <span className="text-muted-foreground/90">{row.code}</span>
                                            <span className="ml-2">{row.name}</span>
                                            {row.account_type ? (
                                                <span className="ml-1.5 text-muted-foreground font-normal">
                                                    ({ACCOUNT_TYPE_LABELS[row.account_type] ?? row.account_type})
                                                </span>
                                            ) : null}
                                        </span>
                                    </div>
                                    {isSelected && (
                                        <div
                                            className="flex items-center gap-0.5 shrink-0 rounded-md bg-background/80 p-0.5 shadow-sm dark:bg-background/40"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {canCreate && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="cursor-pointer size-8 text-inv-primary hover:bg-inv-primary/15 dark:hover:bg-inv-primary/20"
                                                    aria-label={`Añadir subcuenta de ${row.name}`}
                                                    title="Añadir subcuenta"
                                                    onClick={() => {
                                                        setFormAccount(null);
                                                        setInitialParentId(row.id);
                                                        setFormOpen(true);
                                                    }}
                                                >
                                                    <Plus className="size-4" />
                                                </Button>
                                            )}
                                            {canUpdate && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="cursor-pointer size-8 text-inv-primary hover:bg-inv-primary/15 dark:hover:bg-inv-primary/20"
                                                    aria-label={`Editar ${row.name}`}
                                                    onClick={() => {
                                                        setFormAccount(row);
                                                        setInitialParentId(null);
                                                        setFormOpen(true);
                                                    }}
                                                >
                                                    <Pencil className="size-4" />
                                                </Button>
                                            )}
                                            {canDelete && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="cursor-pointer size-8 text-rose-600 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-900/30"
                                                    aria-label={`Eliminar ${row.name}`}
                                                    onClick={() => setDeleteAccount(row)}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <GlAccountFormModal
                open={formOpen}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) {
                        setFormAccount(null);
                        setInitialParentId(null);
                    }
                }}
                glAccount={formAccount}
                glAccountsForSelect={glAccountsForSelect}
                initialParentId={initialParentId}
            />

            <DeleteConfirmModal
                open={!!deleteAccount}
                onOpenChange={(open) => !open && setDeleteAccount(null)}
                title="Eliminar cuenta contable"
                description={
                    deleteAccount
                        ? `¿Eliminar la cuenta «${deleteAccount.code} — ${deleteAccount.name}»? Esta acción no se puede deshacer.`
                        : undefined
                }
                onConfirm={handleDeleteConfirm}
                loading={deleting}
            />
        </AppLayout>
    );
}
