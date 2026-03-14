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
        Schema::create('system_errors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained()->nullOnDelete();
            $table->string('service')->nullable();
            $table->string('endpoint')->nullable();
            $table->integer('status')->nullable();
            $table->string('level')->default('error'); // error, warning, info
            $table->integer('count')->default(1);
            $table->text('message')->nullable();
            $table->longText('stack_trace')->nullable();
            $table->timestamp('last_seen_at')->useCurrent();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_errors');
    }
};
