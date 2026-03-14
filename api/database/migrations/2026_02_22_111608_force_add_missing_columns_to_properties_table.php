<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration 
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            if (!Schema::hasColumn('properties', 'building')) {
                $table->string('building')->nullable();
            }
            if (!Schema::hasColumn('properties', 'created_by_id')) {
                $table->unsignedBigInteger('created_by_id')->nullable();
            }
            if (!Schema::hasColumn('properties', 'internal_meter_price')) {
                $table->decimal('internal_meter_price', 15, 2)->nullable();
            }
            if (!Schema::hasColumn('properties', 'external_meter_price')) {
                $table->decimal('external_meter_price', 15, 2)->nullable();
            }
            if (!Schema::hasColumn('properties', 'meter_price')) {
                $table->decimal('meter_price', 15, 2)->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropColumn(['building', 'created_by_id', 'internal_meter_price', 'external_meter_price', 'meter_price']);
        });
    }
};
