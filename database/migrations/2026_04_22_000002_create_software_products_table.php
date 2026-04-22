<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('software_products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('vendor_id')->constrained('software_vendors')->restrictOnDelete();
            $table->string('name', 200);
            $table->boolean('is_tracked')->default(true);
            $table->timestampsTz();

            $table->index('vendor_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('software_products');
    }
};
