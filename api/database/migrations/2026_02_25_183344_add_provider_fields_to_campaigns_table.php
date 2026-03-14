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
            if (!Schema::hasColumn('campaigns', 'provider')) {
                $table->string('provider')->nullable()->after('status');
            }
            if (!Schema::hasColumn('campaigns', 'ad_account_id')) {
                $table->string('ad_account_id')->nullable()->after('provider');
            }
            if (!Schema::hasColumn('campaigns', 'objective')) {
                $table->string('objective')->nullable()->after('ad_account_id');
            }
            if (!Schema::hasColumn('campaigns', 'daily_budget')) {
                $table->decimal('daily_budget', 15, 2)->nullable()->after('total_budget');
            }
            if (!Schema::hasColumn('campaigns', 'lifetime_budget')) {
                $table->decimal('lifetime_budget', 15, 2)->nullable()->after('daily_budget');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn(['provider', 'ad_account_id', 'objective', 'daily_budget', 'lifetime_budget']);
        });
    }
};
