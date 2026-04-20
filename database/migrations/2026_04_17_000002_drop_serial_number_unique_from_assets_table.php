<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_serial_number_unique');

            return;
        }

        if ($driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS assets_serial_number_unique');

            return;
        }

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE assets DROP INDEX IF EXISTS assets_serial_number_unique');

            return;
        }

        Schema::table('assets', function (Blueprint $table) {
            $table->dropUnique(['serial_number']);
        });
    }

    public function down(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->unique('serial_number');
        });
    }
};
