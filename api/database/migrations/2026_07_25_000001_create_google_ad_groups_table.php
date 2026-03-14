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
        Schema::create('google_ad_groups', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('google_ad_group_id')->unique();
            $table->unsignedBigInteger('google_campaign_id'); // Foreign key to google_campaigns.google_campaign_id or just store the ID
            $table->string('name');
            $table->string('status'); // ENABLED, PAUSED, REMOVED
            $table->string('type')->nullable(); // SEARCH_STANDARD, DISPLAY_STANDARD, etc.
            $table->decimal('cpc_bid_micros', 20, 0)->nullable();
            $table->decimal('cpm_bid_micros', 20, 0)->nullable();
            $table->decimal('cpa_bid_micros', 20, 0)->nullable();
            $table->json('raw_data')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            // We can add a foreign key to google_campaigns if we want strict integrity, 
            // but sometimes sync order matters. Let's just index it for now or link to local id if possible.
            // Better to link to the local google_campaigns.id if we sync campaigns first.
            // For now, I'll store the google ID and we can join on that or add a local foreign key later.
            // Actually, let's add a local_campaign_id if we can.
            $table->unsignedBigInteger('campaign_id')->nullable(); // Local ID
            $table->foreign('campaign_id')->references('id')->on('google_campaigns')->onDelete('set null');
            
            $table->index(['tenant_id', 'google_ad_group_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('google_ad_groups');
    }
};
