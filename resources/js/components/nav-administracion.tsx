import { Link, usePage } from '@inertiajs/react';
import {
    ChevronDown,
    Shield,
    Users,
    Key,
    FolderOpen,
    ScrollText,
    Wrench,
    LogIn,
    Cable,
    DatabaseBackup,
} from 'lucide-react';
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
import { AUDIT_NAV_PERMISSIONS } from '@/config/permission-tree';

function hasPermission(permissions: string[], permission: string): boolean {
    return permissions.includes(permission);
}

const USUARIO_ITEMS = [
    { title: 'Roles', href: '/admin/roles', icon: Shield, permission: 'roles.view' },
    { title: 'Usuarios', href: '/admin/users', icon: Users, permission: 'users.view' },
];

const CATALOGOS_ITEMS = [
    { title: 'Cuentas contables', href: '/admin/gl-accounts', icon: ScrollText, permission: 'gl_accounts.view' },
    { title: 'Categorías de activos', href: '/admin/asset-categories', icon: FolderOpen, permission: 'asset_categories.view' },
    { title: 'Subcategorías de activos', href: '/admin/asset-catalog', icon: FolderOpen, permission: 'asset_subcategories.view' },
    { title: 'Proveedores', href: '/admin/suppliers', icon: FolderOpen, permission: 'suppliers.view' },
    { title: 'Zonales, oficinas y almacenes', href: '/admin/zonals', icon: FolderOpen, permission: 'zonals.view' },
    { title: 'Talleres externos', href: '/admin/repair-shops', icon: Wrench, permission: 'repair_shops.view' },
    { title: 'Departamentos', href: '/admin/departments', icon: FolderOpen, permission: 'departments.view' },
];

const SEGURIDAD_ITEMS = [
    {
        title: 'Intentos de login',
        href: '/admin/security/login-attempts',
        icon: LogIn,
        permission: 'security.login_attempts.view',
    },
    {
        title: 'Logs de API',
        href: '/admin/security/api-logs',
        icon: Cable,
        permission: 'security.api_logs.view',
    },
    {
        title: 'Backups',
        href: '/admin/security/backups',
        icon: DatabaseBackup,
        permission: 'security.backups.view',
    },
];

export function NavAdministracion() {
    const { isCurrentUrl, isCurrentOrParentUrl, currentUrl } = useCurrentUrl();
    const { auth } = usePage().props as { auth?: { permissions?: string[] } };
    const permissions = auth?.permissions ?? [];

    const visibleUsuario = useMemo(
        () => USUARIO_ITEMS.filter((item) => hasPermission(permissions, item.permission)),
        [permissions]
    );
    const visibleCatalogos = useMemo(
        () => CATALOGOS_ITEMS.filter((item) => hasPermission(permissions, item.permission)),
        [permissions]
    );
    const visibleSeguridad = useMemo(
        () => SEGURIDAD_ITEMS.filter((item) => hasPermission(permissions, item.permission)),
        [permissions]
    );
    const showAuditoria = useMemo(
        () => AUDIT_NAV_PERMISSIONS.some((p) => hasPermission(permissions, p)),
        [permissions]
    );

    const hasAny =
        visibleUsuario.length > 0 ||
        visibleCatalogos.length > 0 ||
        visibleSeguridad.length > 0 ||
        showAuditoria;

    const sidebarSection = useSidebarSection();

    const usuarioOpenFromUrl = useMemo(
        () => visibleUsuario.some((item) => isCurrentOrParentUrl(item.href)),
        [visibleUsuario, currentUrl, isCurrentOrParentUrl]
    );
    const catalogosOpenFromUrl = useMemo(
        () => visibleCatalogos.some((item) => isCurrentOrParentUrl(item.href)),
        [visibleCatalogos, currentUrl, isCurrentOrParentUrl]
    );
    const seguridadOpenFromUrl = useMemo(
        () => visibleSeguridad.some((item) => isCurrentOrParentUrl(item.href)),
        [visibleSeguridad, currentUrl, isCurrentOrParentUrl]
    );

    const usuarioOpen = sidebarSection
        ? usuarioOpenFromUrl || sidebarSection.openedSectionKeys.has('admin-usuario')
        : usuarioOpenFromUrl;
    const catalogosOpen = sidebarSection
        ? catalogosOpenFromUrl || sidebarSection.openedSectionKeys.has('admin-catalogos')
        : catalogosOpenFromUrl;
    const seguridadOpen = sidebarSection
        ? seguridadOpenFromUrl || sidebarSection.openedSectionKeys.has('admin-seguridad')
        : seguridadOpenFromUrl;

    const setUsuarioOpen = useCallback(
        (open: boolean) => {
            sidebarSection?.toggleSection('admin-usuario', open);
        },
        [sidebarSection]
    );
    const setCatalogosOpen = useCallback(
        (open: boolean) => {
            sidebarSection?.toggleSection('admin-catalogos', open);
        },
        [sidebarSection]
    );
    const setSeguridadOpen = useCallback(
        (open: boolean) => {
            sidebarSection?.toggleSection('admin-seguridad', open);
        },
        [sidebarSection]
    );

    if (!hasAny) return null;

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel className="text-sidebar-foreground/70 text-xs font-medium uppercase tracking-wider">
                Administración
            </SidebarGroupLabel>
            <SidebarMenu>
                {visibleUsuario.length > 0 && (
                    <Collapsible open={usuarioOpen} onOpenChange={setUsuarioOpen} className="group/collapsible">
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
                                    {visibleUsuario.map((item) => (
                                        <SidebarMenuSubItem key={item.title}>
                                            <SidebarMenuSubButton
                                                asChild
                                                isActive={isCurrentOrParentUrl(item.href)}
                                                tooltip={item.title}
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
                )}

                {visibleCatalogos.length > 0 && (
                    <Collapsible open={catalogosOpen} onOpenChange={setCatalogosOpen} className="group/collapsible">
                        <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                                <SidebarMenuButton
                                    tooltip={{ children: 'Catálogos' }}
                                    className="cursor-pointer data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                >
                                    <FolderOpen className="size-4 shrink-0" />
                                    <span>Catálogos</span>
                                    <ChevronDown className="ml-auto size-4 shrink-0 transition-transform duration-200 ease-out group-data-[state=open]/collapsible:rotate-180" />
                                </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 data-[state=closed]:duration-200 data-[state=open]:duration-200 ease-out">
                                <SidebarMenuSub>
                                    {visibleCatalogos.map((item) => (
                                        <SidebarMenuSubItem key={item.title}>
                                            <SidebarMenuSubButton
                                                asChild
                                                isActive={isCurrentOrParentUrl(item.href)}
                                                tooltip={item.title}
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
                )}

                {visibleSeguridad.length > 0 && (
                    <Collapsible open={seguridadOpen} onOpenChange={setSeguridadOpen} className="group/collapsible">
                        <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                                <SidebarMenuButton
                                    tooltip={{ children: 'Seguridad' }}
                                    className="cursor-pointer data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                >
                                    <Key className="size-4 shrink-0" />
                                    <span>Seguridad</span>
                                    <ChevronDown className="ml-auto size-4 shrink-0 transition-transform duration-200 ease-out group-data-[state=open]/collapsible:rotate-180" />
                                </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 data-[state=closed]:duration-200 data-[state=open]:duration-200 ease-out">
                                <SidebarMenuSub>
                                    {visibleSeguridad.map((item) => (
                                        <SidebarMenuSubItem key={item.title}>
                                            <SidebarMenuSubButton
                                                asChild
                                                isActive={isCurrentOrParentUrl(item.href)}
                                                tooltip={item.title}
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
                )}

                {showAuditoria && (
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            isActive={isCurrentUrl('/admin/audit')}
                            tooltip={{ children: 'Auditoría' }}
                        >
                            <Link href="/admin/audit" prefetch>
                                <ScrollText className="size-4 shrink-0" />
                                <span>Auditoría</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                )}
            </SidebarMenu>
        </SidebarGroup>
    );
}
