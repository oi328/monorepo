<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration 
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Try direct SQL for maximum reliability
        try {
            DB::statement("ALTER TABLE properties ADD COLUMN building VARCHAR(255) NULL");
        }
        catch (\Exception $e) {
        }
        try {
            DB::statement("ALTER TABLE properties ADD COLUMN created_by_id BIGINT UNSIGNED NULL");
        }
        catch (\Exception $e) {
        }
        try {
            DB::statement("ALTER TABLE properties ADD COLUMN internal_meter_price DECIMAL(15,2) NULL");
        }
        catch (\Exception $e) {
        }
        try {
            DB::statement("ALTER TABLE properties ADD COLUMN external_meter_price DECIMAL(15,2) NULL");
        }
        catch (\Exception $e) {
        }
        try {
            DB::statement("ALTER TABLE properties ADD COLUMN meter_price DECIMAL(15,2) NULL");
        }
        catch (\Exception $e) {
        }
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
