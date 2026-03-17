<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            // Hacer nullable purchase_item_id
            $table->uuid('purchase_item_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            // Revertir a NOT NULL (ajusta si tu esquema original era distinto)
            $table->uuid('purchase_item_id')->nullable(false)->change();
        });
    }
};
