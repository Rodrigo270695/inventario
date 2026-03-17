<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('repair_costs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('repair_ticket_id')->constrained('repair_tickets')->cascadeOnDelete();
            $table->string('type', 30);
            $table->decimal('amount', 12, 2);
            $table->foreignUuid('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->string('document_type', 30)->nullable();
            $table->string('document_number', 100)->nullable();
            $table->string('document_path', 500)->nullable();
            $table->text('description')->nullable();
            $table->timestamp('incurred_at')->nullable()->useCurrent();
            $table->timestamps();
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement(
                "ALTER TABLE repair_costs ADD CONSTRAINT repair_costs_type_check CHECK (type IN ('labour', 'transport', 'external_service', 'miscellaneous'))"
            );
            DB::statement(
                "ALTER TABLE repair_costs ADD CONSTRAINT repair_costs_document_type_check CHECK (document_type IS NULL OR document_type IN ('factura', 'recibo_honorarios', 'boleta', 'ticket'))"
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('repair_costs');
    }
};
