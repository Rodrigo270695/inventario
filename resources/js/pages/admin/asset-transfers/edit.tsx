import { AssetTransferForm } from '@/components/asset-transfers/transfer-form';
import type { AssetTransfer, BreadcrumbItem } from '@/types';

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
    assetTransfer: AssetTransfer;
    originWarehouses: WarehouseOption[];
    destinationWarehouses: WarehouseOption[];
    assets: AssetOption[];
    components: ComponentOption[];
    users: Array<{ id: string; name?: string | null; last_name?: string | null; usuario?: string | null }>;
};

const breadcrumbs = (id: string): BreadcrumbItem[] => [
    { title: 'Activos', href: '#' },
    { title: 'Traslados', href: '/admin/asset-transfers' },
    { title: 'Editar traslado', href: `/admin/asset-transfers/${id}/edit` },
];

export default function AssetTransferEdit({ assetTransfer, ...rest }: Props) {
    const subtitle = [
        assetTransfer.code ? `Código: ${assetTransfer.code}` : 'Sin código',
        assetTransfer.origin_warehouse?.name ?? 'Origen',
        assetTransfer.destination_warehouse?.name ?? 'Destino',
    ].join(' · ');

    return (
        <AssetTransferForm
            {...rest}
            transfer={assetTransfer}
            breadcrumbs={breadcrumbs(assetTransfer.id)}
            title="Editar traslado"
            subtitle={subtitle}
            submitLabel="Actualizar traslado"
        />
    );
}
