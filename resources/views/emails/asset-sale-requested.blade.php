@php
    $path = function ($warehouse) {
        if (! $warehouse) {
            return '—';
        }

        return collect([
            $warehouse->office?->zonal?->name,
            $warehouse->office?->name,
            $warehouse->name,
        ])->filter()->join(' / ') ?: '—';
    };

    $itemLabel = function ($disposal) {
        if ($disposal->asset) {
            return collect([
                $disposal->asset->code,
                $disposal->asset->category?->name,
                $disposal->asset->model?->brand?->name,
                $disposal->asset->model?->name,
                $disposal->asset->serial_number ? 'Serie: '.$disposal->asset->serial_number : null,
            ])->filter()->join(' · ');
        }

        if ($disposal->component) {
            return collect([
                $disposal->component->code,
                $disposal->component->type?->name,
                $disposal->component->brand?->name,
                $disposal->component->model,
                $disposal->component->serial_number ? 'Serie: '.$disposal->component->serial_number : null,
            ])->filter()->join(' · ');
        }

        return 'Bien sin referencia';
    };

    $creatorName = collect([
        $sale->createdBy?->name,
        $sale->createdBy?->last_name,
    ])->filter()->join(' ') ?: ($sale->createdBy?->usuario ?: '—');
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Nueva venta registrada</title>
    <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 0; padding: 24px; background: #f9fafb; }
        .container { max-width: 900px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
        .header { background: #447794; color: #ffffff; padding: 20px 24px; }
        .header h1 { margin: 0 0 6px; font-size: 20px; }
        .content { padding: 24px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #fef3c7; color: #92400e; font-size: 12px; font-weight: 700; }
        .section-title { margin: 24px 0 10px; font-size: 15px; font-weight: 700; color: #111827; }
        .meta { margin: 0; font-size: 14px; line-height: 1.6; }
        .button { display: inline-block; margin-top: 20px; background: #447794; color: #ffffff !important; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-weight: 700; }
        .box { border-radius: 10px; border: 1px solid #e5e7eb; padding: 14px 16px; background: #f9fafb; margin-top: 14px; font-size: 13px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Nueva venta pendiente de aprobación</h1>
            <div>Se registró una venta que requiere tu revisión y aprobación.</div>
        </div>

        <div class="content">
            <p class="meta">
                <strong>Estado:</strong> <span class="badge">Pendiente de aprobación</span><br>
                <strong>Registrada por:</strong> {{ $creatorName }}<br>
                <strong>Comprador:</strong> {{ $sale->buyer_name }}<br>
                <strong>Monto:</strong> {{ $sale->amount !== null ? 'S/ '.number_format($sale->amount, 2) : '—' }}<br>
                <strong>Ubicación:</strong> {{ $path($sale->disposal->warehouse) }}<br>
                <strong>Fecha y hora de registro:</strong> {{ optional($sale->created_at)->format('d/m/Y H:i') ?? '—' }}
            </p>

            <div class="section-title">Bien</div>
            <div class="box">
                {{ $itemLabel($sale->disposal) }}
            </div>

            <a class="button" href="{{ $detailUrl }}">Ver ventas</a>
        </div>
    </div>
</body>
</html>

