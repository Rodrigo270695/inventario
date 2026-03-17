import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type AppModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    /** Descripción para accesibilidad (se oculta visualmente si no se proporciona texto visible). */
    description?: string;
    children: React.ReactNode;
    className?: string;
    contentClassName?: string;
    /** Ancho del modal: 'default' (max-w-md) o 'wide' (90vw, max 64rem). Evita que DialogContent lo pise. */
    width?: 'default' | 'wide';
};

export function AppModal({
    open,
    onOpenChange,
    title,
    description,
    children,
    className,
    contentClassName,
    width = 'default',
}: AppModalProps) {
    const style = width === 'wide' ? { maxWidth: 'min(90vw, 64rem)', width: '90vw' } : undefined;
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn('gap-0 p-0 max-h-[90vh] flex flex-col', className ?? 'max-w-md')}
                style={style}
                onPointerDownOutside={(e) => e.preventDefault()}
            >
                <DialogHeader className="shrink-0 px-6 py-4">
                    <DialogTitle className="text-base font-semibold">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {description || 'Contenido del diálogo'}
                    </DialogDescription>
                </DialogHeader>
                <Separator className="bg-border shrink-0" />
                <div className={cn('min-h-0 flex-1 overflow-y-auto px-6 py-4', contentClassName)}>
                    {children}
                </div>
            </DialogContent>
        </Dialog>
    );
}
