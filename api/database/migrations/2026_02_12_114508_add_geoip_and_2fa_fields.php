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
        // Add location to personal_access_tokens
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->string('location')->nullable()->after('ip_address');
        });

        // Add 2FA fields to users
        Schema::table('users', function (Blueprint $table) {
            $table->string('two_factor_code')->nullable()->after('security_settings');
            $table->timestamp('two_factor_expires_at')->nullable()->after('two_factor_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->dropColumn('location');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['two_factor_code', 'two_factor_expires_at']);
        });
    }
};
