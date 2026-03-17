<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('repair_shops', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 200);
            $table->string('ruc', 20)->nullable();
            $table->string('contact_name', 150)->nullable();
            $table->string('phone', 30)->nullable();
            $table->text('address')->nullable();
            $table->foreignUuid('zonal_id')->nullable()->constrained('zonals')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('repair_shops');
    }
};
