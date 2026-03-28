<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * Añade el permiso users.send_credentials y lo asigna a superadmin y admin.
 * Útil en bases ya existentes: php artisan db:seed --class=UserSendCredentialsPermissionSeeder
 */
class UserSendCredentialsPermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permission = Permission::firstOrCreate(
            ['name' => 'users.send_credentials', 'guard_name' => 'web']
        );

        foreach (['superadmin', 'admin'] as $roleName) {
            $role = Role::query()
                ->where('name', $roleName)
                ->where('guard_name', 'web')
                ->first();
            if ($role instanceof Role && ! $role->hasPermissionTo($permission)) {
                $role->givePermissionTo($permission);
            }
        }
    }
}
