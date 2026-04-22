<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('api_key_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('token_id')->constrained('agent_tokens')->restrictOnDelete();
            $table->string('endpoint', 200)->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->smallInteger('status_code')->nullable();
            $table->timestampTz('created_at')->useCurrent();

            $table->index('created_at');
            $table->index('token_id');
            $table->index(['token_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('api_key_logs');
    }
};
