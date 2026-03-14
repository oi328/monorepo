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
        Schema::table('customers', function (Blueprint $table) {
            $table->string('type')->nullable(); // Individual / Company
            $table->string('source')->nullable();
            $table->string('company_name')->nullable();
            $table->string('tax_number')->nullable();
            $table->string('country')->nullable();
            $table->string('city')->nullable();
            $table->string('address')->nullable();
            $table->string('assigned_to')->nullable();
            $table->string('created_by')->nullable();
            $table->text('notes')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn([
                'type', 'source', 'company_name', 'tax_number', 
                'country', 'city', 'address', 'assigned_to', 
                'created_by', 'notes'
            ]);
        });
    }
};
