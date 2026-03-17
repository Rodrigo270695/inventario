import { AssetTransferForm } from '@/components/asset-transfers/transfer-form';
import type { BreadcrumbItem } from '@/types';

type WarehouseOption = {
    id: string;
    name: string;
    code: string | null;
    office?: {
        id: string;
        name: string;
        code: string | null;
        zonal?: { id: string; name: string; code: string } | null;
    } | null;
};

type AssetOption = {
    id: string;
    code: string;
    serial_number?: string | null;
    warehouse_id?: string | null;
    condition: string;
    category?: { id: string; name: string; code?: string | null } | null;
    model?: { id: string; name: string; brand?: { id: string; name: string } | null } | null;
};

type ComponentOption = {
    id: string;
    code: string;
    serial_number?: string | null;
    warehouse_id?: string | null;
    condition: string;
    type?: { id: string; name: string; code?: string | null } | null;
    brand?: { id: string; name: string } | null;
    model?: string | null;
};

type Props = {
    originWarehouses: WarehouseOption[];
    destinationWarehouses: WarehouseOption[];
    assets: AssetOption[];
    components: ComponentOption[];
    users: Array<{ id: string; name?: string | null; last_name?: string | null; usuario?: string | null }>;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Activos', href: '#' },
    { title: 'Traslados', href: '/admin/asset-transfers' },
    { title: 'Nuevo traslado', href: '/admin/asset-transfers/create' },
];

export default function AssetTransferCreate(props: Props) {
    return (
        <AssetTransferForm
            {...props}
            breadcrumbs={breadcrumbs}
            title="Nuevo traslado"
            subtitle="Complete el encabezado y añada los ítems a trasladar."
            submitLabel="Guardar traslado"
        />
    );
}
