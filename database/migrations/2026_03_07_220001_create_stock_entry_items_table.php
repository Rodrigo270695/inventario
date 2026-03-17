<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_entry_items', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('stock_entry_id')->constrained('stock_entries')->cascadeOnDelete();
            $table->foreignUuid('purchase_item_id')->nullable()->constrained('purchase_items')->nullOnDelete();
            $table->foreignUuid('asset_id')->nullable()->constrained('assets')->nullOnDelete();
            $table->foreignUuid('component_id')->nullable()->constrained('components')->nullOnDelete();
            $table->string('condition', 30)->default('new');
            $table->integer('quantity')->default(1);
            $table->timestamps();
        });

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'pgsql') {
            DB::statement(
                "ALTER TABLE stock_entry_items ADD CONSTRAINT stock_entry_items_condition_check CHECK (condition IN ('new', 'good', 'regular', 'damaged', 'obsolete'))"
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_entry_items');
    }
};
