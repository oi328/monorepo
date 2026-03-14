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
        Schema::create('campaign_insights', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->string('meta_campaign_id')->index();
            $table->date('date');
            $table->decimal('spend', 15, 2)->default(0);
            $table->unsignedBigInteger('impressions')->default(0);
            $table->unsignedBigInteger('clicks')->default(0);
            $table->decimal('ctr', 8, 4)->default(0); // Click Through Rate
            $table->decimal('cpc', 10, 2)->default(0); // Cost Per Click
            $table->decimal('cpm', 10, 2)->default(0); // Cost Per Mille
            $table->unsignedBigInteger('reach')->default(0);
            $table->timestamps();
            
            $table->unique(['tenant_id', 'meta_campaign_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaign_insights');
    }
};
