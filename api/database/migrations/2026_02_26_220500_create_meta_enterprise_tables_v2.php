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
        // 1. Meta Connections (OAuth User)
        if (!Schema::hasTable('meta_connections')) {
            Schema::create('meta_connections', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id');
                $table->string('fb_user_id');
                $table->text('user_access_token');
                $table->timestamp('expires_at')->nullable();
                $table->string('name')->nullable();
                $table->string('email')->nullable();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                // Unique per user per tenant
                $table->unique(['tenant_id', 'fb_user_id']);
            });
        }

        // 2. Meta Businesses
        if (!Schema::hasTable('meta_businesses')) {
            Schema::create('meta_businesses', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id');
                $table->unsignedBigInteger('connection_id');
                $table->string('fb_business_id');
                $table->string('business_name')->nullable();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('connection_id')->references('id')->on('meta_connections')->onDelete('cascade');
                
                $table->unique(['tenant_id', 'fb_business_id']);
            });
        }

        // 3. Meta Ad Accounts
        if (!Schema::hasTable('meta_ad_accounts')) {
            Schema::create('meta_ad_accounts', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id');
                $table->unsignedBigInteger('business_id')->nullable(); // Can be owned by connection directly too?
                // The hierarchy usually is Business -> Ad Account.
                // But some ad accounts are personal.
                // We'll allow null business_id if it's a personal ad account.
                // Wait, our model says business_id is required? 
                // Let's check model. No, model has belongsTo.
                // Let's make it nullable just in case.
                
                $table->string('ad_account_id'); // act_XXXXXX
                $table->string('name')->nullable();
                $table->string('currency', 10)->default('USD');
                $table->string('timezone')->default('UTC');
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('business_id')->references('id')->on('meta_businesses')->onDelete('cascade');
                
                $table->unique(['tenant_id', 'ad_account_id']);
            });
        }

        // 4. Meta Pages
        if (!Schema::hasTable('meta_pages')) {
            Schema::create('meta_pages', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id');
                $table->unsignedBigInteger('connection_id');
                $table->unsignedBigInteger('ad_account_id')->nullable(); // Can link to an ad account for tracking
                
                $table->string('page_id');
                $table->string('page_name');
                $table->text('page_token'); // Long-lived page access token
                $table->string('instagram_business_account_id')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('connection_id')->references('id')->on('meta_connections')->onDelete('cascade');
                $table->foreign('ad_account_id')->references('id')->on('meta_ad_accounts')->onDelete('set null');

                $table->unique(['tenant_id', 'page_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('meta_pages');
        Schema::dropIfExists('meta_ad_accounts');
        Schema::dropIfExists('meta_businesses');
        Schema::dropIfExists('meta_connections');
    }
};
