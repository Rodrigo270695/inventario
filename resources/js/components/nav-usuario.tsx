import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, Users, Shield } from 'lucide-react';
import { useMemo } from 'react';
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

/** Ítems del menú Usuario con el permiso que controla su visibilidad (como en raautomotriz). */
const USUARIO_SUB_ITEMS: Array<{ title: string; href: string; icon: typeof Shield; permission: string }> = [
    { title: 'Roles', href: '/admin/roles', icon: Shield, permission: 'roles.view' },
    { title: 'Usuarios', href: '/admin/users', icon: Users, permission: 'users.view' },
];

function hasPermission(permissions: string[], permission: string): boolean {
    return permissions.includes(permission);
}

export function NavUsuario() {
    const { isCurrentUrl } = useCurrentUrl();
    const { auth } = usePage().props as { auth?: { permissions?: string[] } };
    const permissions = auth?.permissions ?? [];

    const visibleItems = useMemo(
        () => USUARIO_SUB_ITEMS.filter((item) => hasPermission(permissions, item.permission)),
        [permissions]
    );

    if (visibleItems.length === 0) return null;

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel className="text-sidebar-foreground/70 text-xs font-medium uppercase tracking-wider">
                Administración
            </SidebarGroupLabel>
            <SidebarMenu>
                <Collapsible defaultOpen className="group/collapsible">
                    <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                                tooltip={{ children: 'Usuario' }}
                                className="cursor-pointer data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                            >
                                <Users className="size-4 shrink-0" />
                                <span>Usuario</span>
                                <ChevronDown className="ml-auto size-4 shrink-0 transition-transform duration-200 ease-out group-data-[state=open]/collapsible:rotate-180" />
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 data-[state=closed]:duration-200 data-[state=open]:duration-200 ease-out">
                            <SidebarMenuSub>
                                {visibleItems.map((item) => (
                                    <SidebarMenuSubItem key={item.title}>
                                        <SidebarMenuSubButton
                                            asChild
                                            isActive={isCurrentUrl(item.href)}
                                        >
                                            <Link href={item.href} prefetch>
                                                <item.icon className="size-4 shrink-0 opacity-70" />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                ))}
                            </SidebarMenuSub>
                        </CollapsibleContent>
                    </SidebarMenuItem>
                </Collapsible>
            </SidebarMenu>
        </SidebarGroup>
    );
}
