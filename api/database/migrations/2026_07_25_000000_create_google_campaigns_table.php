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
        Schema::create('google_campaigns', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('google_campaign_id')->unique(); // Google's Campaign ID
            $table->string('name');
            $table->string('status'); // ENABLED, PAUSED, REMOVED
            $table->string('serving_status')->nullable();
            $table->string('ad_serving_optimization_status')->nullable();
            $table->string('advertising_channel_type')->nullable();
            $table->string('advertising_channel_sub_type')->nullable();
            $table->decimal('amount_micros', 20, 0)->nullable(); // Budget amount in micros
            $table->unsignedBigInteger('budget_id')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->string('network_settings_target_google_search')->nullable();
            $table->string('network_settings_target_search_network')->nullable();
            $table->string('network_settings_target_content_network')->nullable();
            $table->string('network_settings_target_partner_search_network')->nullable();
            $table->json('raw_data')->nullable(); // Store full API response for reference
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->index(['tenant_id', 'google_campaign_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('google_campaigns');
    }
};
