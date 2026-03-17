<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_counts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('warehouse_id')->constrained('warehouses');
            $table->date('count_date');
            $table->string('status', 30)->default('in_progress'); // in_progress, reconciled, closed
            $table->timestampTz('reconciled_at')->nullable();
            $table->foreignUuid('reconciled_by')->nullable()->constrained('users');
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_counts');
    }
};

