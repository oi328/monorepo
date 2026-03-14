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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->nullable()->index(); // For UUID testing
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->string('status')->default('pending');
            $table->decimal('amount', 10, 2);
            $table->timestamps();

            // Index for performance and tenant scoping
            $table->index(['tenant_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
