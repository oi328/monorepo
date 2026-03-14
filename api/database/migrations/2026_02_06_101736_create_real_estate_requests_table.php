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
        Schema::create('real_estate_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index(); // Tenant Scoped
            $table->string('customer_name')->nullable();
            $table->string('project')->nullable();
            $table->string('unit')->nullable();
            $table->decimal('amount', 15, 2)->default(0);
            $table->string('status')->default('Pending'); // Pending, Approved, Rejected, etc.
            $table->string('type')->default('Booking'); // Booking, Inquiry, Maintenance, etc.
            $table->date('date')->nullable();
            $table->text('notes')->nullable();
            $table->string('phone')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('real_estate_requests');
    }
};
