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
            if (!Schema::hasColumn('tenants', 'tenancy_type')) {
                $table->string('tenancy_type')->default('shared')->after('status');
            }

            if (!Schema::hasColumn('tenants', 'db_connection_details')) {
                $table->json('db_connection_details')->nullable()->after('tenancy_type');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            if (Schema::hasColumn('tenants', 'db_connection_details')) {
                $table->dropColumn('db_connection_details');
            }

            if (Schema::hasColumn('tenants', 'tenancy_type')) {
                $table->dropColumn('tenancy_type');
            }
        });
    }
};

