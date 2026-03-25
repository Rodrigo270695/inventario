@php
    $actor = $actorUser
        ? (collect([$actorUser->name, $actorUser->last_name])->filter()->join(' ') ?: ($actorUser->usuario ?? '—'))
        : '—';

    $officePath = collect([
        $order->office?->zonal?->name,
        $order->office?->name,
    ])->filter()->join(' / ') ?: '—';

    $badgeClass = match ($action) {
        'approved' => 'background: #dcfce7; color: #166534;',
        'rejected' => 'background: #fee2e2; color: #991b1b;',
        'observed' => 'background: #fef3c7; color: #92400e;',
        default => 'background: #f3f4f6; color: #374151;',
    };

    $headline = match ($action) {
        'approved' => 'Orden aprobada (aprobación general)',
        'rejected' => 'Orden rechazada (aprobación general)',
        'observed' => 'Orden en observación (aprobación general)',
        default => 'Actualización de orden',
    };

    $badgeText = match ($action) {
        'approved' => 'Aprobada',
        'rejected' => 'Rechazada',
        'observed' => 'Observada',
        default => 'Actualización',
    };
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>{{ $headline }}</title>
    <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 0; padding: 24px; background: #f9fafb; }
        .container { max-width: 900px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
        .header { background: #447794; color: #ffffff; padding: 20px 24px; }
        .header h1 { margin: 0 0 6px; font-size: 20px; }
        .content { padding: 24px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; {{ $badgeClass }} }
        .meta { margin: 0; font-size: 14px; line-height: 1.6; }
        .button { display: inline-block; margin-top: 20px; background: #447794; color: #ffffff !important; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-weight: 700; }
        .note { margin-top: 16px; padding: 12px; background: #f9fafb; border-radius: 8px; font-size: 13px; color: #374151; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{ $headline }}</h1>
            <div>Orden <strong>{{ $order->code ? '#'.$order->code : 'de compra' }}</strong></div>
        </div>
        <div class="content">
            <p class="meta">
                <strong>Estado:</strong> <span class="badge">{{ $badgeText }}</span><br>
                <strong>Resolución por:</strong> {{ $actor }}<br>
                <strong>Zonal / oficina:</strong> {{ $officePath }}<br>
                <strong>Proveedor:</strong> {{ $order->supplier?->name ?? '—' }}
            </p>
            @if (!empty($notes))
                <div class="note"><strong>Nota / observación:</strong><br>{{ $notes }}</div>
            @endif
            <a class="button" href="{{ $detailUrl }}">Ver orden de compra</a>
        </div>
    </div>
</body>
</html>
