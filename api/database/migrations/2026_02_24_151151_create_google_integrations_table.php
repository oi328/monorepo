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
        Schema::create('google_integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->string('google_id')->nullable(); // Google User ID
            $table->string('google_email')->nullable(); // Google User Email
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable(); // CRITICAL for offline access
            $table->string('customer_id')->nullable(); // Google Ads Customer ID (Ad Account)
            $table->string('webhook_key')->nullable(); // Key provided by user or generated for webhook verification
            $table->timestamp('expires_at')->nullable(); // Token expiry
            $table->boolean('status')->default(true); // Active/Inactive
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('google_integrations');
    }
};
