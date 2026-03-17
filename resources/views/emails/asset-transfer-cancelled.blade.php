@php
    $transferPath = function ($warehouse) {
        if (! $warehouse) {
            return '—';
        }

        return collect([
            $warehouse->office?->zonal?->name,
            $warehouse->office?->name,
            $warehouse->name,
        ])->filter()->join(' / ') ?: '—';
    };

    $itemLabel = function ($item) {
        if ($item->asset) {
            return collect([
                $item->asset->code,
                $item->asset->category?->name,
                $item->asset->model?->brand?->name,
                $item->asset->model?->name,
                $item->asset->serial_number ? 'Serie: '.$item->asset->serial_number : null,
            ])->filter()->join(' · ');
        }

        if ($item->component) {
            return collect([
                $item->component->code,
                $item->component->type?->name,
                $item->component->brand?->name,
                $item->component->model,
                $item->component->serial_number ? 'Serie: '.$item->component->serial_number : null,
            ])->filter()->join(' · ');
        }

        return 'Ítem sin referencia';
    };

    $conditionLabel = function ($value) {
        return [
            'new' => 'Nuevo',
            'good' => 'Bueno',
            'regular' => 'Regular',
            'damaged' => 'Dañado',
            'obsolete' => 'Obsoleto',
        ][$value] ?? ($value ?: '—');
    };

    $cancelledByName = collect([
        $transfer->cancelledByUser?->name,
        $transfer->cancelledByUser?->last_name,
    ])->filter()->join(' ') ?: ($transfer->cancelledByUser?->usuario ?: '—');
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Traslado cancelado</title>
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
        .note { margin-top: 12px; padding: 12px 14px; border-radius: 10px; background: #fef3c7; font-size: 13px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Traslado cancelado</h1>
            <div>El traslado <strong>{{ $transfer->code }}</strong> fue cancelado.</div>
        </div>

        <div class="content">
            <p class="meta">
                <strong>Estado:</strong> <span class="badge">Cancelado</span><br>
                <strong>Cancelado por:</strong> {{ $cancelledByName }}<br>
                <strong>Origen:</strong> {{ $transferPath($transfer->originWarehouse) }}<br>
                <strong>Destino:</strong> {{ $transferPath($transfer->destinationWarehouse) }}<br>
                <strong>Fecha de cancelación:</strong> {{ optional($transfer->cancelled_at)->format('d/m/Y H:i') ?? '—' }}
            </p>

            <div class="note">
                <strong>Motivo de cancelación:</strong><br>
                {{ $transfer->cancellation_reason ?: '—' }}
            </div>

            <div class="section-title">Detalle de ítems</div>
            <table class="grid" role="presentation">
                <thead>
                    <tr>
                        <th style="width: 60px;">#</th>
                        <th>Descripción</th>
                        <th style="width: 160px;">Condición salida</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($transfer->items as $index => $item)
                        <tr>
                            <td>{{ $index + 1 }}</td>
                            <td>{{ $itemLabel($item) }}</td>
                            <td>{{ $conditionLabel($item->condition_out) }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="3">No se registraron ítems.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>

            <a class="button" href="{{ $detailUrl }}">Ver detalle del traslado</a>
        </div>
    </div>
</body>
</html>
