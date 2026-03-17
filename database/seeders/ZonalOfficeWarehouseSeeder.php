<?php

namespace Database\Seeders;

use App\Models\Office;
use App\Models\Warehouse;
use App\Models\Zonal;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ZonalOfficeWarehouseSeeder extends Seeder
{
    public function run(): void
    {
        $zonalNames = [
            'CAJAMARCA',
            'TUMBES',
            'CHICLAYO',
            'LIMA',
            'IQUITOS',
            'TARAPOTO',
            'TRUJILLO',
            'JAEN',
        ];

        $zonals = [];

        foreach ($zonalNames as $name) {
            $code = substr(Str::upper(Str::slug($name, '')), 0, 6);

            $zonals[$name] = Zonal::firstOrCreate(
                ['code' => $code],
                [
                    'name' => $name,
                    'region' => $name,
                    'timezone' => 'America/Lima',
                    'is_active' => true,
                ]
            );
        }

        foreach ($zonals as $name => $zonal) {
            // Crear de 1 a 3 oficinas por zonal
            $officeDefinitions = [
                ['name' => 'OFICINA PRINCIPAL', 'code' => 'OFI-PRI'],
                ['name' => 'OFICINA SECUNDARIA', 'code' => 'OFI-SEC'],
                ['name' => 'OFICINA ADMINISTRATIVA', 'code' => 'OFI-ADM'],
            ];

            $createdOffices = [];

            foreach ($officeDefinitions as $def) {
                $office = Office::firstOrCreate(
                    [
                        'zonal_id' => $zonal->id,
                        'name' => $def['name'],
                    ],
                    [
                        'code' => $def['code'],
                        'address' => $name.' - '.$def['name'],
                        'is_active' => true,
                    ]
                );

                $createdOffices[] = $office;
            }

            // Para cada oficina, al menos un almacén principal
            foreach ($createdOffices as $index => $office) {
                $suffix = $index === 0 ? 'PRI' : ($index === 1 ? 'SEC' : 'ALT');
                Warehouse::firstOrCreate(
                    [
                        'office_id' => $office->id,
                        'name' => 'ALMACÉN '.$suffix,
                    ],
                    [
                        'code' => $suffix,
                        'capacity' => null,
                        'is_active' => true,
                    ]
                );
            }
        }
    }
}

