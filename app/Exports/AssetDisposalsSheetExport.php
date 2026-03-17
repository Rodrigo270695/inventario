<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class AssetDisposalsSheetExport implements FromCollection, WithHeadings, WithColumnWidths, WithStyles, WithEvents, WithTitle
{
    public function __construct(
        private Collection $disposals
    ) {}

    public function title(): string
    {
        return 'Bajas';
    }

    public function collection(): Collection
    {
        return $this->disposals->map(function ($disposal) {
            $itemParts = [];
            if ($disposal->asset) {
                $itemParts[] = $disposal->asset->code;
                $itemParts[] = $disposal->asset->category?->name;
                $itemParts[] = $disposal->asset->model?->brand?->name;
                $itemParts[] = $disposal->asset->model?->name;
                $itemParts[] = $disposal->asset->serial_number;
            } elseif ($disposal->component) {
                $itemParts[] = $disposal->component->code;
                $itemParts[] = $disposal->component->type?->name;
                $itemParts[] = $disposal->component->brand?->name;
                $itemParts[] = $disposal->component->model;
                $itemParts[] = $disposal->component->serial_number;
            }
            $item = implode(' · ', array_filter($itemParts)) ?: '—';

            $statusLabels = [
                'requested' => 'Solicitado',
                'approved' => 'Aprobado',
                'rejected' => 'Rechazado',
            ];
            $status = $statusLabels[$disposal->status] ?? $disposal->status;

            $createdAt = $disposal->created_at
                ? $disposal->created_at->timezone('America/Lima')->locale('es')->format('d M Y, H:i')
                : '—';
            $approvedAt = $disposal->approved_at
                ? $disposal->approved_at->timezone('America/Lima')->locale('es')->format('d M Y, H:i')
                : '—';

            $warehouse = $disposal->warehouse;
            $zonalName = $warehouse?->office?->zonal?->name ?? $warehouse?->office?->zonal?->code;
            $officeName = $warehouse?->office?->name ?? $warehouse?->office?->code;
            $warehouseName = $warehouse?->name ?? $warehouse?->code;

            $zonal = $zonalName ?: '—';
            $office = $officeName ?: '—';
            $warehouseLabel = $warehouseName ?: '—';

            $createdBy = $this->fullName($disposal->createdByUser ?? null);
            $approvedBy = $this->fullName($disposal->approvedByUser ?? null);

            return [
                $item,
                $status,
                $disposal->reason ?: '—',
                $zonal,
                $office,
                $warehouseLabel,
                $createdBy,
                $createdAt,
                $approvedBy,
                $approvedAt,
            ];
        });
    }

    public function headings(): array
    {
        return [
            'Bien',
            'Estado',
            'Motivo de baja',
            'Zonal',
            'Oficina',
            'Almacén',
            'Creado por',
            'Fecha creación',
            'Aprobado por',
            'Fecha aprobación',
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 40,
            'B' => 14,
            'C' => 40,
            'D' => 18,
            'E' => 24,
            'F' => 24,
            'G' => 22,
            'H' => 20,
            'I' => 22,
            'J' => 20,
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

