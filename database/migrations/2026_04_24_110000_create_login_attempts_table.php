<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('login_attempts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('email', 255);
            $table->ipAddress('ip_address');
            $table->text('user_agent')->nullable();
            $table->boolean('success');
            $table->string('failure_reason', 100)->nullable();
            $table->timestampTz('created_at')->useCurrent();

            $table->index('email');
            $table->index('created_at');
            $table->index(['email', 'created_at']);
            $table->index(['ip_address', 'created_at']);
            $table->index(['success', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_attempts');
    }
};
