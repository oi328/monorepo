<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('users') || !Schema::hasColumn('users', 'tenant_id')) {
            return;
        }

        if (Schema::hasColumn('users', 'email')) {
            $this->dropUniqueIfExists('users', 'users_email_unique');
            $this->addUniqueIfNotExists('users', ['tenant_id', 'email'], 'users_tenant_id_email_unique');
        }

        if (Schema::hasColumn('users', 'username')) {
            $this->dropUniqueIfExists('users', 'users_username_unique');
            $this->addUniqueIfNotExists('users', ['tenant_id', 'username'], 'users_tenant_id_username_unique');
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('users') || !Schema::hasColumn('users', 'tenant_id')) {
            return;
        }

        $this->dropUniqueIfExists('users', 'users_tenant_id_email_unique');
        $this->dropUniqueIfExists('users', 'users_tenant_id_username_unique');

        if (Schema::hasColumn('users', 'email')) {
            $this->addUniqueIfNotExists('users', ['email'], 'users_email_unique');
        }

        if (Schema::hasColumn('users', 'username')) {
            $this->addUniqueIfNotExists('users', ['username'], 'users_username_unique');
        }
    }

    private function dropUniqueIfExists(string $table, string $indexName): void
    {
        if (!$this->indexExists($table, $indexName)) {
            return;
        }

        Schema::table($table, function (Blueprint $table) use ($indexName) {
            $table->dropUnique($indexName);
        });
    }

    private function addUniqueIfNotExists(string $table, array $columns, string $indexName): void
    {
        if ($this->indexExists($table, $indexName)) {
            return;
        }

        Schema::table($table, function (Blueprint $table) use ($columns, $indexName) {
            $table->unique($columns, $indexName);
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

