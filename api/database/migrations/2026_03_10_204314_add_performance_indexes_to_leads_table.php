<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $migration = $this;

        Schema::table('leads', function (Blueprint $table) use ($migration) {

            $columns = [
                'stage',
                'status',
                'assigned_to',
                'manager_id',
                'source',
                'priority',
                'country',
                'campaign',
                'created_at',
                'last_contact'
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('leads', $column)) {
                    $indexName = 'leads_' . $column . '_index';
                    if (!$migration->indexExists('leads', $indexName)) {
                        $table->index($column, $indexName);
                    }
                }
            }

            $compositeIndexes = [
                'leads_tenant_id_stage_index' => ['tenant_id', 'stage'],
                'leads_tenant_id_assigned_to_index' => ['tenant_id', 'assigned_to'],
                'leads_tenant_id_created_at_index' => ['tenant_id', 'created_at'],
            ];

            foreach ($compositeIndexes as $indexName => $columns) {
                if (!$migration->indexExists('leads', $indexName)) {
                    $table->index($columns, $indexName);
                }
            }
        });
    }

    public function down(): void
    {
        $migration = $this;

        Schema::table('leads', function (Blueprint $table) use ($migration) {

            $columns = [
                'stage',
                'status',
                'assigned_to',
                'manager_id',
                'source',
                'priority',
                'country',
                'campaign',
                'created_at',
                'last_contact'
            ];

            foreach ($columns as $column) {
                $indexName = 'leads_' . $column . '_index';
                if ($migration->indexExists('leads', $indexName)) {
                    $table->dropIndex($indexName);
                }
            }

            $compositeIndexes = [
                'leads_tenant_id_stage_index',
                'leads_tenant_id_assigned_to_index',
                'leads_tenant_id_created_at_index',
            ];

            foreach ($compositeIndexes as $indexName) {
                if ($migration->indexExists('leads', $indexName)) {
                    $table->dropIndex($indexName);
                }
            }
        });
    }

    private function indexExists(string $table, string $indexName): bool
    {
        $connection = DB::connection();
        $driver = $connection->getDriverName();

        if ($driver === 'mysql') {
            $database = $connection->getDatabaseName();
            $row = $connection->selectOne(
                'select 1 as exists_flag from information_schema.statistics where table_schema = ? and table_name = ? and index_name = ? limit 1',
                [$database, $table, $indexName]
            );

            return $row !== null;
        }

        if ($driver === 'sqlite') {
            $rows = $connection->select("PRAGMA index_list('$table')");
            foreach ($rows as $row) {
                if (($row->name ?? null) === $indexName) {
                    return true;
                }
            }
            return false;
        }

        if ($driver === 'pgsql') {
            $row = $connection->selectOne(
                'select 1 as exists_flag from pg_indexes where tablename = ? and indexname = ? limit 1',
                [$table, $indexName]
            );

            return $row !== null;
        }

        return false;
    }
};
