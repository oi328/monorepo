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
        Schema::table('third_parties', function (Blueprint $table) {
            $table->string('contact_person')->nullable()->after('name');
            $table->string('website')->nullable()->after('email');
            $table->string('supply_type')->default('product')->after('type'); // product, service, both
            $table->string('catalog_name')->nullable()->after('supply_type');
            $table->text('service_description')->nullable()->after('catalog_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('third_parties', function (Blueprint $table) {
            $table->dropColumn(['contact_person', 'website', 'supply_type', 'catalog_name', 'service_description']);
        });
    }
};
