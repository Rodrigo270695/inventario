<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Permisos revocados solo para este usuario (el rol no cambia).
     */
    public function up(): void
    {
        Schema::create('user_revoked_permissions', function (Blueprint $table) {
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('permission_id');
            $table->primary(['user_id', 'permission_id']);

            $table->foreign('permission_id')
                ->references('id')
                ->on('permissions')
                ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_revoked_permissions');
    }
};
