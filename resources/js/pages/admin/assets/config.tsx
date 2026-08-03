import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Cpu, Image as ImageIcon, Info, Monitor, Shield } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { cn } from '@/lib/utils';
import { Toast } from '@/components/toast';
import type { ToastMessage } from '@/components/toast';
import { shouldShowComputerTabs } from '@/constants/asset-config';
import {
    AssetConfigAssignmentsTab,
    AssetConfigComputerComponentsTab,
    AssetConfigComputerTab,
    AssetConfigGeneralTab,
    AssetConfigPhotosTab,
} from './config/index';
import type {
    AssetComputerComponent,
    ComponentForComputerOption,
    AssetConfigAsset,
    AssetConfigAssignment,
    AssetConfigPhoto,
    AssetConfigUserOption,
    TabId,
} from './config/index';

type AssetConfigProps = {
    asset: AssetConfigAsset;
    assignments: AssetConfigAssignment[];
    photos: AssetConfigPhoto[];
    usersForAssignment: AssetConfigUserOption[];
    computerComponents: AssetComputerComponent[];
    componentsForComputer: ComponentForComputerOption[];
};

export default function AssetConfigPage({
    asset,
    assignments,
    photos,
    usersForAssignment,
    computerComponents,
    componentsForComputer,
}: AssetConfigProps) {
    const showComputerTab = shouldShowComputerTabs({
        subcategoryCode: asset.model?.subcategory?.code,
        categoryName: asset.model?.subcategory?.category?.name,
    });

    const [tab, setTab] = useState<TabId>('general');
    const [toastQueue, setToastQueue] = useState<Array<ToastMessage & { id: number }>>([]);
    const lastFlashToastRef = useRef<ToastMessage | null>(null);

    useEffect(() => {
        if (!showComputerTab && tab === 'computer') setTab('general');
    }, [showComputerTab, tab]);

    const { props } = usePage();
    const flash = (props.flash as { toast?: ToastMessage } | undefined);

    useEffect(() => {
        const t = flash?.toast;
        if (!t) return;
        if (t === lastFlashToastRef.current) return;
        lastFlashToastRef.current = t;
        const id = Date.now();
        queueMicrotask(() => setToastQueue((q) => [...q, { ...t, id }]));
    }, [flash?.toast]);

    const dismissToast = (id: number) => {
        setToastQueue((q) => q.filter((item) => item.id !== id));
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Activos', href: '/admin/assets' },
        { title: `Configurar: ${asset.code}`, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Configurar activo ${asset.code}`} />

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

            <div className="flex min-h-[60vh] flex-col gap-4 p-3 sm:gap-6 sm:p-4 md:p-6">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                        <Link
                            href="/admin/assets"
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border-2 border-inv-surface/20 bg-inv-primary/5 text-inv-primary shadow-sm transition-all hover:border-inv-primary/40 hover:bg-inv-primary/10 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2 sm:size-10 dark:border-inv-surface/30 dark:bg-inv-section/20 dark:text-inv-primary dark:hover:bg-inv-section/30"
                            aria-label="Volver a activos"
                        >
                            <ArrowLeft className="size-5" />
                        </Link>
                        <div className="min-w-0 border-l-2 border-inv-primary/30 pl-3 sm:pl-4">
                            <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg md:text-xl">
                                Configurar activo
                            </h1>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
                                <span className="font-medium text-foreground/90">{asset.code}</span>
                                {asset.model && (
                                    <>
                                        <span className="text-muted-foreground/80"> · </span>
                                        <span className="text-muted-foreground">
                                            {asset.model.subcategory?.category?.name} /{' '}
                                            {asset.model.subcategory?.name}
                                        </span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="relative min-w-0 overflow-hidden rounded-2xl">
                    <div
                        className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
                        style={{
                            background: 'linear-gradient(135deg, #447794 0%, #2d5b75 40%, #123249 100%)',
                        }}
                        aria-hidden
                    />
                    <div
                        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-30"
                        style={{
                            background: 'radial-gradient(circle, #447794 0%, transparent 70%)',
                        }}
                        aria-hidden
                    />

                    <div className="relative border-b border-inv-primary/40 bg-inv-primary/15 dark:border-inv-surface/60 dark:bg-inv-section/70">
                        <nav
                            className="flex gap-1 overflow-x-auto overscroll-x-contain px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            aria-label="Pestañas del activo"
                        >
                            {(
                                [
                                    { id: 'general' as const, label: 'Info general', short: 'Info', Icon: Info },
                                    { id: 'assignments' as const, label: 'Asignaciones', short: 'Asign.', Icon: Shield },
                                    { id: 'photos' as const, label: 'Fotos', short: 'Fotos', Icon: ImageIcon },
                                    ...(showComputerTab
                                        ? ([
                                              {
                                                  id: 'computer' as const,
                                                  label: 'Datos de PC',
                                                  short: 'PC',
                                                  Icon: Monitor,
                                              },
                                              {
                                                  id: 'computer_components' as const,
                                                  label: 'Componentes',
                                                  short: 'Comp.',
                                                  Icon: Cpu,
                                              },
                                          ] as const)
                                        : []),
                                ] as const
                            ).map(({ id, label, short, Icon }) => {
                                const active = tab === id;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setTab(id)}
                                        className={cn(
                                            'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors outline-none sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm',
                                            'focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-1',
                                            active
                                                ? 'bg-white text-inv-primary shadow-sm ring-1 ring-inv-primary/35 dark:bg-inv-section dark:text-inv-primary dark:ring-inv-primary/50'
                                                : 'bg-transparent text-muted-foreground hover:bg-white/60 hover:text-inv-primary dark:hover:bg-inv-section/40',
                                        )}
                                        aria-current={active ? 'page' : undefined}
                                        title={label}
                                    >
                                        <Icon
                                            className={cn(
                                                'size-3.5 shrink-0 sm:size-4',
                                                active ? 'text-inv-primary' : 'text-muted-foreground',
                                            )}
                                            aria-hidden
                                        />
                                        <span className={cn(active && 'font-semibold', 'sm:hidden')}>{short}</span>
                                        <span className={cn(active && 'font-semibold', 'hidden sm:inline')}>
                                            {label}
                                        </span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="relative min-w-0 overflow-hidden rounded-b-2xl border border-t-0 border-border/80 bg-card shadow-sm">
                        {tab === 'general' && <AssetConfigGeneralTab asset={asset} />}
                        {tab === 'assignments' && (
                            <AssetConfigAssignmentsTab
                                asset={asset}
                                assignments={assignments}
                                usersForAssignment={usersForAssignment}
                            />
                        )}
                        {tab === 'photos' && <AssetConfigPhotosTab asset={asset} photos={photos} />}
                        {showComputerTab && tab === 'computer' && (
                            <AssetConfigComputerTab asset={asset} />
                        )}
                        {showComputerTab && tab === 'computer_components' && (
                            <AssetConfigComputerComponentsTab
                                asset={asset}
                                computerComponents={computerComponents}
                                componentsForComputer={componentsForComputer}
                            />
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
