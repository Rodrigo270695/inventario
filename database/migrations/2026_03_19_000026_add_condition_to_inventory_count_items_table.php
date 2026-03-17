<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_count_items', function (Blueprint $table) {
            $table->string('condition_at_count', 40)->nullable()->after('difference');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_count_items', function (Blueprint $table) {
            $table->dropColumn('condition_at_count');
        });
    }
};

