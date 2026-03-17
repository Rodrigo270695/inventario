<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Tabla asset_categories según ERP: categorías tributarias SUNAT (technology, vehicle,
 * furniture, building, machinery, other) con cuenta contable y depreciación vía gl_accounts.
 * Orden: justo debajo de gl_accounts (000009). Es la única migración que crea asset_categories.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Quitar FKs que referencian asset_categories o fixed_asset_categories (si existen)
        if (Schema::hasTable('purchase_items')) {
            Schema::table('purchase_items', function (Blueprint $table) {
                $table->dropForeign(['fixed_asset_category_id']);
            });
        }

        if (Schema::hasTable('asset_models')) {
            Schema::table('asset_models', function (Blueprint $table) {
                $table->dropForeign(['category_id']);
            });
        }

        if (Schema::hasTable('assets')) {
            Schema::table('assets', function (Blueprint $table) {
                $table->dropForeign(['category_id']);
            });
        }

        Schema::dropIfExists('fixed_asset_categories');
        Schema::dropIfExists('asset_categories');

        Schema::create('asset_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 150);
            $table->string('code', 30)->unique();
            $table->string('type', 30); // technology, vehicle, furniture, building, machinery, other
            $table->foreignUuid('gl_account_id')->nullable()->constrained('gl_accounts')->nullOnDelete();
            $table->foreignUuid('gl_depreciation_account_id')->nullable()->constrained('gl_accounts')->nullOnDelete();
            $table->integer('default_useful_life_years')->default(10);
            $table->string('default_depreciation_method', 30)->default('straight_line');
            $table->decimal('default_residual_value_pct', 5, 2)->default(10.00);
            $table->boolean('requires_insurance')->default(false);
            $table->boolean('requires_soat')->default(false);
            $table->string('icon', 50)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Las categorías se crean vía seeders dedicados (no insertamos datos aquí).
    }

    public function down(): void
    {
        if (Schema::hasTable('purchase_items')) {
            Schema::table('purchase_items', function (Blueprint $table) {
                $table->dropForeign(['fixed_asset_category_id']);
            });
        }

        if (Schema::hasTable('asset_models')) {
            Schema::table('asset_models', function (Blueprint $table) {
                $table->dropForeign(['category_id']);
            });
        }

        if (Schema::hasTable('assets')) {
            Schema::table('assets', function (Blueprint $table) {
                $table->dropForeign(['category_id']);
            });
        }

        Schema::dropIfExists('asset_categories');
    }
};
