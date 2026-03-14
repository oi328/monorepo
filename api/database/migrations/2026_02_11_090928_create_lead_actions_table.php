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
        Schema::create('lead_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->onDelete('cascade');
            $table->string('type'); // call, meeting, email, etc.
            $table->string('status')->default('pending'); // pending, completed, scheduled
            $table->date('date')->nullable();
            $table->time('time')->nullable();
            $table->text('description')->nullable();
            $table->string('outcome')->nullable(); // e.g., 'interested', 'no_answer'
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->unsignedBigInteger('tenant_id')->nullable();
            $table->timestamps();
            
            $table->index(['lead_id', 'created_at']);
            $table->index('tenant_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lead_actions');
    }
};
