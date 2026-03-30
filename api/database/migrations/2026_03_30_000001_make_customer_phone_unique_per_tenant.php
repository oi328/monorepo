<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('customers')) {
            return;
        }

        Schema::table('customers', function (Blueprint $table) {
            if (Schema::hasColumn('customers', 'tenant_id')) {
                $table->unique(['tenant_id', 'phone'], 'customers_tenant_id_phone_unique');
                return;
            }
            $table->unique('phone', 'customers_phone_unique');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('customers')) {
            return;
        }

        Schema::table('customers', function (Blueprint $table) {
            if (Schema::hasColumn('customers', 'tenant_id')) {
                $table->dropUnique('customers_tenant_id_phone_unique');
                return;
            }
            $table->dropUnique('customers_phone_unique');
        });
    }
};
