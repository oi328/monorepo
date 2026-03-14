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
        // Check if table exists to avoid errors if it was created manually or via another migration
        if (!Schema::hasTable('integrations')) {
            Schema::create('integrations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id');
                $table->string('provider'); // 'meta', 'google', etc.
                $table->string('status')->default('inactive'); // active, inactive, error
                $table->json('settings')->nullable(); // Global settings like field mapping
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                // Ensure one provider entry per tenant (global config container)
                $table->unique(['tenant_id', 'provider']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('integrations');
    }
};
