<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->string('code', 60)->nullable();
            $table->string('status', 30)->default('pending');
            $table->foreignUuid('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('approved_at')->nullable();
            $table->foreignUuid('rejected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('rejected_at')->nullable();
            $table->foreignUuid('observed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('observed_at')->nullable();
            $table->text('observation_notes')->nullable();
            $table->decimal('total_amount', 14, 2)->nullable();
            $table->foreignUuid('office_id')->constrained('offices')->cascadeOnDelete();
            $table->uuid('selected_quote_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'pgsql') {
            DB::statement(
                "ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_check CHECK (status IN ('pending', 'observed', 'approved', 'rejected'))"
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_orders');
    }
};
