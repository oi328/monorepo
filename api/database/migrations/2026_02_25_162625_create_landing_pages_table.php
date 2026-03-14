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
        Schema::create('landing_pages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->nullable()->index();
            $table->unsignedBigInteger('campaign_id')->nullable()->index();
            
            $table->string('title');
            $table->string('slug')->unique(); // For URL generation
            $table->text('description')->nullable();
            
            $table->string('source')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            
            $table->string('theme')->default('theme1');
            $table->string('logo')->nullable(); // File path
            $table->string('cover')->nullable(); // File path
            
            // Social Media Links
            $table->string('facebook')->nullable();
            $table->string('instagram')->nullable();
            $table->string('twitter')->nullable();
            $table->string('linkedin')->nullable();
            
            // Custom Scripts
            $table->text('header_script')->nullable();
            $table->text('body_script')->nullable();
            
            $table->boolean('is_active')->default(true);
            $table->string('created_by')->nullable();
            
            // Flexible Data
            $table->json('meta_data')->nullable();
            
            // Simple Analytics
            $table->unsignedBigInteger('visits')->default(0);
            $table->unsignedBigInteger('conversions')->default(0);

            $table->timestamps();

            // Foreign Key Constraint (optional, depending on strictness)
            // $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            // $table->foreign('campaign_id')->references('id')->on('campaigns')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('landing_pages');
    }
};
