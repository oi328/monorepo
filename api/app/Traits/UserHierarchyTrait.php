<?php

namespace App\Traits;

use App\Models\User;

trait UserHierarchyTrait
{
    protected function collectSubordinatesIds(User $root): array
    {
        $ids = [];
        $all = User::where('tenant_id', $root->tenant_id)->get(['id','manager_id','tenant_id']);
        $byManager = [];
        foreach ($all as $u) {
            $byManager[$u->manager_id ?? 0][] = $u;
        }
        $queue = [$root->id];
        $visited = [];
        while (!empty($queue)) {
            $current = array_shift($queue);
            if (isset($visited[$current])) {
                continue;
            }
            $visited[$current] = true;
            $children = $byManager[$current] ?? [];
            foreach ($children as $child) {
                $ids[] = (int) $child->id;
                $queue[] = (int) $child->id;
            }
        }
        return $ids;
    }

    protected function getViewableUserIds(User $user, $managerId = null)
    {
        $tenantId = $user->tenant_id;
        $ids = [];
        
        $roles = $user->getRoleNames()->map(fn($r) => strtolower($r))->toArray();
        $roleLower = strtolower($user->role ?? '');
        
        $isSalesPerson = str_contains($roleLower, 'sales person') || str_contains($roleLower, 'salesperson') || in_array('sales person', $roles) || in_array('salesperson', $roles);
        $isTeamLeader = str_contains($roleLower, 'team leader') || in_array('team leader', $roles);

        // IMPORTANT:
        // "Operation Manager" contains the word "manager" but should not be treated as a hierarchy-limited manager.
        // Director/Operation Manager are expected to have full tenant visibility (unless an explicit manager_id filter is provided).
        $isOperationManager = str_contains($roleLower, 'operation manager') || in_array('operation manager', $roles);
        $isDirector = str_contains($roleLower, 'director') || in_array('director', $roles);

        // Treat only explicit manager roles as hierarchy-limited.
        $isSalesManager = str_contains($roleLower, 'sales manager') || in_array('sales manager', $roles);
        $isGenericManager = ($roleLower === 'manager') || in_array('manager', $roles);
        $isManager = ($isSalesManager || $isGenericManager) && !$isOperationManager && !$isDirector;
        
        $shouldFilter = false;

        if ($isSalesPerson) {
            $ids = [(int)$user->id];
            $shouldFilter = true;
        } elseif ($isTeamLeader || $isManager) {
            $ids = $this->collectSubordinatesIds($user);
            $ids[] = (int)$user->id;
            $shouldFilter = true;
        } elseif (!empty($managerId)) {
            $root = User::where('tenant_id', $tenantId)->find($managerId);
            if ($root) {
                $ids = $this->collectSubordinatesIds($root);
                $ids[] = (int)$root->id;
                $shouldFilter = true;
            }
        }
        
        return $shouldFilter ? $ids : null;
    }
}
