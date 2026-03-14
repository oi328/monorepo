<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('erp_settings', function (Blueprint $table) {
            $table->json('advanced_settings')->nullable()->after('field_mappings');
        });
    }

    public function down(): void
    {
        Schema::table('erp_settings', function (Blueprint $table) {
            $table->dropColumn('advanced_settings');
        });
    }
};

