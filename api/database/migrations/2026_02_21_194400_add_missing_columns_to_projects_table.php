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
        Schema::table('projects', function (Blueprint $table) {
            $table->string('name_ar')->nullable()->after('name');
            $table->text('description_ar')->nullable()->after('description');
            $table->text('address_ar')->nullable()->after('address');
            $table->json('amenities')->nullable()->after('video_urls');
            $table->json('publish_data')->nullable()->after('cil');
            $table->string('currency')->nullable()->default('EGP')->after('max_space');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn([
                'name_ar',
                'description_ar',
                'address_ar',
                'amenities',
                'publish_data',
                'currency'
            ]);
        });
    }
};
