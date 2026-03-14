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
            $table->string('family')->nullable();
            $table->string('group')->nullable();
            $table->string('unit')->default('pcs');
            $table->text('description')->nullable();
            $table->string('pricing_type')->default('Fixed');
            $table->string('billing_cycle')->default('Monthly');
            $table->boolean('allow_discount')->default(false);
            $table->decimal('max_discount', 5, 2)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn([
                'family',
                'group',
                'unit',
                'description',
                'pricing_type',
                'billing_cycle',
                'allow_discount',
                'max_discount'
            ]);
        });
    }
};
