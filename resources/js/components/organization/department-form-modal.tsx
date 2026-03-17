import { useForm } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
import { AppModal } from '@/components/app-modal';
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
import type { Department } from '@/types';

type ZonalOption = { id: string; name: string; code: string };
type DepartmentOption = { id: string; zonal_id: string; name: string; code: string | null };

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    department: Department | null;
    zonals: ZonalOption[];
    departmentsForSelect: DepartmentOption[];
};

export function DepartmentFormModal({
    open,
    onOpenChange,
    department,
    zonals,
    departmentsForSelect,
}: Props) {
    const isEdit = department != null;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        zonal_id: department?.zonal_id ?? '',
        name: department?.name ?? '',
        code: department?.code ?? '',
        parent_id: department?.parent_id ?? '',
        is_active: department?.is_active ?? true,
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
            zonal_id: department?.zonal_id ?? '',
            name: department?.name ?? '',
            code: department?.code ?? '',
            parent_id: department?.parent_id ?? '',
            is_active: department?.is_active ?? true,
        });
    }, [
        open,
        department?.id,
        department?.zonal_id,
        department?.name,
        department?.code,
        department?.parent_id,
        department?.is_active,
    ]);

    const parentOptions = useMemo(() => {
        if (!data.zonal_id) return [];
        return departmentsForSelect.filter(
            (d) => d.zonal_id === data.zonal_id && (isEdit ? d.id !== department?.id : true)
        );
    }, [data.zonal_id, departmentsForSelect, isEdit, department?.id]);

    const handleZonalChange = (v: string) => {
        const value = v === '_' ? '' : v;
        setData((prev) => ({ ...prev, zonal_id: value, parent_id: '' }));
    };

    const handleNameChange = (value: string) => {
        setData((prev) => ({ ...prev, name: value.toUpperCase() }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...data,
            parent_id: data.parent_id === '' ? null : data.parent_id,
        };
        if (isEdit && department) {
            put(`/admin/departments/${department.id}`, {
                preserveScroll: true,
                data: payload,
                transform: () => payload,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        } else {
            post('/admin/departments', {
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

    const canSubmit = data.zonal_id.trim() !== '' && data.name.trim() !== '';

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Editar departamento' : 'Nuevo departamento'}
            contentClassName="space-y-4"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label>
                        Zonal <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        value={data.zonal_id === '' ? '_' : data.zonal_id}
                        onValueChange={handleZonalChange}
                    >
                        <SelectTrigger className="w-full border-border bg-background">
                            <SelectValue placeholder="Seleccione zonal" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_">Seleccione zonal</SelectItem>
                            {zonals.map((z) => (
                                <SelectItem key={z.id} value={z.id}>
                                    {z.name} ({z.code})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.zonal_id && (
                        <p className="text-sm text-destructive">{errors.zonal_id}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>
                        Nombre <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        value={data.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        maxLength={150}
                        className={errors.name ? 'border-destructive' : ''}
                        placeholder="ej. VENTAS"
                    />
                    {errors.name && (
                        <p className="text-sm text-destructive">{errors.name}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>Código</Label>
                    <Input
                        value={data.code}
                        onChange={(e) => setData('code', e.target.value.toUpperCase())}
                        maxLength={30}
                        className={errors.code ? 'border-destructive' : ''}
                        placeholder="ej. VEN"
                    />
                    {errors.code && (
                        <p className="text-sm text-destructive">{errors.code}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>Departamento padre</Label>
                    <Select
                        value={data.parent_id === '' ? '_' : data.parent_id}
                        onValueChange={(v) => setData('parent_id', v === '_' ? '' : v)}
                    >
                        <SelectTrigger className="w-full border-border bg-background">
                            <SelectValue placeholder="Ninguno (raíz)" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_">Ninguno (raíz)</SelectItem>
                            {parentOptions.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                    {d.name} {d.code ? `(${d.code})` : ''}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => setData('is_active', !data.is_active)}
                >
                    <input
                        type="checkbox"
                        id="department-is_active"
                        checked={data.is_active}
                        onChange={(e) => setData('is_active', e.target.checked)}
                        className="cursor-pointer rounded border-border size-4 accent-inv-primary"
                    />
                    <Label htmlFor="department-is_active" className="cursor-pointer">
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
                              : 'Crear departamento'}
                    </Button>
                </div>
            </form>
        </AppModal>
    );
}
