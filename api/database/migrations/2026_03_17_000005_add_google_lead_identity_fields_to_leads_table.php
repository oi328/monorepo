<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('leads')) {
            return;
        }

        Schema::table('leads', function (Blueprint $table) {
            if (!Schema::hasColumn('leads', 'google_ads_account_id')) {
                $table->unsignedBigInteger('google_ads_account_id')->nullable()->index()->after('tenant_id');
            }
            if (!Schema::hasColumn('leads', 'google_lead_id')) {
                $table->string('google_lead_id')->nullable()->index()->after('google_ads_account_id');
            }
        });

        if (Schema::hasColumn('leads', 'tenant_id')
            && Schema::hasColumn('leads', 'google_ads_account_id')
            && Schema::hasColumn('leads', 'google_lead_id')
            && !$this->indexExists('leads', 'leads_tenant_google_account_lead_unique')
        ) {
            Schema::table('leads', function (Blueprint $table) {
                $table->unique(['tenant_id', 'google_ads_account_id', 'google_lead_id'], 'leads_tenant_google_account_lead_unique');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('leads')) {
            return;
        }

        if ($this->indexExists('leads', 'leads_tenant_google_account_lead_unique')) {
            Schema::table('leads', function (Blueprint $table) {
                $table->dropUnique('leads_tenant_google_account_lead_unique');
            });
        }

        Schema::table('leads', function (Blueprint $table) {
            $cols = ['google_lead_id', 'google_ads_account_id'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('leads', $col)) {
                    $table->dropColumn($col);
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

