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
        Schema::create('sales_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->string('invoice_number')->nullable();
            $table->foreignId('customer_id')->nullable()->constrained()->onDelete('set null');
            $table->string('customer_name')->nullable(); // For denormalization or if customer is deleted
            $table->date('issue_date')->nullable();
            $table->date('due_date')->nullable();
            $table->string('status')->default('Draft'); // Draft, Posted, Paid, Overdue, Cancelled
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax', 15, 2)->default(0);
            $table->decimal('discount', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->string('payment_status')->default('Unpaid'); // Unpaid, Partial, Paid
            $table->string('currency')->default('USD');
            $table->text('notes')->nullable();
            $table->json('items')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_invoices');
    }
};
