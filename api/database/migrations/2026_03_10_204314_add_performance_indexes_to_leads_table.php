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
        Schema::table('leads', function (Blueprint $table) {
            // Individual indexes for common filters
            foreach (['stage', 'status', 'assigned_to', 'manager_id', 'source', 'priority', 'country', 'campaign', 'created_at', 'last_contact'] as $column) {
                if (Schema::hasColumn('leads', $column)) {
                    // Note: Schema::hasIndex is not available in all Laravel versions directly on Schema facade, 
                    // but we can try to skip if index name exists or just use a generic try-catch if needed.
                    // A better way is to check the table's index list.
                    $sm = Schema::getConnection()->getDoctrineSchemaManager();
                    $indexes = $sm->listTableIndexes('leads');
                    $indexName = "leads_{$column}_index";
                    if (!array_key_exists($indexName, $indexes)) {
                        $table->index($column);
                    }
                }
            }
            
            // Composite indexes
            $sm = Schema::getConnection()->getDoctrineSchemaManager();
            $indexes = $sm->listTableIndexes('leads');
            
            if (!array_key_exists('leads_tenant_id_stage_index', $indexes)) {
                $table->index(['tenant_id', 'stage']);
            }
            if (!array_key_exists('leads_tenant_id_assigned_to_index', $indexes)) {
                $table->index(['tenant_id', 'assigned_to']);
            }
            if (!array_key_exists('leads_tenant_id_created_at_index', $indexes)) {
                $table->index(['tenant_id', 'created_at']);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropIndex(['stage']);
            $table->dropIndex(['status']);
            $table->dropIndex(['assigned_to']);
            $table->dropIndex(['manager_id']);
            $table->dropIndex(['source']);
            $table->dropIndex(['priority']);
            $table->dropIndex(['country']);
            $table->dropIndex(['campaign']);
            $table->dropIndex(['created_at']);
            $table->dropIndex(['last_contact']);
            
            $table->dropIndex(['tenant_id', 'stage']);
            $table->dropIndex(['tenant_id', 'assigned_to']);
            $table->dropIndex(['tenant_id', 'created_at']);
        });
    }
};
