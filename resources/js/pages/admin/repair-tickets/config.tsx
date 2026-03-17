import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, FileText, History, Info, Receipt, Wrench } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Toast } from '@/components/toast';
import type { ToastMessage } from '@/components/toast';
import { cn } from '@/lib/utils';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import {
    RepairTicketConfigCostsTab,
    RepairTicketConfigDocumentsTab,
    RepairTicketConfigGeneralTab,
    RepairTicketConfigHistoryTab,
    RepairTicketConfigPartsTab,
} from './config/index';
import type {
    AssetOption,
    ComponentOption,
    RepairShopOption,
    RepairTicketConfigTicket,
    RepairTicketCost,
    RepairTicketDocument,
    RepairTicketPart,
    RepairTicketStatusLog,
    SupplierOption,
    TabId,
    UserOption,
} from './config/index';

type Props = {
    repairTicket: RepairTicketConfigTicket;
    parts: RepairTicketPart[];
    costs: RepairTicketCost[];
    documents: RepairTicketDocument[];
    statusLogs: RepairTicketStatusLog[];
    assetsForSelect: AssetOption[];
    componentsForSelect: ComponentOption[];
    repairShopsForSelect: RepairShopOption[];
    usersForSelect: UserOption[];
    suppliersForSelect: SupplierOption[];
    initialTab?: TabId;
};

export default function RepairTicketConfigPage({
    repairTicket,
    parts,
    costs,
    documents,
    statusLogs,
    assetsForSelect,
    componentsForSelect,
    repairShopsForSelect,
    usersForSelect,
    suppliersForSelect,
    initialTab = 'general',
}: Props) {
    const [tab, setTab] = useState<TabId>(initialTab);
    const [toastQueue, setToastQueue] = useState<Array<ToastMessage & { id: number }>>([]);
    const lastFlashToastRef = useRef<ToastMessage | null>(null);
    const { props } = usePage();
    const flash = props.flash as { toast?: ToastMessage } | undefined;
    const permissions = ((props as { auth?: { permissions?: string[] } }).auth?.permissions) ?? [];
    const baseCanEdit = permissions.includes('repair_tickets.update') || permissions.includes('repair_tickets.configure');
    const canEdit = baseCanEdit && !['completed', 'cancelled', 'rejected'].includes(repairTicket.status);

    useEffect(() => {
        const toast = flash?.toast;
        if (!toast || toast === lastFlashToastRef.current) return;
        lastFlashToastRef.current = toast;
        const id = Date.now();
        queueMicrotask(() => setToastQueue((current) => [...current, { ...toast, id }]));
    }, [flash?.toast]);

    const dismissToast = (id: number) => {
        setToastQueue((current) => current.filter((item) => item.id !== id));
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Mantenimiento', href: '#' },
        { title: 'Reparaciones', href: '/admin/repair-tickets' },
        { title: `Configurar: ${repairTicket.code}`, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Configurar ticket ${repairTicket.code}`} />

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
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/repair-tickets"
                            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-inv-surface/20 bg-inv-primary/5 text-inv-primary shadow-sm transition-all hover:border-inv-primary/40 hover:bg-inv-primary/10 hover:shadow-md"
                            aria-label="Volver a reparaciones"
                        >
                            <ArrowLeft className="size-5" />
                        </Link>
                        <div className="border-l-2 border-inv-primary/30 pl-4">
                            <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                                Configurar ticket
                            </h1>
                            <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
                                <span className="font-medium text-foreground/90">{repairTicket.code}</span>
                                <span className="text-muted-foreground/80"> · </span>
                                <span className="text-muted-foreground">{repairTicket.issue_description}</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl">
                    <div
                        className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
                        style={{ background: 'linear-gradient(135deg, #447794 0%, #2d5b75 40%, #123249 100%)' }}
                        aria-hidden
                    />
                    <div
                        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-30"
                        style={{ background: 'radial-gradient(circle, #447794 0%, transparent 70%)' }}
                        aria-hidden
                    />

                    <div className="relative border-b border-inv-primary/50 bg-inv-primary/25 dark:bg-inv-section/70 dark:border-inv-surface/60">
                        <nav
                            className="flex gap-0.5 p-2 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none]"
                            aria-label="Tabs"
                            style={{ scrollbarWidth: 'none' }}
                        >
                            {[
                                { id: 'general', label: 'Info gral.', icon: Info },
                                { id: 'parts', label: 'Repuestos', icon: Wrench },
                                { id: 'costs', label: 'Costos', icon: Receipt },
                                { id: 'documents', label: 'Documentos', icon: FileText },
                                { id: 'history', label: 'Historial', icon: History },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setTab(item.id as TabId)}
                                        className={cn(
                                            'flex-none',
                                            'cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all sm:text-sm',
                                            tab === item.id
                                                ? 'bg-inv-primary text-white shadow-md ring-2 ring-inv-surface/30 dark:ring-inv-section/50'
                                                : 'text-muted-foreground hover:bg-inv-primary/10 hover:text-inv-primary dark:hover:bg-inv-section/30'
                                        )}
                                    >
                                        <Icon className="hidden size-4 sm:inline-block" />
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
                        {tab === 'general' && (
                            <RepairTicketConfigGeneralTab
                                repairTicket={repairTicket}
                                assetsForSelect={assetsForSelect}
                                componentsForSelect={componentsForSelect}
                                usersForSelect={usersForSelect}
                                repairShopsForSelect={repairShopsForSelect}
                                canEdit={canEdit}
                            />
                        )}
                        {tab === 'parts' && (
                            <RepairTicketConfigPartsTab
                                repairTicket={repairTicket}
                                parts={parts}
                                componentsForSelect={componentsForSelect}
                                canEdit={canEdit}
                            />
                        )}
                        {tab === 'costs' && (
                            <RepairTicketConfigCostsTab
                                repairTicket={repairTicket}
                                costs={costs}
                                suppliersForSelect={suppliersForSelect}
                                canEdit={canEdit}
                            />
                        )}
                        {tab === 'documents' && (
                            <RepairTicketConfigDocumentsTab
                                repairTicket={repairTicket}
                                documents={documents}
                                costs={costs}
                                canEdit={canEdit}
                            />
                        )}
                        {tab === 'history' && (
                            <RepairTicketConfigHistoryTab
                                repairTicket={repairTicket}
                                statusLogs={statusLogs}
                            />
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
