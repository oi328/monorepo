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
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'team_id')) {
                $table->unsignedBigInteger('team_id')->nullable();
            }
        });

        Schema::table('users', function (Blueprint $table) {
            // Add foreign key if not exists (hard to check, but assuming it failed before)
            // We'll wrap in try-catch logic effectively by just defining it, 
            // but standard Schema builder doesn't support "add foreign if not exists".
            // However, since the previous run failed specifically on adding the constraint (due to missing table),
            // and the column might be there, we just need to add the constraint now that the table exists.
            
            // Note: Schema::hasColumn check above ensures column exists.
            $table->foreign('team_id')->references('id')->on('teams')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['team_id']);
            $table->dropColumn('team_id');
        });
    }
};
