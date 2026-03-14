<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sms_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->string('provider')->default('custom');
            $table->text('api_key')->nullable(); // Encrypted
            $table->text('api_secret')->nullable(); // Encrypted
            $table->string('sender_id')->nullable();
            $table->boolean('status')->default(true);
            $table->json('triggers')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sms_settings');
    }
};
