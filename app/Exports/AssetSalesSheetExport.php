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

class AssetSalesSheetExport implements FromCollection, WithHeadings, WithColumnWidths, WithStyles, WithEvents, WithTitle
{
    public function __construct(
        private Collection $sales
    ) {}

    public function title(): string
    {
        return 'Ventas';
    }

    public function collection(): Collection
    {
        return $this->sales->map(function ($sale) {
            $disposal = $sale->disposal;

            $itemParts = [];
            if ($disposal?->asset) {
                $itemParts[] = $disposal->asset->code;
                $itemParts[] = $disposal->asset->category?->name;
                $itemParts[] = $disposal->asset->model?->brand?->name;
                $itemParts[] = $disposal->asset->model?->name;
                $itemParts[] = $disposal->asset->serial_number;
            } elseif ($disposal?->component) {
                $itemParts[] = $disposal->component->code;
                $itemParts[] = $disposal->component->type?->name;
                $itemParts[] = $disposal->component->brand?->name;
                $itemParts[] = $disposal->component->model;
                $itemParts[] = $disposal->component->serial_number;
            }
            $item = implode(' · ', array_filter($itemParts)) ?: '—';

            $statusLabels = [
                'pending_approval' => 'Pendiente aprobación',
                'approved' => 'Aprobado',
                'rejected' => 'Rechazado',
            ];
            $status = $statusLabels[$sale->status] ?? $sale->status;

            $warehouse = $disposal?->warehouse;
            $zonalName = $warehouse?->office?->zonal?->name ?? $warehouse?->office?->zonal?->code;
            $officeName = $warehouse?->office?->name ?? $warehouse?->office?->code;
            $warehouseName = $warehouse?->name ?? $warehouse?->code;

            $zonal = $zonalName ?: '—';
            $office = $officeName ?: '—';
            $warehouseLabel = $warehouseName ?: '—';

            $amount = $sale->amount !== null
                ? 'S/ '.number_format((float) $sale->amount, 2, '.', '')
                : '—';

            $soldAt = $sale->sold_at
                ? $sale->sold_at->timezone('America/Lima')->locale('es')->format('d M Y, H:i')
                : '—';

            $createdAt = $sale->created_at
                ? $sale->created_at->timezone('America/Lima')->locale('es')->format('d M Y, H:i')
                : '—';

            $createdBy = $this->fullName($sale->createdBy ?? null);
            $approvedBy = $this->fullName($sale->approvedBy ?? null);

            return [
                $sale->buyer_name,
                $sale->buyer_dni ?: '—',
                $item,
                $amount,
                $sale->payment_method ?: '—',
                $status,
                $zonal,
                $office,
                $warehouseLabel,
                $createdBy,
                $createdAt,
                $approvedBy,
                $soldAt,
            ];
        });
    }

    public function headings(): array
    {
        return [
            'Comprador',
            'DNI/RUC',
            'Bien',
            'Monto',
            'Forma de pago',
            'Estado',
            'Zonal',
            'Oficina',
            'Almacén',
            'Creado por',
            'Fecha creación',
            'Aprobado por',
            'Fecha venta',
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 26,
            'B' => 14,
            'C' => 40,
            'D' => 14,
            'E' => 18,
            'F' => 18,
            'G' => 18,
            'H' => 22,
            'I' => 22,
            'J' => 22,
            'K' => 20,
            'L' => 22,
            'M' => 20,
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

