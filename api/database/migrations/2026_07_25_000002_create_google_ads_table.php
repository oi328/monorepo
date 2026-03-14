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
        Schema::create('google_ads', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('google_ad_id')->unique();
            $table->unsignedBigInteger('google_ad_group_id');
            $table->string('status')->nullable();
            $table->string('type')->nullable(); // EXPANDED_TEXT_AD, RESPONSIVE_SEARCH_AD
            $table->text('final_urls')->nullable();
            $table->text('headlines')->nullable(); // JSON or text
            $table->text('descriptions')->nullable(); // JSON or text
            $table->json('raw_data')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            
            $table->unsignedBigInteger('ad_group_id')->nullable(); // Local ID
            $table->foreign('ad_group_id')->references('id')->on('google_ad_groups')->onDelete('set null');

            $table->index(['tenant_id', 'google_ad_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('google_ads');
    }
};
