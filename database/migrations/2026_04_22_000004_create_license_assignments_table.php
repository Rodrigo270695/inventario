<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('license_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('software_license_id')->constrained('software_licenses')->restrictOnDelete();
            $table->foreignUuid('asset_id')->constrained('assets')->restrictOnDelete();
            $table->timestampTz('assigned_at')->useCurrent();
            $table->timestampTz('revoked_at')->nullable();
            $table->date('valid_until')->nullable();
            $table->timestampsTz();

            $table->index('software_license_id');
            $table->index('asset_id');
            $table->index(['software_license_id', 'revoked_at']);
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement(
                'ALTER TABLE license_assignments ADD CONSTRAINT license_assignments_revoked_after_assigned_check CHECK (revoked_at IS NULL OR revoked_at >= assigned_at)'
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('license_assignments');
    }
};
