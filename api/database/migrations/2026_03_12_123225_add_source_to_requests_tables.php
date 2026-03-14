<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('real_estate_requests')) {
            Schema::table('real_estate_requests', function (Blueprint $table) {
                if (!Schema::hasColumn('real_estate_requests', 'source')) {
                    $table->string('source')->nullable()->after('phone');
                }
            });
        }

        if (Schema::hasTable('inventory_requests')) {
            Schema::table('inventory_requests', function (Blueprint $table) {
                if (!Schema::hasColumn('inventory_requests', 'source')) {
                    $table->string('source')->nullable()->after('payment_plan');
                }
            });
        }

        // Backfill source for existing records if possible
        try {
            DB::table('real_estate_requests')->whereNull('source')->orWhere('source', '')->get()->each(function ($req) {
                $lead = DB::table('leads')->where('phone', $req->phone)->where('tenant_id', $req->tenant_id)->first();
                if ($lead && $lead->source) {
                    DB::table('real_estate_requests')->where('id', $req->id)->update(['source' => $lead->source]);
                }
            });
        } catch (\Exception $e) {
            // Ignore backfill errors
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('real_estate_requests')) {
            Schema::table('real_estate_requests', function (Blueprint $table) {
                if (Schema::hasColumn('real_estate_requests', 'source')) {
                    $table->dropColumn('source');
                }
            });
        }

        if (Schema::hasTable('inventory_requests')) {
            Schema::table('inventory_requests', function (Blueprint $table) {
                if (Schema::hasColumn('inventory_requests', 'source')) {
                    $table->dropColumn('source');
                }
            });
        }
    }
};
