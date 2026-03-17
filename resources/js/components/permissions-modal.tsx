import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Eye, KeyRound } from 'lucide-react';
import { AppModal } from '@/components/app-modal';
import { PermissionTree } from '@/components/permission-tree';
import { SidebarPreview } from '@/components/sidebar-preview';
import { Button } from '@/components/ui/button';
import { PERMISSION_TREE } from '@/config/permission-tree';
import { cn } from '@/lib/utils';
import type { Permission } from '@/types/permission';
import type { Role } from '@/types/role';

function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

type PermissionsModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    role: Role | null;
    onSuccess?: () => void;
};

type TabId = 'permisos' | 'preview';

export function PermissionsModal({
    open,
    onOpenChange,
    role,
    onSuccess,
}: PermissionsModalProps) {
    const [tab, setTab] = useState<TabId>('permisos');
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [rolePermissionIds, setRolePermissionIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const nameToId = useMemo(() => {
        const m = new Map<string, number>();
        permissions.forEach((p) => m.set(p.name, p.id));
        return m;
    }, [permissions]);

    const selectedNames = useMemo(() => {
        const names = new Set<string>();
        permissions.forEach((p) => {
            if (selectedIds.has(p.id)) names.add(p.name);
        });
        return names;
    }, [permissions, selectedIds]);

    useEffect(() => {
        if (!open || !role) return;
        setLoading(true);
        fetch(`/admin/roles/${role.id}/permissions`, { method: 'GET' })
            .then((r) => r.json())
            .then((data: { permissions: Permission[]; role_permission_ids: number[] }) => {
                setPermissions(data.permissions ?? []);
                setRolePermissionIds(data.role_permission_ids ?? []);
                setSelectedIds(new Set(data.role_permission_ids ?? []));
            })
            .catch(() => {
                setPermissions([]);
                setRolePermissionIds([]);
                setSelectedIds(new Set());
            })
            .finally(() => setLoading(false));
    }, [open, role?.id]);

    const handleToggle = useCallback((name: string, checked: boolean) => {
        const id = nameToId.get(name);
        if (id == null) return;
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
    }, [nameToId]);

    const handleSelectAll = useCallback((names: string[], checked: boolean) => {
        const ids = names.map((n) => nameToId.get(n)).filter((id): id is number => id != null);
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (checked) ids.forEach((id) => next.add(id));
            else ids.forEach((id) => next.delete(id));
            return next;
        });
    }, [nameToId]);

    const handleSave = useCallback(() => {
        if (!role) return;
        setSaving(true);
        fetch(`/admin/roles/${role.id}/permissions`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-XSRF-TOKEN': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ permission_ids: Array.from(selectedIds) }),
        })
            .then((res) => {
                if (!res.ok) throw new Error('Error al guardar');
                onOpenChange(false);
                onSuccess?.();
                router.reload();
            })
            .catch(() => {})
            .finally(() => setSaving(false));
    }, [role, selectedIds, onOpenChange, onSuccess]);

    // Temporalmente permitir editar/guardar permisos de superadmin para validar el sistema.
    // Más adelante: canEdit = role?.name !== 'superadmin';
    const canEdit = true;

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title={role ? `Permisos: ${role.name}` : 'Permisos'}
            contentClassName="flex flex-col gap-0 p-0 max-h-[85vh]"
            className="max-w-2xl"
        >
            <div className="flex border-b border-border shrink-0">
                <button
                    type="button"
                    onClick={() => setTab('permisos')}
                    className={cn(
                        'cursor-pointer flex items-center gap-2 px-4 py-3 text-sm border-b-2 -mb-px transition-colors',
                        tab === 'permisos'
                            ? 'border-inv-primary text-inv-primary font-medium'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                >
                    <KeyRound className="size-4" />
                    Permisos
                </button>
                <button
                    type="button"
                    onClick={() => setTab('preview')}
                    className={cn(
                        'cursor-pointer flex items-center gap-2 px-4 py-3 text-sm border-b-2 -mb-px transition-colors',
                        tab === 'preview'
                            ? 'border-inv-primary text-inv-primary font-medium'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                >
                    <Eye className="size-4" />
                    Vista previa
                </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                {loading ? (
                    <p className="text-muted-foreground text-sm">Cargando…</p>
                ) : tab === 'permisos' ? (
                    <PermissionTree
                        tree={PERMISSION_TREE}
                        selectedNames={selectedNames}
                        nameToId={nameToId}
                        onToggle={handleToggle}
                        onSelectAll={handleSelectAll}
                    />
                ) : (
                    <SidebarPreview selectedPermissionNames={selectedNames} />
                )}
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-6 py-3 shrink-0">
                <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => onOpenChange(false)}
                >
                    Cerrar
                </Button>
                {canEdit && (
                    <Button
                        type="button"
                        className="cursor-pointer bg-inv-primary hover:bg-inv-primary/90 text-white"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Guardando…' : 'Guardar permisos'}
                    </Button>
                )}
            </div>
        </AppModal>
    );
}
