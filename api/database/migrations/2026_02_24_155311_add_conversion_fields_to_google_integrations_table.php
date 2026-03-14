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
        Schema::table('google_integrations', function (Blueprint $table) {
            $table->string('conversion_action_id')->nullable();
            $table->string('conversion_currency_code')->default('USD');
            $table->decimal('conversion_value', 10, 2)->default(1.00);
            $table->json('conversion_custom_variables')->nullable(); // For mapping custom vars
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('google_integrations', function (Blueprint $table) {
            $table->dropColumn(['conversion_action_id', 'conversion_currency_code', 'conversion_value', 'conversion_custom_variables']);
        });
    }
};
