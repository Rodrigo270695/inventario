<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('computer_components', function (Blueprint $table) {
            $table->foreignUuid('installed_by')
                ->nullable()
                ->after('installed_at')
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignUuid('uninstalled_by')
                ->nullable()
                ->after('uninstalled_at')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('computer_components', function (Blueprint $table) {
            $table->dropConstrainedForeignId('installed_by');
            $table->dropConstrainedForeignId('uninstalled_by');
        });
    }
};

