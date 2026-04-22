<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('software_installations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('asset_id')->constrained('assets')->restrictOnDelete();
            $table->foreignUuid('product_id')->constrained('software_products')->restrictOnDelete();
            $table->string('version', 100)->nullable();
            $table->timestampTz('detected_at')->useCurrent();
            $table->boolean('is_authorized')->default(false);
            $table->timestampsTz();

            $table->index('asset_id');
            $table->index('product_id');
            $table->index('detected_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('software_installations');
    }
};
