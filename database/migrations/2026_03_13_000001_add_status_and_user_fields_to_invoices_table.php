<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->string('status', 20)->default('open')->after('amount');
            $table->foreignUuid('registered_by_id')->nullable()->after('status')->constrained('users');
            $table->foreignUuid('updated_by_id')->nullable()->after('registered_by_id')->constrained('users');
            $table->foreignUuid('closed_by_id')->nullable()->after('updated_by_id')->constrained('users');
            $table->foreignUuid('opened_by_id')->nullable()->after('closed_by_id')->constrained('users');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['registered_by_id']);
            $table->dropForeign(['updated_by_id']);
            $table->dropForeign(['closed_by_id']);
            $table->dropForeign(['opened_by_id']);
            $table->dropColumn(['status', 'registered_by_id', 'updated_by_id', 'closed_by_id', 'opened_by_id']);
        });
    }
};

