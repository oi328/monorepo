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
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('source')->nullable(); // channel
            $table->string('budget_type')->default('daily');
            $table->decimal('total_budget', 15, 2)->default(0);
            $table->string('currency')->default('EGP');
            $table->dateTime('start_date')->nullable();
            $table->dateTime('end_date')->nullable();
            $table->string('status')->default('Active'); // Active, Paused, Ended
            $table->string('landing_page')->nullable();
            $table->string('audience')->nullable();
            $table->string('created_by')->nullable(); // Store name or ID
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};
