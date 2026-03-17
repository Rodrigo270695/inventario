<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('components', function (Blueprint $table) {
            $table->dropForeign(['zonal_id']);
            $table->dropForeign(['office_id']);
            $table->dropColumn(['zonal_id', 'office_id', 'location_type']);
        });
    }

    public function down(): void
    {
        Schema::table('components', function (Blueprint $table) {
            $table->foreignUuid('zonal_id')->nullable()->constrained('zonals')->nullOnDelete();
            $table->string('location_type', 30)->nullable();
            $table->foreignUuid('office_id')->nullable()->constrained('offices')->nullOnDelete();
        });
    }
};
