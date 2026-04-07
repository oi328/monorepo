<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('stages')) {
            return;
        }

        Schema::table('stages', function (Blueprint $table) {
            if (!Schema::hasColumn('stages', 'notify_time')) {
                $table->string('notify_time')->nullable()->after('type');
            }
            if (!Schema::hasColumn('stages', 'delay_time')) {
                $table->unsignedInteger('delay_time')->default(0)->after('notify_time');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('stages')) {
            return;
        }

        Schema::table('stages', function (Blueprint $table) {
            $cols = [];
            foreach (['delay_time', 'notify_time'] as $c) {
                if (Schema::hasColumn('stages', $c)) {
                    $cols[] = $c;
                }
            }
            if (!empty($cols)) {
                $table->dropColumn($cols);
            }
        });
    }
};

