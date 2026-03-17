<?php

namespace Database\Seeders;

use App\Models\AssetCategory;
use App\Models\AssetSubcategory;
use Illuminate\Database\Seeder;

/**
 * Categoría "Mobiliario de oficina" y subcategorías (Silla, Cortina, Escritorio, etc.)
 * para activos no tecnológicos. Ejecutar: php artisan db:seed --class=AssetCatalogSeeder
 */
class AssetCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $category = AssetCategory::query()->where('code', 'MOB-OFIC')->first();

        if ($category) {
            return;
        }

        $category = AssetCategory::create([
            'name' => 'MOBILIARIO DE OFICINA',
            'code' => 'MOB-OFIC',
            'type' => 'furniture',
            'gl_account_id' => null,
            'gl_depreciation_account_id' => null,
            'default_useful_life_years' => 10,
            'default_depreciation_method' => 'straight_line',
            'default_residual_value_pct' => 10.00,
            'requires_insurance' => false,
            'requires_soat' => false,
            'icon' => null,
            'is_active' => true,
        ]);

        $subcategories = [
            ['name' => 'SILLA', 'code' => 'SILLA'],
            ['name' => 'ESCRITORIO', 'code' => 'ESCRIT'],
            ['name' => 'CORTINA', 'code' => 'CORT'],
            ['name' => 'ARCHIVADOR', 'code' => 'ARCH'],
            ['name' => 'ESTANTERÍA', 'code' => 'EST'],
        ];

        foreach ($subcategories as $sub) {
            AssetSubcategory::firstOrCreate(
                [
                    'asset_category_id' => $category->id,
                    'name' => $sub['name'],
                ],
                [
                    'code' => $sub['code'],
                    'is_active' => true,
                ]
            );
        }
    }
}
