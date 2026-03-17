<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maintenance_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('repair_ticket_id')->nullable()->constrained('repair_tickets')->cascadeOnDelete();
            $table->foreignUuid('preventive_task_id')->nullable()->constrained('preventive_tasks')->cascadeOnDelete();
            $table->foreignUuid('repair_cost_id')->nullable()->constrained('repair_costs')->nullOnDelete();
            $table->string('type', 40);
            $table->string('issuer_type', 20)->nullable();
            $table->string('document_number', 120)->nullable();
            $table->string('title', 200)->nullable();
            $table->string('file_name', 255)->nullable();
            $table->string('file_path', 500);
            $table->string('mime_type', 120)->nullable();
            $table->bigInteger('file_size')->nullable();
            $table->timestamp('issued_at')->nullable();
            $table->foreignUuid('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement(
                "ALTER TABLE maintenance_documents ADD CONSTRAINT maintenance_documents_parent_check CHECK (repair_ticket_id IS NOT NULL OR preventive_task_id IS NOT NULL)"
            );
            DB::statement(
                "ALTER TABLE maintenance_documents ADD CONSTRAINT maintenance_documents_type_check CHECK (type IN ('invoice', 'receipt', 'fee_receipt', 'quote', 'report', 'evidence_photo', 'before_photo', 'after_photo', 'warranty_doc', 'other'))"
            );
            DB::statement(
                "ALTER TABLE maintenance_documents ADD CONSTRAINT maintenance_documents_issuer_type_check CHECK (issuer_type IS NULL OR issuer_type IN ('company', 'supplier', 'technician', 'other'))"
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_documents');
    }
};
