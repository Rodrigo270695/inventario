import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type PerPageSelectProps = {
    value: number;
    options?: number[];
    onChange: (perPage: number) => void;
    label?: string;
    className?: string;
};

export function PerPageSelect({
    value,
    options = [5, 10, 15, 25],
    onChange,
    label = 'Por página',
    className,
}: PerPageSelectProps) {
    return (
        <div className={cn('flex items-center gap-2', className)}>
            <span className="text-muted-foreground text-sm">{label}</span>
            <Select
                value={String(value)}
                onValueChange={(v) => onChange(Number(v))}
            >
                <SelectTrigger className="cursor-pointer h-9 w-[70px]" aria-label={label}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                            {n}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
