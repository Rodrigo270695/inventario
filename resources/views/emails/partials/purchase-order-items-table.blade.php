{{-- Requiere $order con relación items (y assetCategory, assetSubcategory, assetBrand opcionales). --}}
@php
    $formatMoney = fn ($v) => $v !== null && $v !== '' ? number_format((float) $v, 2, ',', ' ') : '—';
    $itemLabel = function ($item) {
        $parts = collect([
            $item->description,
            $item->assetCategory?->name,
            $item->assetSubcategory?->name,
            $item->assetBrand?->name,
        ])->filter()->values();

        return $parts->isNotEmpty() ? $parts->join(' · ') : '—';
    };
@endphp
<div class="section-title">Detalle de ítems</div>
<table class="grid" role="presentation">
    <thead>
        <tr>
            <th style="width: 48px;">#</th>
            <th>Descripción / categoría</th>
            <th style="width: 72px;">Cant.</th>
            <th style="width: 100px;">P. unit.</th>
            <th style="width: 100px;">Subtotal</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($order->items as $index => $item)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>{{ $itemLabel($item) }}</td>
                <td>{{ $item->quantity ?? '—' }}</td>
                <td>{{ $formatMoney($item->unit_price) }}</td>
                <td>{{ $formatMoney($item->total_price) }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="5" class="muted">No se registraron ítems en la orden.</td>
            </tr>
        @endforelse
    </tbody>
    @if ($order->items->isNotEmpty() && $order->total_amount !== null)
        <tfoot>
            <tr>
                <td colspan="4" style="text-align: right; font-weight: 700;">Total orden</td>
                <td style="font-weight: 700;">{{ $formatMoney($order->total_amount) }}</td>
            </tr>
        </tfoot>
    @endif
</table>
