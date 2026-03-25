<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * First-step (minor) approval workflow: who/when approved, rejected, or observed at this tier,
     * plus observation text and its timestamp (parallel to the existing major approval fields).
     */
    public function up(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->foreignUuid('minor_approved_by')->nullable()->after('requested_by')->constrained('users')->nullOnDelete();
            $table->timestampTz('minor_approved_at')->nullable();

            $table->foreignUuid('minor_rejected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('minor_rejected_at')->nullable();

            $table->foreignUuid('minor_observed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('minor_observed_at')->nullable();
            $table->text('minor_observation_notes')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('minor_approved_by');
            $table->dropColumn('minor_approved_at');

            $table->dropConstrainedForeignId('minor_rejected_by');
            $table->dropColumn('minor_rejected_at');

            $table->dropConstrainedForeignId('minor_observed_by');
            $table->dropColumn('minor_observed_at');
            $table->dropColumn('minor_observation_notes');
        });
    }
};
