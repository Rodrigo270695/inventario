<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Zonal;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

/**
 * Crea 4 usuarios con rol admin y asigna a cada uno 1 a 3 zonales.
 * Debe ejecutarse después de RoleSeeder y ZonalOfficeWarehouseSeeder.
 */
class AdminUsersWithZonalsSeeder extends Seeder
{
    public function run(): void
    {
        $role = Role::findByName('admin', 'web');
        $zonals = Zonal::where('is_active', true)->orderBy('name')->get();
        if ($zonals->count() < 3) {
            return;
        }

        $definitions = [
            [
                'usuario' => 'admin.cajamarca',
                'name' => 'Admin',
                'last_name' => 'Cajamarca',
                'email' => 'admin.cajamarca@inventario.local',
                'document_number' => '10000001',
                'zonal_codes' => ['CAJAMA', 'JAEN'], // 2 zonales
            ],
            [
                'usuario' => 'admin.norte',
                'name' => 'Admin',
                'last_name' => 'Norte',
                'email' => 'admin.norte@inventario.local',
                'document_number' => '10000002',
                'zonal_codes' => ['TUMBES', 'CHICLA', 'TRUJIL'], // 3 zonales
            ],
            [
                'usuario' => 'admin.lima',
                'name' => 'Admin',
                'last_name' => 'Lima',
                'email' => 'admin.lima@inventario.local',
                'document_number' => '10000003',
                'zonal_codes' => ['LIMA'], // 1 zonal
            ],
            [
                'usuario' => 'admin.oriente',
                'name' => 'Admin',
                'last_name' => 'Oriente',
                'email' => 'admin.oriente@inventario.local',
                'document_number' => '10000004',
                'zonal_codes' => ['IQUITO', 'TARAPO'], // 2 zonales
            ],
        ];

        foreach ($definitions as $def) {
            $user = User::firstOrCreate(
                ['usuario' => $def['usuario']],
                [
                    'name' => $def['name'],
                    'last_name' => $def['last_name'],
                    'email' => $def['email'],
                    'password' => Hash::make('password'),
                    'document_type' => 'dni',
                    'document_number' => $def['document_number'],
                    'is_active' => true,
                ]
            );

            if (! $user->hasRole($role)) {
                $user->assignRole($role);
            }

            $zonalIds = $zonals->whereIn('code', $def['zonal_codes'])->pluck('id')->all();
            if (! empty($zonalIds)) {
                $user->zonals()->sync($zonalIds);
            }
        }
    }
}
