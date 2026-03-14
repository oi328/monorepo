<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement("
                UPDATE leads
                SET
                    sales_person = COALESCE(NULLIF(sales_person, ''), assigned_to),
                    assigned_to = NULL
                WHERE
                    assigned_to IS NOT NULL
                    AND assigned_to <> ''
                    AND assigned_to NOT REGEXP '^[0-9]+$'
            ");
            return;
        }

        DB::table('leads')
            ->select(['id', 'assigned_to', 'sales_person'])
            ->orderBy('id')
            ->chunkById(500, function ($rows) {
                foreach ($rows as $row) {
                    $assigned = (string)($row->assigned_to ?? '');
                    if ($assigned === '') {
                        continue;
                    }
                    if (preg_match('/^[0-9]+$/', $assigned)) {
                        continue;
                    }
                    $nextSalesPerson = $row->sales_person;
                    if ($nextSalesPerson === null || trim((string)$nextSalesPerson) === '') {
                        $nextSalesPerson = $assigned;
                    }
                    DB::table('leads')
                        ->where('id', $row->id)
                        ->update([
                            'assigned_to' => null,
                            'sales_person' => $nextSalesPerson,
                        ]);
                }
            });
    }

    public function down(): void
    {
    }
};

