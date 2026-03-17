<?php

namespace App\Exports;

use App\Models\InventoryCount;
use App\Models\InventoryCountItem;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class InventoryCountExport implements FromCollection, WithHeadings, WithColumnWidths, WithStyles, WithEvents
{
    public function __construct(
        private InventoryCount $count
    ) {}

    public function collection(): Collection
    {
        $count = $this->count;
        $count->loadMissing([
            'warehouse:id,name,code,office_id',
            'warehouse.office:id,name,code,zonal_id',
            'warehouse.office.zonal:id,name,code',
            'reconciledBy:id,name,last_name,usuario',
            'items.asset:id,code,serial_number,category_id,model_id,warehouse_id,condition,status',
            'items.asset.category:id,name,code',
            'items.asset.model:id,name,brand_id',
            'items.asset.model.brand:id,name',
            'items.component:id,code,serial_number,type_id,brand_id,model,warehouse_id,condition,status',
            'items.component.type:id,name,code',
            'items.component.brand:id,name',
        ]);

        $zonal = $count->warehouse?->office?->zonal?->name ?? $count->warehouse?->office?->zonal?->code ?? '—';
        $office = $count->warehouse?->office?->name ?? '—';
        $warehouse = $count->warehouse?->name ?? '—';
        $countDate = $count->count_date ? $count->count_date->locale('es')->format('d/m/Y') : '—';
        $statusCount = $this->statusCountLabel($count->status);
        $reconciledBy = $this->fullName($count->reconciledBy);
        $reconciledAt = $count->reconciled_at ? $count->reconciled_at->locale('es')->format('d/m/Y H:i') : '—';

        $statusItemLabels = [
            'pending' => 'Pendiente',
            'counted' => 'Contado',
            'difference' => 'Con diferencia',
        ];

        return $count->items->map(function (InventoryCountItem $item) use (
            $zonal,
            $office,
            $warehouse,
            $countDate,
            $statusCount,
            $reconciledBy,
            $reconciledAt,
            $statusItemLabels
        ) {
            $asset = $item->asset;
            $component = $item->component;

            $labelParts = [];
            if ($asset) {
                $labelParts[] = $asset->code;
                $labelParts[] = $asset->category?->name;
                $labelParts[] = $asset->model?->brand?->name ?? '';
                $labelParts[] = $asset->model?->name ?? '';
                $labelParts[] = $asset->serial_number ?? '';
            } elseif ($component) {
                $labelParts[] = $component->code;
                $labelParts[] = $component->type?->name ?? '';
                $labelParts[] = $component->brand?->name ?? '';
                $labelParts[] = $component->model ?? '';
                $labelParts[] = $component->serial_number ?? '';
            }
            $label = implode(' · ', array_filter($labelParts)) ?: '—';
            $tipo = $asset ? 'Activo' : 'Componente';
            $code = $asset?->code ?? $component?->code ?? '—';

            $statusItem = 'pending';
            if ($item->counted_quantity > 0) {
                $statusItem = $item->difference === 0 ? 'counted' : 'difference';
            }
            $statusItemLabel = $statusItemLabels[$statusItem] ?? $statusItem;

            $condOriginal = $this->conditionLabel($asset?->condition ?? $component?->condition);
            $condAtCount = $this->conditionLabel($item->condition_at_count);

            $lifecycleStatus = $asset?->status ?? $component?->status ?? null;
            $lifecycleStatusLabel = $this->lifecycleStatusLabel($lifecycleStatus);
            $notes = $item->notes ?? '';

            return [
                $countDate,
                $zonal,
                $office,
                $warehouse,
                $statusCount,
                $code,
                $tipo,
                $label,
                (int) $item->expected_quantity,
                (int) $item->counted_quantity,
                (int) ($item->difference ?? 0),
                $statusItemLabel,
                $lifecycleStatusLabel,
                $condOriginal,
                $condAtCount,
                $notes,
                $reconciledBy,
                $reconciledAt,
            ];
        });
    }

    public function headings(): array
    {
        return [
            'Fecha conteo',
            'Zonal',
            'Oficina',
            'Almacén',
            'Estado conteo',
            'Código',
            'Tipo',
            'Descripción del bien',
            'Esperado',
            'Contado',
            'Dif.',
            'Estado ítem',
            'Estado inventario',
            'Cond. registrada',
            'Cond. al conteo',
            'Notas',
            'Reconciliado por',
            'Fecha reconciliación',
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 14,
            'B' => 18,
            'C' => 22,
            'D' => 20,
            'E' => 16,
            'F' => 16,
            'G' => 12,
            'H' => 42,
            'I' => 10,
            'J' => 10,
            'K' => 8,
            'L' => 18,
            'M' => 16,
            'N' => 18,
            'O' => 18,
            'P' => 24,
            'Q' => 22,
            'R' => 20,
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '447794'],
                ],
                'alignment' => ['wrapText' => true, 'vertical' => 'center'],
            ],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $highestRow = $sheet->getHighestRow();
                $highestCol = $sheet->getHighestColumn();
                if ($highestRow >= 1 && $highestCol) {
                    $sheet->setAutoFilter('A1:'.$highestCol.$highestRow);
                }
            },
        ];
    }

    private function statusCountLabel(?string $status): string
    {
        $map = [
            'in_progress' => 'En progreso',
            'reconciled' => 'Reconciliado',
            'closed' => 'Cerrado',
        ];

        return $map[$status ?? ''] ?? $status ?? '—';
    }

    private function conditionLabel(?string $value): string
    {
        if ($value === null || $value === '') {
            return '—';
        }
        $v = strtolower(trim($value));
        $map = [
            'new' => 'Nuevo', 'nuevo' => 'Nuevo',
            'good' => 'Bueno', 'bueno' => 'Bueno',
            'regular' => 'Regular', 'fair' => 'Regular',
            'damaged' => 'Dañado', 'malo' => 'Malo', 'bad' => 'Malo',
            'obsolete' => 'Obsoleto', 'obsoleto' => 'Obsoleto',
            'broken' => 'Malogrado', 'malogrado' => 'Malogrado',
            'in_repair' => 'En reparación', 'en_reparacion' => 'En reparación',
            'pending_disposal' => 'Con baja pendiente', 'baja_pendiente' => 'Con baja pendiente',
        ];

        return $map[$v] ?? ucfirst($value);
    }

    private function lifecycleStatusLabel(?string $status): string
    {
        if ($status === null || $status === '') {
            return '—';
        }

        $map = [
            'stored' => 'Almacenado',
            'active' => 'En uso',
            'in_repair' => 'En reparación',
            'in_transit' => 'En tránsito',
            'disposed' => 'Dado de baja',
            'sold' => 'Vendido',
        ];

        return $map[$status] ?? $status;
    }

    private function fullName($user): string
    {
        if (! $user) {
            return '—';
        }
        $parts = array_filter([$user->name ?? null, $user->last_name ?? null]);

        return implode(' ', $parts) ?: ($user->usuario ?? '—');
    }
}
