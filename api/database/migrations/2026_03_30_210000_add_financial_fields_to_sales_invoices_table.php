<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_invoices', function (Blueprint $table) {
            if (!Schema::hasColumn('sales_invoices', 'advance_applied_amount')) {
                $table->decimal('advance_applied_amount', 15, 2)->default(0)->after('paid_amount');
            }
            if (!Schema::hasColumn('sales_invoices', 'balance_due')) {
                $table->decimal('balance_due', 15, 2)->default(0)->after('advance_applied_amount');
            }
            if (!Schema::hasColumn('sales_invoices', 'payment_method')) {
                $table->string('payment_method')->nullable()->after('payment_status');
            }
            if (!Schema::hasColumn('sales_invoices', 'payment_terms')) {
                $table->string('payment_terms')->nullable()->after('payment_method');
            }
        });
    }

    public function down(): void
    {
        Schema::table('sales_invoices', function (Blueprint $table) {
            if (Schema::hasColumn('sales_invoices', 'payment_terms')) {
                $table->dropColumn('payment_terms');
            }
            if (Schema::hasColumn('sales_invoices', 'payment_method')) {
                $table->dropColumn('payment_method');
            }
            if (Schema::hasColumn('sales_invoices', 'balance_due')) {
                $table->dropColumn('balance_due');
            }
            if (Schema::hasColumn('sales_invoices', 'advance_applied_amount')) {
                $table->dropColumn('advance_applied_amount');
            }
        });
    }
};

