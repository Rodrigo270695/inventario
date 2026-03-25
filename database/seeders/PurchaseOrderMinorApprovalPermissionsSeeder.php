<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * Permisos de aprobación menor (primer nivel) en órdenes de compra.
 * Ejecutar en producción sin re-lanzar PermissionSeeder completo:
 * php artisan db:seed --class=PurchaseOrderMinorApprovalPermissionsSeeder
 */
class PurchaseOrderMinorApprovalPermissionsSeeder extends Seeder
{
    private const PERMISSIONS = [
        'purchase_orders.minor_approve',
        'purchase_orders.minor_observe',
    ];

    public function run(): void
    {
        foreach (self::PERMISSIONS as $name) {
            Permission::firstOrCreate(
                ['name' => $name, 'guard_name' => 'web']
            );
        }

        $superadmin = Role::query()->where('name', 'superadmin')->where('guard_name', 'web')->first();
        if ($superadmin instanceof Role) {
            $superadmin->givePermissionTo(self::PERMISSIONS);
        }
    }
}
