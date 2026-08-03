<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unmatched_agent_reports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->jsonb('payload');
            $table->string('bios_serial', 200)->nullable();
            $table->string('mac_address', 50)->nullable();
            $table->string('hostname', 255)->nullable();
            $table->string('reason', 40); // not_found | ambiguous | missing_identity
            $table->unsignedSmallInteger('candidate_count')->default(0);
            $table->jsonb('candidate_asset_ids')->nullable();
            $table->timestampTz('reported_at');
            $table->boolean('is_full_snapshot')->nullable()->default(true);
            $table->timestampTz('created_at')->useCurrent();

            $table->index('created_at');
            $table->index('bios_serial');
            $table->index('mac_address');
            $table->index('reason');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unmatched_agent_reports');
    }
};
