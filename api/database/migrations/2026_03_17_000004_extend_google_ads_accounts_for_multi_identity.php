<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('google_ads_accounts')) {
            return;
        }

        Schema::table('google_ads_accounts', function (Blueprint $table) {
            if (!Schema::hasColumn('google_ads_accounts', 'connected_account_id')) {
                $table->unsignedBigInteger('connected_account_id')->nullable()->after('tenant_id');
            }
            if (!Schema::hasColumn('google_ads_accounts', 'webhook_key')) {
                $table->string('webhook_key')->nullable()->after('google_ads_id');
            }
            if (!Schema::hasColumn('google_ads_accounts', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('expires_at');
            }
            if (!Schema::hasColumn('google_ads_accounts', 'is_primary')) {
                $table->boolean('is_primary')->default(false)->after('is_active');
            }
            if (!Schema::hasColumn('google_ads_accounts', 'connection_status')) {
                $table->string('connection_status')->default('connected')->after('is_primary');
            }
            if (!Schema::hasColumn('google_ads_accounts', 'login_customer_id')) {
                $table->string('login_customer_id')->nullable()->after('connection_status');
            }
            if (!Schema::hasColumn('google_ads_accounts', 'currency_code')) {
                $table->string('currency_code', 10)->nullable()->after('login_customer_id');
            }
            if (!Schema::hasColumn('google_ads_accounts', 'timezone')) {
                $table->string('timezone', 64)->nullable()->after('currency_code');
            }
            if (!Schema::hasColumn('google_ads_accounts', 'is_manager')) {
                $table->boolean('is_manager')->default(false)->after('timezone');
            }
        });

        Schema::table('google_ads_accounts', function (Blueprint $table) {
            if (Schema::hasColumn('google_ads_accounts', 'connected_account_id')) {
                $table->foreign('connected_account_id')
                    ->references('id')
                    ->on('google_connected_accounts')
                    ->nullOnDelete();
            }
        });

        Schema::table('google_ads_accounts', function (Blueprint $table) {
            if ($this->indexExists('google_ads_accounts', 'google_ads_accounts_tenant_google_ads_id_unique') === false) {
                $table->unique(['tenant_id', 'google_ads_id'], 'google_ads_accounts_tenant_google_ads_id_unique');
            }
        });

        Schema::table('google_ads_accounts', function (Blueprint $table) {
            if ($this->indexExists('google_ads_accounts', 'google_ads_accounts_webhook_key_unique') === false && Schema::hasColumn('google_ads_accounts', 'webhook_key')) {
                $table->unique(['webhook_key'], 'google_ads_accounts_webhook_key_unique');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('google_ads_accounts')) {
            return;
        }

        if ($this->indexExists('google_ads_accounts', 'google_ads_accounts_webhook_key_unique')) {
            Schema::table('google_ads_accounts', function (Blueprint $table) {
                $table->dropUnique('google_ads_accounts_webhook_key_unique');
            });
        }

        if ($this->indexExists('google_ads_accounts', 'google_ads_accounts_tenant_google_ads_id_unique')) {
            Schema::table('google_ads_accounts', function (Blueprint $table) {
                $table->dropUnique('google_ads_accounts_tenant_google_ads_id_unique');
            });
        }

        if ($this->indexExists('google_ads_accounts', 'google_ads_accounts_connected_account_id_foreign')) {
            Schema::table('google_ads_accounts', function (Blueprint $table) {
                $table->dropForeign('google_ads_accounts_connected_account_id_foreign');
            });
        }

        Schema::table('google_ads_accounts', function (Blueprint $table) {
            $cols = [
                'is_manager',
                'timezone',
                'currency_code',
                'login_customer_id',
                'connection_status',
                'is_primary',
                'is_active',
                'webhook_key',
                'connected_account_id',
            ];

            foreach ($cols as $col) {
                if (Schema::hasColumn('google_ads_accounts', $col)) {
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

