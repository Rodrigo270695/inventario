import { router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { PaginationLink as PaginationLinkType } from '@/types';
import { cn } from '@/lib/utils';

type TablePaginationProps = {
    from: number | null;
    to: number | null;
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number;
    links: PaginationLinkType[];
    buildPageUrl: (page: number) => string;
    onPerPageChange: (perPage: number) => void;
    perPageOptions?: number[];
    className?: string;
};

function PaginationLink({
    link,
    children,
}: {
    link: PaginationLinkType;
    children: React.ReactNode;
}) {
    if (link.active || !link.url) {
        return (
            <span
                className={cn(
                    'inline-flex min-w-9 items-center justify-center rounded-md border px-2 py-1.5 text-sm font-medium transition-colors',
                    link.active
                        ? 'border-inv-primary/50 bg-inv-primary/15 text-inv-primary'
                        : 'text-muted-foreground cursor-not-allowed border-transparent'
                )}
                aria-current={link.active ? 'page' : undefined}
            >
                {children}
            </span>
        );
    }
    return (
        <a
            href={link.url}
            onClick={(e) => {
                e.preventDefault();
                router.get(link.url!, {}, { preserveState: true, preserveScroll: true });
            }}
            className="cursor-pointer inline-flex min-w-9 items-center justify-center rounded-md border border-border px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-inv-primary/10 hover:border-inv-primary/30"
        >
            {children}
        </a>
    );
}

const prevNextLabel = (l: PaginationLinkType) =>
    /anterior|previous/i.test(l.label.replace(/&[^;]+;/g, '').trim()) ||
    /siguiente|next/i.test(l.label.replace(/&[^;]+;/g, '').trim());

export function TablePagination({
    from,
    to,
    total,
    perPage,
    currentPage,
    lastPage,
    links,
    buildPageUrl,
    onPerPageChange,
    perPageOptions = [10, 15, 25, 50],
    className,
}: TablePaginationProps) {
    const text =
        total === 0
            ? 'Mostrando 0 de 0 registros'
            : `Mostrando ${from ?? 0} a ${to ?? 0} de ${total} registros`;

    const [goToPage, setGoToPage] = useState('');
    const handleGoToPage = (e: React.FormEvent) => {
        e.preventDefault();
        const num = parseInt(goToPage, 10);
        if (Number.isFinite(num) && num >= 1 && num <= lastPage) {
            router.get(buildPageUrl(num), {}, { preserveState: true, preserveScroll: true });
            setGoToPage('');
        }
    };

    const prev = links.find((l) => /anterior|previous/i.test(l.label.replace(/&[^;]+;/g, '').trim()));
    const next = links.find((l) => /siguiente|next/i.test(l.label.replace(/&[^;]+;/g, '').trim()));
    const pages = links.filter((l) => !prevNextLabel(l));
    const hasPages = links.length > 1;

    return (
        <div
            className={cn(
                'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between lg:items-center',
                className
            )}
        >
            <div className="flex flex-wrap items-center gap-3">
                <p className="text-muted-foreground text-sm wrap-break-word">
                    {text}
                    {lastPage > 0 && (
                        <span className="ml-1 text-muted-foreground/80">
                            (página {currentPage} de {lastPage})
                        </span>
                    )}
                </p>
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm whitespace-nowrap">
                        Mostrar:
                    </span>
                    <Select
                        value={String(perPage)}
                        onValueChange={(v) => onPerPageChange(Number(v))}
                    >
                        <SelectTrigger className="h-8 w-[78px] shrink-0 border-border">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {perPageOptions.map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                    {n}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {hasPages && lastPage > 1 && (
                    <form onSubmit={handleGoToPage} className="flex items-center gap-1">
                        <span className="text-muted-foreground text-sm whitespace-nowrap">
                            Ir a:
                        </span>
                        <input
                            type="number"
                            min={1}
                            max={lastPage}
                            value={goToPage}
                            onChange={(e) => setGoToPage(e.target.value)}
                            className="h-8 w-14 rounded-md border border-border bg-transparent px-2 text-center text-sm"
                            aria-label="Número de página"
                        />
                        <Button type="submit" variant="outline" size="sm" className="h-8 cursor-pointer">
                            Ir
                        </Button>
                    </form>
                )}
            </div>
            {hasPages && (
                <nav
                    className="flex flex-wrap items-center justify-center gap-1 sm:justify-end"
                    aria-label="Paginación"
                >
                    {prev && (
                        <PaginationLink link={prev}>
                            <ChevronLeft className="size-4" />
                        </PaginationLink>
                    )}
                    {pages.map((link, i) => (
                        <PaginationLink key={i} link={link}>
                            <span dangerouslySetInnerHTML={{ __html: link.label }} />
                        </PaginationLink>
                    ))}
                    {next && (
                        <PaginationLink link={next}>
                            <ChevronRight className="size-4" />
                        </PaginationLink>
                    )}
                </nav>
            )}
        </div>
    );
}
