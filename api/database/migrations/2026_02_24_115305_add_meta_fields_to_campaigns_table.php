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
            $table->string('meta_campaign_id')->nullable()->index();
            $table->string('objective')->nullable();
            $table->decimal('daily_budget', 15, 2)->nullable();
            $table->decimal('lifetime_budget', 15, 2)->nullable();
            $table->string('provider')->default('meta'); // meta, google, etc.
            $table->string('ad_account_id')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn([
                'meta_campaign_id',
                'objective',
                'daily_budget',
                'lifetime_budget',
                'provider',
                'ad_account_id'
            ]);
        });
    }
};
