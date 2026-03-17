import {
    LayoutGrid,
    MapPin,
    Shield,
    Users,
    FolderOpen,
    Monitor,
    Sofa,
    ShoppingCart,
    Wrench,
    Trash2,
    Key,
    BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ADMIN_CATALOGOS_ITEMS,
    ADMIN_USUARIO_ITEMS,
    SIDEBAR_PREVIEW_SECTIONS,
} from '@/config/permission-tree';

type SidebarPreviewProps = {
    selectedPermissionNames: Set<string>;
    className?: string;
};

function SectionIcon({ keyName }: { keyName: string }) {
    switch (keyName) {
        case 'nav':
            return <LayoutGrid className="size-4 shrink-0 text-muted-foreground" />;
        case 'activos-ti':
            return <Monitor className="size-4 shrink-0 text-muted-foreground" />;
        case 'activos-fijos':
            return <Sofa className="size-4 shrink-0 text-muted-foreground" />;
        case 'compras':
            return <ShoppingCart className="size-4 shrink-0 text-muted-foreground" />;
        case 'mantenimiento':
            return <Wrench className="size-4 shrink-0 text-muted-foreground" />;
        case 'bajas':
            return <Trash2 className="size-4 shrink-0 text-muted-foreground" />;
        case 'licencias':
            return <Key className="size-4 shrink-0 text-muted-foreground" />;
        case 'alertas':
            return <BarChart3 className="size-4 shrink-0 text-muted-foreground" />;
        case 'admin':
            return <FolderOpen className="size-4 shrink-0 text-muted-foreground" />;
        default:
            return <FolderOpen className="size-4 shrink-0 text-muted-foreground" />;
    }
}

export function SidebarPreview({ selectedPermissionNames, className }: SidebarPreviewProps) {
    const visibleUsuarioItems = ADMIN_USUARIO_ITEMS.filter((item) =>
        selectedPermissionNames.has(item.permission)
    );
    const visibleCatalogosItems = ADMIN_CATALOGOS_ITEMS.filter((item) =>
        selectedPermissionNames.has(item.permission)
    );
    const showUsuario = visibleUsuarioItems.length > 0;
    const showCatalogos = visibleCatalogosItems.length > 0;
    const showAdmin = showUsuario || showCatalogos;

    return (
        <div
            className={cn(
                'rounded-lg border border-border bg-muted/30 p-3 text-sm min-h-[200px]',
                className
            )}
        >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5 mb-1">
                Vista previa del menú (mismo orden que el sidebar)
            </p>
            <div className="space-y-3">
                {SIDEBAR_PREVIEW_SECTIONS.map((section) => {
                    if (section.key === 'admin') {
                        return (
                            <div key={section.key} className="space-y-1">
                                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50">
                                    <SectionIcon keyName={section.key} />
                                    <span className="font-medium text-foreground">{section.label}</span>
                                </div>
                                {showAdmin ? (
                                    <div className="rounded-md border border-border overflow-hidden ml-2">
                                        {showUsuario && (
                                            <>
                                                <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/50 border-b border-border">
                                                    <Users className="size-3.5 shrink-0 text-muted-foreground" />
                                                    <span className="font-medium text-foreground text-xs">Usuario</span>
                                                </div>
                                                <ul className="bg-background/50">
                                                    {visibleUsuarioItems.map((item) => (
                                                        <li key={item.permission}>
                                                            <div className="flex items-center gap-2 pl-6 pr-2 py-1.5 border-t border-border/70">
                                                                {item.title === 'Roles' ? (
                                                                    <Shield className="size-3.5 shrink-0 text-muted-foreground" />
                                                                ) : (
                                                                    <Users className="size-3.5 shrink-0 text-muted-foreground" />
                                                                )}
                                                                <span className="text-foreground text-xs">{item.title}</span>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </>
                                        )}
                                        {showCatalogos && (
                                            <>
                                                <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/50 border-t border-border">
                                                    <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
                                                    <span className="font-medium text-foreground text-xs">Catálogos</span>
                                                </div>
                                                <ul className="bg-background/50">
                                                    {visibleCatalogosItems.map((item) => (
                                                        <li key={item.permission}>
                                                            <div className="flex items-center gap-2 pl-6 pr-2 py-1.5 border-t border-border/70">
                                                                <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                                                                <span className="text-foreground text-xs">{item.title}</span>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground px-2 py-1 text-xs ml-2">Sin acceso a Administración</p>
                                )}
                            </div>
                        );
                    }
                    const hasItems = section.items.length > 0;
                    const visibleCount = section.items.filter((item) => selectedPermissionNames.has(item.permission)).length;
                    const showSection = !hasItems || visibleCount > 0;
                    return (
                        <div key={section.key} className="space-y-1">
                            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50">
                                <SectionIcon keyName={section.key} />
                                <span className="font-medium text-foreground">{section.label}</span>
                            </div>
                            {hasItems ? (
                                showSection ? (
                                    <ul className="ml-2 space-y-0.5">
                                        {section.items
                                            .filter((item) => selectedPermissionNames.has(item.permission))
                                            .map((item) => (
                                                <li key={item.permission}>
                                                    <div className="flex items-center gap-2 pl-4 pr-2 py-1 rounded border border-border/50 bg-background/50">
                                                        <LayoutGrid className="size-3.5 shrink-0 text-muted-foreground" />
                                                        <span className="text-foreground text-xs">{item.title}</span>
                                                    </div>
                                                </li>
                                            ))}
                                    </ul>
                                ) : (
                                    <p className="text-muted-foreground px-2 py-1 text-xs ml-2">Sin acceso</p>
                                )
                            ) : (
                                <p className="text-muted-foreground px-2 py-1 text-xs ml-2 italic">(sin permisos asignados aún)</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
