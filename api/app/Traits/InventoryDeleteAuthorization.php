<?php

namespace App\Traits;

use Illuminate\Http\Request;

trait InventoryDeleteAuthorization
{
    protected function normalizeTenantCompanyType(): string
    {
        $tenant = app()->bound('tenant') ? app('tenant') : null;
        $raw = strtolower(trim((string)($tenant?->company_type ?? '')));
        $raw = str_replace(['_', '-'], ' ', $raw);
        $raw = preg_replace('/\s+/', ' ', $raw) ?: $raw;

        if (str_contains($raw, 'general')) return 'general';
        if (str_contains($raw, 'real')) return 'realestate';
        return $raw ?: 'unknown';
    }

    protected function isTenantAdminUser($user): bool
    {
        $roleRaw = (string) ($user?->role ?? $user?->job_title ?? '');
        $roleLower = strtolower(trim($roleRaw));
        return ($user && ($user->is_super_admin ?? false))
            || in_array($roleLower, ['admin', 'tenant admin', 'tenant-admin'], true);
    }

    protected function getInventoryModulePerms($user): array
    {
        $meta = [];
        try {
            if (is_array($user?->meta_data)) {
                $meta = $user->meta_data;
            } elseif (is_string($user?->meta_data)) {
                $decoded = json_decode($user->meta_data, true);
                $meta = is_array($decoded) ? $decoded : [];
            }
        } catch (\Throwable $e) {
        }

        $modulePerms = is_array($meta['module_permissions'] ?? null) ? ($meta['module_permissions'] ?? []) : [];
        $inventoryPerms = $modulePerms['Inventory'] ?? [];
        return is_array($inventoryPerms) ? $inventoryPerms : [];
    }

    /**
     * Authorize deleting inventory data.
     *
     * @param string $scope 'general' or 'realestate'
     * @return \Illuminate\Http\JsonResponse|null
     */
    protected function authorizeInventoryDelete(Request $request, string $scope)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $companyType = $this->normalizeTenantCompanyType();
        if ($scope === 'general' && $companyType !== 'general') {
            return response()->json(['message' => 'This action is not available for this tenant type'], 403);
        }
        if ($scope === 'realestate' && $companyType === 'general') {
            return response()->json(['message' => 'This action is not available for this tenant type'], 403);
        }

        $isAdmin = $this->isTenantAdminUser($user);
        $inventoryPerms = $this->getInventoryModulePerms($user);
        $canDelete = $isAdmin || in_array('deleteInventory', $inventoryPerms, true);

        if (!$canDelete) {
            return response()->json(['message' => 'You do not have permission to delete inventory data'], 403);
        }

        return null;
    }
}

