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
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('meta_pages');
        Schema::dropIfExists('meta_ad_accounts');
        Schema::dropIfExists('meta_businesses');
        Schema::dropIfExists('meta_connections');
        Schema::enableForeignKeyConstraints();

        // 1. Meta Connections (OAuth User Sessions)
        Schema::create('meta_connections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->string('fb_user_id')->index(); // Facebook User ID
            $table->text('user_access_token'); // Long-lived User Token
            $table->timestamp('expires_at')->nullable();
            $table->string('name')->nullable(); // User's name
            $table->string('email')->nullable(); // User's email
            $table->timestamps();
            
            // Ensure unique connection per user per tenant
            $table->unique(['tenant_id', 'fb_user_id']);
        });

        // 2. Meta Businesses
        Schema::create('meta_businesses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->foreignId('connection_id')->constrained('meta_connections')->onDelete('cascade');
            $table->string('fb_business_id')->index(); // Meta Business ID
            $table->string('business_name');
            $table->timestamps();

            $table->unique(['tenant_id', 'fb_business_id']);
        });

        // 3. Meta Ad Accounts
        Schema::create('meta_ad_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            // An ad account usually belongs to a business, but personal ad accounts exist.
            // We make business_id nullable for personal accounts, though our logic currently assumes business.
            $table->foreignId('business_id')->nullable()->constrained('meta_businesses')->onDelete('cascade');
            $table->string('ad_account_id')->index(); // act_123456
            $table->string('name');
            $table->string('currency')->nullable();
            $table->string('timezone')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'ad_account_id']);
        });

        // 4. Meta Pages
        Schema::create('meta_pages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->foreignId('connection_id')->constrained('meta_connections')->onDelete('cascade');
            // Pages can be linked to an Ad Account in our system for hierarchy, but technically independent.
            // We'll allow it to be nullable.
            $table->foreignId('ad_account_id')->nullable()->constrained('meta_ad_accounts')->onDelete('set null');
            $table->string('page_id')->index(); // Page ID
            $table->string('page_name');
            $table->text('page_token')->nullable(); // Page Access Token
            $table->string('instagram_business_account_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'page_id']);
        });
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
