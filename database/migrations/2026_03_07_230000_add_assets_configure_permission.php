<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        if (! class_exists(Permission::class)) {
            return;
        }

        $permission = Permission::firstOrCreate(
            ['name' => 'assets.configure', 'guard_name' => 'web']
        );

        $superadmin = Role::where('name', 'superadmin')->first();
        if ($superadmin) {
            $superadmin->givePermissionTo($permission);
        }
    }

    public function down(): void
    {
        if (! class_exists(Permission::class)) {
            return;
        }

        $permission = Permission::where('name', 'assets.configure')->first();
        if ($permission) {
            $permission->delete();
        }
    }
};

