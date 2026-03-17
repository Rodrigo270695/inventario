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

class PurchaseOrdersExport implements FromCollection, WithHeadings, WithColumnWidths, WithStyles, WithEvents
{
    public function __construct(
        private Collection $orders
    ) {}

    public function collection(): Collection
    {
        $statusLabels = [
            'pending' => 'Pendiente',
            'observed' => 'Observado',
            'approved' => 'Aprobada',
            'rejected' => 'Rechazada',
        ];

        return $this->orders->map(function ($order) use ($statusLabels) {
            $code = $order->code ? '#'.$order->code : '—';
            $supplierName = $order->supplier?->name ?? '—';
            $ruc = $order->supplier?->ruc ?? '';

            $zonal = $order->office?->zonal?->name ?? $order->office?->zonal?->code ?? '—';
            $office = $order->office?->name ?? $order->office?->code ?? '—';

            $status = $statusLabels[$order->status] ?? $order->status;

            $totalFormatted = $order->total_amount !== null
                ? 'S/ '.number_format((float) $order->total_amount, 2, '.', '')
                : '—';

            $requestedBy = $this->fullName($order->requestedByUser);

            $gerOper = $this->formatLevel($order->approvedByUser, $order->approved_at, $order->rejectedByUser, $order->rejected_at);

            $createdAt = $order->created_at
                ? $order->created_at->locale('es')->format('d M Y')
                : '—';

            return [
                $code,
                $supplierName,
                $ruc,
                $zonal,
                $office,
                $status,
                $totalFormatted,
                $requestedBy,
                $gerOper,
                $createdAt,
            ];
        });
    }

    public function headings(): array
    {
        return [
            'Código',
            'Proveedor',
            'RUC',
            'Zonal',
            'Oficina',
            'Estado',
            'Total',
            'Solicitado por',
            'Ger. Oper.',
            'Creado',
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 14,  // Código
            'B' => 22,  // Proveedor
            'C' => 14,  // RUC
            'D' => 18,  // Zonal
            'E' => 24,  // Oficina
            'F' => 14,  // Estado
            'G' => 12,  // Total
            'H' => 22,  // Solicitado por
            'I' => 28,  // Ger. Oper.
            'J' => 14,  // Creado
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

    private function formatLevel($approvedUser, $approvedAt, $rejectedUser, $rejectedAt): string
    {
        if ($approvedAt && $approvedUser) {
            $name = $this->fullName($approvedUser);
            $date = $approvedAt->locale('es')->format('d M Y, H:i');

            return 'Apr. '.$name.' '.$date;
        }
        if ($rejectedAt && $rejectedUser) {
            $name = $this->fullName($rejectedUser);
            $date = $rejectedAt->locale('es')->format('d M Y, H:i');

            return 'Rech. '.$name.' '.$date;
        }

        return '—';
    }
}
