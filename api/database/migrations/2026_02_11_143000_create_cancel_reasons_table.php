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
        Schema::create('cancel_reasons', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('title_ar')->nullable();
            $table->unsignedBigInteger('tenant_id')->nullable();
            $table->timestamps();

            $table->index('tenant_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cancel_reasons');
    }
};
