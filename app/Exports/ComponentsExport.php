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

class ComponentsExport implements FromCollection, WithColumnWidths, WithEvents, WithHeadings, WithStyles
{
    public function __construct(
        private Collection $components
    ) {}

    public function collection(): Collection
    {
        $statusLabels = [
            'stored' => 'Almacenado',
            'active' => 'En uso',
            'in_repair' => 'En reparación',
            'in_transit' => 'En tránsito',
            'broken' => 'Malogrado',
            'disposed' => 'Dado de baja',
            'unassigned' => 'Sin estado',
        ];
        $conditionLabels = [
            'new' => 'Nuevo',
            'good' => 'Bueno',
            'regular' => 'Regular',
            'damaged' => 'Dañado',
            'obsolete' => 'Obsoleto',
        ];

        return $this->components->map(function ($component) use ($statusLabels, $conditionLabels) {
            $code = $component->code ?? '—';
            $serial = $component->serial_number ?? '—';
            $type = $component->type?->name ?? '—';
            $brand = $component->brand?->name ?? '—';
            $model = $component->model ?? '—';

            $categoryType = $component->subcategory?->category?->type ?? null;
            $categoryName = $component->subcategory?->category?->name ?? null;
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
            $subcategory = $component->subcategory?->name ?? '—';

            $rawStatus = $component->status;
            $statusKey = ($rawStatus === null || trim((string) $rawStatus) === '') ? 'unassigned' : (string) $rawStatus;
            $status = $statusLabels[$statusKey] ?? $rawStatus ?? '—';
            $condition = $conditionLabels[$component->condition] ?? $component->condition ?? '—';

            $zonal = $component->warehouse?->office?->zonal?->name
                ?? $component->warehouse?->office?->zonal?->code
                ?? '—';
            $office = $component->warehouse?->office?->name
                ?? $component->warehouse?->office?->code
                ?? '—';
            $warehouse = $component->warehouse?->name
                ?? $component->warehouse?->code
                ?? '—';

            $createdAt = $component->created_at
                ? $component->created_at->locale('es')->timezone('America/Lima')->format('d M Y')
                : '—';

            return [
                $code,
                $serial,
                $type,
                $brand,
                $model,
                $category,
                $subcategory,
                $status,
                $condition,
                $zonal,
                $office,
                $warehouse,
                $createdAt,
            ];
        });
    }

    public function headings(): array
    {
        return [
            'Código',
            'Nº serie',
            'Tipo',
            'Marca',
            'Modelo',
            'Categoría',
            'Subcategoría',
            'Estado',
            'Condición',
            'Zonal',
            'Oficina',
            'Almacén',
            'Creado',
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 16, // Código
            'B' => 18, // Nº serie
            'C' => 20, // Tipo
            'D' => 18, // Marca
            'E' => 22, // Modelo
            'F' => 30, // Categoría / Subcategoría
            'G' => 14, // Estado
            'H' => 14, // Condición
            'I' => 16, // Zonal
            'J' => 20, // Oficina
            'K' => 20, // Almacén
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
}
