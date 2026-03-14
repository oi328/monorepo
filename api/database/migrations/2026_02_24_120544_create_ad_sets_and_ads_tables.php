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
        Schema::create('ad_sets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->foreignId('campaign_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('meta_adset_id')->nullable()->index();
            $table->string('name');
            $table->string('status')->default('ACTIVE'); // ACTIVE, PAUSED, ARCHIVED
            $table->string('billing_event')->nullable();
            $table->string('optimization_goal')->nullable();
            $table->decimal('daily_budget', 15, 2)->nullable();
            $table->decimal('lifetime_budget', 15, 2)->nullable();
            $table->timestamp('start_time')->nullable();
            $table->timestamp('end_time')->nullable();
            
            // Metrics
            $table->integer('impressions')->default(0);
            $table->integer('clicks')->default(0);
            $table->decimal('spend', 15, 2)->default(0);
            
            $table->json('meta_data')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'meta_adset_id']);
        });

        Schema::create('ads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->foreignId('ad_set_id')->nullable()->constrained('ad_sets')->onDelete('cascade');
            $table->foreignId('campaign_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('meta_ad_id')->nullable()->index();
            $table->string('name');
            $table->string('status')->default('ACTIVE');
            
            // Metrics
            $table->integer('impressions')->default(0);
            $table->integer('clicks')->default(0);
            $table->decimal('spend', 15, 2)->default(0);

            $table->json('creative')->nullable(); // Store image/video url, headline, etc.
            $table->json('meta_data')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'meta_ad_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ads');
        Schema::dropIfExists('ad_sets');
    }
};
