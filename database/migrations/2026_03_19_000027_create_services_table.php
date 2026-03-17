<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('purchase_item_id')->constrained('purchase_items');
            $table->foreignUuid('asset_subcategory_id')->nullable()->constrained('asset_subcategories')->nullOnDelete();
            $table->foreignUuid('warehouse_id')->constrained('warehouses');
            $table->string('name', 200);
            $table->string('type', 60);
            $table->foreignUuid('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->string('renewal', 30)->nullable();
            $table->decimal('amount', 14, 2)->nullable();
            $table->string('status', 30)->default('draft');
            $table->text('notes')->nullable();
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
