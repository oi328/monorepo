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
        Schema::table('brokers', function (Blueprint $table) {
            if (!Schema::hasColumn('brokers', 'tenant_id')) {
                $table->unsignedBigInteger('tenant_id')->index()->after('id');
                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            }
            if (!Schema::hasColumn('brokers', 'agency_name')) {
                $table->string('agency_name')->nullable();
            }
            if (!Schema::hasColumn('brokers', 'address')) {
                $table->string('address')->nullable();
            }
            if (!Schema::hasColumn('brokers', 'email')) {
                $table->string('email')->nullable();
            }
            if (!Schema::hasColumn('brokers', 'commission_rate')) {
                $table->decimal('commission_rate', 5, 2)->nullable();
            }
            if (!Schema::hasColumn('brokers', 'status')) {
                $table->string('status')->default('Active');
            }
            if (!Schema::hasColumn('brokers', 'broker_type')) {
                $table->string('broker_type')->default('individual');
            }
            if (!Schema::hasColumn('brokers', 'contracted')) {
                $table->boolean('contracted')->default(false);
            }
            if (!Schema::hasColumn('brokers', 'tax_id')) {
                $table->string('tax_id')->nullable();
            }
            if (!Schema::hasColumn('brokers', 'national_id')) {
                $table->string('national_id')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('brokers', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropColumn(['tenant_id', 'agency_name', 'address', 'email', 'commission_rate', 'status', 'broker_type', 'contracted', 'tax_id', 'national_id']);
        });
    }
};
