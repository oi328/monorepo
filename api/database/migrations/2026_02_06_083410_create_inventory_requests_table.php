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
        Schema::create('inventory_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index(); // Tenant Scoped
            
            // Core Fields matching Frontend
            $table->string('customer_name')->nullable();
            $table->string('property_unit')->nullable();
            $table->string('product')->nullable();
            $table->integer('quantity')->nullable();
            $table->string('status')->default('Pending'); // Pending, In Progress, Approved, Rejected
            $table->string('priority')->default('Medium'); // Low, Medium, High
            $table->string('type')->default('Inquiry'); // Inquiry, Maintenance, Booking
            $table->text('description')->nullable();
            $table->string('assigned_to')->nullable();
            $table->string('payment_plan')->nullable();
            
            $table->timestamps();

            // Foreign key constraint for tenant
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_requests');
    }
};
