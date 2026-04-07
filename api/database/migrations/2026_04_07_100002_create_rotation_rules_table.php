<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('rotation_rules')) {
            return;
        }

        Schema::create('rotation_rules', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('user_id')->index();
            $table->string('type'); // assign | delay

            $table->unsignedBigInteger('project_id')->nullable()->index();
            $table->string('source')->nullable()->index();
            $table->json('regions')->nullable();

            $table->unsignedInteger('position')->nullable()->index(); // used for assign
            $table->boolean('is_active')->default(true)->index();

            $table->timestamps();

            $table->index(['tenant_id', 'type', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rotation_rules');
    }
};

