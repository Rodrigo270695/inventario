import { useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { AppModal } from '@/components/app-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Supplier } from '@/types';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    supplier: Supplier | null;
};

export function SupplierFormModal({ open, onOpenChange, supplier }: Props) {
    const isEdit = supplier != null;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: supplier?.name ?? '',
        ruc: supplier?.ruc ?? '',
        contact_name: supplier?.contact_name ?? '',
        contact_email: supplier?.contact_email ?? '',
        contact_phone: supplier?.contact_phone ?? '',
        address: supplier?.address ?? '',
        payment_conditions: supplier?.payment_conditions ?? '',
        is_active: supplier?.is_active ?? true,
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
            name: supplier?.name ?? '',
            ruc: supplier?.ruc ?? '',
            contact_name: supplier?.contact_name ?? '',
            contact_email: supplier?.contact_email ?? '',
            contact_phone: supplier?.contact_phone ?? '',
            address: supplier?.address ?? '',
            payment_conditions: supplier?.payment_conditions ?? '',
            is_active: supplier?.is_active ?? true,
        });
        setRucInfoLink(null);
    }, [
        open,
        supplier?.id,
        supplier?.name,
        supplier?.ruc,
        supplier?.contact_name,
        supplier?.contact_email,
        supplier?.contact_phone,
        supplier?.address,
        supplier?.payment_conditions,
        supplier?.is_active,
    ]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...data };
        if (isEdit && supplier) {
            put(`/admin/suppliers/${supplier.id}`, {
                preserveScroll: true,
                data: payload,
                transform: () => payload,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        } else {
            post('/admin/suppliers', {
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
                    'Accept': 'application/json',
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
                setData('name', razon.toUpperCase());
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
            title={isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}
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
                    {errors.ruc && <p className="text-sm text-destructive">{errors.ruc}</p>}
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
                        onChange={(e) => setData('name', e.target.value.toUpperCase())}
                        maxLength={200}
                        className={errors.name ? 'border-destructive' : ''}
                        placeholder="ej. DISTRIBUIDORA TECH SAC"
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
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
                    {errors.contact_name && <p className="text-sm text-destructive">{errors.contact_name}</p>}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                            type="email"
                            value={data.contact_email}
                            onChange={(e) => setData('contact_email', e.target.value)}
                            maxLength={255}
                            className={errors.contact_email ? 'border-destructive' : ''}
                            placeholder="contacto@proveedor.com"
                        />
                        {errors.contact_email && <p className="text-sm text-destructive">{errors.contact_email}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label>Teléfono</Label>
                        <Input
                            value={data.contact_phone}
                            onChange={(e) => setData('contact_phone', e.target.value)}
                            maxLength={30}
                            className={errors.contact_phone ? 'border-destructive' : ''}
                            placeholder="ej. 01 234 5678"
                        />
                        {errors.contact_phone && <p className="text-sm text-destructive">{errors.contact_phone}</p>}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Dirección</Label>
                    <textarea
                        value={data.address}
                        onChange={(e) => setData('address', e.target.value)}
                        rows={2}
                        className={cn(
                            'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                            errors.address && 'border-destructive'
                        )}
                        placeholder="Dirección fiscal"
                    />
                    {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
                </div>
                <div className="space-y-2">
                    <Label>Condiciones de pago</Label>
                    <textarea
                        value={data.payment_conditions}
                        onChange={(e) => setData('payment_conditions', e.target.value)}
                        rows={2}
                        className={cn(
                            'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                            errors.payment_conditions && 'border-destructive'
                        )}
                        placeholder="ej. 30 días, contado"
                    />
                    {errors.payment_conditions && <p className="text-sm text-destructive">{errors.payment_conditions}</p>}
                </div>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setData('is_active', !data.is_active)}>
                    <input
                        type="checkbox"
                        id="supplier-is_active"
                        checked={data.is_active}
                        onChange={(e) => setData('is_active', e.target.checked)}
                        className="cursor-pointer rounded border-border size-4 accent-[var(--color-inv-primary)]"
                    />
                    <Label htmlFor="supplier-is_active" className="cursor-pointer">Activo</Label>
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
                        {processing ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear proveedor'}
                    </Button>
                </div>
            </form>
        </AppModal>
    );
}
