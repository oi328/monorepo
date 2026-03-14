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
        Schema::table('developers', function (Blueprint $table) {
            $table->string('contact_person')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('city')->nullable();
            $table->string('status')->default('Active');
            $table->text('logo')->nullable();
            $table->json('project_types')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('developers', function (Blueprint $table) {
            $table->dropColumn([
                'contact_person',
                'phone',
                'email',
                'city',
                'status',
                'logo',
                'project_types'
            ]);
        });
    }
};
