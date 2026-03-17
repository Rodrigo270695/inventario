@php
    $statusLabels = [
        'rejected' => 'Rechazado',
        'cancelled' => 'Cancelado',
        'diagnosed' => 'Diagnosticado',
        'in_progress' => 'En proceso',
        'completed' => 'Completado',
    ];

    $statusLabel = $statusLabels[$status] ?? $status;

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

    $locationPath = function (\App\Models\RepairTicket $ticket) {
        $warehouse = $ticket->warehouse ?? $ticket->asset?->warehouse ?? $ticket->component?->warehouse ?? null;
        if (! $warehouse) {
            return '—';
        }

        return collect([
            $warehouse->office?->zonal?->name ?? null,
            $warehouse->office?->name ?? null,
            $warehouse->name ?? null,
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
    <title>Cambio de estado de ticket</title>
    <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 0; padding: 24px; background: #f9fafb; }
        .container { max-width: 900px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
        .header { background: #447794; color: #ffffff; padding: 20px 24px; }
        .header h1 { margin: 0 0 6px; font-size: 20px; }
        .content { padding: 24px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #e5e7eb; color: #111827; font-size: 12px; font-weight: 700; }
        .badge--rejected, .badge--cancelled { background: #fee2e2; color: #b91c1c; }
        .badge--diagnosed { background: #e0e7ff; color: #3730a3; }
        .badge--in_progress { background: #e0f2fe; color: #0369a1; }
        .badge--completed { background: #dcfce7; color: #166534; }
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
            <h1>Cambio de estado del ticket {{ $ticket->code }}</h1>
            <div>El ticket <strong>{{ $ticket->code }}</strong> ahora se encuentra en estado <strong>{{ $statusLabel }}</strong>.</div>
        </div>

        <div class="content">
            <p class="meta">
                <strong>Estado actual:</strong>
                <span class="badge badge--{{ $status }}">
                    {{ $statusLabel }}
                </span><br>
                <strong>Bien afectado:</strong> {{ $itemLabel($ticket) }}<br>
                <strong>Ubicación:</strong> {{ $locationPath($ticket) }}<br>
                <strong>Reportado por:</strong> {{ $userName($ticket->openedByUser) }}<br>
                <strong>Técnico responsable:</strong> {{ $userName($ticket->technician) }}<br>
                <strong>Aprobado por:</strong> {{ $userName($ticket->approvedByUser) }}<br>
                <strong>Fecha de registro:</strong> {{ optional($ticket->reported_at)->format('d/m/Y H:i') ?? '—' }}<br>
                @if($ticket->approved_at)
                    <strong>Fecha de aprobación:</strong> {{ $ticket->approved_at->format('d/m/Y H:i') }}<br>
                @endif
            </p>

            @if($comment)
                <div class="section-title">Comentario</div>
                <p class="meta">{{ $comment }}</p>
            @endif

            <div class="section-title">Detalle de la incidencia</div>
            <table class="grid" role="presentation">
                <tbody>
                    <tr>
                        <th style="width: 160px;">Incidencia reportada</th>
                        <td>{{ $ticket->issue_description }}</td>
                    </tr>
                    <tr>
                        <th>Diagnóstico</th>
                        <td>{{ $ticket->diagnosis ?: '—' }}</td>
                    </tr>
                    <tr>
                        <th>Solución</th>
                        <td>{{ $ticket->solution ?: '—' }}</td>
                    </tr>
                </tbody>
            </table>

            <a class="button" href="{{ $detailUrl }}">Ver detalle del ticket</a>
        </div>
    </div>
</body>
</html>

