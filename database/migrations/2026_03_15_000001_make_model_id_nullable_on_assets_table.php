<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->dropForeign(['model_id']);
        });
        Schema::table('assets', function (Blueprint $table) {
            $table->uuid('model_id')->nullable()->change();
        });
        Schema::table('assets', function (Blueprint $table) {
            $table->foreign('model_id')->references('id')->on('asset_models');
        });
    }

    public function down(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->dropForeign(['model_id']);
        });
        Schema::table('assets', function (Blueprint $table) {
            $table->uuid('model_id')->nullable(false)->change();
        });
        Schema::table('assets', function (Blueprint $table) {
            $table->foreign('model_id')->references('id')->on('asset_models');
        });
    }
};
