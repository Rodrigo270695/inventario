<?php

namespace Database\Seeders;

use App\Models\AssetCategory;
use App\Models\AssetSubcategory;
use App\Models\GlAccount;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class GlAccountAndAssetCategorySeeder extends Seeder
{
    public function run(): void
    {
        // Cuentas contables base (ejemplo simple, puedes ajustarlas luego)
        $accounts = [
            ['code' => '1211', 'name' => 'Cuentas por cobrar - Activo Fijo', 'account_type' => 'asset'],
            ['code' => '6311', 'name' => 'Gastos de servicios y mantenimiento', 'account_type' => 'expense'],
        ];

        $accountIds = [];

        foreach ($accounts as $acc) {
            $gl = GlAccount::firstOrCreate(
                ['code' => $acc['code']],
                [
                    'name' => $acc['name'],
                    'account_type' => $acc['account_type'],
                    'parent_id' => null,
                    'is_active' => true,
                ]
            );
            $accountIds[$acc['code']] = $gl->id;
        }

        // Activo Fijo
        $afEquiposDiversos = AssetCategory::firstOrCreate(
            ['code' => 'AF-EQDIV'],
            [
                'name' => 'Activo Fijo - Equipos Diversos',
                'type' => 'fixed_asset',
                'gl_account_id' => $accountIds['1211'] ?? null,
                'gl_depreciation_account_id' => null,
                'default_useful_life_years' => 10,
                'default_depreciation_method' => 'straight_line',
                'default_residual_value_pct' => 10.00,
                'requires_insurance' => false,
                'requires_soat' => false,
                'icon' => null,
                'is_active' => true,
            ]
        );

        $afEquiposDiversosSubs = [
            ['name' => 'AIRE ACONDICIONADO', 'code' => 'AA'],
            ['name' => 'CORTINAS DE AIRE', 'code' => 'CAIRE'],
            ['name' => 'ECRAN', 'code' => 'ECRAN'],
            ['name' => 'RACKS', 'code' => 'RACK'],
        ];
        foreach ($afEquiposDiversosSubs as $sub) {
            AssetSubcategory::firstOrCreate(
                ['asset_category_id' => $afEquiposDiversos->id, 'name' => $sub['name']],
                ['code' => $sub['code'], 'is_active' => true]
            );
        }

        $afVehiculos = AssetCategory::firstOrCreate(
            ['code' => 'AF-VEH'],
            [
                'name' => 'Activo Fijo - Vehículos',
                'type' => 'fixed_asset',
                'gl_account_id' => $accountIds['1211'] ?? null,
                'gl_depreciation_account_id' => null,
                'default_useful_life_years' => 5,
                'default_depreciation_method' => 'straight_line',
                'default_residual_value_pct' => 10.00,
                'requires_insurance' => true,
                'requires_soat' => true,
                'icon' => null,
                'is_active' => true,
            ]
        );

        $afEquiposComputo = AssetCategory::firstOrCreate(
            ['code' => 'AF-COMP'],
            [
                'name' => 'Activo Fijo - Equipos de Cómputo',
                'type' => 'fixed_asset',
                'gl_account_id' => $accountIds['1211'] ?? null,
                'gl_depreciation_account_id' => null,
                'default_useful_life_years' => 5,
                'default_depreciation_method' => 'straight_line',
                'default_residual_value_pct' => 10.00,
                'requires_insurance' => false,
                'requires_soat' => false,
                'icon' => null,
                'is_active' => true,
            ]
        );

        $afEquiposComputoSubs = [
            ['name' => 'CPU', 'code' => 'CPU'],
            ['name' => 'MONITOR', 'code' => 'MON'],
            ['name' => 'LAPTOP', 'code' => 'LAP'],
            ['name' => 'IMPRESORA', 'code' => 'IMP'],
            ['name' => 'TICKETERAS', 'code' => 'TICK'],
            ['name' => 'SERVIDORES', 'code' => 'SRV'],
        ];
        foreach ($afEquiposComputoSubs as $sub) {
            AssetSubcategory::firstOrCreate(
                ['asset_category_id' => $afEquiposComputo->id, 'name' => $sub['name']],
                ['code' => $sub['code'], 'is_active' => true]
            );
        }

        $afMueblesEnseres = AssetCategory::firstOrCreate(
            ['code' => 'AF-MUEB'],
            [
                'name' => 'Activo Fijo - Muebles y Enseres',
                'type' => 'fixed_asset',
                'gl_account_id' => $accountIds['1211'] ?? null,
                'gl_depreciation_account_id' => null,
                'default_useful_life_years' => 10,
                'default_depreciation_method' => 'straight_line',
                'default_residual_value_pct' => 10.00,
                'requires_insurance' => false,
                'requires_soat' => false,
                'icon' => null,
                'is_active' => true,
            ]
        );

        $afMueblesEnseresSubs = [
            ['name' => 'SILLAS', 'code' => 'SILLAS'],
            ['name' => 'ESCRITORIOS', 'code' => 'ESCRIT'],
            ['name' => 'ESTANTES', 'code' => 'ESTANT'],
            ['name' => 'MÓDULOS', 'code' => 'MOD'],
            ['name' => 'OTROS', 'code' => 'OTROS'],
        ];
        foreach ($afMueblesEnseresSubs as $sub) {
            AssetSubcategory::firstOrCreate(
                ['asset_category_id' => $afMueblesEnseres->id, 'name' => $sub['name']],
                ['code' => $sub['code'], 'is_active' => true]
            );
        }

        // Activo Menor
        $amCompComputo = AssetCategory::firstOrCreate(
            ['code' => 'AM-COMP'],
            [
                'name' => 'Activo Menor - Complementos del Activo de Cómputo',
                'type' => 'minor_asset',
                'gl_account_id' => $accountIds['1211'] ?? null,
                'gl_depreciation_account_id' => null,
                'default_useful_life_years' => 3,
                'default_depreciation_method' => 'straight_line',
                'default_residual_value_pct' => 0.00,
                'requires_insurance' => false,
                'requires_soat' => false,
                'icon' => null,
                'is_active' => true,
            ]
        );

        $amCompComputoSubs = [
            ['name' => 'ROUTER', 'code' => 'ROUT'],
            ['name' => 'MOUSE', 'code' => 'MOUSE'],
            ['name' => 'TECLADO', 'code' => 'TECL'],
            ['name' => 'ADAPTADORES', 'code' => 'ADAPT'],
            ['name' => 'EXTENSIONES', 'code' => 'EXT'],
            ['name' => 'CABLES HDMI', 'code' => 'HDMI'],
            ['name' => 'OTROS COMPLEMENTOS DE CÓMPUTO', 'code' => 'OTC'],
        ];
        foreach ($amCompComputoSubs as $sub) {
            AssetSubcategory::firstOrCreate(
                ['asset_category_id' => $amCompComputo->id, 'name' => $sub['name']],
                ['code' => $sub['code'], 'is_active' => true]
            );
        }

        $amCompDiversos = AssetCategory::firstOrCreate(
            ['code' => 'AM-EQDIV'],
            [
                'name' => 'Activo Menor - Complementos del Activo de Equipos Diversos',
                'type' => 'minor_asset',
                'gl_account_id' => $accountIds['1211'] ?? null,
                'gl_depreciation_account_id' => null,
                'default_useful_life_years' => 3,
                'default_depreciation_method' => 'straight_line',
                'default_residual_value_pct' => 0.00,
                'requires_insurance' => false,
                'requires_soat' => false,
                'icon' => null,
                'is_active' => true,
            ]
        );

        $amCompDiversosSubs = [
            ['name' => 'BOMBAS PARA AIRE ACONDICIONADO', 'code' => 'BOMB-AA'],
            ['name' => 'CAMBIOS DE FILTROS', 'code' => 'FILTRO'],
            ['name' => 'OTROS COMPLEMENTOS EQUIPOS DIVERSOS', 'code' => 'OTED'],
        ];
        foreach ($amCompDiversosSubs as $sub) {
            AssetSubcategory::firstOrCreate(
                ['asset_category_id' => $amCompDiversos->id, 'name' => $sub['name']],
                ['code' => $sub['code'], 'is_active' => true]
            );
        }

        $amCompMuebles = AssetCategory::firstOrCreate(
            ['code' => 'AM-MUEB'],
            [
                'name' => 'Activo Menor - Complementos del Activo de Muebles y Enseres',
                'type' => 'minor_asset',
                'gl_account_id' => $accountIds['1211'] ?? null,
                'gl_depreciation_account_id' => null,
                'default_useful_life_years' => 3,
                'default_depreciation_method' => 'straight_line',
                'default_residual_value_pct' => 0.00,
                'requires_insurance' => false,
                'requires_soat' => false,
                'icon' => null,
                'is_active' => true,
            ]
        );

        $amCompMueblesSubs = [
            ['name' => 'SILLAS O BANCOS DE PLÁSTICO', 'code' => 'SBP'],
            ['name' => 'ESCRITORIOS', 'code' => 'ESCRIT-M'],
            ['name' => 'MESAS', 'code' => 'MESA'],
        ];
        foreach ($amCompMueblesSubs as $sub) {
            AssetSubcategory::firstOrCreate(
                ['asset_category_id' => $amCompMuebles->id, 'name' => $sub['name']],
                ['code' => $sub['code'], 'is_active' => true]
            );
        }

        // Servicios y Mantenimiento
        $smEquiposDiversos = AssetCategory::firstOrCreate(
            ['code' => 'SM-EQDIV-CAT'],
            [
                'name' => 'Servicios y Mantenimiento - Equipos Diversos',
                'type' => 'service_maintenance',
                'gl_account_id' => $accountIds['6311'] ?? null,
                'gl_depreciation_account_id' => null,
                'default_useful_life_years' => 1,
                'default_depreciation_method' => 'straight_line',
                'default_residual_value_pct' => 0.00,
                'requires_insurance' => false,
                'requires_soat' => false,
                'icon' => null,
                'is_active' => true,
            ]
        );

        $smMuebles = AssetCategory::firstOrCreate(
            ['code' => 'SM-MUEB-CAT'],
            [
                'name' => 'Servicios y Mantenimiento - Muebles y Enseres',
                'type' => 'service_maintenance',
                'gl_account_id' => $accountIds['6311'] ?? null,
                'gl_depreciation_account_id' => null,
                'default_useful_life_years' => 1,
                'default_depreciation_method' => 'straight_line',
                'default_residual_value_pct' => 0.00,
                'requires_insurance' => false,
                'requires_soat' => false,
                'icon' => null,
                'is_active' => true,
            ]
        );

        $smVehiculos = AssetCategory::firstOrCreate(
            ['code' => 'SM-VEH-CAT'],
            [
                'name' => 'Servicios y Mantenimiento - Vehículos',
                'type' => 'service_maintenance',
                'gl_account_id' => $accountIds['6311'] ?? null,
                'gl_depreciation_account_id' => null,
                'default_useful_life_years' => 1,
                'default_depreciation_method' => 'straight_line',
                'default_residual_value_pct' => 0.00,
                'requires_insurance' => false,
                'requires_soat' => false,
                'icon' => null,
                'is_active' => true,
            ]
        );

        $smEquiposComputo = AssetCategory::firstOrCreate(
            ['code' => 'SM-COMP-CAT'],
            [
                'name' => 'Servicios y Mantenimiento - Equipos de Cómputo',
                'type' => 'service_maintenance',
                'gl_account_id' => $accountIds['6311'] ?? null,
                'gl_depreciation_account_id' => null,
                'default_useful_life_years' => 1,
                'default_depreciation_method' => 'straight_line',
                'default_residual_value_pct' => 0.00,
                'requires_insurance' => false,
                'requires_soat' => false,
                'icon' => null,
                'is_active' => true,
            ]
        );
    }
}

