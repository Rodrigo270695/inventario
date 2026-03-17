<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Añade usuario (login) y phone (9 dígitos, nullable) solo si no existen
     * (la migración base ya los crea en instalaciones nuevas).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'usuario')) {
                $table->string('usuario')->unique()->nullable()->after('name');
            }
            if (! Schema::hasColumn('users', 'phone')) {
                $table->string('phone', 9)->nullable()->after('password');
            }
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            $constraintExists = DB::selectOne("SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_phone_9_digits'");
            if (! $constraintExists) {
                DB::statement('ALTER TABLE users ADD CONSTRAINT chk_users_phone_9_digits CHECK (phone IS NULL OR phone ~ \'^[0-9]{9}$\')');
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_phone_9_digits');
        }
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'usuario')) {
                $table->dropColumn('usuario');
            }
            if (Schema::hasColumn('users', 'phone')) {
                $table->dropColumn('phone');
            }
        });
    }
};
