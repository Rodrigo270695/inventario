<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('components', function (Blueprint $table) {
            $table->foreignUuid('subcategory_id')
                ->nullable()
                ->after('brand_id')
                ->constrained('asset_subcategories')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('components', function (Blueprint $table) {
            $table->dropConstrainedForeignId('subcategory_id');
        });
    }
};

