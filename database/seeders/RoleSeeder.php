<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    /**
     * Crea los roles base del sistema.
     */
    public function run(): void
    {
        $roles = ['superadmin', 'admin'];

        foreach ($roles as $name) {
            Role::firstOrCreate(
                ['name' => $name],
                ['guard_name' => 'web']
            );
        }
    }
}
