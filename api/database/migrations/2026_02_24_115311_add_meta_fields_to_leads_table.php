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
        Schema::table('leads', function (Blueprint $table) {
            $table->string('meta_lead_id')->nullable()->index();
            $table->unsignedBigInteger('campaign_id')->nullable()->after('source'); // Use unsignedBigInteger for FK compatibility
            // Note: If 'campaign' string column exists from previous migration, we keep it or migrate data. 
            // Here we just add campaign_id.
            $table->string('adset_id')->nullable();
            $table->string('ad_id')->nullable();
            $table->json('raw_payload')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn([
                'meta_lead_id',
                'campaign_id',
                'adset_id',
                'ad_id',
                'raw_payload'
            ]);
        });
    }
};
