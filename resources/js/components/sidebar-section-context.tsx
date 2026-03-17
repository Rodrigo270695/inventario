import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useCurrentUrl } from '@/hooks/use-current-url';

type SidebarSectionContextValue = {
    /** Secciones abiertas manualmente por el usuario (clic en el chevron). Al navegar se vacía. */
    openedSectionKeys: Set<string>;
    /** Abre o cierra una sección manualmente. No afecta a las demás. */
    toggleSection: (sectionKey: string, open: boolean) => void;
    currentUrl: string;
};

const SidebarSectionContext = createContext<SidebarSectionContextValue | null>(null);

export function SidebarSectionProvider({ children }: { children: ReactNode }) {
    const { currentUrl } = useCurrentUrl();
    const [openedSectionKeys, setOpenedSectionKeys] = useState<Set<string>>(() => new Set());

    useEffect(() => {
        setOpenedSectionKeys(new Set());
    }, [currentUrl]);

    const toggleSection = useCallback((sectionKey: string, open: boolean) => {
        setOpenedSectionKeys((prev) => {
            const next = new Set(prev);
            if (open) next.add(sectionKey);
            else next.delete(sectionKey);
            return next;
        });
    }, []);

    const value: SidebarSectionContextValue = {
        openedSectionKeys,
        toggleSection,
        currentUrl,
    };

    return (
        <SidebarSectionContext.Provider value={value}>
            {children}
        </SidebarSectionContext.Provider>
    );
}

export function useSidebarSection() {
    const ctx = useContext(SidebarSectionContext);
    return ctx;
}
