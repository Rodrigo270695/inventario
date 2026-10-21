<?php

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Asset;
use App\Models\AssetBrand;
use App\Models\AssetSubcategory;

$codes = ['AD0006-2025-0344', 'TEX-00000197', 'AD0006-2025-0356'];
echo 'Total assets: '.Asset::count().PHP_EOL;
echo 'Imported huelleros (by code prefix): '.Asset::where('code', 'like', 'AD0006-2025-%')->orWhere('code', 'like', 'TEX-00000%')->count().PHP_EOL;

echo PHP_EOL.'Sample rows:'.PHP_EOL;
foreach (Asset::with(['category', 'brand', 'model', 'warehouse.office.zonal'])->whereIn('code', $codes)->get() as $a) {
    echo "  {$a->code} | {$a->status}/{$a->condition} | ".($a->category?->code ?? '').PHP_EOL;
    echo '    zonal: '.($a->warehouse?->office?->zonal?->name ?? '—').' | office: '.($a->warehouse?->office?->name ?? '—').' | wh: '.($a->warehouse?->name ?? '—').PHP_EOL;
    echo '    brand: '.($a->brand?->name ?? '—').' | model: '.($a->model?->name ?? '—').PHP_EOL;
    echo "    acq: {$a->acquisition_value} @ {$a->acquisition_date?->format('Y-m-d')} | current: {$a->current_value}".PHP_EOL;
}

echo PHP_EOL.'Subcategory HUELLEROS: '.AssetSubcategory::where('name', 'HUELLEROS')->count().PHP_EOL;
echo 'Brand MORPHO: '.(AssetBrand::where('name', 'MORPHO')->exists() ? 'yes' : 'no').PHP_EOL;
