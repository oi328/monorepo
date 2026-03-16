<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('users')) {
            Schema::create('users', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('email')->unique();
                $table->timestamp('email_verified_at')->nullable();
                $table->string('password');
                $table->rememberToken();
                $table->string('username')->nullable()->unique();
                $table->string('phone')->nullable();
                $table->string('status')->default('Active');
                $table->unsignedBigInteger('manager_id')->nullable();
                $table->boolean('is_super_admin')->default(false);
                $table->string('avatar')->nullable();
                $table->string('job_title')->nullable();
                $table->string('locale')->default('en')->nullable();
                $table->string('timezone')->default('Africa/Cairo')->nullable();
                $table->string('theme_mode')->default('light')->nullable();
                $table->json('notification_settings')->nullable();
                $table->json('security_settings')->nullable();
                $table->date('birth_date')->nullable();
                $table->unsignedBigInteger('team_id')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('password_reset_tokens')) {
            Schema::create('password_reset_tokens', function (Blueprint $table) {
                $table->string('email')->primary();
                $table->string('token');
                $table->timestamp('created_at')->nullable();
            });
        }

        if (!Schema::hasTable('personal_access_tokens')) {
            Schema::create('personal_access_tokens', function (Blueprint $table) {
                $table->id();
                $table->morphs('tokenable');
                $table->text('name');
                $table->string('token', 64)->unique();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->text('abilities')->nullable();
                $table->timestamp('last_used_at')->nullable();
                $table->timestamp('expires_at')->nullable()->index();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('leads')) {
            Schema::create('leads', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('email')->nullable();
                $table->string('phone')->nullable();
                $table->string('company')->nullable();
                $table->string('location')->nullable();
                $table->string('type')->nullable();
                $table->string('stage')->nullable();
                $table->string('status')->nullable();
                $table->string('priority')->nullable();
                $table->string('source')->nullable();
                $table->string('campaign')->nullable();
                $table->unsignedBigInteger('project_id')->nullable();
                $table->unsignedBigInteger('unit_id')->nullable();
                $table->unsignedBigInteger('item_id')->nullable();
                $table->string('project')->nullable();
                $table->string('unit')->nullable();
                $table->string('assigned_to')->nullable();
                $table->string('sales_person')->nullable();
                $table->text('notes')->nullable();
                $table->json('actions_data')->nullable();
                $table->json('attachments')->nullable();
                $table->decimal('estimated_value', 15, 2)->nullable();
                $table->integer('probability')->default(0);
                $table->timestamp('last_contact')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->unsignedBigInteger('deleted_by')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (!Schema::hasTable('recycle_leads')) {
            Schema::create('recycle_leads', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('original_lead_id')->nullable()->index();
                $table->longText('lead_data');
                $table->unsignedBigInteger('deleted_by')->nullable();
                $table->timestamp('deleted_at');
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('lead_actions')) {
            Schema::create('lead_actions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('lead_id')->constrained('leads')->onDelete('cascade');
                $table->string('action_type');
                $table->text('description')->nullable();
                $table->foreignId('stage_id_at_creation')->nullable()->constrained('stages')->nullOnDelete();
                $table->string('next_action_type', 50)->nullable();
                $table->json('details')->nullable();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_actions');
        Schema::dropIfExists('recycle_leads');
        Schema::dropIfExists('leads');
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
