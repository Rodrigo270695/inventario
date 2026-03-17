<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Número de documento único por tipo (solo usuarios no eliminados).
     * PostgreSQL: índice único parcial. MySQL: índice único simple.
     */
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement(
                'CREATE UNIQUE INDEX users_document_type_number_unique ON users (document_type, document_number) WHERE deleted_at IS NULL'
            );
        } else {
            Schema::table('users', function ($table) {
                $table->unique(['document_type', 'document_number'], 'users_document_type_number_unique');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS users_document_type_number_unique');
        } else {
            Schema::table('users', function ($table) {
                $table->dropUnique('users_document_type_number_unique');
            });
        }
    }
};
