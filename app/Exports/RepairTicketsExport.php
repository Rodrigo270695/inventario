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

class RepairTicketsExport implements FromCollection, WithHeadings, WithColumnWidths, WithStyles, WithEvents
{
    public function __construct(
        private Collection $tickets
    ) {}

    public function collection(): Collection
    {
        $statusLabels = [
            'pending_approval' => 'Pendiente aprobación',
            'approved' => 'Aprobado',
            'rejected' => 'Rechazado',
            'diagnosed' => 'Diagnosticado',
            'in_progress' => 'En proceso',
            'completed' => 'Completado',
            'cancelled' => 'Cancelado',
        ];

        $priorityLabels = [
            'low' => 'Baja',
            'medium' => 'Media',
            'high' => 'Alta',
            'critical' => 'Crítica',
        ];

        $modeLabels = [
            'internal' => 'Interno',
            'external' => 'Externo',
            'warranty' => 'Garantía',
        ];

        return $this->tickets->map(function ($ticket) use ($statusLabels, $priorityLabels, $modeLabels) {
            $code = $ticket->code ?? '—';

            $itemParts = [];
            if ($ticket->asset) {
                $itemParts[] = $ticket->asset->code;
                $itemParts[] = $ticket->asset->category?->name;
                $itemParts[] = $ticket->asset->model?->brand?->name;
                $itemParts[] = $ticket->asset->model?->name;
            } elseif ($ticket->component) {
                $itemParts[] = $ticket->component->code;
                $itemParts[] = $ticket->component->type?->name;
                $itemParts[] = $ticket->component->brand?->name;
                $itemParts[] = $ticket->component->model;
            }
            $item = implode(' · ', array_filter($itemParts)) ?: '—';

            $status = $statusLabels[$ticket->status] ?? $ticket->status;
            $priority = $priorityLabels[$ticket->priority] ?? $ticket->priority;
            $mode = $modeLabels[$ticket->maintenance_mode] ?? $ticket->maintenance_mode;

            $technician = $this->fullName($ticket->technician);
            $repairShop = $ticket->repairShop?->name ?? '—';

            // Determinar almacén base: primero el directamente asociado al ticket,
            // si no existe, el del activo y si no, el del componente.
            $warehouse = $ticket->warehouse
                ?? $ticket->asset?->warehouse
                ?? $ticket->component?->warehouse;

            $zonalName = $warehouse?->office?->zonal?->name ?? $warehouse?->office?->zonal?->code;
            $officeName = $warehouse?->office?->name ?? $warehouse?->office?->code;
            $warehouseName = $warehouse?->name ?? $warehouse?->code;

            $zonal = $zonalName ?: '—';
            $office = $officeName ?: '—';
            $warehouseLabel = $warehouseName ?: '—';

            $reportedAt = $ticket->reported_at
                ? $ticket->reported_at->timezone('America/Lima')->locale('es')->format('d M Y, H:i')
                : '—';

            $completedAt = $ticket->completed_at
                ? $ticket->completed_at->timezone('America/Lima')->locale('es')->format('d M Y, H:i')
                : '—';

            return [
                $code,
                $item,
                $mode,
                $status,
                $priority,
                $technician,
                $repairShop,
                $zonal,
                $office,
                $warehouseLabel,
                $reportedAt,
                $completedAt,
            ];
        });
    }

    public function headings(): array
    {
        return [
            'Código',
            'Bien',
            'Modo',
            'Estado',
            'Prioridad',
            'Técnico',
            'Taller',
            'Zonal',
            'Oficina',
            'Almacén',
            'Reportado',
            'Completado',
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 14,  // Código
            'B' => 36,  // Bien
            'C' => 12,  // Modo
            'D' => 16,  // Estado
            'E' => 14,  // Prioridad
            'F' => 22,  // Técnico
            'G' => 22,  // Taller
            'H' => 18,  // Zonal
            'I' => 24,  // Oficina
            'J' => 22,  // Almacén
            'K' => 20,  // Reportado
            'L' => 20,  // Completado
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

