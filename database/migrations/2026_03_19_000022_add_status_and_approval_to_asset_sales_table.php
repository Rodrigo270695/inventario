<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('asset_sales', function (Blueprint $table) {
            $table->string('status', 30)->default('pending_approval')->after('payment_method');
            $table->foreignUuid('approved_by')->nullable()->after('status')->constrained('users')->nullOnDelete();
            $table->timestampTz('approved_at')->nullable()->after('approved_by');
            $table->foreignUuid('created_by')->nullable()->after('asset_disposal_id')->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable()->after('amount'); // Nota registrada al crear la venta
        });
    }

    public function down(): void
    {
        Schema::table('asset_sales', function (Blueprint $table) {
            $table->dropForeign(['approved_by']);
            $table->dropForeign(['created_by']);
            $table->dropColumn(['status', 'approved_by', 'approved_at', 'created_by', 'notes']);
        });
    }
};

