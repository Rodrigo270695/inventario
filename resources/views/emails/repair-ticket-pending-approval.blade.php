@php
    $itemLabel = function (\App\Models\RepairTicket $ticket) {
        if ($ticket->asset) {
            return collect([
                $ticket->asset->code,
                $ticket->asset->category?->name,
                $ticket->asset->model?->brand?->name,
                $ticket->asset->model?->name,
                $ticket->asset->serial_number ? 'Serie: '.$ticket->asset->serial_number : null,
            ])->filter()->join(' · ');
        }

        if ($ticket->component) {
            return collect([
                $ticket->component->code,
                $ticket->component->type?->name,
                $ticket->component->brand?->name,
                $ticket->component->model,
                $ticket->component->serial_number ? 'Serie: '.$ticket->component->serial_number : null,
            ])->filter()->join(' · ');
        }

        return 'Bien sin referencia';
    };

    $priorityLabel = [
        'low' => 'Baja',
        'medium' => 'Media',
        'high' => 'Alta',
        'critical' => 'Crítica',
    ][$ticket->priority] ?? $ticket->priority;

    $modeLabel = [
        'internal' => 'Interno',
        'external' => 'Externo',
        'warranty' => 'Garantía',
    ][$ticket->maintenance_mode] ?? $ticket->maintenance_mode;

    $failureLabel = [
        'hardware' => 'Hardware',
        'electrical' => 'Eléctrica',
        'physical' => 'Física',
        'cosmetic' => 'Estética',
        'connectivity' => 'Conectividad',
        'other' => 'Otro',
    ][$ticket->failure_type] ?? ($ticket->failure_type ?: '—');

    $conditionLabel = function ($value) {
        return [
            'new' => 'Nuevo',
            'good' => 'Bueno',
            'regular' => 'Regular',
            'damaged' => 'Dañado',
            'obsolete' => 'Obsoleto',
        ][$value] ?? ($value ?: '—');
    };

    $locationPath = function (\App\Models\RepairTicket $ticket) {
        $warehouse = $ticket->asset->warehouse ?? $ticket->component->warehouse ?? null;
        if (! $warehouse) {
            return '—';
        }

        return collect([
            $warehouse->office?->zonal?->name,
            $warehouse->office?->name,
            $warehouse->name,
        ])->filter()->join(' / ') ?: '—';
    };

    $userName = function ($user) {
        return collect([
            $user?->name,
            $user?->last_name,
        ])->filter()->join(' ') ?: ($user?->usuario ?: '—');
    };
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Ticket de reparación pendiente de aprobación</title>
    <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 0; padding: 24px; background: #f9fafb; }
        .container { max-width: 900px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
        .header { background: #447794; color: #ffffff; padding: 20px 24px; }
        .header h1 { margin: 0 0 6px; font-size: 20px; }
        .content { padding: 24px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #fef3c7; color: #92400e; font-size: 12px; font-weight: 700; }
        .grid { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .grid td, .grid th { border: 1px solid #e5e7eb; padding: 10px 12px; font-size: 13px; text-align: left; vertical-align: top; }
        .grid th { background: #f3f4f6; font-weight: 700; }
        .section-title { margin: 24px 0 10px; font-size: 15px; font-weight: 700; color: #111827; }
        .meta { margin: 0; font-size: 14px; line-height: 1.6; }
        .button { display: inline-block; margin-top: 20px; background: #447794; color: #ffffff !important; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-weight: 700; }
        .muted { color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Ticket de reparación pendiente de aprobación</h1>
            <div>Se registró el ticket <strong>{{ $ticket->code }}</strong> y requiere revisión.</div>
        </div>

        <div class="content">
            <p class="meta">
                <strong>Estado:</strong> <span class="badge">Por aprobar</span><br>
                <strong>Bien afectado:</strong> {{ $itemLabel($ticket) }}<br>
                <strong>Ubicación:</strong> {{ $locationPath($ticket) }}<br>
                <strong>Prioridad:</strong> {{ $priorityLabel }}<br>
                <strong>Modo:</strong> {{ $modeLabel }}<br>
                <strong>Tipo de falla:</strong> {{ $failureLabel }}<br>
                <strong>Condición ingreso:</strong> {{ $conditionLabel($ticket->condition_in) }}<br>
                <strong>Condición salida (prevista):</strong> {{ $conditionLabel($ticket->condition_out) }}<br>
                <strong>Reportado por:</strong> {{ $userName($ticket->openedByUser) }}<br>
                <strong>Técnico responsable:</strong> {{ $userName($ticket->technician) }}<br>
                <strong>Taller:</strong> {{ $ticket->repairShop?->name ?? '—' }}<br>
                <strong>Fecha de registro:</strong> {{ optional($ticket->reported_at)->format('d/m/Y H:i') ?? '—' }}
            </p>

            <div class="section-title">Detalle de la incidencia</div>
            <table class="grid" role="presentation">
                <tbody>
                    <tr>
                        <th style="width: 160px;">Incidencia reportada</th>
                        <td>{{ $ticket->issue_description }}</td>
                    </tr>
                    <tr>
                        <th>Diagnóstico (si aplica)</th>
                        <td>{{ $ticket->diagnosis ?: '—' }}</td>
                    </tr>
                    <tr>
                        <th>Referencia externa</th>
                        <td>{{ $ticket->external_reference ?: '—' }}</td>
                    </tr>
                    <tr>
                        <th>Notas internas</th>
                        <td>{{ $ticket->notes ?: '—' }}</td>
                    </tr>
                </tbody>
            </table>

            <a class="button" href="{{ $detailUrl }}">Ver detalle del ticket</a>
        </div>
    </div>
</body>
</html>

