<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maintenance_status_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('repair_ticket_id')->nullable()->constrained('repair_tickets')->cascadeOnDelete();
            $table->foreignUuid('preventive_task_id')->nullable()->constrained('preventive_tasks')->cascadeOnDelete();
            $table->string('event_type', 40);
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30)->nullable();
            $table->text('comment')->nullable();
            $table->foreignUuid('performed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement(
                "ALTER TABLE maintenance_status_logs ADD CONSTRAINT maintenance_status_logs_parent_check CHECK (repair_ticket_id IS NOT NULL OR preventive_task_id IS NOT NULL)"
            );
            DB::statement(
                "ALTER TABLE maintenance_status_logs ADD CONSTRAINT maintenance_status_logs_event_type_check CHECK (event_type IN ('status_change', 'assignment', 'approval', 'cancellation', 'completion', 'note'))"
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_status_logs');
    }
};
