<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('properties')) {
            Schema::table('properties', function (Blueprint $table) {
                if (!Schema::hasColumn('properties', 'reserved_at')) {
                    $table->dateTime('reserved_at')->nullable()->after('status');
                }
                if (!Schema::hasColumn('properties', 'reserved_expires_at')) {
                    $table->dateTime('reserved_expires_at')->nullable()->after('reserved_at');
                    $table->index('reserved_expires_at');
                }
                if (!Schema::hasColumn('properties', 'reserved_lead_id')) {
                    $table->unsignedBigInteger('reserved_lead_id')->nullable()->after('reserved_expires_at');
                    $table->index('reserved_lead_id');
                }
                if (!Schema::hasColumn('properties', 'sold_at')) {
                    $table->dateTime('sold_at')->nullable()->after('reserved_lead_id');
                }
                if (!Schema::hasColumn('properties', 'sold_lead_id')) {
                    $table->unsignedBigInteger('sold_lead_id')->nullable()->after('sold_at');
                    $table->index('sold_lead_id');
                }
            });
        }

        if (Schema::hasTable('units')) {
            Schema::table('units', function (Blueprint $table) {
                if (!Schema::hasColumn('units', 'reserved_at')) {
                    $table->dateTime('reserved_at')->nullable()->after('status');
                }
                if (!Schema::hasColumn('units', 'reserved_expires_at')) {
                    $table->dateTime('reserved_expires_at')->nullable()->after('reserved_at');
                    $table->index('reserved_expires_at');
                }
                if (!Schema::hasColumn('units', 'reserved_lead_id')) {
                    $table->unsignedBigInteger('reserved_lead_id')->nullable()->after('reserved_expires_at');
                    $table->index('reserved_lead_id');
                }
                if (!Schema::hasColumn('units', 'sold_at')) {
                    $table->dateTime('sold_at')->nullable()->after('reserved_lead_id');
                }
                if (!Schema::hasColumn('units', 'sold_lead_id')) {
                    $table->unsignedBigInteger('sold_lead_id')->nullable()->after('sold_at');
                    $table->index('sold_lead_id');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('properties')) {
            Schema::table('properties', function (Blueprint $table) {
                if (Schema::hasColumn('properties', 'reserved_expires_at')) {
                    $table->dropIndex(['reserved_expires_at']);
                }
                if (Schema::hasColumn('properties', 'reserved_lead_id')) {
                    $table->dropIndex(['reserved_lead_id']);
                }
                if (Schema::hasColumn('properties', 'sold_lead_id')) {
                    $table->dropIndex(['sold_lead_id']);
                }
                $cols = [];
                foreach (['reserved_at','reserved_expires_at','reserved_lead_id','sold_at','sold_lead_id'] as $c) {
                    if (Schema::hasColumn('properties', $c)) $cols[] = $c;
                }
                if (!empty($cols)) {
                    $table->dropColumn($cols);
                }
            });
        }

        if (Schema::hasTable('units')) {
            Schema::table('units', function (Blueprint $table) {
                if (Schema::hasColumn('units', 'reserved_expires_at')) {
                    $table->dropIndex(['reserved_expires_at']);
                }
                if (Schema::hasColumn('units', 'reserved_lead_id')) {
                    $table->dropIndex(['reserved_lead_id']);
                }
                if (Schema::hasColumn('units', 'sold_lead_id')) {
                    $table->dropIndex(['sold_lead_id']);
                }
                $cols = [];
                foreach (['reserved_at','reserved_expires_at','reserved_lead_id','sold_at','sold_lead_id'] as $c) {
                    if (Schema::hasColumn('units', $c)) $cols[] = $c;
                }
                if (!empty($cols)) {
                    $table->dropColumn($cols);
                }
            });
        }
    }
};

