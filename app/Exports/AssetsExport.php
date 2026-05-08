<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class AssetsExport implements FromCollection, WithColumnWidths, WithEvents, WithHeadings, WithStyles
{
    public function __construct(
        private Collection $assets
    ) {}

    public function collection(): Collection
    {
        return $this->assets->map(function ($asset) {
            $code = $asset->code ?? '—';
            $categoryType = $asset->category?->type ?? null;
            $categoryName = $asset->category?->name ?? null;
            $typeLabels = [
                'fixed_asset' => 'Activo fijo',
                'minor_asset' => 'Activo menor',
                'intangible' => 'Intangible',
            ];
            $categoryTypeLabel = $categoryType
                ? ($typeLabels[$categoryType] ?? ucfirst(str_replace('_', ' ', $categoryType)))
                : null;
            $category = $categoryTypeLabel && $categoryName
                ? $categoryTypeLabel.' - '.$categoryName
                : ($categoryName ?? $categoryTypeLabel ?? '—');
            $subcategory = $asset->model?->subcategory?->name ?? '—';
            $modelName = $asset->model?->name ?? null;
            $brandName = $asset->model?->brand?->name ?? $asset->brand?->name ?? '—';

            $statusLabels = [
                'stored' => 'Almacenado',
                'active' => 'En uso',
                'in_repair' => 'En reparación',
                'in_transit' => 'En tránsito',
                'disposed' => 'Dado de baja',
                'sold' => 'Vendido',
                'unassigned' => 'Sin estado',
            ];
            $conditionLabels = [
                'new' => 'Nuevo',
                'good' => 'Bueno',
                'regular' => 'Regular',
                'damaged' => 'Dañado',
                'obsolete' => 'Obsoleto',
            ];

            $rawStatus = $asset->status;
            $r = $rawStatus === null ? '' : trim((string) $rawStatus);
            $statusKey = ($r === '' || $r === 'broken') ? 'unassigned' : $r;
            $status = $statusLabels[$statusKey] ?? $rawStatus ?? '—';
            $condition = $conditionLabels[$asset->condition] ?? $asset->condition ?? '—';

            $zonal = $asset->warehouse?->office?->zonal?->name
                ?? $asset->warehouse?->office?->zonal?->code
                ?? '—';
            $office = $asset->warehouse?->office?->name
                ?? $asset->warehouse?->office?->code
                ?? '—';
            $warehouse = $asset->warehouse?->name
                ?? $asset->warehouse?->code
                ?? '—';

            $registeredBy = $this->fullName($asset->registeredBy ?? null);
            $updatedBy = $this->fullName($asset->updatedBy ?? null);

            $createdAt = $this->formatDateTime($asset->created_at);
            $updatedAt = $this->formatDateTime($asset->updated_at);

            return [
                $asset->id ?? '—',
                $code,
                $asset->serial_number ?? '—',
                $asset->category_id ?? '—',
                $category,
                $asset->model?->subcategory_id ?? '—',
                $subcategory,
                $asset->brand_id ?? ($asset->model?->brand_id ?? '—'),
                $modelName ?? '—',
                $brandName,
                $asset->model_id ?? '—',
                $status,
                $condition,
                $this->formatMoney($asset->acquisition_value),
                $this->formatDate($asset->acquisition_date),
                $this->formatMoney($asset->current_value),
                $this->formatPercent($asset->depreciation_rate),
                $this->formatDate($asset->warranty_until),
                $asset->warehouse_id ?? '—',
                $zonal,
                $office,
                $warehouse,
                $asset->repair_shop_id ?? '—',
                $asset->repairShop?->name ?? '—',
                $asset->purchase_item_id ?? '—',
                $asset->purchaseItem?->description ?? '—',
                $registeredBy,
                $updatedBy,
                $createdAt,
                $updatedAt,
                $asset->notes ?? '—',
            ];
        });
    }

    public function headings(): array
    {
        return [
            'ID Activo',
            'Código',
            'N° serie',
            'ID Categoría',
            'Categoría',
            'ID Subcategoría',
            'Subcategoría',
            'ID Marca',
            'Modelo',
            'Marca',
            'ID Modelo',
            'Estado',
            'Condición',
            'Valor adquisición',
            'Fecha adquisición',
            'Valor actual',
            'Tasa depreciación (%)',
            'Garantía hasta',
            'ID Almacén',
            'Zonal',
            'Oficina',
            'Almacén',
            'ID Taller reparación',
            'Taller reparación',
            'ID Item compra',
            'Item compra',
            'Registrado por',
            'Actualizado por',
            'Creado',
            'Actualizado',
            'Notas',
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 38,
            'B' => 16,
            'C' => 20,
            'D' => 38,
            'E' => 28,
            'F' => 38,
            'G' => 28,
            'H' => 38,
            'I' => 26,
            'J' => 20,
            'K' => 38,
            'L' => 14,
            'M' => 14,
            'N' => 16,
            'O' => 14,
            'P' => 16,
            'Q' => 16,
            'R' => 38,
            'S' => 16,
            'T' => 22,
            'U' => 22,
            'V' => 38,
            'W' => 22,
            'X' => 38,
            'Y' => 28,
            'Z' => 28,
            'AA' => 18,
            'AB' => 18,
            'AC' => 40,
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

    private function fullName($user): string
    {
        if (! $user) {
            return '—';
        }
        $parts = array_filter([$user->name ?? null, $user->last_name ?? null]);

        return implode(' ', $parts) ?: ($user->usuario ?? '—');
    }

    private function formatMoney(mixed $value): string
    {
        if ($value === null || $value === '') {
            return '—';
        }

        return number_format((float) $value, 2, '.', '');
    }

    private function formatPercent(mixed $value): string
    {
        if ($value === null || $value === '') {
            return '—';
        }

        return number_format((float) $value, 2, '.', '');
    }

    private function formatDate(mixed $value): string
    {
        if (! $value) {
            return '—';
        }

        try {
            return $value->format('d/m/Y');
        } catch (\Throwable) {
            return '—';
        }
    }

    private function formatDateTime(mixed $value): string
    {
        if (! $value) {
            return '—';
        }

        try {
            return $value->locale('es')->timezone('America/Lima')->format('d M Y H:i');
        } catch (\Throwable) {
            return '—';
        }
    }
}
