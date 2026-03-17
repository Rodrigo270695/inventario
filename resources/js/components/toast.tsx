import { useEffect, useRef } from 'react';
import { CheckCircle2, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastMessage = {
    type?: 'success' | 'error' | 'info';
    message: string;
};

type ToastProps = {
    toast: ToastMessage | null;
    onDismiss?: () => void;
    duration?: number;
    className?: string;
};

export function Toast({ toast, onDismiss, duration = 3000, className }: ToastProps) {
    const onDismissRef = useRef(onDismiss);
    onDismissRef.current = onDismiss;

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => {
            onDismissRef.current?.();
        }, duration);
        return () => clearTimeout(t);
    }, [toast, duration]);

    if (!toast) return null;

    const isSuccess = toast.type === 'success';
    const isError = toast.type === 'error';

    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                'pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border px-4 py-3.5 shadow-lg',
                'bg-card/95 backdrop-blur-sm',
                isSuccess &&
                    'border-inv-primary/30 bg-inv-primary/5 text-foreground shadow-inv-primary/10',
                isError &&
                    'border-red-400/30 bg-red-500/5 text-red-900 dark:text-red-100 shadow-red-500/10',
                !isSuccess &&
                    !isError &&
                    'border-border bg-card text-card-foreground',
                'animate-in fade-in-0 slide-in-from-right-4 duration-300',
                className
            )}
        >
            <span
                className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-lg',
                    isSuccess && 'bg-inv-primary/15 text-inv-primary',
                    isError && 'bg-red-500/15 text-red-600 dark:text-red-400',
                    !isSuccess && !isError && 'bg-muted text-muted-foreground'
                )}
            >
                {isSuccess && <CheckCircle2 className="size-5" />}
                {isError && <XCircle className="size-5" />}
                {!isSuccess && !isError && null}
            </span>
            <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
                {toast.message}
            </p>
            <button
                type="button"
                onClick={onDismiss}
                className="cursor-pointer shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Cerrar"
            >
                <X className="size-4" />
            </button>
        </div>
    );
}
