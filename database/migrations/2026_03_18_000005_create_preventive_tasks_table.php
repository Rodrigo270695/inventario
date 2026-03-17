<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('preventive_tasks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('plan_id')->constrained('preventive_plans')->restrictOnDelete();
            $table->foreignUuid('asset_id')->nullable()->constrained('assets')->restrictOnDelete();
            $table->foreignUuid('component_id')->nullable()->constrained('components')->restrictOnDelete();
            $table->string('status', 30)->default('scheduled');
            $table->string('priority', 20)->nullable()->default('medium');
            $table->date('scheduled_date');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->foreignUuid('technician_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('findings')->nullable();
            $table->text('action_taken')->nullable();
            $table->jsonb('checklist_done')->nullable();
            $table->string('condition_after', 30)->nullable();
            $table->decimal('cost', 10, 2)->nullable();
            $table->date('next_due_date')->nullable();
            $table->timestamps();
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement(
                "ALTER TABLE preventive_tasks ADD CONSTRAINT preventive_tasks_asset_xor_component_check CHECK ((asset_id IS NOT NULL AND component_id IS NULL) OR (asset_id IS NULL AND component_id IS NOT NULL))"
            );
            DB::statement(
                "ALTER TABLE preventive_tasks ADD CONSTRAINT preventive_tasks_status_check CHECK (status IN ('scheduled', 'in_progress', 'completed', 'skipped', 'overdue', 'cancelled'))"
            );
            DB::statement(
                "ALTER TABLE preventive_tasks ADD CONSTRAINT preventive_tasks_priority_check CHECK (priority IS NULL OR priority IN ('low', 'medium', 'high'))"
            );
            DB::statement(
                "ALTER TABLE preventive_tasks ADD CONSTRAINT preventive_tasks_condition_after_check CHECK (condition_after IS NULL OR condition_after IN ('new', 'good', 'regular', 'damaged', 'obsolete'))"
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('preventive_tasks');
    }
};
