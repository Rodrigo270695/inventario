<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('purchase_order_id')->constrained('purchase_orders')->cascadeOnDelete();
            $table->text('description');
            $table->integer('quantity');
            $table->decimal('unit_price', 14, 2)->nullable();
            $table->decimal('total_price', 14, 2)->nullable();
            $table->foreignUuid('asset_category_id')->nullable()->constrained('asset_categories')->nullOnDelete();
            $table->foreignUuid('asset_subcategory_id')->nullable()->constrained('asset_subcategories')->nullOnDelete();
            $table->foreignUuid('asset_brand_id')->nullable()->constrained('asset_brands')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_items');
    }
};
