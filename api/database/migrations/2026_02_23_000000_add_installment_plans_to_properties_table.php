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
        if (Schema::hasTable('properties')) {
            Schema::table('properties', function (Blueprint $table) {
                if (!Schema::hasColumn('properties', 'installment_plans')) {
                    $table->json('installment_plans')->nullable()->after('maintenance_amount');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('properties') && Schema::hasColumn('properties', 'installment_plans')) {
            Schema::table('properties', function (Blueprint $table) {
                $table->dropColumn('installment_plans');
            });
        }
    }
};

