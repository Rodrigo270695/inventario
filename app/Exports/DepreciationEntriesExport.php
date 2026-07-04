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

class DepreciationEntriesExport implements FromCollection, WithColumnWidths, WithEvents, WithHeadings, WithStyles
{
    public function __construct(
        private Collection $entries
    ) {}

    public function collection(): Collection
    {
        return $this->entries->map(function ($entry) {
            $asset = $entry->asset;
            $model = $asset?->model;
            $brand = $model?->brand?->name ?? $asset?->brand?->name;
            $subcategory = $model?->subcategory;
            $category = $asset?->category ?? $subcategory?->category;

            return [
                $asset?->code ?? '—',
                $asset?->serial_number ?? '—',
                $brand ?? '—',
                $model?->name ?? '—',
                $subcategory?->name ?? '—',
                $category?->name ?? '—',
                $this->formatMoney($asset?->acquisition_value),
                $this->formatDate($asset?->acquisition_date),
                $this->formatPercent($asset?->depreciation_rate),
                $this->formatMoney($asset?->current_value),
                $this->formatMoney($entry->amount),
            ];
        });
    }

    public function headings(): array
    {
        return [
            'Código del activo',
            'N° de serie',
            'Marca',
            'Modelo',
            'Subcategoría',
            'Categoría',
            'Precio de adquisición',
            'Fecha de compra',
            'Depreciación (%)',
            'Valor de activo actual',
            'Monto de la depreciación',
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 18,
            'B' => 22,
            'C' => 20,
            'D' => 26,
            'E' => 28,
            'F' => 32,
            'G' => 20,
            'H' => 16,
            'I' => 18,
            'J' => 22,
            'K' => 24,
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
}
