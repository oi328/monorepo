<?php

namespace App\Contracts;

use App\Models\User;

interface TwoFactorInterface
{
    public function isEnabled(User $user): bool;
    public function generateAndSend(User $user): void;
    public function verify(User $user, string $code): bool;
    public function clear(User $user): void;
}
