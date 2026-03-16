<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('leads')) {
            return;
        }

        Schema::table('leads', function (Blueprint $table) {
            if (! Schema::hasColumn('leads', 'unit_id')) {
                $table->unsignedBigInteger('unit_id')->nullable()->index();
            }

            if (! Schema::hasColumn('leads', 'unit')) {
                $table->string('unit')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('leads')) {
            return;
        }

        Schema::table('leads', function (Blueprint $table) {
            if (Schema::hasColumn('leads', 'unit_id')) {
                $table->dropIndex(['unit_id']);
                $table->dropColumn('unit_id');
            }

            if (Schema::hasColumn('leads', 'unit')) {
                $table->dropColumn('unit');
            }
        });
    }
};

