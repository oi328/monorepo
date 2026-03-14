<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('email_templates', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->string('name');
            $table->string('related')->nullable(); // Leads, Customers, etc.
            $table->string('subject')->nullable();
            $table->longText('body')->nullable();
            $table->string('status')->default('Draft'); // Draft/Approved/Rejected
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_templates');
    }
};
