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
        Schema::table('items', function (Blueprint $table) {
            $table->integer('quantity')->default(0);
            $table->integer('reserved_quantity')->default(0);
            $table->integer('min_alert')->default(0);
            $table->string('warehouse')->nullable();
            $table->string('sku')->nullable(); // Add explicit SKU if needed, though 'code' exists
            $table->string('category')->nullable();
            $table->string('brand')->nullable();
            $table->string('supplier')->nullable();
            $table->decimal('price', 10, 2)->default(0);
            $table->decimal('cost', 10, 2)->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn([
                'quantity', 
                'reserved_quantity', 
                'min_alert', 
                'warehouse',
                'sku',
                'category',
                'brand',
                'supplier',
                'price',
                'cost'
            ]);
        });
    }
};
