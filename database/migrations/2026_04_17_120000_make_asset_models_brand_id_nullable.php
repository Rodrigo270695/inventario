<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('asset_models', function (Blueprint $table) {
            $table->dropForeign(['brand_id']);
        });
        Schema::table('asset_models', function (Blueprint $table) {
            $table->uuid('brand_id')->nullable()->change();
        });
        Schema::table('asset_models', function (Blueprint $table) {
            $table->foreign('brand_id')->references('id')->on('asset_brands')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('asset_models', function (Blueprint $table) {
            $table->dropForeign(['brand_id']);
        });
        Schema::table('asset_models', function (Blueprint $table) {
            $table->uuid('brand_id')->nullable(false)->change();
        });
        Schema::table('asset_models', function (Blueprint $table) {
            $table->foreign('brand_id')->references('id')->on('asset_brands')->cascadeOnDelete();
        });
    }
};
