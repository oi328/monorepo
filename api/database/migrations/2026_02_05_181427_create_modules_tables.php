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
        Schema::create('modules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique(); // e.g., leads, orders, reports
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true); // Global system-wide switch
            $table->timestamps();
        });

        Schema::create('tenant_modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->foreignId('module_id')->constrained()->onDelete('cascade');
            $table->boolean('is_enabled')->default(true); // Tenant-specific switch
            $table->json('config')->nullable(); // Tenant-specific configuration
            $table->timestamps();

            $table->unique(['tenant_id', 'module_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tenant_modules');
        Schema::dropIfExists('modules');
    }
};
