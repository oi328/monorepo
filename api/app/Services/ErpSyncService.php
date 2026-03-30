<?php

namespace App\Services;

use App\Models\Broker;
use App\Models\Developer;
use App\Models\ErpSetting;
use App\Models\ErpSyncLog;
use App\Models\InventoryRequest;
use App\Models\Item;
use App\Models\ItemCategory;
use App\Models\Project;
use App\Models\Property;
use App\Models\RealEstateRequest;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class ErpSyncService
{
    public function run(Tenant $tenant, ?User $actor = null, array $options = []): array
    {
        $settings = ErpSetting::firstOrCreate(
            ['tenant_id' => $tenant->id],
            ['provider' => 'Generic REST API', 'auth_type' => 'Bearer Token']
        );

        if (empty($settings->base_url)) {
            throw new \RuntimeException('ERP base_url is not configured.');
        }

        $client = new ErpApiClient($settings);

        $companyType = strtolower(trim((string)($tenant->company_type ?? '')));
        $companyType = str_replace(['_', '-'], '', $companyType);
        $isGeneral = str_contains($companyType, 'general');

        $syncSettings = is_array($settings->sync_settings) ? $settings->sync_settings : [];
        $entitiesCfg = $syncSettings['entities'] ?? null;
        if (!is_array($entitiesCfg)) {
            $entitiesCfg = [];
        }

        // Allow overriding entities from request/options.
        $only = $options['only_entities'] ?? null;
        $only = is_array($only) ? array_values(array_filter($only, fn($v) => is_string($v) && $v !== '')) : null;

        // If no entities configured, provide sensible defaults but require endpoints to be configured.
        if (empty($entitiesCfg)) {
            $entitiesCfg = $isGeneral
                ? [
                    'item_categories' => ['enabled' => true],
                    'items' => ['enabled' => true],
                    'inventory_requests' => ['enabled' => true],
                ]
                : [
                    'projects' => ['enabled' => true],
                    'properties' => ['enabled' => true],
                    'developers' => ['enabled' => true],
                    'brokers' => ['enabled' => true],
                    'real_estate_requests' => ['enabled' => true],
                ];
        }

        $fieldMappings = is_array($settings->field_mappings) ? $settings->field_mappings : [];

        $summary = [
            'tenant_id' => $tenant->id,
            'base_url' => $client->baseUrl(),
            'entities' => [],
        ];

        foreach ($entitiesCfg as $entity => $cfg) {
            if ($only && !in_array($entity, $only, true)) {
                continue;
            }
            if (!is_array($cfg)) $cfg = [];
            $enabled = (bool)($cfg['enabled'] ?? false);
            if (!$enabled) continue;

            $scope = $this->entityScope($entity);
            if ($scope === 'general' && !$isGeneral) {
                $summary['entities'][$entity] = ['skipped' => true, 'reason' => 'tenant_type_mismatch'];
                continue;
            }
            if ($scope === 'realestate' && $isGeneral) {
                $summary['entities'][$entity] = ['skipped' => true, 'reason' => 'tenant_type_mismatch'];
                continue;
            }

            $endpoint = (string)($cfg['endpoint'] ?? '');
            if ($endpoint === '') {
                $this->logSync($tenant->id, $entity, 'sync', 'failed', 'outbound', 'Missing endpoint in ERP sync settings.', $actor);
                $summary['entities'][$entity] = ['ok' => false, 'error' => 'missing_endpoint'];
                continue;
            }

            $limit = (int)($cfg['limit'] ?? 200);
            $query = is_array($cfg['query'] ?? null) ? $cfg['query'] : [];
            if ($limit > 0 && !array_key_exists('limit', $query)) {
                $query['limit'] = $limit;
            }

            $dataPath = (string)($cfg['data_path'] ?? 'data');
            $idField = (string)($cfg['id_field'] ?? 'id');

            $mapForEntity = is_array($fieldMappings[$entity] ?? null) ? $fieldMappings[$entity] : [];
            if (empty($mapForEntity) && is_array($cfg['field_mappings'] ?? null)) {
                $mapForEntity = $cfg['field_mappings'];
            }

            $modelClass = $this->entityModel($entity);
            if (!$modelClass) {
                $this->logSync($tenant->id, $entity, 'sync', 'failed', 'outbound', 'Unknown entity model mapping.', $actor);
                $summary['entities'][$entity] = ['ok' => false, 'error' => 'unknown_entity'];
                continue;
            }

            $created = 0;
            $updated = 0;
            $failed = 0;

            try {
                $resp = $client->get($endpoint, $query);
                $rows = $this->pluckPath($resp, $dataPath);
                if (!is_array($rows)) {
                    // If data path doesn't exist, allow passing the entire response as array
                    $rows = is_array($resp) ? $resp : [];
                }

                foreach ($rows as $row) {
                    if (!is_array($row)) continue;
                    $extId = $this->pluckPath($row, $idField);
                    $extId = is_scalar($extId) ? (string)$extId : null;
                    if (!$extId) {
                        $failed++;
                        continue;
                    }

                    try {
                        $payload = $this->mapFields($row, $mapForEntity);
                        $payload['tenant_id'] = $tenant->id;
                        $payload = $this->filterPayloadForModel(new $modelClass(), $payload);

                        /** @var Model $existing */
                        $existing = $modelClass::query()
                            ->where('tenant_id', $tenant->id)
                            ->where('meta_data->erp_id', $extId)
                            ->first();

                        if ($existing) {
                            $existingMeta = is_array($existing->meta_data) ? $existing->meta_data : [];
                            $existingMeta['erp_id'] = $extId;
                            $payload['meta_data'] = array_merge($existingMeta, is_array($payload['meta_data'] ?? null) ? $payload['meta_data'] : []);

                            $existing->fill($payload);
                            $existing->save();
                            $updated++;
                        } else {
                            $meta = is_array($payload['meta_data'] ?? null) ? $payload['meta_data'] : [];
                            $meta['erp_id'] = $extId;
                            $payload['meta_data'] = $meta;

                            $modelClass::create($payload);
                            $created++;
                        }
                    } catch (\Throwable $e) {
                        $failed++;
                        Log::warning('ERP sync row failed', ['entity' => $entity, 'error' => $e->getMessage()]);
                    }
                }

                $this->logSync(
                    $tenant->id,
                    $entity,
                    'sync',
                    'success',
                    'outbound',
                    "Created: {$created}, Updated: {$updated}, Failed: {$failed}",
                    $actor
                );

                $summary['entities'][$entity] = [
                    'ok' => true,
                    'created' => $created,
                    'updated' => $updated,
                    'failed' => $failed,
                ];
            } catch (\Throwable $e) {
                $this->logSync($tenant->id, $entity, 'sync', 'failed', 'outbound', $e->getMessage(), $actor);
                $summary['entities'][$entity] = ['ok' => false, 'error' => $e->getMessage()];
            }
        }

        return $summary;
    }

    protected function entityScope(string $entity): string
    {
        return match ($entity) {
            'items', 'item_categories', 'inventory_requests' => 'general',
            'projects', 'properties', 'developers', 'brokers', 'real_estate_requests' => 'realestate',
            default => 'unknown',
        };
    }

    protected function entityModel(string $entity): ?string
    {
        return match ($entity) {
            'item_categories' => ItemCategory::class,
            'items' => Item::class,
            'inventory_requests' => InventoryRequest::class,
            'projects' => Project::class,
            'properties' => Property::class,
            'developers' => Developer::class,
            'brokers' => Broker::class,
            'real_estate_requests' => RealEstateRequest::class,
            default => null,
        };
    }

    protected function mapFields(array $row, array $mapping): array
    {
        // Supports two shapes:
        // 1) CRM_FIELD => ERP_FIELD
        // 2) ERP_FIELD => CRM_FIELD (auto-detected when values look like known CRM fields)
        $out = [];
        if (empty($mapping)) return $out;

        // Heuristic: if keys contain dots/spaces and values are simple (name/email/phone), assume ERP=>CRM
        $assumeErpToCrm = false;
        foreach ($mapping as $k => $v) {
            if (!is_string($k) || !is_string($v)) continue;
            if (in_array($v, ['name', 'email', 'phone', 'code', 'status', 'description'], true)) {
                $assumeErpToCrm = true;
                break;
            }
        }

        foreach ($mapping as $a => $b) {
            if (!is_string($a) || !is_string($b) || $a === '' || $b === '') continue;
            $crmField = $assumeErpToCrm ? $b : $a;
            $erpField = $assumeErpToCrm ? $a : $b;
            $val = $this->pluckPath($row, $erpField);
            if ($val === null) continue;
            $out[$crmField] = $val;
        }

        return $out;
    }

    protected function filterPayloadForModel(Model $model, array $payload): array
    {
        $table = $model->getTable();
        $columns = [];
        try {
            $columns = Schema::getColumnListing($table);
        } catch (\Throwable $e) {
        }

        $allowed = array_flip($columns);
        // Always allow meta_data (most tables have it).
        $allowed['meta_data'] = true;

        return array_intersect_key($payload, $allowed);
    }

    protected function pluckPath($data, string $path)
    {
        if ($path === '' || $data === null) return null;
        // Simple key
        if (!str_contains($path, '.')) {
            return is_array($data) && array_key_exists($path, $data) ? $data[$path] : null;
        }
        $cur = $data;
        foreach (explode('.', $path) as $seg) {
            if (!is_array($cur) || !array_key_exists($seg, $cur)) return null;
            $cur = $cur[$seg];
        }
        return $cur;
    }

    protected function logSync(int $tenantId, string $entity, string $action, string $status, ?string $direction, ?string $message, ?User $actor = null): void
    {
        try {
            ErpSyncLog::create([
                'tenant_id' => $tenantId,
                'entity' => $entity,
                'action' => $action,
                'status' => $status,
                'direction' => $direction,
                'message' => $message,
                'synced_at' => now(),
            ]);
        } catch (\Throwable $e) {
            // Avoid breaking sync if logging fails.
        }
    }
}

