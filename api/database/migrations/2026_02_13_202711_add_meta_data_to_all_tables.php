<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * List of tables to add meta_data column to.
     */
    protected $tables = [
        'users',
        'tenants',
        'customers',
        'leads',
        'items',
        'properties',
        'brokers',
        'orders',
        'quotations',
        'sales_invoices',
        'inventory_requests',
        'real_estate_requests',
        'opportunities',
        'campaigns',
        'departments',
        'teams',
        'projects',
        'tasks',
        'tickets',
        'units',
        'countries',
        'sources',
        'stages',
        'cancel_reasons',
        'item_families',
        'item_categories',
        'item_groups',
        'item_brands',
        'third_parties',
        'notification_settings',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach ($this->tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    if (!Schema::hasColumn($tableName, 'meta_data')) {
                        $table->json('meta_data')->nullable();
                    }
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach ($this->tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    if (Schema::hasColumn($tableName, 'meta_data')) {
                        $table->dropColumn('meta_data');
                    }
                });
            }
        }
    }
};
