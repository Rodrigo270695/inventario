<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\AssetCategory;
use App\Models\AssetModel;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

/**
 * Crea activos de ejemplo. Debe ejecutarse después de ZonalOfficeWarehouseSeeder,
 * GlAccountAndAssetCategorySeeder y opcionalmente AssetBrandsModelsComponentTypesSeeder.
 */
class AssetsSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::where('usuario', 'superadmin')->first();
        $userId = $user?->id;

        $warehouses = Warehouse::where('is_active', true)->with('office.zonal')->limit(20)->get();
        if ($warehouses->isEmpty()) {
            return;
        }

        $categories = AssetCategory::where('is_active', true)->get()->keyBy('code');
        if ($categories->isEmpty()) {
            return;
        }

        $modelsByCategory = [];
        $catComputo = $categories->get('AF-COMP');
        if ($catComputo) {
            $modelsByCategory['AF-COMP'] = AssetModel::whereHas('subcategory', fn ($q) => $q->where('asset_category_id', $catComputo->id))
                ->where('is_active', true)
                ->limit(12)
                ->get();
        }

        $specsByCategory = [
            'AF-COMP' => [
                ['RAM' => '8 GB', 'Disco' => 'SSD 256 GB', 'Procesador' => 'Intel i5', 'Pantalla' => '15.6"'],
                ['RAM' => '16 GB', 'Disco' => 'SSD 512 GB', 'Procesador' => 'Intel i7', 'Pantalla' => '14"'],
                ['RAM' => '8 GB', 'Disco' => 'HDD 1 TB', 'Procesador' => 'Intel i3', 'Pantalla' => '21.5"'],
                ['RAM' => '32 GB', 'Disco' => 'SSD 1 TB', 'Procesador' => 'Intel i7', 'Pantalla' => '27"'],
                ['RAM' => '16 GB', 'Disco' => 'SSD 256 GB', 'Procesador' => 'AMD Ryzen 5', 'Pantalla' => '15.6"'],
                ['RAM' => '8 GB', 'Disco' => 'SSD 512 GB', 'Procesador' => 'Intel i5', 'Pantalla' => '24"'],
            ],
            'AF-MUEB' => [
                ['Material' => 'Melamina', 'Color' => 'Blanco', 'Dimensiones' => '120 x 60 x 75 cm'],
                ['Material' => 'Melamina', 'Color' => 'Café', 'Dimensiones' => '140 x 70 x 75 cm'],
                ['Material' => 'Metal', 'Color' => 'Negro', 'Dimensiones' => 'Ajustable'],
                ['Material' => 'Madera', 'Color' => 'Natural', 'Dimensiones' => '100 x 50 x 75 cm'],
                ['Material' => 'Melamina', 'Color' => 'Blanco', 'Dimensiones' => 'Estante 90 cm'],
            ],
            'AF-EQDIV' => [
                ['Tipo' => 'Split', 'BTU' => '12000', 'Área aprox.' => '15 m²', 'Marca' => 'Genérico'],
                ['Tipo' => 'Split', 'BTU' => '18000', 'Área aprox.' => '25 m²', 'Marca' => 'Genérico'],
                ['Tipo' => 'Rack 19"', 'Unidades' => '42U', 'Ancho' => '600 mm', 'Uso' => 'Servidores'],
            ],
            'AM-COMP' => [
                ['Tipo' => 'Inalámbrico', 'Conectividad' => 'USB', 'Compatibilidad' => 'Windows/Linux/Mac'],
                ['Tipo' => 'Mecánico', 'Conectividad' => 'USB', 'Teclas' => 'Español'],
                ['Tipo' => 'Router WiFi', 'Bandas' => 'Dual', 'Puertos LAN' => '4', 'Velocidad' => 'AC1200'],
                ['Tipo' => 'HDMI', 'Longitud' => '1.5 m', 'Versión' => '2.0'],
            ],
        ];

        $definitions = [
            ['category_code' => 'AF-COMP', 'with_model' => true, 'count' => 4, 'status' => 'stored', 'condition' => 'new'],
            ['category_code' => 'AF-COMP', 'with_model' => true, 'count' => 2, 'status' => 'active', 'condition' => 'good'],
            ['category_code' => 'AF-MUEB', 'with_model' => false, 'count' => 3, 'status' => 'stored', 'condition' => 'new'],
            ['category_code' => 'AF-MUEB', 'with_model' => false, 'count' => 2, 'status' => 'active', 'condition' => 'good'],
            ['category_code' => 'AF-EQDIV', 'with_model' => false, 'count' => 2, 'status' => 'stored', 'condition' => 'new'],
            ['category_code' => 'AM-COMP', 'with_model' => false, 'count' => 2, 'status' => 'stored', 'condition' => 'new'],
        ];

        $seqByCategory = [];

        foreach ($definitions as $def) {
            $category = $categories->get($def['category_code']);
            if (! $category) {
                continue;
            }

            $prefix = $category->code.'-';
            if (! isset($seqByCategory[$def['category_code']])) {
                $last = Asset::withTrashed()->where('code', 'like', $prefix.'%')->max('code');
                $seqByCategory[$def['category_code']] = $last ? ((int) preg_replace('/.*-/', '', $last)) + 1 : 1;
            }

            $models = ($def['with_model'] && isset($modelsByCategory[$def['category_code']]))
                ? $modelsByCategory[$def['category_code']]
                : collect();

            for ($i = 0; $i < $def['count']; $i++) {
                $seq = $seqByCategory[$def['category_code']]++;
                $code = $prefix.str_pad((string) $seq, 5, '0', STR_PAD_LEFT);

                if (Asset::withTrashed()->where('code', $code)->exists()) {
                    continue;
                }

                $modelId = $models->isNotEmpty() ? $models->random()->id : null;
                $warehouse = $warehouses->random();

                $categorySpecs = $specsByCategory[$def['category_code']] ?? [];
                $specs = $categorySpecs !== []
                    ? $categorySpecs[array_rand($categorySpecs)]
                    : null;

                Asset::create([
                    'code' => $code,
                    'serial_number' => $modelId ? 'SN-'.str_replace('-', '', $code).'-'.str_pad((string) $seq, 3, '0', STR_PAD_LEFT) : null,
                    'model_id' => $modelId,
                    'category_id' => $category->id,
                    'status' => $def['status'],
                    'condition' => $def['condition'],
                    'warehouse_id' => $warehouse->id,
                    'acquisition_value' => $modelId ? rand(800, 3500) : rand(200, 1500),
                    'current_value' => null,
                    'depreciation_rate' => 10.00,
                    'warranty_until' => now()->addYears(2),
                    'specs' => $specs,
                    'notes' => null,
                    'registered_by_id' => $userId,
                    'updated_by_id' => $userId,
                ]);
            }
        }
    }
}
