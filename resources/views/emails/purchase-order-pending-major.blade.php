@php
    $requester = collect([
        $order->requestedByUser?->name,
        $order->requestedByUser?->last_name,
    ])->filter()->join(' ') ?: ($order->requestedByUser?->usuario ?? '—');

    $minorApprover = collect([
        $order->minorApprovedByUser?->name,
        $order->minorApprovedByUser?->last_name,
    ])->filter()->join(' ') ?: ($order->minorApprovedByUser?->usuario ?? '—');

    $officePath = collect([
        $order->office?->zonal?->name,
        $order->office?->name,
    ])->filter()->join(' / ') ?: '—';
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Orden de compra pendiente (general)</title>
    <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 0; padding: 24px; background: #f9fafb; }
        .container { max-width: 900px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
        .header { background: #447794; color: #ffffff; padding: 20px 24px; }
        .header h1 { margin: 0 0 6px; font-size: 20px; }
        .content { padding: 24px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #dbeafe; color: #1e3a8a; font-size: 12px; font-weight: 700; }
        .meta { margin: 0; font-size: 14px; line-height: 1.6; }
        .button { display: inline-block; margin-top: 20px; background: #447794; color: #ffffff !important; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-weight: 700; }
        .grid { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .grid td, .grid th { border: 1px solid #e5e7eb; padding: 10px 12px; font-size: 13px; text-align: left; vertical-align: top; }
        .grid th { background: #f3f4f6; font-weight: 700; }
        .section-title { margin: 24px 0 10px; font-size: 15px; font-weight: 700; color: #111827; }
        .muted { color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Orden de compra pendiente (aprobación general)</h1>
            <div>La orden <strong>{{ $order->code ? '#'.$order->code : 'de compra' }}</strong> ya fue aprobada en zonal y requiere aprobación general.</div>
        </div>
        <div class="content">
            <p class="meta">
                <strong>Estado:</strong> <span class="badge">Pendiente general</span><br>
                <strong>Solicitante:</strong> {{ $requester }}<br>
                <strong>Aprobó (zonal):</strong> {{ $minorApprover }}<br>
                <strong>Proveedor:</strong> {{ $order->supplier?->name ?? '—' }}@if ($order->supplier?->ruc) (RUC {{ $order->supplier->ruc }})@endif<br>
                <strong>Zonal / oficina:</strong> {{ $officePath }}<br>
                <strong>Total:</strong> {{ $order->total_amount !== null ? number_format((float) $order->total_amount, 2, ',', ' ') : '—' }}
            </p>

            @include('emails.partials.purchase-order-items-table')

            <a class="button" href="{{ $detailUrl }}">Ver orden de compra</a>
        </div>
    </div>
</body>
</html>
