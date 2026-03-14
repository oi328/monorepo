<?php

namespace App\Policies;

use App\Models\Activity;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ActivityLogPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->is_super_admin;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Activity $activity): bool
    {
        if ($user->is_super_admin) {
            return true;
        }

        // Tenant isolation check
        return $user->tenant_id === $activity->tenant_id;
    }

    /**
     * Determine whether the user can view tenant specific logs.
     */
    public function viewTenantLogs(User $user): bool
    {
        // Allow tenant admins to view logs?
        // Assuming 'view-logs' permission or 'Admin' role is required.
        // For now, let's say only users with 'view-reports' permission can see logs.
        return $user->can('view-reports');
    }

    // Other methods are false by default (create, update, delete, restore, forceDelete)
    // Logs should be immutable.

    public function create(User $user): bool { return false; }
    public function update(User $user, Activity $activity): bool { return false; }
    public function delete(User $user, Activity $activity): bool { return false; }
    public function restore(User $user, Activity $activity): bool { return false; }
    public function forceDelete(User $user, Activity $activity): bool { return false; }
}
