<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('google_connected_accounts')) {
            return;
        }

        Schema::create('google_connected_accounts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->string('google_user_id');
            $table->string('google_email')->nullable();
            $table->string('google_name')->nullable();
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->string('connection_status')->default('connected');
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->unique(['tenant_id', 'google_user_id'], 'google_connected_accounts_tenant_user_unique');
            $table->index(['tenant_id', 'google_email'], 'google_connected_accounts_tenant_email_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('google_connected_accounts');
    }
};

