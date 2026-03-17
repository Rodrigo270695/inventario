import { cn } from '@/lib/utils';

export type DateRangeFilterValue = {
    date_from: string;
    date_to: string;
} | null;

type DateRangeFilterProps = {
    value: DateRangeFilterValue;
    onChange: (value: DateRangeFilterValue) => void;
    className?: string;
    id?: string;
};

export function DateRangeFilter({
    value,
    onChange,
    className,
    id = 'date-range-filter',
}: DateRangeFilterProps) {
    const dateFrom = value?.date_from ?? '';
    const dateTo = value?.date_to ?? '';
    const isDateToDisabled = !dateFrom;

    const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const from = e.target.value;
        if (!from) {
            onChange({ date_from: '', date_to: '' });
            return;
        }
        const to = dateTo;
        if (to && to < from) {
            onChange({ date_from: from, date_to: from });
        } else {
            onChange({ date_from: from, date_to: to });
        }
    };

    const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const to = e.target.value;
        onChange({ date_from: dateFrom, date_to: to });
    };

    return (
        <div
            className={cn('flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center', className)}
            id={id}
        >
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-initial">
                <label htmlFor={`${id}-from`} className="text-muted-foreground w-14 shrink-0 text-xs font-medium sm:w-auto">
                    Desde
                </label>
                <input
                    id={`${id}-from`}
                    type="date"
                    value={dateFrom}
                    onChange={handleFromChange}
                    className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-initial">
                <label htmlFor={`${id}-to`} className="text-muted-foreground w-14 shrink-0 text-xs font-medium sm:w-auto">
                    Hasta
                </label>
                <input
                    id={`${id}-to`}
                    type="date"
                    value={dateTo}
                    onChange={handleToChange}
                    disabled={isDateToDisabled}
                    min={dateFrom || undefined}
                    className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
            </div>
        </div>
    );
}
