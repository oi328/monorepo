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
                $table->string('building')->nullable()->after('unit_code');
            }
            if (!Schema::hasColumn('properties', 'created_by_id')) {
                $table->unsignedBigInteger('created_by_id')->nullable()->after('tenant_id');
                $table->foreign('created_by_id')->references('id')->on('users')->onDelete('set null');
            }
            if (!Schema::hasColumn('properties', 'internal_meter_price')) {
                $table->decimal('internal_meter_price', 15, 2)->nullable()->after('internal_area');
            }
            if (!Schema::hasColumn('properties', 'external_meter_price')) {
                $table->decimal('external_meter_price', 15, 2)->nullable()->after('external_area');
            }
            if (!Schema::hasColumn('properties', 'meter_price')) {
                $table->decimal('meter_price', 15, 2)->nullable()->after('total_area');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropForeign(['created_by_id']);
            $table->dropColumn(['building', 'created_by_id', 'internal_meter_price', 'external_meter_price', 'meter_price']);
        });
    }
};
