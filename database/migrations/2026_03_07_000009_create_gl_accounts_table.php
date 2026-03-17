<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gl_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 20)->unique();
            $table->string('name', 200);
            $table->string('account_type', 30)->nullable();
            $table->uuid('parent_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('gl_accounts', function (Blueprint $table) {
            $table->foreign('parent_id')->references('id')->on('gl_accounts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('gl_accounts', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
        });
        Schema::dropIfExists('gl_accounts');
    }
};
