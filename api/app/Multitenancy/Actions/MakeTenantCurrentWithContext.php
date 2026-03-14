<?php

namespace App\Multitenancy\Actions;

use Spatie\Multitenancy\Actions\MakeTenantCurrentAction;
use Spatie\Multitenancy\Contracts\IsTenant;

class MakeTenantCurrentWithContext extends MakeTenantCurrentAction
{
    public function execute(IsTenant $tenant): static
    {
        parent::execute($tenant);

        app()->instance('current_tenant_id', $tenant->id);

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($tenant->id);
        }

        return $this;
    }
}
