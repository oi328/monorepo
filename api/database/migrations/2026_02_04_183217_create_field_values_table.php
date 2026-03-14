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
        Schema::create('field_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('field_id')->constrained('fields')->onDelete('cascade');
            $table->unsignedBigInteger('record_id'); // Polymorphic-like ID
            $table->text('value')->nullable();
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['field_id', 'record_id']);
            $table->index('record_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('field_values');
    }
};
