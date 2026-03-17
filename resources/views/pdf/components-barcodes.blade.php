<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Barcodes de componentes</title>
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
            margin: 0 2.2mm 2.2mm 0;
            padding: 1.3mm 1.5mm;
            border: 0.2mm solid #d1d5db;
            border-radius: 1.2mm;
            overflow: hidden;
        }

        .code {
            font-size: 7.6pt;
            font-weight: 700;
            line-height: 1;
            margin-bottom: 0.5mm;
        }

        .barcode-wrap {
            text-align: center;
            margin-bottom: 0.5mm;
        }

        .barcode {
            width: 33.5mm;
            height: 7.5mm;
        }

        .meta {
            font-size: 5.1pt;
            line-height: 1.05;
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
                <div class="meta">{{ $label['type_name'] ?? 'Sin tipo' }}</div>
                @if (! empty($label['model_line']))
                    <div class="meta">{{ $label['model_line'] }}</div>
                @endif
                @if (! empty($label['serial_number']))
                    <div class="meta">Serie: {{ $label['serial_number'] }}</div>
                @endif
            </div>
        @endforeach
    </div>
</body>
</html>
