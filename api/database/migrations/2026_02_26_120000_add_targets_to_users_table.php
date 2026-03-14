<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('monthly_target', 12, 2)->nullable()->after('birth_date');
            $table->decimal('quarterly_target', 12, 2)->nullable()->after('monthly_target');
            $table->decimal('yearly_target', 12, 2)->nullable()->after('quarterly_target');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['monthly_target', 'quarterly_target', 'yearly_target']);
        });
    }
};

