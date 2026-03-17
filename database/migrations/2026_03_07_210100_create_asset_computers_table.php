<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_computers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('asset_id')->unique()->constrained('assets')->cascadeOnDelete();
            $table->string('hostname', 255)->nullable();
            $table->string('bios_serial', 200)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('mac_address', 50)->nullable();
            $table->timestampTz('last_seen_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_computers');
    }
};

