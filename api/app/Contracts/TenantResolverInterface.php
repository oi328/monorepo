<?php

namespace App\Contracts;

use Illuminate\Http\Request;
use App\Models\Tenant;

interface TenantResolverInterface
{
    public function resolveFromRequest(Request $request): ?Tenant;
}
