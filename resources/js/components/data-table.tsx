import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortOrder = 'asc' | 'desc';

export type DataTableColumn<T> = {
    key: string;
    label: string;
    sortable?: boolean;
    className?: string;
    render?: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
    columns: DataTableColumn<T>[];
    data: T[];
    keyExtractor: (row: T) => string | number;
    sortBy?: string;
    sortOrder?: SortOrder;
    onSort?: (key: string) => void;
    emptyMessage?: string;
    className?: string;
    /** Fila de cabecera extra (p. ej. buscador) dentro de la tabla, encima de las columnas */
    headerExtra?: React.ReactNode;
    /** 'neutral' = bordes y cabecera sin colores navy (para card). 'default' = cabecera inv-section */
    variant?: 'default' | 'neutral';
};

export function DataTable<T>({
    columns,
    data,
    keyExtractor,
    sortBy,
    sortOrder = 'asc',
    onSort,
    emptyMessage = 'No hay registros',
    className,
    headerExtra,
    variant = 'default',
}: DataTableProps<T>) {
    const isNeutral = variant === 'neutral';
    return (
        <div
            className={cn(
                'overflow-x-auto text-sm',
                isNeutral ? 'rounded-none border-0' : 'rounded-lg border border-inv-primary/40',
                className
            )}
        >
            <table className="w-full min-w-[400px]">
                <thead>
                    {headerExtra != null && (
                        <tr className={cn('border-b bg-background', isNeutral ? 'border-border' : 'border-inv-primary/30')}>
                            <td colSpan={columns.length} className="p-2">
                                {headerExtra}
                            </td>
                        </tr>
                    )}
                    <tr
                        className={cn(
                            'border-b',
                            isNeutral
                                ? 'border-border bg-muted/50'
                                : 'border-inv-primary/50 bg-inv-primary'
                        )}
                    >
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={cn(
                                    'px-4 py-3 text-left font-medium',
                                    col.sortable && onSort && 'cursor-pointer select-none',
                                    isNeutral ? 'text-foreground hover:bg-muted/70' : 'hover:bg-inv-primary/90',
                                    col.className
                                )}
                                onClick={() => col.sortable && onSort?.(col.key)}
                            >
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-1.5',
                                        !isNeutral && 'text-white'
                                    )}
                                >
                                    {col.label}
                                    {col.sortable && onSort && (
                                        <span className={isNeutral ? 'text-muted-foreground' : 'opacity-90'} aria-hidden>
                                            {sortBy !== col.key ? (
                                                <ArrowUpDown className="size-4" />
                                            ) : sortOrder === 'asc' ? (
                                                <ArrowUp className="size-4" />
                                            ) : (
                                                <ArrowDown className="size-4" />
                                            )}
                                        </span>
                                    )}
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className="text-muted-foreground bg-background px-4 py-8 text-center"
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((row, idx) => (
                            <tr
                                key={keyExtractor(row)}
                                className={cn(
                                    'border-b transition-colors last:border-b-0',
                                    isNeutral
                                        ? 'border-border/70 hover:bg-muted/30'
                                        : 'border-inv-primary/20 hover:bg-inv-primary/10',
                                    isNeutral ? (idx % 2 === 0 ? 'bg-background' : 'bg-muted/20') : (idx % 2 === 0 ? 'bg-background' : 'bg-inv-primary/5')
                                )}
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        className={cn('px-4 py-3', col.className)}
                                    >
                                        {col.render
                                            ? col.render(row)
                                            : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
