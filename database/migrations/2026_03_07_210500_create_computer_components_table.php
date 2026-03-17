<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('computer_components', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->foreignUuid('asset_id')->constrained('assets')->cascadeOnDelete();
            $table->foreignUuid('component_id')->constrained('components')->cascadeOnDelete();
            $table->string('slot', 60)->nullable();
            $table->timestampTz('installed_at')->useCurrent();
            $table->timestampTz('uninstalled_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('computer_components');
    }
};

