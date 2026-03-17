<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('depreciation_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('asset_id')->constrained('assets');
            $table->char('period', 7); // YYYY-MM
            $table->string('method', 30);
            $table->decimal('amount', 14, 2);
            $table->decimal('book_value_before', 14, 2);
            $table->decimal('book_value_after', 14, 2);
            $table->timestampTz('calculated_at')->nullable();
            $table->foreignUuid('approved_by')->nullable()->constrained('users');
            $table->string('status', 30)->default('draft'); // draft, approved
            $table->timestampsTz();

            $table->unique(['asset_id', 'period'], 'depreciation_entries_asset_period_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('depreciation_entries');
    }
};

