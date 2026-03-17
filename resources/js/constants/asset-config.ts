/**
 * Configuración de la vista de activos (Configurar activo).
 *
 * SUBCATEGORÍAS CON TAB "DATOS DE PC"
 * -----------------------------------
 * Códigos de subcategoría para las cuales se muestra el tab "Datos de PC"
 * (hostname, IP, MAC, serial BIOS, last_seen_at). Coinciden con el campo
 * `code` de la tabla asset_subcategories.
 *
 * Para que un tipo de activo muestre ese tab: agrega aquí el código de su
 * subcategoría. Ej.: si creas una subcategoría "Impresoras" con code "IMP",
 * inclúyela en este array.
 */
export const SUBCATEGORY_CODES_WITH_COMPUTER_TAB: string[] = [
    'CPU',
    'LAP',
    'IMP',
    'TICK',
    'SRV',
];
