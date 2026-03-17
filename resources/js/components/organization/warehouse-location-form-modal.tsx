import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
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
import type { Warehouse, WarehouseLocation } from '@/types';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    location: WarehouseLocation | null;
    warehouses: Warehouse[];
    selectedWarehouseId: string | null;
};

export function WarehouseLocationFormModal({
    open,
    onOpenChange,
    location,
    warehouses,
    selectedWarehouseId,
}: Props) {
    const isEdit = location != null;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        warehouse_id: location?.warehouse_id ?? selectedWarehouseId ?? '',
        code: location?.code ?? '',
        aisle: location?.aisle ?? '',
        row: location?.row ?? '',
        bin: location?.bin ?? '',
        is_active: location?.is_active ?? true,
    });

    const showWarehouseSelect = !selectedWarehouseId;
    const effectiveWarehouseId = data.warehouse_id || selectedWarehouseId || '';
    const canSubmit = effectiveWarehouseId !== '' && data.code.trim() !== '';

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
            warehouse_id: location?.warehouse_id ?? selectedWarehouseId ?? '',
            code: location?.code ?? '',
            aisle: location?.aisle ?? '',
            row: location?.row ?? '',
            bin: location?.bin ?? '',
            is_active: location?.is_active ?? true,
        });
    }, [open, location?.id, location?.warehouse_id, location?.code, location?.aisle, location?.row, location?.bin, location?.is_active, selectedWarehouseId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...data,
            warehouse_id: data.warehouse_id || selectedWarehouseId,
            aisle: data.aisle.trim() || null,
            row: data.row.trim() || null,
            bin: data.bin.trim() || null,
        };
        if (isEdit && location) {
            put(`/admin/warehouse-locations/${location.id}`, {
                preserveScroll: true,
                data: payload,
                transform: () => payload,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        } else {
            post('/admin/warehouse-locations', {
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

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Editar ubicación' : 'Nueva ubicación'}
            contentClassName="space-y-4"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {showWarehouseSelect && (
                    <div className="space-y-2">
                        <Label>Almacén <span className="text-red-500">*</span></Label>
                        <Select
                            value={data.warehouse_id === '' ? '_' : data.warehouse_id}
                            onValueChange={(v) => setData('warehouse_id', v === '_' ? '' : v)}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue placeholder="Seleccione almacén" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Seleccione almacén</SelectItem>
                                {warehouses.map((w) => (
                                    <SelectItem key={w.id} value={w.id}>
                                        {w.name} {w.code ? `(${w.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.warehouse_id && <p className="text-sm text-destructive">{errors.warehouse_id}</p>}
                    </div>
                )}
                <div className="space-y-2">
                    <Label>Código <span className="text-red-500">*</span></Label>
                    <Input
                        value={data.code}
                        onChange={(e) => setData('code', e.target.value.toUpperCase())}
                        maxLength={60}
                        className={errors.code ? 'border-destructive' : ''}
                        placeholder="ej. A1-B2-C3"
                    />
                    {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
                </div>
                <div className="space-y-2">
                    <Label>Pasillo</Label>
                    <Input
                        value={data.aisle}
                        onChange={(e) => setData('aisle', e.target.value)}
                        maxLength={30}
                        className={errors.aisle ? 'border-destructive' : ''}
                        placeholder="ej. A"
                    />
                    {errors.aisle && <p className="text-sm text-destructive">{errors.aisle}</p>}
                </div>
                <div className="space-y-2">
                    <Label>Fila</Label>
                    <Input
                        value={data.row}
                        onChange={(e) => setData('row', e.target.value)}
                        maxLength={30}
                        className={errors.row ? 'border-destructive' : ''}
                        placeholder="ej. 1"
                    />
                    {errors.row && <p className="text-sm text-destructive">{errors.row}</p>}
                </div>
                <div className="space-y-2">
                    <Label>Columna</Label>
                    <Input
                        value={data.bin}
                        onChange={(e) => setData('bin', e.target.value)}
                        maxLength={30}
                        className={errors.bin ? 'border-destructive' : ''}
                        placeholder="ej. 2"
                    />
                    {errors.bin && <p className="text-sm text-destructive">{errors.bin}</p>}
                </div>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setData('is_active', !data.is_active)}>
                    <input
                        type="checkbox"
                        id="location-is_active"
                        checked={data.is_active}
                        onChange={(e) => setData('is_active', e.target.checked)}
                        className="cursor-pointer rounded border-border size-4 accent-[var(--color-inv-primary)]"
                    />
                    <Label htmlFor="location-is_active" className="cursor-pointer">Activo</Label>
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
                        {processing ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear ubicación'}
                    </Button>
                </div>
            </form>
        </AppModal>
    );
}
