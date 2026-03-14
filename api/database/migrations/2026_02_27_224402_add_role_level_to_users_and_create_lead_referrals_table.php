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
        // Add role_level to users
        if (!Schema::hasColumn('users', 'role_level')) {
            Schema::table('users', function (Blueprint $table) {
                $table->integer('role_level')->default(0)->after('status')->comment('Higher number = higher authority');
            });
        }

        // Create lead_referrals table
        if (!Schema::hasTable('lead_referrals')) {
            Schema::create('lead_referrals', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id')->index();
                $table->unsignedBigInteger('lead_id')->index();
                $table->unsignedBigInteger('user_id')->index()->comment('The user who received the referral');
                $table->unsignedBigInteger('referrer_id')->nullable()->index()->comment('The user who sent the referral');
                $table->timestamps();

                $table->unique(['lead_id', 'user_id']);

                $table->foreign('lead_id')->references('id')->on('leads')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('referrer_id')->references('id')->on('users')->onDelete('set null');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lead_referrals');

        if (Schema::hasColumn('users', 'role_level')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('role_level');
            });
        }
    }
};
