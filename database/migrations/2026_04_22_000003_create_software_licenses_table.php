<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('software_licenses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->constrained('software_products')->restrictOnDelete();
            $table->string('license_type', 30)->nullable();
            $table->integer('seats_total');
            $table->integer('seats_used')->default(0);
            $table->date('valid_until')->nullable();
            $table->decimal('cost', 14, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestampsTz();

            $table->index('product_id');
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement(
                'ALTER TABLE software_licenses ADD CONSTRAINT software_licenses_seats_nonnegative_check CHECK (seats_total > 0 AND seats_used >= 0)'
            );
            DB::statement(
                'ALTER TABLE software_licenses ADD CONSTRAINT software_licenses_seats_range_check CHECK (seats_used <= seats_total)'
            );
            DB::statement(
                'CREATE INDEX software_licenses_valid_until_not_null_idx ON software_licenses(valid_until) WHERE valid_until IS NOT NULL'
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('software_licenses');
    }
};
