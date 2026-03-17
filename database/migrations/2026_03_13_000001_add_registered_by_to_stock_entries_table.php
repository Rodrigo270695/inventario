<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('stock_entries') || Schema::hasColumn('stock_entries', 'registered_by')) {
            return;
        }

        Schema::table('stock_entries', function (Blueprint $table) {
            $table->foreignUuid('registered_by')
                ->nullable()
                ->after('received_by')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('stock_entries') || ! Schema::hasColumn('stock_entries', 'registered_by')) {
            return;
        }

        Schema::table('stock_entries', function (Blueprint $table) {
            $table->dropForeign(['registered_by']);
            $table->dropColumn('registered_by');
        });
    }
};
