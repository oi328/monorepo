<?php

use App\Models\OauthToken;
use App\Models\GoogleIntegration;

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "UserTokens: " . OauthToken::count() . PHP_EOL;
echo "Integrations: " . GoogleIntegration::count() . PHP_EOL;

if (OauthToken::count() > 0) {
    echo "First User Token Provider: " . OauthToken::first()->provider . PHP_EOL;
}
