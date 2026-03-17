<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('preventive_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 200);
            $table->string('target_type', 20);
            $table->foreignUuid('subcategory_id')->nullable()->constrained('asset_subcategories')->nullOnDelete();
            $table->foreignUuid('component_type_id')->nullable()->constrained('component_types')->nullOnDelete();
            $table->foreignUuid('warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->string('frequency_type', 30);
            $table->integer('frequency_days')->nullable();
            $table->jsonb('checklist')->nullable();
            $table->string('default_priority', 20)->nullable()->default('medium');
            $table->decimal('estimated_cost', 12, 2)->nullable();
            $table->string('assigned_role', 60)->nullable()->default('tecnico');
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->timestamps();
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement(
                "ALTER TABLE preventive_plans ADD CONSTRAINT preventive_plans_target_type_check CHECK (target_type IN ('asset', 'component'))"
            );
            DB::statement(
                "ALTER TABLE preventive_plans ADD CONSTRAINT preventive_plans_frequency_type_check CHECK (frequency_type IN ('monthly', 'quarterly', 'biannual', 'annual', 'custom'))"
            );
            DB::statement(
                "ALTER TABLE preventive_plans ADD CONSTRAINT preventive_plans_priority_check CHECK (default_priority IS NULL OR default_priority IN ('low', 'medium', 'high'))"
            );
            DB::statement(
                "ALTER TABLE preventive_plans ADD CONSTRAINT preventive_plans_custom_frequency_check CHECK ((frequency_type = 'custom' AND frequency_days IS NOT NULL AND frequency_days > 0) OR (frequency_type <> 'custom'))"
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('preventive_plans');
    }
};
