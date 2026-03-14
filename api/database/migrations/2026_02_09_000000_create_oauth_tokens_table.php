<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('oauth_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tenant_id')->nullable()->constrained()->nullOnDelete();
            $table->string('provider', 50);
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->text('scope')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'tenant_id', 'provider']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('oauth_tokens');
    }
};
