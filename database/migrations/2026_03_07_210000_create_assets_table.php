<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 60)->unique();
            $table->string('serial_number', 200)->nullable()->unique();
            $table->foreignUuid('model_id')->constrained('asset_models');
            $table->foreignUuid('category_id')->constrained('asset_categories');
            $table->foreignUuid('purchase_item_id')->nullable()->constrained('purchase_items')->nullOnDelete();
            $table->string('status', 30)->default('stored');
            $table->string('condition', 30)->default('new');
            $table->foreignUuid('warehouse_id')->nullable()->constrained('warehouses')->restrictOnDelete();
            $table->foreignUuid('repair_shop_id')->nullable()->constrained('repair_shops')->restrictOnDelete();
            $table->decimal('acquisition_value', 14, 2)->nullable();
            $table->decimal('current_value', 14, 2)->nullable();
            $table->decimal('depreciation_rate', 5, 2)->nullable()->default(20.00);
            $table->date('warranty_until')->nullable();
            $table->jsonb('specs')->nullable();
            $table->text('notes')->nullable();
            $table->foreignUuid('registered_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('updated_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assets');
    }
};
