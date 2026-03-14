<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Services\TenantBootstrapper;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreateTenantCommand extends Command
{
    protected $signature = 'tenants:create {--name=} {--domain=} {--slug=} {--type=shared} {--admin-name=} {--admin-email=} {--admin-password=}';

    protected $description = 'Create a new tenant (shared or dedicated) in landlord database';

    protected TenantBootstrapper $bootstrapper;

    public function __construct(TenantBootstrapper $bootstrapper)
    {
        parent::__construct();
        $this->bootstrapper = $bootstrapper;
    }

    public function handle(): int
    {
        $name = $this->option('name') ?: $this->ask('Tenant name');
        $domain = $this->option('domain') ?: $this->ask('Tenant domain (e.g. client.example.com)');
        $slug = $this->option('slug') ?: Str::slug(strtok((string) $domain, '.'));
        $type = $this->option('type') ?: 'shared';

        $adminName = $this->option('admin-name');
        $adminEmail = $this->option('admin-email');
        $adminPassword = $this->option('admin-password');

        $adminData = null;
        if ($adminName && $adminEmail && $adminPassword) {
            $adminData = [
                'name' => $adminName,
                'email' => $adminEmail,
                'password' => $adminPassword,
            ];
        }

        if (!in_array($type, ['shared', 'dedicated'], true)) {
            $this->error("Invalid type '{$type}'. Allowed: shared, dedicated.");
            return self::FAILURE;
        }

        try {
            $tenant = new Tenant();
            $tenant->setConnection('landlord');
            $tenant->name = $name;
            $tenant->slug = $slug;
            $tenant->domain = $domain;
            $tenant->status = 'active';
            $tenant->tenancy_type = $type;
            $tenant->subscription_plan = $tenant->subscription_plan ?? 'core';
            $tenant->save();

            if ($type === 'dedicated') {
                $dbHost = config('database.connections.mysql.host');
                $dbPort = config('database.connections.mysql.port');

                $databaseName = 'tenant_' . $tenant->id . '_' . Str::random(6);
                $username = 'tenant_' . $tenant->id . '_' . Str::lower(Str::random(4));
                $password = Str::random(32);

                $dbDetails = [
                    'driver' => 'mysql',
                    'host' => $dbHost,
                    'port' => $dbPort,
                    'database' => $databaseName,
                    'username' => $username,
                    'password' => $password,
                ];

                $this->info("Creating dedicated database '{$databaseName}' and user '{$username}'...");

                DB::statement("CREATE DATABASE `{$databaseName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                DB::statement("CREATE USER '{$username}'@'%' IDENTIFIED BY '{$password}'");
                DB::statement("GRANT ALL PRIVILEGES ON `{$databaseName}`.* TO '{$username}'@'%'");
                DB::statement('FLUSH PRIVILEGES');

                $tenant->db_connection_details = $dbDetails;
                $tenant->save();

                $connectionName = 'tenant-dedicated';

                Config::set("database.connections.{$connectionName}", array_merge(
                    Config::get("database.connections.tenant-dedicated", []),
                    $dbDetails
                ));

                DB::purge($connectionName);

                Artisan::call('migrate', [
                    '--database' => $connectionName,
                    '--force' => true,
                ]);
            }

            if ($adminData) {
                $this->bootstrapper->bootstrap($tenant, $adminData);
            }

            $this->info("Tenant [{$tenant->id}] created successfully.");
            $this->line(" - Name: {$tenant->name}");
            $this->line(" - Domain: {$tenant->domain}");
            $this->line(" - Slug: {$tenant->slug}");
            $this->line(" - Type: {$tenant->tenancy_type}");

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Failed to create tenant: ' . $e->getMessage());
            return self::FAILURE;
        }
    }
}
