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
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('developer')->nullable();
            $table->string('city')->nullable();
            $table->string('country')->nullable()->default('Egypt');
            $table->string('category')->nullable(); // Residential, Commercial, etc.
            $table->string('status')->default('Active'); // Planning, Active, Sales, Completed
            
            $table->decimal('min_price', 15, 2)->nullable();
            $table->decimal('max_price', 15, 2)->nullable();
            $table->integer('min_space')->nullable();
            $table->integer('max_space')->nullable();
            
            $table->integer('units')->default(0);
            $table->integer('phases')->default(0);
            $table->integer('docs')->default(0);
            $table->integer('completion')->default(0); // Percentage
            
            $table->decimal('lat', 10, 8)->nullable();
            $table->decimal('lng', 11, 8)->nullable();
            $table->text('address')->nullable();
            $table->text('description')->nullable();
            
            $table->string('image')->nullable(); // Main image
            $table->string('logo')->nullable(); // Developer logo
            $table->text('video_urls')->nullable();
            
            $table->json('gallery_images')->nullable();
            $table->json('master_plan_images')->nullable();
            $table->json('payment_plan')->nullable();
            $table->json('cil')->nullable(); // Contract/Legal info
            
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('tenant_id')->nullable();
            
            $table->timestamps();
            
            $table->index('tenant_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
