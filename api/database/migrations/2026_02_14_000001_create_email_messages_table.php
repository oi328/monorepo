<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('email_messages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('lead_id')->nullable()->index();
            $table->string('from')->nullable()->index();
            $table->string('to')->nullable()->index();
            $table->string('subject')->nullable();
            $table->longText('body')->nullable();
            $table->string('direction')->default('outbound'); // inbound/outbound
            $table->string('status')->nullable(); // sent/failed/received
            $table->string('message_id')->nullable()->index();
            $table->json('raw')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_messages');
    }
};
