<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agent_tokens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 100)->nullable();
            $table->string('token_hash', 255);
            $table->jsonb('ip_whitelist')->nullable();
            $table->timestampTz('expires_at')->nullable();
            $table->timestampTz('last_used_at')->nullable();
            $table->timestampsTz();

            $table->unique('token_hash');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_tokens');
    }
};
