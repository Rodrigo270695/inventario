<?php

namespace App\Console\Commands;

use App\Models\Asset;
use App\Models\AssetBrand;
use App\Models\AssetCategory;
use App\Models\AssetModel;
use App\Models\AssetSubcategory;
use App\Models\Office;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\Zonal;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class ImportHuellerosAssetsCommand extends Command
{
    protected $signature = 'assets:import-huelleros
                            {file : Ruta al archivo .xlsx}
                            {--dry-run : Simular sin insertar}
                            {--force : Actualizar activos existentes con el mismo código}';

    protected $description = 'Importa activos desde la plantilla PLANTILLA ACT-FIJO (hoja HUELLEROS)';

    public function handle(): int
    {
        $path = $this->argument('file');
        if (! is_readable($path)) {
            $this->error("No se puede leer el archivo: {$path}");

            return self::FAILURE;
        }

        $user = User::query()->where('usuario', 'superadmin')->first()
            ?? User::query()->where('is_active', true)->first();

        if (! $user) {
            $this->error('No hay usuario activo para registered_by_id.');

            return self::FAILURE;
        }

        $spreadsheet = IOFactory::load($path);
        $sheet = $spreadsheet->getSheetByName('HUELLEROS') ?? $spreadsheet->getActiveSheet();

        $headers = [];
        $highestColumn = $sheet->getHighestDataColumn();
        $highestRow = $sheet->getHighestDataRow();

        for ($col = 1; $col <= \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($highestColumn); $col++) {
            $val = $sheet->getCellByColumnAndRow($col, 1)->getValue();
            if ($val !== null && trim((string) $val) !== '') {
                $headers[$col] = $this->normalizeHeader((string) $val);
            }
        }

        $dryRun = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');
        $created = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];

        for ($row = 2; $row <= $highestRow; $row++) {
            $data = [];
            foreach ($headers as $col => $key) {
                $cell = $sheet->getCellByColumnAndRow($col, $row);
                $raw = $cell->getValue();
                $data[$key] = is_string($raw) && str_starts_with($raw, '=')
                    ? $cell->getCalculatedValue()
                    : $raw;
            }

            $code = trim((string) ($data['codigo_activo'] ?? ''));
            if ($code === '') {
                continue;
            }

            try {
                $payload = $this->mapRowToAssetPayload($data, $user->id);
            } catch (\Throwable $e) {
                $errors[] = "{$code}: {$e->getMessage()}";

                continue;
            }

            $existing = Asset::withTrashed()->where('code', $code)->first();

            if ($existing && ! $existing->trashed() && ! $force) {
                $skipped++;
                $this->line("  Omitido (ya existe): {$code}");

                continue;
            }

            if ($dryRun) {
                $this->info("[dry-run] {$code} → cat {$payload['category_id']}, wh {$payload['warehouse_id']}, model ".($payload['model_id'] ?? '—'));
                $created++;

                continue;
            }

            if ($existing && $existing->trashed()) {
                $existing->restore();
            }

            if ($existing && $force) {
                $existing->update($payload);
                $updated++;
                $this->info("  Actualizado: {$code}");
            } else {
                Asset::create($payload);
                $created++;
                $this->info("  Creado: {$code}");
            }
        }

        $this->newLine();
        $this->info("Listo. Creados/simulados: {$created}, actualizados: {$updated}, omitidos: {$skipped}.");

        if ($errors !== []) {
            $this->warn('Errores:');
            foreach ($errors as $err) {
                $this->line("  - {$err}");
            }

            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function mapRowToAssetPayload(array $data, string $userId): array
    {
        $zonal = $this->resolveZonal((string) ($data['zonal'] ?? ''));
        if (! $zonal) {
            throw new \RuntimeException('Zonal no encontrado: '.($data['zonal'] ?? ''));
        }

        $office = $this->resolveOffice($zonal, (string) ($data['oficina'] ?? ''));
        $warehouse = $this->resolveWarehouse($office, (string) ($data['almacen'] ?? ''));

        $category = $this->resolveCategory((string) ($data['categoria'] ?? ''));
        if (! $category) {
            throw new \RuntimeException('Categoría no mapeada: '.($data['categoria'] ?? ''));
        }

        $subcategory = $this->resolveSubcategory($category, (string) ($data['subcategoria'] ?? 'HUELLEROS'));
        $brand = $this->resolveBrand((string) ($data['marca'] ?? ''));
        $modelName = trim((string) ($data['modelo'] ?? ''));
        $modelId = null;
        $brandId = $brand?->id;

        if ($modelName !== '' && $brand && $subcategory) {
            $model = AssetModel::firstOrCreate(
                [
                    'brand_id' => $brand->id,
                    'subcategory_id' => $subcategory->id,
                    'name' => $modelName,
                ],
                ['is_active' => true]
            );
            $modelId = $model->id;
            $brandId = $brand->id;
        }

        $serial = trim((string) ($data['serie'] ?? ''));
        if ($serial === '' || str_contains(mb_strtoupper($serial), 'NO ESPECIFICA')) {
            $serial = null;
        }

        $specText = trim((string) ($data['especificaciones'] ?? ''));
        $specs = $specText !== '' ? ['descripcion' => $specText] : null;

        $notesParts = array_filter([
            $this->noteLine('Proveedor', $data['proveedor'] ?? null),
            $this->noteLine('Factura', $data['factura'] ?? null),
            trim((string) ($data['notas'] ?? '')),
        ]);
        $notes = $notesParts !== [] ? implode("\n", $notesParts) : null;

        return [
            'code' => trim((string) $data['codigo_activo']),
            'serial_number' => $serial,
            'model_id' => $modelId,
            'brand_id' => $brandId,
            'category_id' => $category->id,
            'status' => $this->mapStatus((string) ($data['estado'] ?? '')),
            'condition' => $this->mapCondition((string) ($data['condicion'] ?? '')),
            'warehouse_id' => $warehouse->id,
            'acquisition_value' => $this->numeric($data['valor_adquisicion'] ?? null),
            'acquisition_date' => $this->parseDate($data['fecha_adquisicion'] ?? null),
            'current_value' => $this->numeric($data['valor_actual'] ?? null),
            'depreciation_rate' => $this->numeric($data['tasa_depreciacion'] ?? null),
            'warranty_until' => $this->parseDate($data['garantia'] ?? null),
            'specs' => $specs,
            'notes' => $notes,
            'registered_by_id' => $userId,
            'updated_by_id' => $userId,
        ];
    }

    private function normalizeHeader(string $header): string
    {
        $h = mb_strtolower(trim($header));
        $h = str_replace(['ó', 'í', 'é', 'á', 'ú', 'ñ'], ['o', 'i', 'e', 'a', 'u', 'n'], $h);
        $h = preg_replace('/\s+/', '_', $h) ?? $h;
        $h = str_replace(['(*)', '*', '.'], ['', '', '_'], $h);
        $h = trim($h, '_');

        $map = [
            'n_de_serie' => 'serie',
            'no_de_serie' => 'serie',
            'fecha_adquision' => 'fecha_adquisicion',
            'valor_de_adquisicion' => 'valor_adquisicion',
            'valor_actual_activo_neto_31_12_2025' => 'valor_actual',
            'tasa_depreciacion_(%)' => 'tasa_depreciacion',
            'tasa_depreciacion_%' => 'tasa_depreciacion',
            'garantia_hasta' => 'garantia',
            'codigo_de_activo' => 'codigo_activo',
            'tipo_de_bien' => 'tipo_bien',
        ];

        return $map[$h] ?? $h;
    }

    private function resolveZonal(string $name): ?Zonal
    {
        $name = trim($name);
        if ($name === '') {
            return null;
        }

        $upper = mb_strtoupper($name);

        return Zonal::query()
            ->where('is_active', true)
            ->where(function ($q) use ($upper) {
                $q->whereRaw('UPPER(name) = ?', [$upper])
                    ->orWhereRaw('UPPER(code) = ?', [$upper])
                    ->orWhereRaw('UPPER(name) like ?', [$upper.'%']);
            })
            ->first();
    }

    private function resolveOffice(Zonal $zonal, string $excelOffice): Office
    {
        $excel = mb_strtoupper(trim($excelOffice));

        if ($excel !== '') {
            $office = Office::query()
                ->where('zonal_id', $zonal->id)
                ->where('is_active', true)
                ->where(function ($q) use ($excel) {
                    $q->whereRaw('UPPER(name) = ?', [$excel])
                        ->orWhereRaw('UPPER(name) like ?', ['%'.$excel.'%']);
                })
                ->first();

            if ($office) {
                return $office;
            }
        }

        $fallback = Office::query()
            ->where('zonal_id', $zonal->id)
            ->where('is_active', true)
            ->where('name', 'OFICINA PRINCIPAL')
            ->first();

        if ($fallback) {
            return $fallback;
        }

        return Office::query()
            ->where('zonal_id', $zonal->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->firstOrFail();
    }

    private function resolveWarehouse(Office $office, string $excelWarehouse): Warehouse
    {
        $needle = mb_strtoupper(Str::ascii(trim($excelWarehouse)));

        $candidates = Warehouse::query()
            ->where('office_id', $office->id)
            ->where('is_active', true)
            ->get();

        foreach ($candidates as $wh) {
            $whName = mb_strtoupper(Str::ascii($wh->name));
            if ($needle !== '' && (str_contains($whName, $needle) || str_contains($needle, $whName))) {
                return $wh;
            }
            if (str_contains($whName, 'ALMAC') && (str_contains($needle, 'PRINCIPAL') || str_contains($needle, 'PRI'))) {
                return $wh;
            }
        }

        $pri = $candidates->first(fn ($w) => str_contains(mb_strtoupper(Str::ascii($w->name)), 'PRI'));

        return $pri ?? $candidates->firstOrFail();
    }

    private function resolveCategory(string $excelName): ?AssetCategory
    {
        $u = mb_strtoupper($excelName);

        if (str_contains($u, 'COMPUTO') || str_contains($u, 'CÓMPUTO')) {
            return AssetCategory::query()->where('code', 'AF-COMP')->where('is_active', true)->first();
        }

        if (str_contains($u, 'DIVERSOS')) {
            return AssetCategory::query()->where('code', 'AF-EQDIV')->where('is_active', true)->first();
        }

        return null;
    }

    private function resolveSubcategory(AssetCategory $category, string $name): AssetSubcategory
    {
        $name = trim($name) !== '' ? trim($name) : 'HUELLEROS';
        $code = Str::upper(Str::slug($name, ''));

        return AssetSubcategory::firstOrCreate(
            [
                'asset_category_id' => $category->id,
                'name' => mb_strtoupper($name),
            ],
            [
                'code' => substr($code, 0, 20),
                'is_active' => true,
            ]
        );
    }

    private function resolveBrand(string $name): ?AssetBrand
    {
        $name = trim($name);
        if ($name === '') {
            return null;
        }

        return AssetBrand::firstOrCreate(['name' => mb_strtoupper($name)]);
    }

    private function mapStatus(string $label): string
    {
        $map = [
            'almacenado' => 'stored',
            'activo' => 'active',
            'en reparacion' => 'in_repair',
            'en reparación' => 'in_repair',
            'en transito' => 'in_transit',
            'en tránsito' => 'in_transit',
            'dado de baja' => 'disposed',
            'vendido' => 'sold',
        ];

        $key = mb_strtolower(trim($label));

        return $map[$key] ?? 'stored';
    }

    private function mapCondition(string $label): string
    {
        $map = [
            'nuevo' => 'new',
            'bueno' => 'good',
            'regular' => 'regular',
            'danado' => 'damaged',
            'dañado' => 'damaged',
            'obsoleto' => 'obsolete',
            'malogrado' => 'broken',
        ];

        $key = mb_strtolower(trim($label));

        return $map[$key] ?? 'obsolete';
    }

    private function parseDate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        if (is_numeric($value)) {
            try {
                return Carbon::instance(ExcelDate::excelToDateTimeObject((float) $value))->format('Y-m-d');
            } catch (\Throwable) {
                return null;
            }
        }

        $str = trim((string) $value);
        if (preg_match('#^(\d{1,2})/(\d{1,2})/(\d{4})$#', $str, $m)) {
            return sprintf('%04d-%02d-%02d', (int) $m[3], (int) $m[2], (int) $m[1]);
        }

        try {
            return Carbon::parse($str)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }

    private function numeric(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return round((float) $value, 2);
    }

    private function noteLine(string $label, mixed $value): ?string
    {
        $v = trim((string) ($value ?? ''));
        if ($v === '') {
            return null;
        }

        return "{$label}: {$v}";
    }
}
