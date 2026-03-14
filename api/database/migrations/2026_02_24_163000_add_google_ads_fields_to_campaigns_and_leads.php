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
        Schema::table('campaigns', function (Blueprint $table) {
            $table->string('google_id')->nullable()->index()->after('meta_id');
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->string('gcl_id')->nullable()->index(); // Google Click ID
            $table->string('google_adgroup_id')->nullable();
            $table->string('google_creative_id')->nullable();
            $table->string('google_campaign_id')->nullable(); // Explicit Google Campaign ID if different from linked internal campaign
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn('google_id');
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn(['gcl_id', 'google_adgroup_id', 'google_creative_id', 'google_campaign_id']);
        });
    }
};
