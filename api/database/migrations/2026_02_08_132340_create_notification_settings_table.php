<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('notification_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            
            // Master Toggles
            $table->boolean('system_notifications')->default(true);
            $table->boolean('app_notifications')->default(true);
            
            // Quiet Hours
            $table->boolean('quiet_hours_enabled')->default(false);
            $table->time('quiet_hours_start')->nullable();
            $table->time('quiet_hours_end')->nullable();
            
            // Individual Notification Types
            $table->boolean('notify_assigned_leads')->default(true);
            $table->boolean('notify_delay_leads')->default(true);
            $table->boolean('notify_requests')->default(true);
            $table->boolean('notify_rent_end_date')->default(true);
            $table->boolean('notify_add_customer')->default(true);
            $table->boolean('notify_create_invoice')->default(true);
            $table->boolean('notify_open_ticket')->default(true);
            $table->boolean('notify_campaign_expired')->default(true);
            $table->boolean('notify_task_assigned')->default(true);
            $table->boolean('notify_task_expired')->default(true);
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_settings');
    }
};
