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
        Schema::create('cil_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->string('driver')->nullable();
            $table->string('host_name')->nullable();
            $table->string('port')->nullable();
            $table->string('email')->nullable();
            $table->text('password')->nullable(); // Encrypted
            $table->string('encryption')->nullable();
            $table->string('name')->nullable();
            $table->text('cil_signature')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cil_settings');
    }
};
