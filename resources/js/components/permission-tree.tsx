import { ChevronRight, Folder, FolderOpen } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { PermissionTreeNode } from '@/types/permission';

type PermissionTreeProps = {
    tree: PermissionTreeNode[];
    selectedNames: Set<string>;
    nameToId: Map<string, number>;
    onToggle: (name: string, checked: boolean) => void;
    onSelectAll: (names: string[], checked: boolean) => void;
};

function collectPermissionNames(node: PermissionTreeNode): string[] {
    if (node.permission) return [node.permission];
    if (node.children) return node.children.flatMap(collectPermissionNames);
    return [];
}

function TreeNode({
    node,
    depth,
    selectedNames,
    nameToId,
    onToggle,
    onSelectAll,
    expandedKeys,
    setExpandedKeys,
}: {
    node: PermissionTreeNode;
    depth: number;
    selectedNames: Set<string>;
    nameToId: Map<string, number>;
    onToggle: (name: string, checked: boolean) => void;
    onSelectAll: (names: string[], checked: boolean) => void;
    expandedKeys: Set<string>;
    setExpandedKeys: (fn: (prev: Set<string>) => Set<string>) => void;
}) {
    const hasChildren = node.children && node.children.length > 0;
    const isFolder = hasChildren && !node.permission;
    const isExpanded = expandedKeys.has(node.key);
    const indent = depth * 16;

    const allNames = useMemo(() => collectPermissionNames(node), [node]);
    const allSelected = allNames.length > 0 && allNames.every((n) => selectedNames.has(n));
    const someSelected = allNames.some((n) => selectedNames.has(n));

    const toggleExpand = useCallback(() => {
        setExpandedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(node.key)) next.delete(node.key);
            else next.add(node.key);
            return next;
        });
    }, [node.key, setExpandedKeys]);

    const handleSelectAll = useCallback(() => {
        onSelectAll(allNames, !allSelected);
    }, [allNames, allSelected, onSelectAll]);

    if (node.permission) {
        const checked = selectedNames.has(node.permission);
        return (
            <div
                className="flex items-center gap-2 py-0.5 pr-2 transition-colors hover:bg-muted/50 rounded"
                style={{ paddingLeft: indent }}
            >
                <Checkbox
                    id={`perm-${node.key}`}
                    checked={checked}
                    onCheckedChange={(c) => onToggle(node.permission!, c === true)}
                    className="cursor-pointer size-3.5 rounded border-inv-primary/50 data-[state=checked]:bg-inv-primary data-[state=checked]:border-inv-primary shrink-0"
                />
                <label
                    htmlFor={`perm-${node.key}`}
                    className="cursor-pointer text-sm text-foreground select-none flex-1 py-0.5"
                >
                    {node.label}
                </label>
            </div>
        );
    }

    return (
        <div className="py-0.5" style={{ paddingLeft: indent }}>
            <div className="flex items-center gap-1.5 py-0.5 pr-2 rounded group hover:bg-muted/50">
                <button
                    type="button"
                    onClick={toggleExpand}
                    className="cursor-pointer p-0.5 rounded hover:bg-muted shrink-0"
                    aria-expanded={isExpanded}
                >
                    <ChevronRight
                        className={cn('size-4 text-muted-foreground transition-transform', isExpanded && 'rotate-90')}
                    />
                </button>
                {isExpanded ? (
                    <FolderOpen className="size-4 text-amber-500 shrink-0" />
                ) : (
                    <Folder className="size-4 text-amber-500 shrink-0" />
                )}
                <span className="text-sm font-medium text-foreground flex-1">{node.label}</span>
                <button
                    type="button"
                    onClick={handleSelectAll}
                    className="cursor-pointer text-xs text-inv-primary hover:underline shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    {allSelected ? 'Quitar todos' : 'Seleccionar todo'}
                </button>
            </div>
            {isFolder && isExpanded && node.children && (
                <div className="border-l border-border ml-1.5 pl-1">
                    {node.children.map((child) => (
                        <TreeNode
                            key={child.key}
                            node={child}
                            depth={depth + 1}
                            selectedNames={selectedNames}
                            nameToId={nameToId}
                            onToggle={onToggle}
                            onSelectAll={onSelectAll}
                            expandedKeys={expandedKeys}
                            setExpandedKeys={setExpandedKeys}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function PermissionTree({
    tree,
    selectedNames,
    nameToId,
    onToggle,
    onSelectAll,
}: PermissionTreeProps) {
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());

    return (
        <div className="space-y-0.5 py-1">
            {tree.map((node) => (
                <TreeNode
                    key={node.key}
                    node={node}
                    depth={0}
                    selectedNames={selectedNames}
                    nameToId={nameToId}
                    onToggle={onToggle}
                    onSelectAll={onSelectAll}
                    expandedKeys={expandedKeys}
                    setExpandedKeys={setExpandedKeys}
                />
            ))}
        </div>
    );
}
