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
            // Indexes for frequently filtered columns
            $table->index('stage');
            $table->index('status');
            $table->index('assigned_to');
            $table->index('source');
            $table->index('campaign');
            $table->index('created_at');
            
            // Indexes for search columns
            $table->index('email');
            $table->index('phone');
            $table->index('name');
        });

        Schema::table('recycle_leads', function (Blueprint $table) {
            $table->index('deleted_at');
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
            $table->dropIndex(['source']);
            $table->dropIndex(['campaign']);
            $table->dropIndex(['created_at']);
            $table->dropIndex(['email']);
            $table->dropIndex(['phone']);
            $table->dropIndex(['name']);
        });

        Schema::table('recycle_leads', function (Blueprint $table) {
            $table->dropIndex(['deleted_at']);
        });
    }
};
