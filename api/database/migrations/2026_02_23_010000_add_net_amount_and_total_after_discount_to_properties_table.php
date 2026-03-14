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
                if (!Schema::hasColumn('properties', 'net_amount')) {
                    $table->decimal('net_amount', 15, 2)->nullable()->after('maintenance_amount');
                }
                if (!Schema::hasColumn('properties', 'total_after_discount')) {
                    $table->decimal('total_after_discount', 15, 2)->nullable()->after('discount');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('properties')) {
            Schema::table('properties', function (Blueprint $table) {
                if (Schema::hasColumn('properties', 'net_amount')) {
                    $table->dropColumn('net_amount');
                }
                if (Schema::hasColumn('properties', 'total_after_discount')) {
                    $table->dropColumn('total_after_discount');
                }
            });
        }
    }
};

