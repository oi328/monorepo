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
            if (!Schema::hasColumn('tenants', 'company_type')) {
                $table->string('company_type')->nullable()->after('subscription_plan'); // Real Estate / General
            }
            if (!Schema::hasColumn('tenants', 'start_date')) {
                $table->date('start_date')->nullable()->after('status');
            }
            if (!Schema::hasColumn('tenants', 'end_date')) {
                $table->date('end_date')->nullable()->after('start_date');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['company_type', 'start_date', 'end_date']);
        });
    }
};
