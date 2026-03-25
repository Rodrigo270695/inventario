<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        // Órdenes que estaban "pendientes" pasan a esperar aprobación zonal (menor) primero.
        DB::table('purchase_orders')->where('status', 'pending')->update(['status' => 'pending_minor']);

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check');
            DB::statement(
                "ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_check CHECK (status IN ('pending_minor', 'pending', 'observed_minor', 'observed', 'approved', 'rejected'))"
            );
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        DB::table('purchase_orders')->where('status', 'pending_minor')->update(['status' => 'pending']);
        DB::table('purchase_orders')->where('status', 'observed_minor')->update(['status' => 'observed']);

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check');
            DB::statement(
                "ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_check CHECK (status IN ('pending', 'observed', 'approved', 'rejected'))"
            );
        }
    }
};
