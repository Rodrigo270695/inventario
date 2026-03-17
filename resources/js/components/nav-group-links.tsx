import { Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { useMemo } from 'react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';

export type NavLinkItem = {
    title: string;
    href: string;
    icon: LucideIcon;
    permission: string;
};

function hasPermission(permissions: string[], permission: string): boolean {
    return permissions.includes(permission);
}

type NavGroupLinksProps = {
    groupLabel: string;
    items: NavLinkItem[];
};

export function NavGroupLinks({ groupLabel, items }: NavGroupLinksProps) {
    const { isCurrentUrl } = useCurrentUrl();
    const { auth } = usePage().props as { auth?: { permissions?: string[] } };
    const permissions = auth?.permissions ?? [];

    const visibleItems = useMemo(
        () => items.filter((item) => hasPermission(permissions, item.permission)),
        [items, permissions]
    );

    if (visibleItems.length === 0) return null;

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel className="text-sidebar-foreground/70 text-xs font-medium uppercase tracking-wider">
                {groupLabel}
            </SidebarGroupLabel>
            <SidebarMenu>
                {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            asChild
                            isActive={isCurrentUrl(item.href)}
                            tooltip={{ children: item.title }}
                        >
                            <Link href={item.href} prefetch>
                                <item.icon className="size-4 shrink-0" />
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
