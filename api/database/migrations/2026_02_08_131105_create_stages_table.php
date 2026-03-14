<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('stages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->nullable(); // For multi-tenancy
            $table->string('name');
            $table->string('name_ar')->nullable();
            $table->string('type')->default('follow_up');
            $table->integer('order')->default(0);
            $table->string('color')->default('#3B82F6');
            $table->string('icon')->default('BarChart2');
            $table->timestamps();

            $table->index('tenant_id');
        });

        // Seed default stages matching Settings page defaults
        $now = now();
        $stages = [
            ['name' => 'Follow up',    'name_ar' => 'متابعة',       'type' => 'follow_up',   'order' => 1, 'color' => '#3B82F6', 'icon' => 'RefreshCw'],
            ['name' => 'No Answer',    'name_ar' => 'لا رد',        'type' => 'follow_up',   'order' => 2, 'color' => '#EF4444', 'icon' => 'PhoneOff'],
            ['name' => 'Meeting',      'name_ar' => 'اجتماع',       'type' => 'meeting',     'order' => 3, 'color' => '#3B82F6', 'icon' => 'Calendar'],
            ['name' => 'Proposal',     'name_ar' => 'عرض سعر',      'type' => 'proposal',    'order' => 4, 'color' => '#F59E0B', 'icon' => 'FileText'],
            ['name' => 'Reservation',  'name_ar' => 'حجز',          'type' => 'reservation', 'order' => 5, 'color' => '#EF4444', 'icon' => 'Pin'],
            ['name' => 'Closing Deal', 'name_ar' => 'إغلاق صفقة',  'type' => 'closing_deals','order' => 6, 'color' => '#EAB308', 'icon' => 'Handshake'],
            ['name' => 'Cancelation',  'name_ar' => 'إلغاء',        'type' => 'cancel',      'order' => 7, 'color' => '#EF4444', 'icon' => 'XCircle'],
        ];

        foreach ($stages as $stage) {
            DB::table('stages')->insert(array_merge($stage, [
                'created_at' => $now,
                'updated_at' => $now
            ]));
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stages');
    }
};
