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
        Schema::table('tenants', function (Blueprint $table) {
            // Add slug and subscription_plan
            // slug must be unique, lowercase, letters, numbers, hyphens
            $table->string('slug')->unique()->after('name');
            $table->string('subscription_plan')->default('trial')->after('slug'); // trial, starter, pro
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['slug', 'subscription_plan']);
        });
    }
};
