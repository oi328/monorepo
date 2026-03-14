<?php
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed_domains = [
    'https://besouholacrm.net',
    'https://www.besouholacrm.net',
    'http://localhost:5173'
];

// Check if origin ends with .besouholacrm.net or is in allowed list
if (in_array($origin, $allowed_domains) || preg_match('/^https:\/\/[a-z0-9-]+\.besouholacrm\.net$/', $origin)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    // If not matching, we do NOT set the header, effectively blocking CORS
}

header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Origin, Content-Type, X-Auth-Token, Authorization, Accept, charset, boundary, Content-Length, X-Tenant-Id, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] == "OPTIONS") {
    exit(0);
}
use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());
