import AppLogoIcon from '@/components/app-logo-icon';

/** Marca: mismo criterio que el panel izquierdo del login (Inventario + badge TI). Primer hijo = SVG fijo para modo icono del sidebar sin distorsión. */
export default function AppLogo() {
    return (
        <>
            <AppLogoIcon className="size-[19px] shrink-0 fill-current text-inv-primary" />
            <span className="ml-1 flex min-w-0 flex-1 items-center gap-1.5">
                <span className="truncate text-base font-semibold tracking-tight text-sidebar-foreground">
                    Inventario
                </span>
                <span className="shrink-0 text-base font-semibold text-inv-primary">
                    TI
                </span>
            </span>
        </>
    );
}
