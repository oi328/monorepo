<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$tokens = App\Models\OauthToken::all();
foreach ($tokens as $t) {
    echo "ID: {$t->id}, User: {$t->user_id}, Tenant: {$t->tenant_id}, Provider: {$t->provider}, Expires: {$t->expires_at}\n";
    echo "Scope: {$t->scope}\n";
}
