<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('repair_tickets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 60)->unique();
            $table->foreignUuid('asset_id')->nullable()->constrained('assets')->restrictOnDelete();
            $table->foreignUuid('component_id')->nullable()->constrained('components')->restrictOnDelete();
            $table->string('status', 30)->default('pending_approval');
            $table->string('priority', 20)->default('medium');
            $table->string('failure_type', 40)->nullable();
            $table->string('maintenance_mode', 20)->default('internal');
            $table->decimal('estimated_cost', 12, 2)->nullable();
            $table->decimal('approved_budget', 12, 2)->nullable();
            $table->timestamp('reported_at')->useCurrent();
            $table->timestamp('diagnosed_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('issue_description');
            $table->text('diagnosis')->nullable();
            $table->text('solution')->nullable();
            $table->string('condition_in', 30)->nullable();
            $table->string('condition_out', 30)->nullable();
            $table->foreignUuid('opened_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('technician_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('rejected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('repair_shop_id')->nullable()->constrained('repair_shops')->restrictOnDelete();
            $table->string('external_reference', 120)->nullable();
            $table->text('rejection_reason')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement(
                "ALTER TABLE repair_tickets ADD CONSTRAINT repair_tickets_asset_xor_component_check CHECK ((asset_id IS NOT NULL AND component_id IS NULL) OR (asset_id IS NULL AND component_id IS NOT NULL))"
            );
            DB::statement(
                "ALTER TABLE repair_tickets ADD CONSTRAINT repair_tickets_status_check CHECK (status IN ('pending_approval', 'approved', 'rejected', 'diagnosed', 'in_progress', 'completed', 'cancelled'))"
            );
            DB::statement(
                "ALTER TABLE repair_tickets ADD CONSTRAINT repair_tickets_priority_check CHECK (priority IN ('low', 'medium', 'high', 'critical'))"
            );
            DB::statement(
                "ALTER TABLE repair_tickets ADD CONSTRAINT repair_tickets_failure_type_check CHECK (failure_type IS NULL OR failure_type IN ('hardware', 'electrical', 'physical', 'cosmetic', 'connectivity', 'other'))"
            );
            DB::statement(
                "ALTER TABLE repair_tickets ADD CONSTRAINT repair_tickets_maintenance_mode_check CHECK (maintenance_mode IN ('internal', 'external', 'warranty'))"
            );
            DB::statement(
                "ALTER TABLE repair_tickets ADD CONSTRAINT repair_tickets_condition_in_check CHECK (condition_in IS NULL OR condition_in IN ('new', 'good', 'regular', 'damaged', 'obsolete'))"
            );
            DB::statement(
                "ALTER TABLE repair_tickets ADD CONSTRAINT repair_tickets_condition_out_check CHECK (condition_out IS NULL OR condition_out IN ('new', 'good', 'regular', 'damaged', 'obsolete'))"
            );
            DB::statement(
                "ALTER TABLE repair_tickets ADD CONSTRAINT repair_tickets_approved_fields_check CHECK (status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))"
            );
            DB::statement(
                "ALTER TABLE repair_tickets ADD CONSTRAINT repair_tickets_rejected_fields_check CHECK (status <> 'rejected' OR (rejected_by IS NOT NULL AND rejected_at IS NOT NULL AND rejection_reason IS NOT NULL))"
            );
            DB::statement(
                "ALTER TABLE repair_tickets ADD CONSTRAINT repair_tickets_cancelled_fields_check CHECK (status <> 'cancelled' OR (cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL))"
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('repair_tickets');
    }
};
