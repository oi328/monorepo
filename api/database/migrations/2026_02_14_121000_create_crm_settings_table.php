<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->nullable();
            $table->json('settings')->nullable();
            $table->timestamps();

            $table->index('tenant_id');
            $table->unique('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_settings');
    }
};
