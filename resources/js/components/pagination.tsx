import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationLink as PaginationLinkType } from '@/types';
import { cn } from '@/lib/utils';

type PaginationProps = {
    links: PaginationLinkType[];
    from: number | null;
    to: number | null;
    total: number;
    currentPage?: number;
    lastPage?: number;
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
                    'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm',
                    link.active
                        ? 'bg-inv-primary text-white font-medium'
                        : 'text-muted-foreground cursor-not-allowed'
                )}
            >
                {children}
            </span>
        );
    }
    return (
        <Link
            href={link.url}
            preserveState
            className="cursor-pointer text-foreground hover:bg-inv-surface/20 inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors"
        >
            {children}
        </Link>
    );
}

export function Pagination({
    links,
    from,
    to,
    total,
    currentPage = 1,
    lastPage = 1,
    className,
}: PaginationProps) {
    if (total === 0) return null;

    const prev = links.find((l) => /anterior|previous/i.test(l.label.replace(/&[^;]+;/g, '').trim()));
    const next = links.find((l) => /siguiente|next/i.test(l.label.replace(/&[^;]+;/g, '').trim()));
    const pages = links.filter(
        (l) => !/anterior|previous|siguiente|next/i.test(l.label.replace(/&[^;]+;/g, '').trim())
    );

    return (
        <div
            className={cn(
                'flex flex-wrap items-center justify-between gap-3 sm:justify-between',
                className
            )}
        >
            <p className="text-muted-foreground text-sm">
                {from != null && to != null ? (
                    <>
                        Mostrando <span className="font-medium text-foreground">{from}</span> a{' '}
                        <span className="font-medium text-foreground">{to}</span> de{' '}
                        <span className="font-medium text-foreground">{total}</span> resultados
                        {' · '}
                        Página <span className="font-medium text-foreground">{currentPage}</span>
                        {' de '}
                        <span className="font-medium text-foreground">{lastPage}</span>
                    </>
                ) : (
                    <>
                        <span className="font-medium text-foreground">{total}</span>
                        {' resultados'}
                    </>
                )}
            </p>
            <nav className="flex items-center gap-1" aria-label="Paginación">
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
        </div>
    );
}
