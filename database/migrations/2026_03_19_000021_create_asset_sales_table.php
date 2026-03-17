<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_sales', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('asset_disposal_id')->constrained('asset_disposals')->cascadeOnDelete();
            $table->string('buyer_name', 200);
            $table->string('buyer_dni', 20)->nullable();
            $table->decimal('amount', 14, 2)->nullable();
            $table->string('payment_method', 60)->nullable();
            $table->timestampTz('sold_at')->nullable();
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_sales');
    }
};

