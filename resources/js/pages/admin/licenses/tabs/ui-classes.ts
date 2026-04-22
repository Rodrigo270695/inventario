/** Mismo estilo que «Nuevo activo» en `admin/assets/index.tsx`. */
export const LICENSES_PRIMARY_ACTION_BTN =
    'inline-flex w-fit cursor-pointer items-center gap-2 rounded-md bg-inv-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-inv-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2';

/** Mismo estilo que el botón principal del footer en `asset-form-modal.tsx`. */
export const LICENSES_MODAL_SUBMIT_BTN =
    'cursor-pointer bg-inv-primary hover:bg-inv-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed';

/** Misma densidad y cabecera que la tabla de activos (`admin/assets/index.tsx`). */
export const LICENSES_DATA_TABLE_CLASSNAME =
    'text-[11px] leading-snug [&_th]:px-2.5 [&_th]:py-1.5 [&_td]:px-2.5 [&_td]:py-1.5 [&_th_svg]:size-3';

/**
 * Botones icono en tabla — mismas utilidades que `admin/assets/index.tsx`
 * (el variant `ghost` aplica `hover:text-accent-foreground`; hay que fijar color en hover).
 */
export const LICENSES_ICON_BTN_EDIT =
    'cursor-pointer shrink-0 size-7 gap-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30';

export const LICENSES_ICON_BTN_DELETE =
    'cursor-pointer shrink-0 size-7 gap-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400/80 dark:hover:bg-rose-900/20';

export const LICENSES_ICON_BTN_REVOKE =
    'cursor-pointer shrink-0 size-7 gap-0 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30';

/** Pie de tarjeta móvil — mismo patrón `variant="outline" size="sm"` que activos. */
export const LICENSES_MOBILE_BTN_EDIT =
    'cursor-pointer shrink-0 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30';

export const LICENSES_MOBILE_BTN_DELETE =
    'cursor-pointer shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/20';

export const LICENSES_MOBILE_BTN_REVOKE =
    'cursor-pointer shrink-0 border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30';
