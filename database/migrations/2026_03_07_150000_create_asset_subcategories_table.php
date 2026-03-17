<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_subcategories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('asset_category_id')->constrained('asset_categories')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('code', 30)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_subcategories');
    }
};
