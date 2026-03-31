<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            if (!Schema::hasColumn('leads', 'history_hidden_before_action_id')) {
                $table->unsignedBigInteger('history_hidden_before_action_id')->nullable()->after('assigned_to');
            }
            if (!Schema::hasColumn('leads', 'sales_view_reset_at')) {
                $table->timestamp('sales_view_reset_at')->nullable()->after('history_hidden_before_action_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            if (Schema::hasColumn('leads', 'sales_view_reset_at')) {
                $table->dropColumn('sales_view_reset_at');
            }
            if (Schema::hasColumn('leads', 'history_hidden_before_action_id')) {
                $table->dropColumn('history_hidden_before_action_id');
            }
        });
    }
};

