import { Bell } from 'lucide-react';
import { Link, usePage } from '@inertiajs/react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { cn } from '@/lib/utils';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { props } = usePage();
    const { auth, notificationsUnreadCount = 0 } = props as {
        auth?: { permissions?: string[] };
        notificationsUnreadCount?: number;
    };
    const permissions = auth?.permissions ?? [];
    const canViewAlerts = permissions.includes('alerts.view');

    return (
        <header
            data-sidebar-header
            className="relative flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 shadow-sm transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-6"
        >
            <div className="flex min-w-0 flex-1 items-center gap-3">
                <SidebarTrigger className="-ml-1 shrink-0" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            {canViewAlerts && (
                <div className="flex items-center gap-3 pr-1">
                    <Link
                        href="/admin/alerts"
                        className="group relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-inv-primary/40 bg-inv-primary/5 text-inv-primary shadow-[0_1px_2px_rgba(15,23,42,0.12)] ring-0 transition-all hover:bg-inv-primary hover:text-white hover:ring-2 hover:ring-inv-primary/60 cursor-pointer"
                        aria-label="Centro de alertas"
                    >
                        <Bell
                            className={cn(
                                'size-4 transition-transform group-hover:scale-110',
                                notificationsUnreadCount > 0 && 'animate-[ring_1s_ease-in-out_infinite]'
                            )}
                        />
                        {notificationsUnreadCount > 0 && (
                            <span className="absolute -right-0.5 -top-0.5 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold leading-none text-white shadow-[0_0_0_1px_rgba(15,23,42,0.12)]">
                                {notificationsUnreadCount > 9 ? '9+' : notificationsUnreadCount}
                            </span>
                        )}
                    </Link>
                </div>
            )}
        </header>
    );
}
