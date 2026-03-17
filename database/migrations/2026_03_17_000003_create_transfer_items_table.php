<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transfer_items', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('asset_transfer_id')->constrained('asset_transfers')->cascadeOnDelete();
            $table->foreignUuid('asset_id')->nullable()->constrained('assets')->nullOnDelete();
            $table->foreignUuid('component_id')->nullable()->constrained('components')->nullOnDelete();
            $table->string('condition_out', 30)->nullable();
            $table->string('condition_in', 30)->nullable();
            $table->timestamps();
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement(
                "ALTER TABLE transfer_items ADD CONSTRAINT transfer_items_asset_or_component_check CHECK (asset_id IS NOT NULL OR component_id IS NOT NULL)"
            );
            DB::statement(
                "ALTER TABLE transfer_items ADD CONSTRAINT transfer_items_condition_out_check CHECK (condition_out IS NULL OR condition_out IN ('new', 'good', 'regular', 'damaged', 'obsolete'))"
            );
            DB::statement(
                "ALTER TABLE transfer_items ADD CONSTRAINT transfer_items_condition_in_check CHECK (condition_in IS NULL OR condition_in IN ('new', 'good', 'regular', 'damaged', 'obsolete'))"
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('transfer_items');
    }
};
