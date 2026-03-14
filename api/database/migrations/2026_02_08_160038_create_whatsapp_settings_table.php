<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->string('provider')->default('meta');
            $table->text('api_key')->nullable(); // Encrypted (Access Token)
            $table->text('api_secret')->nullable(); // Encrypted
            $table->string('business_number')->nullable();
            $table->string('business_id')->nullable();
            $table->string('webhook_url')->nullable();
            $table->boolean('status')->default(true);
            $table->json('triggers')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_settings');
    }
};
