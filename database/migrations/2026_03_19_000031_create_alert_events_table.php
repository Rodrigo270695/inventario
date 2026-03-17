<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alert_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('alert_rule_id')->nullable()->constrained('alert_rules')->nullOnDelete();
            $table->string('severity', 30);
            $table->string('model_type', 255)->nullable();
            $table->uuid('model_id')->nullable();
            $table->jsonb('payload')->nullable();
            $table->timestampTz('resolved_at')->nullable();
            $table->foreignUuid('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alert_events');
    }
};

