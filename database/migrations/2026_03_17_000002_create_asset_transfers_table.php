<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_transfers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 60)->unique();
            $table->foreignUuid('origin_warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->foreignUuid('destination_warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->string('status', 30)->default('pending_approval');
            $table->foreignUuid('sent_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->string('carrier_name', 200)->nullable();
            $table->string('tracking_number', 100)->nullable();
            $table->string('carrier_reference', 150)->nullable();
            $table->string('company_guide_number', 100)->nullable();
            $table->string('company_guide_path', 500)->nullable();
            $table->string('carrier_voucher_number', 100)->nullable();
            $table->string('carrier_voucher_path', 500)->nullable();
            $table->timestamp('ship_date')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->text('dispatch_notes')->nullable();
            $table->text('receipt_notes')->nullable();
            $table->foreignUuid('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->timestamps();
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement(
                "ALTER TABLE asset_transfers ADD CONSTRAINT asset_transfers_status_check CHECK (status IN ('pending_approval', 'approved', 'in_transit', 'received', 'cancelled'))"
            );
            DB::statement(
                "ALTER TABLE asset_transfers ADD CONSTRAINT asset_transfers_origin_destination_check CHECK (origin_warehouse_id <> destination_warehouse_id)"
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_transfers');
    }
};
