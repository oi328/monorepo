<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Schema;

try {
    $hasColumn = Schema::hasColumn('personal_access_tokens', 'expires_at');
    echo "Has expires_at column: " . ($hasColumn ? 'Yes' : 'No') . "\n";
} catch (\Exception $e) {
    echo "Error checking schema: " . $e->getMessage() . "\n";
}
