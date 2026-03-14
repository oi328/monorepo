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
        // Add meta_id to campaigns
        if (Schema::hasTable('campaigns') && !Schema::hasColumn('campaigns', 'meta_id')) {
            Schema::table('campaigns', function (Blueprint $table) {
                $table->string('meta_id')->nullable()->index();
            });
        }

        // Add meta_id to leads
        if (Schema::hasTable('leads')) {
            Schema::table('leads', function (Blueprint $table) {
                if (!Schema::hasColumn('leads', 'meta_id')) {
                    $table->string('meta_id')->nullable()->index();
                }
                if (!Schema::hasColumn('leads', 'ad_id')) {
                    $table->string('ad_id')->nullable();
                }
                if (!Schema::hasColumn('leads', 'ad_name')) {
                    $table->string('ad_name')->nullable();
                }
                if (!Schema::hasColumn('leads', 'adset_id')) {
                    $table->string('adset_id')->nullable();
                }
                if (!Schema::hasColumn('leads', 'adset_name')) {
                    $table->string('adset_name')->nullable();
                }
                if (!Schema::hasColumn('leads', 'campaign_id_meta')) {
                    $table->string('campaign_id_meta')->nullable();
                }
                if (!Schema::hasColumn('leads', 'campaign_name')) {
                    $table->string('campaign_name')->nullable();
                }
                if (!Schema::hasColumn('leads', 'form_id')) {
                    $table->string('form_id')->nullable();
                }
                if (!Schema::hasColumn('leads', 'form_name')) {
                    $table->string('form_name')->nullable();
                }
                if (!Schema::hasColumn('leads', 'is_organic')) {
                    $table->boolean('is_organic')->default(false);
                }
                if (!Schema::hasColumn('leads', 'platform')) {
                    $table->string('platform')->default('facebook'); // facebook, instagram
                }
            });
        }

        // Create ad_sets table
        if (!Schema::hasTable('ad_sets')) {
            Schema::create('ad_sets', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
                $table->foreignId('campaign_id')->nullable()->constrained()->onDelete('cascade'); // Local Campaign ID
                $table->string('meta_id')->unique();
                $table->string('name');
                $table->string('status')->default('PAUSED');
                $table->string('optimization_goal')->nullable();
                $table->string('billing_event')->nullable();
                $table->decimal('daily_budget', 15, 2)->nullable();
                $table->decimal('lifetime_budget', 15, 2)->nullable();
                $table->dateTime('start_time')->nullable();
                $table->dateTime('end_time')->nullable();
                // Insights snapshot (optional, can be in separate table or JSON)
                $table->integer('impressions')->default(0);
                $table->integer('clicks')->default(0);
                $table->decimal('spend', 15, 2)->default(0);
                $table->timestamps();
            });
        }

        // Create ads table
        if (!Schema::hasTable('ads')) {
            Schema::create('ads', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
                $table->foreignId('ad_set_id')->nullable()->constrained('ad_sets')->onDelete('cascade'); // Local AdSet ID
                $table->string('meta_id')->unique();
                $table->string('name');
                $table->string('status')->default('PAUSED');
                $table->string('creative_name')->nullable();
                $table->string('creative_thumbnail_url')->nullable(); // Preview
                // Insights snapshot
                $table->integer('impressions')->default(0);
                $table->integer('clicks')->default(0);
                $table->decimal('spend', 15, 2)->default(0);
                $table->timestamps();
            });
        }

        // Create campaign_insights table
        if (!Schema::hasTable('campaign_insights')) {
            Schema::create('campaign_insights', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
                $table->string('meta_campaign_id')->index();
                
                $table->date('date');
                $table->decimal('spend', 15, 2)->default(0);
                $table->integer('impressions')->default(0);
                $table->integer('clicks')->default(0);
                $table->decimal('ctr', 8, 4)->default(0);
                $table->decimal('cpc', 10, 2)->default(0);
                $table->decimal('cpm', 10, 2)->default(0);
                $table->integer('reach')->default(0);
                
                $table->unique(['tenant_id', 'meta_campaign_id', 'date'], 'unique_insight_per_day');
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaign_insights');
        Schema::dropIfExists('ads');
        Schema::dropIfExists('ad_sets');
        
        if (Schema::hasColumn('leads', 'meta_id')) {
            Schema::table('leads', function (Blueprint $table) {
                $table->dropColumn(['meta_id', 'ad_id', 'ad_name', 'adset_id', 'adset_name', 'campaign_id_meta', 'campaign_name', 'form_id', 'form_name', 'is_organic', 'platform']);
            });
        }

        if (Schema::hasColumn('campaigns', 'meta_id')) {
            Schema::table('campaigns', function (Blueprint $table) {
                $table->dropColumn('meta_id');
            });
        }
    }
};
