<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            if (Schema::hasColumn('assets', 'asset_tag')) {
                $table->dropColumn('asset_tag');
            }
            if (Schema::hasColumn('assets', 'location_type')) {
                $table->dropColumn('location_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->string('asset_tag', 120)->nullable()->after('code');
            $table->string('location_type', 30)->nullable()->after('condition');
        });
    }
};
