<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class UserSeeder extends Seeder
{
    /**
     * Crea el usuario inicial superadmin y le asigna el rol.
     */
    public function run(): void
    {
        $role = Role::query()
            ->where('name', 'superadmin')
            ->where('guard_name', 'web')
            ->first();

        if (! $role instanceof Role) {
            return;
        }

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
    }
}

