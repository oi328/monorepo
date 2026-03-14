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
        Schema::table('leads', function (Blueprint $blueprint) {
            $blueprint->integer('score')->default(50)->comment('Lead seriousness score (0-100)');
            $blueprint->integer('missed_meetings_count')->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leads', function (Blueprint $blueprint) {
            $blueprint->dropColumn(['score', 'missed_meetings_count']);
        });
    }
};
