import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type SearchFilterProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    id?: string;
};

export function SearchFilter({
    value,
    onChange,
    placeholder = 'Buscar…',
    className,
    id = 'search-filter',
}: SearchFilterProps) {
    return (
        <div className={cn('relative', className)}>
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
                id={id}
                type="search"
                role="searchbox"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-9 pl-9 pr-3"
                autoComplete="off"
            />
        </div>
    );
}
