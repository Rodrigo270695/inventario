<?php

namespace Database\Seeders;

use App\Models\RepairShop;
use App\Models\Zonal;
use Illuminate\Database\Seeder;

class RepairShopSeeder extends Seeder
{
    /**
     * Crea talleres externos de ejemplo.
     *
     * Debe ejecutarse después de ZonalOfficeWarehouseSeeder (para que existan zonales).
     */
    public function run(): void
    {
        $zonals = Zonal::where('is_active', true)->get()->keyBy('code');
        if ($zonals->isEmpty()) {
            return;
        }

        $definitions = [
            [
                'name' => 'SERVICIO TÉCNICO LIMA',
                'ruc' => '20500123001',
                'contact_name' => 'Luis Fernández',
                'phone' => '+51 1 730 4040',
                'address' => 'Av. La Marina 1500, Lima',
                'zonal_code' => 'LIMA',
            ],
            [
                'name' => 'TALLER ELECTRÓNICO NORTE',
                'ruc' => '20567890011',
                'contact_name' => 'Rosa Medina',
                'phone' => '+51 74 620 300',
                'address' => 'Av. Grau 780, Chiclayo',
                'zonal_code' => 'CHICLA',
            ],
            [
                'name' => 'SOPORTE INFORMÁTICO ORIENTE',
                'ruc' => '20654321009',
                'contact_name' => 'Pedro Salazar',
                'phone' => '+51 65 550 900',
                'address' => 'Jr. Putumayo 430, Iquitos',
                'zonal_code' => 'IQUITO',
            ],
        ];

        foreach ($definitions as $def) {
            $zonal = $zonals->get($def['zonal_code']) ?? $zonals->first();

            RepairShop::firstOrCreate(
                ['ruc' => $def['ruc']],
                [
                    'name' => $def['name'],
                    'contact_name' => $def['contact_name'],
                    'phone' => $def['phone'],
                    'address' => $def['address'],
                    'zonal_id' => $zonal?->id,
                    'is_active' => true,
                ]
            );
        }
    }
}

