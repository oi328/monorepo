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
        $modules = [
            ['name' => 'Dashboard', 'slug' => 'dashboard', 'description' => 'Main dashboard', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'User Management', 'slug' => 'users', 'description' => 'Manage system users', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Reports', 'slug' => 'reports', 'description' => 'System reports and analytics', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Inventory', 'slug' => 'inventory', 'description' => 'Inventory and product items', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
        ];

        foreach ($modules as $module) {
            DB::table('modules')->updateOrInsert(
                ['slug' => $module['slug']],
                $module
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // We don't delete modules in down() to avoid data loss if rolled back
    }
};
