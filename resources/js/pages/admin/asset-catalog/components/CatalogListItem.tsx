import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CatalogListItemProps = {
    selected?: boolean;
    onSelect?: () => void;
    disabled?: boolean;
    name: string;
    statusBadge?: React.ReactNode;
    subtitle?: string;
    onEdit?: () => void;
    onDelete?: () => void;
    canEdit: boolean;
    canDelete: boolean;
};

export function CatalogListItem({
    selected = false,
    onSelect,
    disabled = false,
    name,
    statusBadge,
    subtitle,
    onEdit,
    onDelete,
    canEdit,
    canDelete,
}: CatalogListItemProps) {
    const isSelectable = onSelect != null && !disabled;
    const baseClass =
        'flex items-center justify-between gap-1.5 sm:gap-2 rounded-md border py-1.5 px-2 sm:py-2 sm:px-2.5 transition-colors shrink-0';
    const selectableClass =
        onSelect != null
            ? disabled
                ? 'cursor-not-allowed opacity-60 border-border/50 bg-muted/20'
                : 'cursor-pointer ' +
                  (selected ? 'border-inv-primary/50 bg-inv-primary/5' : 'border-border/50 hover:bg-muted/30')
            : 'border-border/50 hover:bg-muted/30';

    const actions = (
        <div
            className="flex shrink-0 gap-1"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
        >
            {canEdit && onEdit && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer size-7 sm:size-8 text-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
                    aria-label={`Editar ${name}`}
                    onClick={onEdit}
                >
                    <Pencil className="size-4" />
                </Button>
            )}
            {canDelete && onDelete && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer size-7 sm:size-8 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                    aria-label={`Eliminar ${name}`}
                    onClick={onDelete}
                >
                    <Trash2 className="size-4" />
                </Button>
            )}
        </div>
    );

    const labelContent =
        subtitle != null ? (
            <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-foreground">{name}</span>
                <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
            </div>
        ) : (
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">{name}</span>
                {statusBadge}
            </div>
        );

    if (onSelect != null) {
        return (
            <li
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-disabled={disabled}
                className={`${baseClass} ${selectableClass}`}
                onClick={() => !disabled && onSelect?.()}
                onKeyDown={(e) => {
                    if (disabled) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect?.();
                    }
                }}
            >
                {labelContent}
                {actions}
            </li>
        );
    }

    return (
        <li className={`${baseClass} ${selectableClass}`}>
            {labelContent}
            {actions}
        </li>
    );
}
