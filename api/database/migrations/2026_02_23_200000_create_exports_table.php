<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exports', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('module')->nullable();
            $table->string('action')->nullable();
            $table->string('file_name')->nullable();
            $table->string('format', 20)->default('xlsx');
            $table->string('status', 50)->default('success');
            $table->text('filters')->nullable();
            $table->text('error_message')->nullable();
            $table->json('meta_data')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'module']);
            $table->index(['tenant_id', 'user_id']);
            $table->index(['created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exports');
    }
};

