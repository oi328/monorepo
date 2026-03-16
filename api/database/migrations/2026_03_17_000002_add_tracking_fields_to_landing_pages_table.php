<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('landing_pages', function (Blueprint $table) {
            if (!Schema::hasColumn('landing_pages', 'header_script_enabled')) {
                $table->boolean('header_script_enabled')->default(true)->after('header_script');
            }
            if (!Schema::hasColumn('landing_pages', 'body_script_enabled')) {
                $table->boolean('body_script_enabled')->default(true)->after('body_script');
            }
            if (!Schema::hasColumn('landing_pages', 'pixel_id')) {
                $table->string('pixel_id')->nullable()->after('body_script_enabled');
            }
            if (!Schema::hasColumn('landing_pages', 'is_pixel_enabled')) {
                $table->boolean('is_pixel_enabled')->default(true)->after('pixel_id');
            }
            if (!Schema::hasColumn('landing_pages', 'gtm_id')) {
                $table->string('gtm_id')->nullable()->after('is_pixel_enabled');
            }
            if (!Schema::hasColumn('landing_pages', 'is_gtm_enabled')) {
                $table->boolean('is_gtm_enabled')->default(true)->after('gtm_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('landing_pages', function (Blueprint $table) {
            $cols = [
                'is_gtm_enabled',
                'gtm_id',
                'is_pixel_enabled',
                'pixel_id',
                'body_script_enabled',
                'header_script_enabled',
            ];

            foreach ($cols as $col) {
                if (Schema::hasColumn('landing_pages', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};

