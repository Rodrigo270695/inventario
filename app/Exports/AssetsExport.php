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
            $brandName = $asset->model?->brand?->name ?? '—';

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

            $createdAt = $asset->created_at
                ? $asset->created_at->locale('es')->timezone('America/Lima')->format('d M Y')
                : '—';

            return [
                $code,
                $category,
                $subcategory,
                $modelName ?? '—',
                $brandName,
                $status,
                $condition,
                $zonal,
                $office,
                $warehouse,
                $registeredBy,
                $createdAt,
            ];
        });
    }

    public function headings(): array
    {
        return [
            'Código',
            'Categoría',
            'Subcategoría',
            'Modelo',
            'Marca',
            'Estado',
            'Condición',
            'Zonal',
            'Oficina',
            'Almacén',
            'Registrado por',
            'Creado',
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 16, // Código
            'B' => 22, // Categoría
            'C' => 26, // Subcategoría
            'D' => 26, // Modelo
            'E' => 18, // Marca
            'F' => 14, // Estado
            'G' => 14, // Condición
            'H' => 16, // Zonal
            'I' => 20, // Oficina
            'J' => 20, // Almacén
            'K' => 22, // Registrado por
            'L' => 14, // Creado
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
}
