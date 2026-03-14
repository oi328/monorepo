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
        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedBigInteger('leader_id')->nullable(); // User ID
            $table->string('status')->default('Active'); // Active, Inactive
            $table->timestamps();

            // Indexes
            $table->index('tenant_id');
            $table->foreign('leader_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teams');
    }
};
