<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_disposals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('asset_id')->nullable()->constrained('assets')->restrictOnDelete();
            $table->foreignUuid('component_id')->nullable()->constrained('components')->restrictOnDelete();
            $table->foreignUuid('warehouse_id')->nullable()->constrained('warehouses')->restrictOnDelete();
            $table->string('status', 30)->default('requested');
            $table->text('reason');
            $table->foreignUuid('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('approved_at')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement(
                "ALTER TABLE asset_disposals ADD CONSTRAINT asset_disposals_asset_xor_component_check CHECK ((asset_id IS NOT NULL AND component_id IS NULL) OR (asset_id IS NULL AND component_id IS NOT NULL))"
            );
            DB::statement(
                "ALTER TABLE asset_disposals ADD CONSTRAINT asset_disposals_status_check CHECK (status IN ('requested', 'approved', 'rejected'))"
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_disposals');
    }
};

