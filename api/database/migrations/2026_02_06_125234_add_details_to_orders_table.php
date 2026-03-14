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
        Schema::table('orders', function (Blueprint $table) {
            $table->string('customer_code')->nullable();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->string('customer_name')->nullable();
            $table->string('sales_person')->nullable();
            $table->json('items')->nullable();
            $table->date('delivery_date')->nullable();
            $table->string('payment_terms')->nullable();
            $table->string('created_by')->nullable();
            $table->string('quotation_id')->nullable();
            $table->decimal('discount_rate', 5, 2)->default(0);
            $table->decimal('tax', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('shipped_at')->nullable();
            $table->text('cancel_reason')->nullable();
            $table->text('hold_reason')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->dropColumn([
                'customer_code',
                'customer_id',
                'customer_name',
                'sales_person',
                'items',
                'delivery_date',
                'payment_terms',
                'created_by',
                'quotation_id',
                'discount_rate',
                'tax',
                'total',
                'notes',
                'confirmed_at',
                'shipped_at',
                'cancel_reason',
                'hold_reason'
            ]);
        });
    }
};
