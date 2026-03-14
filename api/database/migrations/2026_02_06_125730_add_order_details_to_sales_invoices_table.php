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
        Schema::table('sales_invoices', function (Blueprint $table) {
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('customer_code')->nullable();
            $table->string('sales_person')->nullable();
            $table->string('invoice_type')->nullable(); // Full, Partial, Advance
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales_invoices', function (Blueprint $table) {
            $table->dropForeign(['order_id']);
            $table->dropColumn(['order_id', 'customer_code', 'sales_person', 'invoice_type']);
        });
    }
};
