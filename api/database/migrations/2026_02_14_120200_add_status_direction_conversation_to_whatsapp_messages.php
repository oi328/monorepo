<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('whatsapp_messages', function (Blueprint $table) {
            $table->string('status')->nullable()->after('type');
            $table->string('direction')->nullable()->after('status'); // inbound | outbound
            $table->string('conversation_id')->nullable()->after('direction');
        });
    }

    public function down(): void
    {
        Schema::table('whatsapp_messages', function (Blueprint $table) {
            $table->dropColumn(['status', 'direction', 'conversation_id']);
        });
    }
};
