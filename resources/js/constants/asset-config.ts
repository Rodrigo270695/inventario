/**
 * Configuración de la vista de activos (Configurar activo).
 *
 * El tab de "Datos de PC" / "Componentes" se habilita cuando:
 * - La subcategoría está en la lista permitida, o
 * - La categoría incluye "equipos de computo" (sin importar tildes/case).
 */
export const SUBCATEGORY_CODES_WITH_COMPUTER_TAB: string[] = [
    'CPU',
    'LAP',
    'IMP',
    'TICK',
    'SRV',
];

/** Fragmentos de categoría que habilitan tabs de PC (normalizados). */
export const CATEGORY_KEYWORDS_WITH_COMPUTER_TAB: string[] = [
    'EQUIPOS DE CÓMPUTO',
];

function normalizeKey(value: string | null | undefined): string {
    if (!value) return '';
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .trim();
}

export function shouldShowComputerTabs(params: {
    subcategoryCode?: string | null;
    categoryName?: string | null;
}): boolean {
    const subcategoryCode = normalizeKey(params.subcategoryCode);
    const categoryName = normalizeKey(params.categoryName);

    const matchesSubcategory =
        subcategoryCode !== '' &&
        SUBCATEGORY_CODES_WITH_COMPUTER_TAB.some((code) => normalizeKey(code) === subcategoryCode);

    const matchesCategory =
        categoryName !== '' &&
        CATEGORY_KEYWORDS_WITH_COMPUTER_TAB.some((keyword) => categoryName.includes(normalizeKey(keyword)));

    return matchesSubcategory || matchesCategory;
}
