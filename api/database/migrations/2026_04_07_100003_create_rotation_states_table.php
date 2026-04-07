<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('rotation_states')) {
            return;
        }

        Schema::create('rotation_states', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->string('queue_key')->index();
            $table->unsignedBigInteger('last_user_id')->nullable()->index();
            $table->timestamps();

            $table->unique(['tenant_id', 'queue_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rotation_states');
    }
};

