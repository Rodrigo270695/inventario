<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('depreciation_schedules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('category_id')->constrained('asset_categories');
            $table->string('method', 30)->default('straight_line');
            $table->unsignedInteger('useful_life_years');
            $table->decimal('residual_value_pct', 5, 2)->default(0);
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('depreciation_schedules');
    }
};

