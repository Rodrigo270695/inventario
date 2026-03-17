import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Info } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Component } from '@/types';
import { cn } from '@/lib/utils';
import { Toast } from '@/components/toast';
import type { ToastMessage } from '@/components/toast';
import { ComponentConfigGeneralTab } from './config/ComponentConfigGeneralTab';

type ComponentConfigProps = {
    component: Component;
};

type TabId = 'general';

export default function ComponentConfigPage({ component }: ComponentConfigProps) {
    const [tab, setTab] = useState<TabId>('general');
    const [toastQueue, setToastQueue] = useState<Array<ToastMessage & { id: number }>>([]);
    const lastFlashToastRef = useRef<ToastMessage | null>(null);

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
        { title: 'Componentes', href: '/admin/components' },
        { title: `Configurar: ${component.code}`, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Configurar componente ${component.code}`} />

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
                            href="/admin/components"
                            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-inv-surface/20 bg-inv-primary/5 text-inv-primary shadow-sm transition-all hover:border-inv-primary/40 hover:bg-inv-primary/10 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2 dark:border-inv-surface/30 dark:bg-inv-section/20 dark:text-inv-primary dark:hover:bg-inv-section/30"
                            aria-label="Volver a componentes"
                        >
                            <ArrowLeft className="size-5" />
                        </Link>
                        <div className="border-l-2 border-inv-primary/30 pl-4">
                            <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                                Configurar componente
                            </h1>
                            <p className="mt-0.5 text-muted-foreground text-xs md:text-sm">
                                <span className="font-medium text-foreground/90">{component.code}</span>
                                {component.model && (
                                    <>
                                        <span className="text-muted-foreground/80"> · </span>
                                        <span className="text-muted-foreground">
                                            {component.type?.name} / {component.model}
                                        </span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl">
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

                    <div className="relative border-b border-inv-primary/50 bg-inv-primary/25 dark:bg-inv-section/70 dark:border-inv-surface/60">
                        <nav className="flex gap-0.5 p-2" aria-label="Tabs">
                            <button
                                type="button"
                                onClick={() => setTab('general')}
                                className={cn(
                                    'cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all sm:text-sm',
                                    tab === 'general'
                                        ? 'bg-inv-primary text-white shadow-md ring-2 ring-inv-surface/30 dark:ring-inv-section/50'
                                        : 'text-muted-foreground hover:bg-inv-primary/10 hover:text-inv-primary dark:hover:bg-inv-section/30'
                                )}
                            >
                                <Info className="hidden size-4 sm:inline-block" />
                                <span>Info gral.</span>
                            </button>
                        </nav>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
                        {tab === 'general' && <ComponentConfigGeneralTab component={component as any} />}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

