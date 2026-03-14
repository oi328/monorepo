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
        Schema::table('users', function (Blueprint $table) {
            $table->string('locale')->default('en')->nullable()->after('remember_token');
            $table->string('timezone')->default('Africa/Cairo')->nullable()->after('locale');
            $table->string('theme_mode')->default('light')->nullable()->after('timezone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['locale', 'timezone', 'theme_mode']);
        });
    }
};
