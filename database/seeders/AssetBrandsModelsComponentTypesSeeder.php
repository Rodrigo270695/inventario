<?php

namespace Database\Seeders;

use App\Models\AssetBrand;
use App\Models\AssetCategory;
use App\Models\AssetModel;
use App\Models\AssetSubcategory;
use App\Models\ComponentType;
use Illuminate\Database\Seeder;

/**
 * Marcas, modelos (equipos tecnológicos) y tipos de componente.
 * Debe ejecutarse después de GlAccountAndAssetCategorySeeder.
 */
class AssetBrandsModelsComponentTypesSeeder extends Seeder
{
    public function run(): void
    {
        // ——— Marcas ———
        $brandNames = [
            'HP',
            'Dell',
            'Lenovo',
            'Epson',
            'Brother',
            'Canon',
            'Acer',
            'ASUS',
            'Samsung',
            'LG',
            'Intel',
            'AMD',
        ];

        $brands = [];
        foreach ($brandNames as $name) {
            $brands[$name] = AssetBrand::firstOrCreate(
                ['name' => $name],
                []
            );
        }

        // ——— Subcategorías de "Activo Fijo - Equipos de Cómputo" (AF-COMP) ———
        $catComputo = AssetCategory::where('code', 'AF-COMP')->first();
        if (! $catComputo) {
            return;
        }

        $subs = AssetSubcategory::where('asset_category_id', $catComputo->id)->get()->keyBy('name');

        // Modelos por subcategoría (nombre en BD: CPU, MONITOR, LAPTOP, IMPRESORA, TICKETERAS, SERVIDORES)
        $modelsBySub = [
            'CPU' => ['ProDesk 400 G6', 'EliteDesk 800 G5', 'OptiPlex 7080', 'ThinkCentre M720', 'Vostro 3888'],
            'MONITOR' => ['E2420', 'P2219H', 'E24-20', 'ThinkVision E24', 'S24F350'],
            'LAPTOP' => ['ProBook 450 G8', 'Latitude 5520', 'ThinkPad E14', 'Vostro 3510', 'Aspire 5'],
            'IMPRESORA' => ['LaserJet Pro M404dn', 'L3250', 'WorkForce Pro WF-3730', 'HL-L2350DW', 'MF3010'],
            'TICKETERAS' => ['TM-T20', 'TM-T88', 'RP326', 'Bixolon SRP-350'],
            'SERVIDORES' => ['ProLiant DL380 Gen10', 'PowerEdge R740', 'ThinkSystem SR650'],
        ];

        $brandsForModels = ['HP', 'Dell', 'Lenovo', 'Epson', 'Brother'];
        foreach ($brandsForModels as $brandName) {
            $brand = $brands[$brandName] ?? null;
            if (! $brand) {
                continue;
            }
            foreach ($modelsBySub as $subName => $modelNames) {
                $sub = $subs->get($subName);
                if (! $sub) {
                    continue;
                }
                $toCreate = $brandName === 'HP' ? $modelNames : array_slice($modelNames, 0, 2);
                foreach ($toCreate as $modelName) {
                    AssetModel::firstOrCreate(
                        [
                            'brand_id' => $brand->id,
                            'subcategory_id' => $sub->id,
                            'name' => $modelName,
                        ],
                        ['is_active' => true]
                    );
                }
            }
        }

        // ——— Tipos de componente (RAM, HDD, SSD, GPU, PSU, Motherboard) ———
        $componentTypes = [
            ['name' => 'RAM', 'code' => 'RAM'],
            ['name' => 'SSD', 'code' => 'SSD'],
            ['name' => 'HDD', 'code' => 'HDD'],
            ['name' => 'GPU', 'code' => 'GPU'],
            ['name' => 'PSU', 'code' => 'PSU'],
            ['name' => 'Motherboard', 'code' => 'MB'],
        ];

        foreach ($componentTypes as $ct) {
            ComponentType::firstOrCreate(
                ['code' => $ct['code']],
                ['name' => $ct['name']]
            );
        }
    }
}
