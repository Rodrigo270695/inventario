<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('stock_entry_items') || ! Schema::hasColumn('stock_entry_items', 'fixed_asset_id')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE stock_entry_items DROP CONSTRAINT IF EXISTS stock_entry_items_fixed_asset_id_foreign');
        } else {
            Schema::table('stock_entry_items', function (Blueprint $table) {
                $table->dropForeign(['fixed_asset_id']);
            });
        }

        Schema::table('stock_entry_items', function (Blueprint $table) {
            $table->dropColumn('fixed_asset_id');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('stock_entry_items') || Schema::hasColumn('stock_entry_items', 'fixed_asset_id')) {
            return;
        }

        Schema::table('stock_entry_items', function (Blueprint $table) {
            $table->foreignUuid('fixed_asset_id')->nullable()->after('component_id')->constrained('fixed_assets')->nullOnDelete();
        });
    }
};
