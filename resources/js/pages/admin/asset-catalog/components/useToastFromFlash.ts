import { usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { ToastMessage } from '@/components/toast';

export function useToastFromFlash() {
    const { props } = usePage();
    const flash = props.flash as { toast?: ToastMessage } | undefined;
    const [toastQueue, setToastQueue] = useState<Array<ToastMessage & { id: number }>>([]);
    const lastFlashToastRef = useRef<ToastMessage | null>(null);

    useEffect(() => {
        const t = flash?.toast;
        if (!t) return;
        if (t === lastFlashToastRef.current) return;
        lastFlashToastRef.current = t;
        const id = Date.now();
        const payload = { ...t, id };
        queueMicrotask(() => setToastQueue((q) => [...q, payload]));
    }, [flash?.toast]);

    const dismiss = (id: number) => {
        setToastQueue((q) => q.filter((i) => i.id !== id));
    };

    return { toastQueue, dismiss };
}
