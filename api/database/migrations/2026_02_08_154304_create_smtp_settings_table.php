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
        Schema::create('smtp_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('provider')->default('custom');
            $table->string('host')->nullable();
            $table->integer('port')->default(587);
            $table->string('encryption')->default('TLS');
            $table->string('username')->nullable();
            $table->text('password')->nullable(); // Will be encrypted
            $table->string('from_email')->nullable();
            $table->string('from_name')->nullable();
            $table->string('reply_to')->nullable();
            $table->longText('signature')->nullable();
            $table->json('recipients_config')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('smtp_settings');
    }
};
