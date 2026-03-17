<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('repair_parts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('repair_ticket_id')->constrained('repair_tickets')->cascadeOnDelete();
            $table->foreignUuid('component_id')->nullable()->constrained('components')->restrictOnDelete();
            $table->string('part_name', 200)->nullable();
            $table->string('part_number', 120)->nullable();
            $table->string('source_type', 20)->default('stock');
            $table->integer('quantity')->default(1);
            $table->decimal('unit_cost', 12, 2)->nullable();
            $table->decimal('total_cost', 12, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement(
                "ALTER TABLE repair_parts ADD CONSTRAINT repair_parts_source_type_check CHECK (source_type IN ('stock', 'external'))"
            );
            DB::statement(
                "ALTER TABLE repair_parts ADD CONSTRAINT repair_parts_quantity_check CHECK (quantity > 0)"
            );
            DB::statement(
                "ALTER TABLE repair_parts ADD CONSTRAINT repair_parts_source_data_check CHECK ((source_type = 'stock' AND component_id IS NOT NULL) OR (source_type = 'external' AND part_name IS NOT NULL))"
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('repair_parts');
    }
};
