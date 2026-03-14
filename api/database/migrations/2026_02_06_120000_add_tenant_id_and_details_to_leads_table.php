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
        Schema::table('leads', function (Blueprint $table) {
            if (!Schema::hasColumn('leads', 'tenant_id')) {
                $table->unsignedBigInteger('tenant_id')->after('id');
                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            }
            
            if (!Schema::hasColumn('leads', 'probability')) {
                $table->integer('probability')->default(0)->after('estimated_value');
            }
            
            if (!Schema::hasColumn('leads', 'last_contact')) {
                $table->timestamp('last_contact')->nullable()->after('updated_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            if (Schema::hasColumn('leads', 'probability')) {
                $table->dropColumn('probability');
            }
            if (Schema::hasColumn('leads', 'last_contact')) {
                $table->dropColumn('last_contact');
            }
            // Optional: drop tenant_id if we added it, but hard to know for sure in down()
        });
    }
};
