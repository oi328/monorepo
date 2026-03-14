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
        Schema::table('lead_actions', function (Blueprint $table) {
            // Rename columns
            $table->renameColumn('type', 'action_type');
            $table->renameColumn('created_by', 'user_id');
            $table->renameColumn('payload', 'details');
            
            // Add new columns
            $table->foreignId('stage_id_at_creation')->nullable()->after('description')->constrained('stages')->nullOnDelete();
            $table->string('next_action_type', 50)->nullable()->after('stage_id_at_creation');
            
            // Drop columns that are now part of details or not in schema
            $table->dropColumn(['status', 'date', 'time', 'outcome']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lead_actions', function (Blueprint $table) {
            $table->renameColumn('action_type', 'type');
            $table->renameColumn('user_id', 'created_by');
            $table->renameColumn('details', 'payload');
            
            $table->dropForeign(['stage_id_at_creation']);
            $table->dropColumn(['stage_id_at_creation', 'next_action_type']);
            
            $table->string('status')->default('pending');
            $table->date('date')->nullable();
            $table->time('time')->nullable();
            $table->string('outcome')->nullable();
        });
    }
};
