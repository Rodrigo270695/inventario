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

class AssetTransfersExport implements FromCollection, WithHeadings, WithColumnWidths, WithStyles, WithEvents
{
    public function __construct(
        private Collection $transfers
    ) {}

    public function collection(): Collection
    {
        $statusLabels = [
            'pending_approval' => 'Por aprobar',
            'approved' => 'Aprobado',
            'in_transit' => 'En tránsito',
            'received' => 'Recibido',
            'cancelled' => 'Cancelado',
        ];

        return $this->transfers->map(function ($transfer) use ($statusLabels) {
            return [
                '#'.$transfer->code,
                $transfer->originWarehouse?->office?->zonal?->name ?? $transfer->originWarehouse?->office?->zonal?->code ?? '—',
                $transfer->originWarehouse?->office?->name ?? $transfer->originWarehouse?->office?->code ?? '—',
                $transfer->originWarehouse?->name ?? $transfer->originWarehouse?->code ?? '—',
                $transfer->destinationWarehouse?->office?->zonal?->name ?? $transfer->destinationWarehouse?->office?->zonal?->code ?? '—',
                $transfer->destinationWarehouse?->office?->name ?? $transfer->destinationWarehouse?->office?->code ?? '—',
                $transfer->destinationWarehouse?->name ?? $transfer->destinationWarehouse?->code ?? '—',
                $statusLabels[$transfer->status] ?? $transfer->status ?? '—',
                (string) ($transfer->items_count ?? $transfer->items?->count() ?? 0),
                $transfer->carrier_name ?? '—',
                $transfer->tracking_number ?? '—',
                $transfer->carrier_reference ?? '—',
                $transfer->company_guide_number ?? '—',
                $transfer->carrier_voucher_number ?? '—',
                $this->fullName($transfer->sentByUser),
                $this->fullName($transfer->receivedByUser),
                $this->fullName($transfer->approvedByUser),
                $transfer->ship_date?->locale('es')->timezone('America/Lima')->format('d M Y, H:i') ?? '—',
                $transfer->received_at?->locale('es')->timezone('America/Lima')->format('d M Y, H:i') ?? '—',
                $transfer->dispatch_notes ?? '—',
                $transfer->receipt_notes ?? '—',
                $transfer->cancellation_reason ?? '—',
                $transfer->created_at?->locale('es')->timezone('America/Lima')->format('d M Y, H:i') ?? '—',
            ];
        });
    }

    public function headings(): array
    {
        return [
            'Código',
            'Zonal origen',
            'Oficina origen',
            'Almacén origen',
            'Zonal destino',
            'Oficina destino',
            'Almacén destino',
            'Estado',
            'Ítems',
            'Transporte',
            'Seguimiento',
            'Referencia courier',
            'Guía empresa',
            'Voucher courier',
            'Despacha',
            'Recibe',
            'Aprobado por',
            'Fecha envío',
            'Fecha recepción',
            'Observ. despacho',
            'Observ. recepción',
            'Motivo cancelación',
            'Creado',
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 14,
            'B' => 18,
            'C' => 22,
            'D' => 22,
            'E' => 18,
            'F' => 22,
            'G' => 22,
            'H' => 14,
            'I' => 8,
            'J' => 18,
            'K' => 16,
            'L' => 18,
            'M' => 18,
            'N' => 18,
            'O' => 22,
            'P' => 22,
            'Q' => 22,
            'R' => 18,
            'S' => 18,
            'T' => 28,
            'U' => 28,
            'V' => 28,
            'W' => 18,
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
