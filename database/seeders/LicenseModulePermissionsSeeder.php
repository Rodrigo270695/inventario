<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class LicenseModulePermissionsSeeder extends Seeder
{
    private const LICENSE_PERMISSIONS = [
        'licenses.view',
        'licenses.create',
        'licenses.update',
        'licenses.delete',
        'licenses.assign',
        'licenses.revoke',
    ];

    /** Módulo auditoría (solo se asignan aquí al superadmin; el modal usa PERMISSION_TREE). */
    private const AUDIT_PERMISSIONS = [
        'audit.view',
        'audit.logs.view',
        'audit.reports.view',
        'audit.tokens.manage',
    ];

    private const SECURITY_PERMISSIONS = [
        'security.login_attempts.view',
        'security.api_logs.view',
        'security.backups.view',
        'security.backups.create',
        'security.backups.verify',
    ];

    public function run(): void
    {
        foreach (array_merge(self::LICENSE_PERMISSIONS, self::AUDIT_PERMISSIONS, self::SECURITY_PERMISSIONS) as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }

        $superadmin = Role::query()->where('name', 'superadmin')->where('guard_name', 'web')->first();
        if ($superadmin) {
            $superadmin->givePermissionTo(array_merge(self::LICENSE_PERMISSIONS, self::AUDIT_PERMISSIONS, self::SECURITY_PERMISSIONS));
        }
    }
}
