<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('erp_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->string('provider')->default('Generic REST API');
            $table->string('base_url')->nullable();
            $table->string('auth_type')->default('Bearer Token');
            $table->text('api_key')->nullable();
            $table->string('username')->nullable();
            $table->text('password')->nullable();
            $table->json('sync_settings')->nullable();
            $table->json('field_mappings')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('erp_settings');
    }
};

