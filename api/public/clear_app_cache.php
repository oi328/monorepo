<?php

// Load Laravel application
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);

echo "<h1>Clearing Caches...</h1>";

try {
    Illuminate\Support\Facades\Artisan::call('cache:clear');
    echo "Cache cleared.<br>";
    
    Illuminate\Support\Facades\Artisan::call('config:clear');
    echo "Config cleared.<br>";
    
    Illuminate\Support\Facades\Artisan::call('route:clear');
    echo "Routes cleared.<br>";
    
    Illuminate\Support\Facades\Artisan::call('view:clear');
    echo "Views cleared.<br>";
    
    Illuminate\Support\Facades\Artisan::call('optimize:clear');
    echo "Optimization cleared.<br>";
    
    echo "<h2>Done!</h2>";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
