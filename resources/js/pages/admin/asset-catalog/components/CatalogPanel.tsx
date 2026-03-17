import type { LucideIcon } from 'lucide-react';
import { Inbox, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ActionButtonConfig = {
    show: boolean;
    label: string;
    onClick: () => void;
};

type EmptyStateConfig = {
    icon?: LucideIcon;
    message: string;
    primaryButton?: { label: string; onClick: () => void };
};

type CatalogPanelProps = {
    title: string;
    titleExtra?: React.ReactNode;
    actionButton?: ActionButtonConfig;
    emptyState?: EmptyStateConfig;
    children: React.ReactNode;
};

export function CatalogPanel({
    title,
    titleExtra,
    actionButton,
    emptyState,
    children,
}: CatalogPanelProps) {
    const isEmpty = emptyState != null;
    const Icon = emptyState?.icon ?? Inbox;

    return (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-border p-3 sm:p-4">
                <h2 className="font-semibold text-base text-foreground">
                    {title}
                    {titleExtra != null && (
                        <span className="ml-1 text-sm font-normal text-muted-foreground">
                            {titleExtra}
                        </span>
                    )}
                </h2>
                {actionButton?.show && (
                    <Button
                        size="sm"
                        onClick={actionButton.onClick}
                        className="cursor-pointer shrink-0 bg-inv-primary text-white hover:bg-inv-primary/90"
                    >
                        <Plus className="size-4" />
                        {actionButton.label}
                    </Button>
                )}
            </div>
            <div className="p-3 sm:p-4">
                {isEmpty ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-8">
                        <Icon className="size-10 text-muted-foreground/60" aria-hidden />
                        <span className="text-sm text-muted-foreground">{emptyState!.message}</span>
                        {emptyState!.primaryButton && (
                            <Button
                                size="sm"
                                onClick={emptyState!.primaryButton.onClick}
                                className="cursor-pointer mt-1 bg-inv-primary hover:bg-inv-primary/90 text-white"
                            >
                                <Plus className="size-4 mr-1" />
                                {emptyState!.primaryButton.label}
                            </Button>
                        )}
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
}
