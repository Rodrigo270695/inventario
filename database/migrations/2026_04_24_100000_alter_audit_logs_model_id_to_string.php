<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Los IDs no siempre son UUID (p. ej. roles/permissions Spatie usan bigint).
     * Se usa string para morph genérico.
     */
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE audit_logs ALTER COLUMN model_id TYPE varchar(64) USING model_id::text');
        } elseif ($driver === 'mysql') {
            DB::statement('ALTER TABLE audit_logs MODIFY model_id VARCHAR(64) NOT NULL');
        } elseif ($driver === 'sqlite') {
            // En SQLite Laravel suele crear UUID como CHAR; no hace falta cambiar.
        }
    }

    public function down(): void
    {
        // Irreversible si ya existen IDs no UUID.
    }
};
