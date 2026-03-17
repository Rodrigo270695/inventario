<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->string('remission_guide', 100)->nullable()->after('amount');
            $table->string('remission_guide_path', 255)->nullable()->after('remission_guide');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['remission_guide_path', 'remission_guide']);
        });
    }
};

