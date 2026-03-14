<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->unsignedBigInteger('assigned_to')->nullable()->change();
        });

        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement("
                UPDATE leads l
                LEFT JOIN users u ON u.id = l.assigned_to
                SET l.assigned_to = NULL
                WHERE l.assigned_to IS NOT NULL
                  AND u.id IS NULL
            ");
        } else {
            DB::table('leads')
                ->select(['id', 'assigned_to'])
                ->whereNotNull('assigned_to')
                ->orderBy('id')
                ->chunkById(500, function ($rows) {
                    foreach ($rows as $row) {
                        $assignedTo = $row->assigned_to;
                        if ($assignedTo === null) {
                            continue;
                        }
                        $exists = DB::table('users')->where('id', $assignedTo)->exists();
                        if (!$exists) {
                            DB::table('leads')->where('id', $row->id)->update(['assigned_to' => null]);
                        }
                    }
                });
        }

        $hasFk = false;
        if ($driver === 'mysql') {
            $hasFk = DB::table('information_schema.KEY_COLUMN_USAGE')
                ->where('TABLE_SCHEMA', DB::raw('DATABASE()'))
                ->where('TABLE_NAME', 'leads')
                ->where('COLUMN_NAME', 'assigned_to')
                ->whereNotNull('REFERENCED_TABLE_NAME')
                ->exists();
        }

        if (!$hasFk) {
            try {
                Schema::table('leads', function (Blueprint $table) {
                    $table->foreign('assigned_to')->references('id')->on('users')->nullOnDelete();
                });
            } catch (\Throwable $e) {
            }
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            try {
                DB::statement("ALTER TABLE leads DROP FOREIGN KEY leads_assigned_to_foreign");
            } catch (\Throwable $e) {
            }
        } else {
            try {
                Schema::table('leads', function (Blueprint $table) {
                    $table->dropForeign(['assigned_to']);
                });
            } catch (\Throwable $e) {
            }
        }

        Schema::table('leads', function (Blueprint $table) {
            $table->string('assigned_to')->nullable()->change();
        });
    }
};
