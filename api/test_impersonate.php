<?php
require 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';

$kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);

$request = \Illuminate\Http\Request::create(
    '/api/super-admin/tenants',
    'GET',
);

try {
    $response = $kernel->handle($request);
    echo "Response Status: " . $response->status() . "\n";
    echo "Response:\n";
    echo $response->getContent() . "\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
    echo "Stack trace:\n";
    echo $e->getTraceAsString() . "\n";
}
