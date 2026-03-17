<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('asset_sales', function (Blueprint $table) {
            $table->text('approval_notes')->nullable()->after('approved_at'); // Nota registrada al aprobar/rechazar la venta
        });
    }

    public function down(): void
    {
        Schema::table('asset_sales', function (Blueprint $table) {
            $table->dropColumn('approval_notes');
        });
    }
};

