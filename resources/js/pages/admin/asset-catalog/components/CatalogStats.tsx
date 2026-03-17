import { FolderOpen, Inbox, Layers, Package } from 'lucide-react';

type CatalogStatsProps = {
    subcategoriesCount: number;
    brandsCount: number;
    modelsCount: number;
    componentTypesCount: number;
};

export function CatalogStats({
    subcategoriesCount,
    brandsCount,
    modelsCount,
    componentTypesCount,
}: CatalogStatsProps) {
    return (
        <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 dark:bg-blue-500/20 text-gray-600 dark:text-gray-400">
                <FolderOpen className="size-3.5 text-blue-600 dark:text-blue-400" />
                <span>Subcategorías</span>
                <span className="font-semibold">{subcategoriesCount}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 dark:bg-violet-500/20 text-gray-600 dark:text-gray-400">
                <Package className="size-3.5 text-violet-600 dark:text-violet-400" />
                <span>Marcas</span>
                <span className="font-semibold">{brandsCount}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 dark:bg-emerald-500/20 text-gray-600 dark:text-gray-400">
                <Layers className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Modelos</span>
                <span className="font-semibold">{modelsCount}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 dark:bg-amber-500/20 text-gray-600 dark:text-gray-400">
                <Inbox className="size-3.5 text-amber-600 dark:text-amber-400" />
                <span>Tipos componente</span>
                <span className="font-semibold">{componentTypesCount}</span>
            </span>
        </div>
    );
}
