<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('revenues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('leads')->nullOnDelete();
            $table->foreignId('action_id')->nullable()->constrained('lead_actions')->nullOnDelete();
            $table->decimal('amount', 15, 2)->default(0);
            $table->string('currency', 10)->default('EGP');
            $table->string('source')->nullable(); // e.g. Closed Deal
            $table->json('meta_data')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('revenues');
    }
};

