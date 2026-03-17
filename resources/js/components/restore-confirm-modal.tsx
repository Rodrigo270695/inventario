import { AppModal } from '@/components/app-modal';
import { Button } from '@/components/ui/button';

export type RestoreCandidate = {
    type: 'zonal' | 'office' | 'warehouse' | 'repair_shop' | 'department' | 'asset_model' | 'supplier' | 'asset';
    id: string;
    name: string;
};

type RestoreConfirmModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    candidate: RestoreCandidate | null;
    onConfirm: () => void;
    loading?: boolean;
};

const typeLabel: Record<RestoreCandidate['type'], string> = {
    zonal: 'zonal',
    office: 'oficina',
    warehouse: 'almacén',
    repair_shop: 'taller externo',
    department: 'departamento',
    asset_model: 'modelo (catálogo)',
    supplier: 'proveedor',
    asset: 'activo',
};

export function RestoreConfirmModal({
    open,
    onOpenChange,
    candidate,
    onConfirm,
    loading = false,
}: RestoreConfirmModalProps) {
    const label = candidate ? typeLabel[candidate.type] : '';

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title="Registro ya existió"
            contentClassName="space-y-4"
        >
            <p className="text-muted-foreground text-sm">
                Este {label} (<strong>{candidate?.name}</strong>) ya estuvo en el sistema y fue eliminado.
                ¿Desea volver a activarlo? No se creará un duplicado; el registro se restaurará.
            </p>
            <div className="flex justify-end gap-2">
                <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => onOpenChange(false)}
                    className="cursor-pointer"
                >
                    Cancelar
                </Button>
                <Button
                    type="button"
                    disabled={loading}
                    onClick={onConfirm}
                    className="cursor-pointer bg-inv-primary hover:bg-inv-primary/90 text-white disabled:opacity-50"
                >
                    {loading ? 'Restaurando…' : 'Sí, restaurar'}
                </Button>
            </div>
        </AppModal>
    );
}
