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
        Schema::table('activity_log', function (Blueprint $table) {
            $table->dropIndex(['tenant_id']);
            $table->dropColumn('tenant_id');
        });

        Schema::table('activity_log', function (Blueprint $table) {
            $table->unsignedBigInteger('tenant_id')->nullable()->after('properties')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activity_log', function (Blueprint $table) {
            $table->dropColumn('tenant_id');
        });
        
        Schema::table('activity_log', function (Blueprint $table) {
             $table->uuid('tenant_id')->nullable()->index();
        });
    }
};
