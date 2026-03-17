import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useSidebarSection } from '@/components/sidebar-section-context';

export type NavSubItem = {
    title: string;
    href: string;
    icon: LucideIcon;
    permission: string;
    /** Si se define, el ítem se muestra si el usuario tiene al menos uno de estos permisos (alternativa a permission). */
    permissionsAny?: string[];
};

function itemVisible(permissions: string[], item: NavSubItem): boolean {
    if (item.permissionsAny?.length) {
        return item.permissionsAny.some((p) => permissions.includes(p));
    }
    return permissions.includes(item.permission);
}

type NavGroupCollapsibleProps = {
    sectionKey: string;
    groupLabel: string;
    sectionTitle: string;
    icon: LucideIcon;
    items: NavSubItem[];
    /** Contador tipo notificación por href (ej. { '/admin/stock-entries': 3 }). Solo se muestra si > 0. */
    itemBadgeCounts?: Record<string, number>;
};

export function NavGroupCollapsible({
    sectionKey,
    groupLabel,
    sectionTitle,
    icon: Icon,
    items,
    itemBadgeCounts,
}: NavGroupCollapsibleProps) {
    const { isCurrentUrl, isCurrentOrParentUrl, currentUrl } = useCurrentUrl();
    const sidebarSection = useSidebarSection();
    const { auth } = usePage().props as { auth?: { permissions?: string[] } };
    const permissions = auth?.permissions ?? [];

    const visibleItems = useMemo(
        () => items.filter((item) => itemVisible(permissions, item)),
        [items, permissions]
    );

    const openFromUrl = useMemo(
        () => visibleItems.some((item) => isCurrentOrParentUrl(item.href)),
        [visibleItems, currentUrl, isCurrentOrParentUrl]
    );

    const isOpen = sidebarSection
        ? openFromUrl || sidebarSection.openedSectionKeys.has(sectionKey)
        : openFromUrl;

    const onOpenChange = useCallback(
        (open: boolean) => {
            sidebarSection?.toggleSection(sectionKey, open);
        },
        [sidebarSection, sectionKey]
    );

    if (visibleItems.length === 0) return null;

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel className="text-sidebar-foreground/70 text-xs font-medium uppercase tracking-wider">
                {groupLabel}
            </SidebarGroupLabel>
            <SidebarMenu>
                <Collapsible open={isOpen} onOpenChange={onOpenChange} className="group/collapsible">
                    <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                                tooltip={{ children: sectionTitle }}
                                className="cursor-pointer data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                            >
                                <Icon className="size-4 shrink-0" />
                                <span>{sectionTitle}</span>
                                <ChevronDown className="ml-auto size-4 shrink-0 transition-transform duration-200 ease-out group-data-[state=open]/collapsible:rotate-180" />
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 data-[state=closed]:duration-200 data-[state=open]:duration-200 ease-out">
                            <SidebarMenuSub>
                                {visibleItems.map((item) => {
                                    const badgeCount = itemBadgeCounts?.[item.href] ?? 0;
                                    return (
                                        <SidebarMenuSubItem key={item.title}>
                                            <SidebarMenuSubButton
                                                asChild
                                                isActive={isCurrentOrParentUrl(item.href)}
                                                tooltip={item.title}
                                            >
                                                <Link href={item.href} prefetch className="flex items-center gap-2 w-full">
                                                    <item.icon className="size-4 shrink-0 opacity-70" />
                                                    <span className="flex-1 truncate">{item.title}</span>
                                                    {badgeCount > 0 && (
                                                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground tabular-nums">
                                                            {badgeCount > 99 ? '99+' : badgeCount}
                                                        </span>
                                                    )}
                                                </Link>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    );
                                })}
                            </SidebarMenuSub>
                        </CollapsibleContent>
                    </SidebarMenuItem>
                </Collapsible>
            </SidebarMenu>
        </SidebarGroup>
    );
}
