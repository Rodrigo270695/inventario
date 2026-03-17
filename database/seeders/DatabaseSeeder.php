<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            PermissionSeeder::class,
            ZonalOfficeWarehouseSeeder::class,
            GlAccountAndAssetCategorySeeder::class,
            AssetBrandsModelsComponentTypesSeeder::class,
        ]);

        $role = Role::findByName('superadmin', 'web');

        // Usuario inicial: sin created_by ni updated_by (creado por el sistema).
        $user = User::firstOrCreate(
            ['usuario' => 'superadmin'],
            [
                'name' => 'Super',
                'last_name' => 'Admin',
                'email' => 'superadmin@inventario.local',
                'password' => Hash::make('password'),
                'document_type' => 'dni',
                'document_number' => '00000000',
                'is_active' => true,
            ]
        );

        if (! $user->hasRole($role)) {
            $user->assignRole($role);
        }

        $this->call([
            AdminUsersWithZonalsSeeder::class,
            AssetsSeeder::class,
        ]);
    }
}
