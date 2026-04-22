<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agent_reports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('asset_id')->constrained('assets')->restrictOnDelete();
            $table->jsonb('payload');
            $table->timestampTz('reported_at');
            $table->boolean('is_full_snapshot')->nullable()->default(true);
            $table->timestampTz('created_at')->useCurrent();

            $table->index('asset_id');
            $table->index('created_at');
            $table->index('reported_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_reports');
    }
};
