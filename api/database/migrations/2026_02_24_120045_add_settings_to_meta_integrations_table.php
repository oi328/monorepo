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
        Schema::table('meta_integrations', function (Blueprint $table) {
            $table->string('pixel_id')->nullable()->after('ad_account_id');
            $table->json('settings')->nullable()->after('token_expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('meta_integrations', function (Blueprint $table) {
            $table->dropColumn(['pixel_id', 'settings']);
        });
    }
};
