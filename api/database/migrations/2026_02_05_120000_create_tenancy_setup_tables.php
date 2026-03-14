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
        // 1. Create tenants table
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('domain')->nullable()->unique(); // Or slug
            $table->string('status')->default('active'); // active, suspended, etc.
            $table->timestamps();
        });

        // 2. Update users table
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('tenant_id')->nullable()->after('id')->constrained()->onDelete('cascade');
            $table->index('tenant_id');
        });

        // 3. Update existing CRM tables with tenant_id
        $tables = [
            'leads', 
            'customers', 
            'items', 
            'properties', 
            'brokers', 
            'entities', 
            'fields', 
            'field_values'
        ];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->foreignId('tenant_id')->nullable()->after('id')->constrained()->onDelete('cascade');
                    $table->index('tenant_id');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove tenant_id from tables
        $tables = [
            'leads', 
            'customers', 
            'items', 
            'properties', 
            'brokers', 
            'entities', 
            'fields', 
            'field_values'
        ];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->dropForeign(['tenant_id']);
                    $table->dropColumn('tenant_id');
                });
            }
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropColumn('tenant_id');
        });

        Schema::dropIfExists('tenants');
    }
};
