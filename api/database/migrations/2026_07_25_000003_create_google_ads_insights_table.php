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
        Schema::create('google_ads_insights', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->date('date');
            
            // Polymorphic relation to link to Campaign, AdGroup, or Ad
            $table->unsignedBigInteger('google_entity_id'); // The local ID of the entity (campaign_id, ad_group_id, ad_id)
            $table->string('google_entity_type'); // App\Models\GoogleCampaign, etc.
            
            // Metrics
            $table->bigInteger('impressions')->default(0);
            $table->bigInteger('clicks')->default(0);
            $table->decimal('cost_micros', 20, 0)->default(0);
            $table->decimal('conversions', 10, 2)->default(0);
            $table->decimal('conversion_value', 20, 2)->default(0);
            $table->double('ctr')->default(0); // Click Through Rate
            $table->double('average_cpc')->default(0);
            
            $table->string('device')->nullable(); // MOBILE, DESKTOP, TABLET
            $table->string('network')->nullable(); // SEARCH, DISPLAY, YOUTUBE

            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->index(['tenant_id', 'date']);
            $table->index(['google_entity_type', 'google_entity_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('google_ads_insights');
    }
};
