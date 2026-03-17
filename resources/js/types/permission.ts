/**
 * Permiso (Spatie) para el modal de roles.
 */
export type Permission = {
    id: number;
    name: string;
};

/**
 * Nodo del árbol de permisos (como explorador de archivos).
 * - Si `permission` está definido, es una hoja (checkbox).
 * - Si `children` está definido, es carpeta (expandir y opción "seleccionar todo").
 */
export type PermissionTreeNode = {
    key: string;
    label: string;
    permission?: string;
    children?: PermissionTreeNode[];
};
