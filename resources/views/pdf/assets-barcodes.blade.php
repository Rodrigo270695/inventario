<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Barcodes de activos</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 8mm;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: DejaVu Sans, sans-serif;
            color: #111827;
            font-size: 8pt;
        }

        .sheet {
            width: 100%;
        }

        .label {
            display: inline-block;
            vertical-align: top;
            width: {{ $labelWidthMm }}mm;
            height: {{ $labelHeightMm }}mm;
            margin: 0 3mm 3mm 0;
            padding: 2mm;
            border: 0.2mm solid #d1d5db;
            border-radius: 1.2mm;
            overflow: hidden;
        }

        .code {
            font-size: 8.4pt;
            font-weight: 700;
            line-height: 1.05;
            margin-bottom: 0.8mm;
        }

        .barcode-wrap {
            text-align: center;
            margin-bottom: 0.8mm;
        }

        .barcode {
            width: 45mm;
            height: 10mm;
        }

        .meta {
            font-size: 5.8pt;
            line-height: 1.08;
            color: #374151;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    </style>
</head>
<body>
    <div class="sheet">
        @foreach ($labels as $label)
            <div class="label">
                <div class="code">{{ $label['code'] }}</div>
                <div class="barcode-wrap">
                    <img class="barcode" src="{{ $label['barcode_data_uri'] }}" alt="Barcode {{ $label['code'] }}">
                </div>
                <div class="meta">{{ $label['category_name'] ?? 'Sin categoría' }}</div>
                @php
                    $modelLine = trim(collect([$label['brand_name'] ?? null, $label['model_name'] ?? null])->filter()->implode(' '));
                @endphp
                @if ($modelLine !== '')
                    <div class="meta">{{ $modelLine }}</div>
                @endif
                @if (! empty($label['serial_number']))
                    <div class="meta">Serie: {{ $label['serial_number'] }}</div>
                @endif
            </div>
        @endforeach
    </div>
</body>
</html>
