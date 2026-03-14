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
        Schema::table('tasks', function (Blueprint $table) {
            $table->date('start_date')->nullable();
            $table->string('attachment')->nullable();
            $table->string('task_type')->default('visit');
            $table->string('created_by_name')->nullable(); // For manual input
            $table->string('related_to')->nullable(); // e.g., Lead, Deal
            $table->string('related_ref')->nullable(); // e.g., LEAD-102
            $table->json('tags')->nullable();
            $table->integer('progress')->default(0);
            $table->string('reminder_before')->nullable();
            $table->string('recurring')->default('none');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn([
                'start_date',
                'attachment',
                'task_type',
                'created_by_name',
                'related_to',
                'related_ref',
                'tags',
                'progress',
                'reminder_before',
                'recurring',
            ]);
        });
    }
};
