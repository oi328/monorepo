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
        Schema::table('ad_sets', function (Blueprint $table) {
            $table->string('google_id')->nullable()->index();
        });

        Schema::table('ads', function (Blueprint $table) {
            $table->string('google_id')->nullable()->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ad_sets', function (Blueprint $table) {
            $table->dropColumn('google_id');
        });

        Schema::table('ads', function (Blueprint $table) {
            $table->dropColumn('google_id');
        });
    }
};
