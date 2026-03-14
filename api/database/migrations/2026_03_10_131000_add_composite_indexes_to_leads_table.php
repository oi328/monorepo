<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->index(['tenant_id', 'stage'], 'leads_tenant_stage_idx');
            $table->index(['tenant_id', 'assigned_to'], 'leads_tenant_assigned_to_idx');
            $table->index(['tenant_id', 'manager_id'], 'leads_tenant_manager_id_idx');
            $table->index(['tenant_id', 'created_by'], 'leads_tenant_created_by_idx');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropIndex('leads_tenant_stage_idx');
            $table->dropIndex('leads_tenant_assigned_to_idx');
            $table->dropIndex('leads_tenant_manager_id_idx');
            $table->dropIndex('leads_tenant_created_by_idx');
        });
    }
};

