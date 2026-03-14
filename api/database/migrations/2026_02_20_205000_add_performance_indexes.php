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
        $tables = [
            'leads',
            'tasks',
            'properties',
            'inventory_items',
            'inventory_requests'
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'tenant_id') && Schema::hasColumn($table, 'created_at')) {
                $indexName = $table . '_tenant_created_index';
                Schema::table($table, function (Blueprint $table_blueprint) use ($table, $indexName) {
                    if (!Schema::hasIndex($table, $indexName)) {
                        $table_blueprint->index(['tenant_id', 'created_at'], $indexName);
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
        $tables = [
            'leads',
            'tasks',
            'properties',
            'inventory_items',
            'inventory_requests'
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                $indexName = $table . '_tenant_created_index';
                Schema::table($table, function (Blueprint $table_blueprint) use ($table, $indexName) {
                    if (Schema::hasIndex($table, $indexName)) {
                        $table_blueprint->dropIndex($indexName);
                    }
                });
            }
        }
    }
};
