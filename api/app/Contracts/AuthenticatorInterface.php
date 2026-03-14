<?php

namespace App\Contracts;

use App\Models\User;

interface AuthenticatorInterface
{
    public function verifyCredentials(?User $user, string $password): bool;
}
