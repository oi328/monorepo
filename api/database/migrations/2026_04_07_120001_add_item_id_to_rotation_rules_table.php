<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('rotation_rules')) {
            return;
        }

        Schema::table('rotation_rules', function (Blueprint $table) {
            if (!Schema::hasColumn('rotation_rules', 'item_id')) {
                $table->unsignedBigInteger('item_id')->nullable()->index()->after('project_id');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('rotation_rules')) {
            return;
        }

        Schema::table('rotation_rules', function (Blueprint $table) {
            if (Schema::hasColumn('rotation_rules', 'item_id')) {
                $table->dropColumn('item_id');
            }
        });
    }
};

