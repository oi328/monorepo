<?php

namespace App\Contracts;

use App\Models\User;
use Illuminate\Http\Request;

interface TokenIssuerInterface
{
    public function issue(User $user, Request $request): string;
}
