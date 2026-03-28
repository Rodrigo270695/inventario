<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * Añade permisos de usuarios (envío de credenciales, duplicar con permisos/zonales) y los asigna a superadmin y admin.
 * Útil en bases ya existentes: php artisan db:seed --class=UserSendCredentialsPermissionSeeder
 */
class UserSendCredentialsPermissionSeeder extends Seeder
{
    public function run(): void
    {
        $names = ['users.send_credentials', 'users.duplicate'];

        foreach ($names as $name) {
            $permission = Permission::firstOrCreate(
                ['name' => $name, 'guard_name' => 'web']
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
}
