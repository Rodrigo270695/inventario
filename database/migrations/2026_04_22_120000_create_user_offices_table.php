<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_offices', function (Blueprint $table) {
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('office_id')->constrained('offices')->cascadeOnDelete();
            $table->primary(['user_id', 'office_id']);
        });

        // Compatibilidad: por cada zonal asignado en user_zonals, dar acceso a todas las oficinas activas de ese zonal.
        if (Schema::hasTable('user_zonals') && Schema::hasTable('offices')) {
            $driver = Schema::getConnection()->getDriverName();
            if ($driver === 'pgsql') {
                DB::statement('
                    INSERT INTO user_offices (user_id, office_id)
                    SELECT uz.user_id, o.id
                    FROM user_zonals uz
                    INNER JOIN offices o ON o.zonal_id = uz.zonal_id AND o.deleted_at IS NULL
                    ON CONFLICT DO NOTHING
                ');
            } elseif ($driver === 'mysql') {
                DB::statement('
                    INSERT IGNORE INTO user_offices (user_id, office_id)
                    SELECT uz.user_id, o.id
                    FROM user_zonals uz
                    INNER JOIN offices o ON o.zonal_id = uz.zonal_id AND o.deleted_at IS NULL
                ');
            } else {
                DB::statement('
                    INSERT OR IGNORE INTO user_offices (user_id, office_id)
                    SELECT uz.user_id, o.id
                    FROM user_zonals uz
                    INNER JOIN offices o ON o.zonal_id = uz.zonal_id AND o.deleted_at IS NULL
                ');
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('user_offices');
    }
};
