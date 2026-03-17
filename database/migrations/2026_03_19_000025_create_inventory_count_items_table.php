<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_count_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('inventory_count_id')->constrained('inventory_counts')->cascadeOnDelete();
            $table->foreignUuid('asset_id')->nullable()->constrained('assets');
            $table->foreignUuid('component_id')->nullable()->constrained('components');
            $table->integer('expected_quantity');
            $table->integer('counted_quantity');
            $table->integer('difference')->nullable();
            $table->text('notes')->nullable();
            $table->timestampsTz();

            // Opcional: al menos uno de asset_id o component_id debe existir (se valida a nivel de dominio)
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_count_items');
    }
};

