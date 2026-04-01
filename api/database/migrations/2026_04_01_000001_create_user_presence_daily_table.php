<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_presence_daily', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('user_id')->index();
            $table->date('date')->index();

            // Accumulate presence time based on consecutive authenticated API requests.
            // Stored in seconds for better accuracy; UI can format h/m.
            $table->unsignedBigInteger('total_seconds')->default(0);
            $table->timestamp('last_tick_at')->nullable()->index();

            $table->timestamps();

            $table->unique(['tenant_id', 'user_id', 'date'], 'user_presence_daily_tenant_user_date_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_presence_daily');
    }
};

