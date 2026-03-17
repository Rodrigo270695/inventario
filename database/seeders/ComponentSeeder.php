<?php

namespace Database\Seeders;

use App\Models\AssetBrand;
use App\Models\Component;
use App\Models\AssetSubcategory;
use App\Models\ComponentType;
use App\Models\RepairShop;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

class ComponentSeeder extends Seeder
{
    public function run(): void
    {
        $typeMemory = ComponentType::firstOrCreate(
            ['code' => 'RAM'],
            ['name' => 'Memoria RAM']
        );

        $typeDisk = ComponentType::firstOrCreate(
            ['code' => 'HDD'],
            ['name' => 'Disco duro']
        );

        $typeSsd = ComponentType::firstOrCreate(
            ['code' => 'SSD'],
            ['name' => 'Unidad SSD']
        );

        $brandGeneric = AssetBrand::firstOrCreate(['name' => 'GENÉRICO']);
        $brandKingston = AssetBrand::firstOrCreate(['name' => 'Kingston']);
        $brandSeagate = AssetBrand::firstOrCreate(['name' => 'Seagate']);

        $warehouse = Warehouse::query()->first();
        $repairShop = RepairShop::query()->first();
        $subcategory = AssetSubcategory::query()->where('is_active', true)->first();

        if (! $warehouse) {
            $this->command?->warn('ComponentSeeder: no hay almacenes, se omite creación de componentes.');

            return;
        }

        $components = [
            [
                'code' => 'COMP-RAM-8GB-001',
                'serial_number' => 'RAM8-0001',
                'type_id' => $typeMemory->id,
                'subcategory_id' => $subcategory?->id,
                'brand_id' => $brandKingston->id,
                'model' => 'DDR4 8GB',
                'warehouse_id' => $warehouse->id,
                'repair_shop_id' => null,
                'status' => 'stored',
                'condition' => 'new',
                'specs' => [
                    'capacity_gb' => 8,
                    'standard' => 'DDR4',
                    'speed_mhz' => 2666,
                    'voltage_v' => 1.2,
                    'form_factor' => 'DIMM',
                ],
                'notes' => 'Módulo RAM genérico para desktops.',
            ],
            [
                'code' => 'COMP-RAM-16GB-001',
                'serial_number' => 'RAM16-0001',
                'type_id' => $typeMemory->id,
                'subcategory_id' => $subcategory?->id,
                'brand_id' => $brandKingston->id,
                'model' => 'DDR4 16GB',
                'warehouse_id' => $warehouse->id,
                'repair_shop_id' => null,
                'status' => 'stored',
                'condition' => 'new',
                'specs' => [
                    'capacity_gb' => 16,
                    'standard' => 'DDR4',
                    'speed_mhz' => 3200,
                    'voltage_v' => 1.2,
                    'form_factor' => 'SODIMM',
                ],
                'notes' => 'Pensado para laptops de alta gama.',
            ],
            [
                'code' => 'COMP-HDD-1TB-001',
                'serial_number' => 'HDD1TB-0001',
                'type_id' => $typeDisk->id,
                'subcategory_id' => $subcategory?->id,
                'brand_id' => $brandSeagate->id,
                'model' => 'Barracuda 1TB',
                'warehouse_id' => $warehouse->id,
                'repair_shop_id' => $repairShop?->id,
                'status' => 'in_repair',
                'condition' => 'damaged',
                'specs' => [
                    'capacity_gb' => 1024,
                    'rpm' => 7200,
                    'interface' => 'SATA III',
                    'cache_mb' => 64,
                    'form_factor' => '3.5\"',
                ],
                'notes' => 'Disco enviado a evaluación por sectores defectuosos.',
            ],
            [
                'code' => 'COMP-SSD-480-001',
                'serial_number' => 'SSD480-0001',
                'type_id' => $typeSsd->id,
                'subcategory_id' => $subcategory?->id,
                'brand_id' => $brandGeneric->id,
                'model' => 'SSD 480GB',
                'warehouse_id' => $warehouse->id,
                'repair_shop_id' => null,
                'status' => 'active',
                'condition' => 'good',
                'specs' => [
                    'capacity_gb' => 480,
                    'interface' => 'SATA III',
                    'read_mbps' => 520,
                    'write_mbps' => 450,
                    'nand_type' => 'TLC',
                ],
                'notes' => 'SSD actualmente instalado en un equipo en producción.',
            ],
        ];

        foreach ($components as $data) {
            Component::firstOrCreate(
                ['code' => $data['code']],
                $data
            );
        }
    }
}

