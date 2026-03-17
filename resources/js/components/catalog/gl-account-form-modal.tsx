import { useForm } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
import { AppModal } from '@/components/app-modal';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { GlAccount } from '@/types';

type GlAccountOption = { id: string; code: string; name: string };

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    glAccount: GlAccount | null;
    glAccountsForSelect: GlAccountOption[];
    /** Al abrir para crear, preselecciona esta cuenta como padre (ej. "Añadir subcuenta" desde una fila). */
    initialParentId?: string | null;
};

const ACCOUNT_TYPES = [
    { value: 'asset', label: 'Activo' },
    { value: 'depreciation', label: 'Depreciación' },
    { value: 'expense', label: 'Gasto' },
    { value: 'income', label: 'Ingreso' },
    { value: 'other', label: 'Otro' },
];

export function GlAccountFormModal({
    open,
    onOpenChange,
    glAccount,
    glAccountsForSelect,
    initialParentId = null,
}: Props) {
    const isEdit = glAccount != null;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        code: glAccount?.code ?? '',
        name: glAccount?.name ?? '',
        account_type: glAccount?.account_type ?? '',
        parent_id: glAccount?.parent_id ?? initialParentId ?? '',
        is_active: glAccount?.is_active ?? true,
    });

    useEffect(() => {
        if (!open) {
            clearErrors();
            return;
        }
        const timer = setTimeout(() => {
            document.body.style.pointerEvents = '';
        }, 0);
        return () => {
            clearTimeout(timer);
            document.body.style.pointerEvents = 'auto';
        };
    }, [open, clearErrors]);

    useEffect(() => {
        if (!open) return;
        setData({
            code: glAccount?.code ?? '',
            name: glAccount?.name ?? '',
            account_type: glAccount?.account_type ?? '',
            parent_id: glAccount?.parent_id ?? initialParentId ?? '',
            is_active: glAccount?.is_active ?? true,
        });
    }, [
        open,
        glAccount?.id,
        glAccount?.code,
        glAccount?.name,
        glAccount?.account_type,
        glAccount?.parent_id,
        glAccount?.is_active,
        initialParentId,
    ]);

    const parentOptions = glAccountsForSelect.filter(
        (a) => !isEdit || a.id !== glAccount?.id
    );

    const parentSelectOptions = useMemo(
        () =>
            parentOptions.map((a) => ({
                value: a.id,
                label: `${a.code} — ${a.name}`,
                searchTerms: [a.code, a.name],
            })),
        [parentOptions]
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...data,
            parent_id: data.parent_id === '' ? null : data.parent_id,
            account_type: data.account_type === '' ? null : data.account_type,
        };
        if (isEdit && glAccount) {
            put(`/admin/gl-accounts/${glAccount.id}`, {
                preserveScroll: true,
                data: payload,
                transform: () => payload,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        } else {
            post('/admin/gl-accounts', {
                preserveScroll: true,
                data: payload,
                transform: () => payload,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        }
    };

    const canSubmit = data.code.trim() !== '' && data.name.trim() !== '';

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Editar cuenta contable' : 'Nueva cuenta contable'}
            contentClassName="space-y-4"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label>
                        Código <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        value={data.code}
                        onChange={(e) => setData('code', e.target.value)}
                        maxLength={20}
                        className={errors.code ? 'border-destructive' : ''}
                        placeholder="ej. 3361"
                    />
                    {errors.code && (
                        <p className="text-sm text-destructive">{errors.code}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>
                        Nombre <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        maxLength={200}
                        className={errors.name ? 'border-destructive' : ''}
                        placeholder="ej. Equipo para procesamiento de información"
                    />
                    {errors.name && (
                        <p className="text-sm text-destructive">{errors.name}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>Tipo de cuenta</Label>
                    <Select
                        value={data.account_type === '' ? '_' : data.account_type}
                        onValueChange={(v) =>
                            setData('account_type', v === '_' ? '' : v)
                        }
                    >
                        <SelectTrigger className="w-full border-border bg-background">
                            <SelectValue placeholder="Seleccione tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_">Ninguno</SelectItem>
                            {ACCOUNT_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                    {t.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Cuenta padre</Label>
                    <SearchableSelect
                        value={data.parent_id === '' ? '' : data.parent_id}
                        onChange={(v) => setData('parent_id', v)}
                        options={parentSelectOptions}
                        placeholder="Buscar por código o nombre..."
                        noOptionsMessage="No hay coincidencias"
                        isClearable
                    />
                </div>
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => setData('is_active', !data.is_active)}
                >
                    <input
                        type="checkbox"
                        id="gl_account-is_active"
                        checked={data.is_active}
                        onChange={(e) => setData('is_active', e.target.checked)}
                        className="cursor-pointer rounded border-border size-4 accent-inv-primary"
                    />
                    <Label
                        htmlFor="gl_account-is_active"
                        className="cursor-pointer"
                    >
                        Activo
                    </Label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="cursor-pointer"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={processing || !canSubmit}
                        className="cursor-pointer bg-inv-primary hover:bg-inv-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing
                            ? 'Guardando…'
                            : isEdit
                              ? 'Guardar'
                              : 'Crear cuenta'}
                    </Button>
                </div>
            </form>
        </AppModal>
    );
}
