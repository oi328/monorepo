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
        Schema::table('landing_pages', function (Blueprint $table) {
            $table->boolean('header_script_enabled')->default(true)->after('header_script');
            $table->boolean('body_script_enabled')->default(true)->after('body_script');
            $table->string('pixel_id')->nullable()->after('body_script_enabled');
            $table->string('gtm_id')->nullable()->after('pixel_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('landing_pages', function (Blueprint $table) {
            $table->dropColumn(['header_script_enabled', 'body_script_enabled', 'pixel_id', 'gtm_id']);
        });
    }
};
