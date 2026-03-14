<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('properties') && Schema::hasColumn('properties', 'main_image')) {
            try {
                DB::statement('ALTER TABLE properties MODIFY main_image LONGTEXT NULL');
            } catch (\Throwable $e) {
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('properties') && Schema::hasColumn('properties', 'main_image')) {
            try {
                DB::statement('ALTER TABLE properties MODIFY main_image VARCHAR(255) NULL');
            } catch (\Throwable $e) {
            }
        }
    }
};
