import ReactSelect, { type GroupBase, type OptionsOrGroups } from 'react-select';

export type SearchableSelectOption = {
    value: string;
    label: string;
    /** Campos extra para búsqueda (ej. email, document_number). Se unen al texto buscable. */
    searchTerms?: string[];
};

type SearchableSelectProps = {
    value: string;
    onChange: (value: string) => void;
    options: SearchableSelectOption[];
    placeholder?: string;
    noOptionsMessage?: string;
    isClearable?: boolean;
    disabled?: boolean;
    id?: string;
    /** Si se pasa, se usa para filtrar; si no, se busca en label + searchTerms. */
    filterOption?: (option: SearchableSelectOption, input: string) => boolean;
    /** Para mostrar la opción de forma custom (ej. label + subtítulo). */
    formatOptionLabel?: (option: SearchableSelectOption, meta: { context: 'menu' | 'value' }) => React.ReactNode;
    className?: string;
};

const defaultFilter = (option: SearchableSelectOption, input: string): boolean => {
    const q = input.trim().toLowerCase();
    if (!q) return true;
    const searchText = [
        option.label,
        ...(option.searchTerms ?? []),
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    return q.split(/\s+/).every((word) => searchText.includes(word));
};

/**
 * Select con búsqueda reutilizable para usuarios, zonales, oficinas, almacenes, etc.
 * Recibe options con value/label y opcionalmente searchTerms para ampliar la búsqueda.
 */
export function SearchableSelect({
    value,
    onChange,
    options,
    placeholder = 'Buscar...',
    noOptionsMessage = 'No hay coincidencias',
    isClearable = true,
    disabled = false,
    id,
    filterOption,
    formatOptionLabel,
    className,
}: SearchableSelectProps) {
    const selected = options.find((o) => o.value === value) ?? null;

    return (
        <ReactSelect<SearchableSelectOption, false, GroupBase<SearchableSelectOption>>
            inputId={id}
            value={selected}
            onChange={(opt) => onChange(opt?.value ?? '')}
            options={options as OptionsOrGroups<SearchableSelectOption, GroupBase<SearchableSelectOption>>}
            placeholder={placeholder}
            noOptionsMessage={() => noOptionsMessage}
            isClearable={isClearable}
            isDisabled={disabled}
            filterOption={filterOption ?? defaultFilter}
            formatOptionLabel={formatOptionLabel}
            classNames={{
                control: () =>
                    `!min-h-9 !max-h-9 !rounded-md !border-border !border !bg-background !shadow-xs !text-sm w-full ${className ?? ''}`.trim(),
                valueContainer: () => '!py-0',
                singleValue: () => '!leading-9 !m-0 !text-sm',
                placeholder: () => '!text-muted-foreground !text-sm',
                menuPortal: () => 'z-[10050] pointer-events-auto',
                menu: () =>
                    '!rounded-md !border !border-border !bg-popover !text-popover-foreground !shadow-lg',
                option: () => '!text-sm',
                input: () => '!text-sm',
            }}
            menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
            menuPosition="fixed"
            styles={{
                control: (base) => ({ ...base, minHeight: 36, maxHeight: 36 }),
                input: (base) => ({ ...base, margin: 0, padding: 0 }),
                menuPortal: (base) => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
            }}
        />
    );
}
