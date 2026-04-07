<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('rotation_settings')) {
            return;
        }

        Schema::table('rotation_settings', function (Blueprint $table) {
            if (!Schema::hasColumn('rotation_settings', 'delay_work_from')) {
                $table->string('delay_work_from')->nullable()->after('work_to');
            }
            if (!Schema::hasColumn('rotation_settings', 'delay_work_to')) {
                $table->string('delay_work_to')->nullable()->after('delay_work_from');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('rotation_settings')) {
            return;
        }

        Schema::table('rotation_settings', function (Blueprint $table) {
            $cols = [];
            foreach (['delay_work_to', 'delay_work_from'] as $c) {
                if (Schema::hasColumn('rotation_settings', $c)) {
                    $cols[] = $c;
                }
            }
            if (!empty($cols)) {
                $table->dropColumn($cols);
            }
        });
    }
};

