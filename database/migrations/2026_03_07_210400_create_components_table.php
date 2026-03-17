<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('components', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 60)->unique();
            $table->string('serial_number', 200)->nullable();
            $table->foreignUuid('type_id')->constrained('component_types');
            $table->foreignUuid('brand_id')->nullable()->constrained('asset_brands')->nullOnDelete();
            $table->string('model', 150)->nullable();
            $table->foreignUuid('zonal_id')->constrained('zonals');
            $table->string('location_type', 30)->nullable();
            $table->foreignUuid('warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->foreignUuid('office_id')->nullable()->constrained('offices')->nullOnDelete();
            $table->foreignUuid('repair_shop_id')->nullable()->constrained('repair_shops')->nullOnDelete();
            $table->string('status', 30)->default('stored');
            $table->string('condition', 30)->default('new');
            $table->foreignUuid('purchase_item_id')->nullable()->constrained('purchase_items')->nullOnDelete();
            $table->jsonb('specs')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('components');
    }
};

