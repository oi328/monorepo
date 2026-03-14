<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('rotation_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->boolean('allow_assign_rotation')->default(true);
            $table->boolean('delay_assign_rotation')->default(false);
            $table->string('work_from')->default('00:00');
            $table->string('work_to')->default('23:59');
            $table->boolean('reshuffle_cold_leads')->default(false);
            $table->unsignedInteger('reshuffle_cold_leads_number')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rotation_settings');
    }
};
