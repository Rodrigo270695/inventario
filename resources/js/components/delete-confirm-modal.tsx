import { AppModal } from '@/components/app-modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { ReactNode } from 'react';

type DeleteConfirmModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string | ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    loading?: boolean;
};

export function DeleteConfirmModal({
    open,
    onOpenChange,
    title = 'Eliminar',
    description = '¿Está seguro? Esta acción no se puede deshacer.',
    confirmLabel = 'Eliminar',
    cancelLabel = 'Cancelar',
    onConfirm,
    loading = false,
}: DeleteConfirmModalProps) {
    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            contentClassName="space-y-4"
        >
            {typeof description === 'string' ? (
                <p className="text-muted-foreground text-sm">{description}</p>
            ) : (
                description
            )}
            <div className="flex justify-end gap-2">
                <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => onOpenChange(false)}
                >
                    {cancelLabel}
                </Button>
                <Button
                    type="button"
                    variant="destructive"
                    disabled={loading}
                    onClick={onConfirm}
                    className="cursor-pointer"
                >
                    {loading ? (
                        <Spinner className="size-4" />
                    ) : (
                        confirmLabel
                    )}
                </Button>
            </div>
        </AppModal>
    );
}
