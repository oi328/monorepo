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
        Schema::create('meta_integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->string('ad_account_id')->nullable();
            $table->string('page_id')->nullable();
            $table->string('page_access_token')->nullable(); // Page Access Token
            $table->text('user_access_token')->nullable(); // User Access Token (short lived initially)
            $table->text('long_lived_token')->nullable(); // Long Lived User Token
            $table->timestamp('token_expires_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('meta_integrations');
    }
};
