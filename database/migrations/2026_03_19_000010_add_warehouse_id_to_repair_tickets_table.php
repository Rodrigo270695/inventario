<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('repair_tickets', function (Blueprint $table) {
            if (! Schema::hasColumn('repair_tickets', 'warehouse_id')) {
                $table->foreignUuid('warehouse_id')
                    ->nullable()
                    ->after('component_id')
                    ->constrained('warehouses')
                    ->restrictOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('repair_tickets', function (Blueprint $table) {
            if (Schema::hasColumn('repair_tickets', 'warehouse_id')) {
                $table->dropForeign(['warehouse_id']);
                $table->dropColumn('warehouse_id');
            }
        });
    }
};

