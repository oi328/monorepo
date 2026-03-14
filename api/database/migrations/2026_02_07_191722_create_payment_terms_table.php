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
        Schema::create('payment_terms', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->nullable();
            $table->string('name');
            $table->integer('days')->default(0);
            $table->decimal('discount_rate', 5, 4)->default(0); // e.g. 0.0200 for 2%
            $table->text('description')->nullable();
            $table->timestamps();
            
            // Add foreign key constraint if tenants table exists, but usually we handle this loosely or with trait
            // $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_terms');
    }
};
