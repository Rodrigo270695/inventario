import { useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
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
import type { RepairShop, Zonal } from '@/types';

type ZonalOption = { id: string; name: string; code: string };

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    repairShop: RepairShop | null;
    zonals: ZonalOption[];
};

export function RepairShopFormModal({ open, onOpenChange, repairShop, zonals }: Props) {
    const isEdit = repairShop != null;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: repairShop?.name ?? '',
        ruc: repairShop?.ruc ?? '',
        contact_name: repairShop?.contact_name ?? '',
        phone: repairShop?.phone ?? '',
        address: repairShop?.address ?? '',
        zonal_id: repairShop?.zonal_id ?? '',
        is_active: repairShop?.is_active ?? true,
    });

    const [rucLoading, setRucLoading] = useState(false);
    const [rucInfoLink, setRucInfoLink] = useState<string | null>(null);

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
            name: repairShop?.name ?? '',
            ruc: repairShop?.ruc ?? '',
            contact_name: repairShop?.contact_name ?? '',
            phone: repairShop?.phone ?? '',
            address: repairShop?.address ?? '',
            zonal_id: repairShop?.zonal_id ?? '',
            is_active: repairShop?.is_active ?? true,
        });
        setRucInfoLink(null);
    }, [
        open,
        repairShop?.id,
        repairShop?.name,
        repairShop?.ruc,
        repairShop?.contact_name,
        repairShop?.phone,
        repairShop?.address,
        repairShop?.zonal_id,
        repairShop?.is_active,
    ]);

    const handleNameChange = (value: string) => {
        setData((prev) => ({ ...prev, name: value.toUpperCase() }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...data,
            zonal_id: data.zonal_id === '' ? null : data.zonal_id,
        };
        if (isEdit && repairShop) {
            put(`/admin/repair-shops/${repairShop.id}`, {
                preserveScroll: true,
                data: payload,
                transform: () => payload,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        } else {
            post('/admin/repair-shops', {
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

    const canSubmit = data.name.trim() !== '' && data.ruc.trim() !== '';

    const handleSearchRuc = async () => {
        const ruc = data.ruc.trim();
        if (ruc.length !== 11) return;
        try {
            setRucLoading(true);
            const resp = await fetch(`/admin/api-peru/ruc?ruc=${encodeURIComponent(ruc)}`, {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                },
            });
            const json = await resp.json();
            if (!json.ok) {
                return;
            }
            const info = json.data?.data ?? json.data;
            const razon =
                (info?.razon_social ?? info?.nombre_o_razon_social ?? '').toString();
            const direccion = (info?.direccion ?? info?.domicilio_fiscal ?? '').toString();
            const estado = (info?.estado ?? '').toString().toUpperCase();
            if (razon !== '') {
                setData((prev) => ({ ...prev, name: razon.toUpperCase() }));
            }
            if (direccion !== '') {
                setData('address', direccion);
            }
            if (estado !== '') {
                setData('is_active', estado === 'ACTIVO' || estado === 'HABIDO');
            }
            setRucInfoLink(`/admin/api-peru/ruc-info?ruc=${encodeURIComponent(ruc)}`);
        } finally {
            setRucLoading(false);
        }
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Editar taller externo' : 'Nuevo taller externo'}
            contentClassName="space-y-4"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label>
                        RUC <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2">
                        <Input
                            value={data.ruc}
                            onChange={(e) => setData('ruc', e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSearchRuc();
                                }
                            }}
                            maxLength={11}
                            className={errors.ruc ? 'border-destructive' : ''}
                            placeholder="ej. 20123456789"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                            disabled={rucLoading || data.ruc.trim().length !== 11}
                            onClick={handleSearchRuc}
                        >
                            {rucLoading ? 'Buscando…' : 'Consultar'}
                        </Button>
                    </div>
                    {errors.ruc && (
                        <p className="text-sm text-destructive">{errors.ruc}</p>
                    )}
                    {rucInfoLink && (
                        <button
                            type="button"
                            className="text-xs text-inv-primary hover:underline"
                            onClick={() => window.open(rucInfoLink!, '_blank')}
                        >
                            Ver información SUNAT (deuda, representantes, establecimientos…)
                        </button>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>
                        Nombre <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        value={data.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        maxLength={200}
                        className={errors.name ? 'border-destructive' : ''}
                        placeholder="ej. TALLER CENTRAL"
                    />
                    {errors.name && (
                        <p className="text-sm text-destructive">{errors.name}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>Contacto</Label>
                    <Input
                        value={data.contact_name}
                        onChange={(e) => setData('contact_name', e.target.value)}
                        maxLength={150}
                        className={errors.contact_name ? 'border-destructive' : ''}
                        placeholder="Nombre del contacto"
                    />
                    {errors.contact_name && (
                        <p className="text-sm text-destructive">
                            {errors.contact_name}
                        </p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                        value={data.phone}
                        onChange={(e) => setData('phone', e.target.value)}
                        maxLength={30}
                        className={errors.phone ? 'border-destructive' : ''}
                        placeholder="ej. 01 234 5678"
                    />
                    {errors.phone && (
                        <p className="text-sm text-destructive">{errors.phone}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>Dirección</Label>
                    <Input
                        value={data.address}
                        onChange={(e) => setData('address', e.target.value)}
                        className={errors.address ? 'border-destructive' : ''}
                        placeholder="Dirección del taller"
                    />
                    {errors.address && (
                        <p className="text-sm text-destructive">{errors.address}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>Zonal</Label>
                    <Select
                        value={data.zonal_id === '' ? '_' : data.zonal_id}
                        onValueChange={(v) => setData('zonal_id', v === '_' ? '' : v)}
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
                </div>
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => setData('is_active', !data.is_active)}
                >
                    <input
                        type="checkbox"
                        id="repair_shop-is_active"
                        checked={data.is_active}
                        onChange={(e) => setData('is_active', e.target.checked)}
                        className="cursor-pointer rounded border-border size-4 accent-inv-primary"
                    />
                    <Label
                        htmlFor="repair_shop-is_active"
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
                              : 'Crear taller'}
                    </Button>
                </div>
            </form>
        </AppModal>
    );
}
