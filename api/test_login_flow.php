<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// 1. Login
echo "Attempting Login...\n";
$request = Illuminate\Http\Request::create('/api/login', 'POST', [
    'email' => 'ab@gmail.com',
    'password' => 'password',
    'subdomain' => 'ab' // Assuming the user logs in via 'ab' subdomain or similar? 
                        // Wait, the frontend sends 'subdomain' if it detects one.
                        // In the previous context, the user is on localhost.
                        // But let's try to simulate what the frontend does.
                        // Frontend code: const subdomain = parts.length > threshold ? parts[0] : null;
]);

$response = $app->handle($request);
$content = json_decode($response->getContent(), true);

if ($response->getStatusCode() !== 200) {
    echo "Login Failed: " . $response->getStatusCode() . "\n";
    print_r($content);
    exit;
}

echo "Login Successful.\n";
$token = $content['token'];
echo "Token: " . substr($token, 0, 20) . "...\n";

// 2. Company Info
echo "\nAttempting Company Info...\n";
$request = Illuminate\Http\Request::create('/api/company-info', 'GET');
$request->headers->set('Authorization', 'Bearer ' . $token);
$request->headers->set('Accept', 'application/json');

// Simulate the Tenant header if the frontend sends it
// In api.js: if (parts.length > threshold) { config.headers['X-Tenant'] = parts[0] }
// If user is accessing via localhost:8000, and api.js sees 'localhost', it might not send X-Tenant if it's just 'localhost'.
// But wait, the user's tenant is 'ab'. If they are on localhost, how does the system know they are tenant 'ab'?
// Ah, the user logs in, gets a token. The token claims should have the tenant info.
// OR the frontend must send X-Tenant.

// Let's see what happens without X-Tenant first.
try {
    $response = $app->handle($request);
    
    echo "Company Info Status: " . $response->getStatusCode() . "\n";
    if ($response->getStatusCode() !== 200) {
        echo "Response: " . $response->getContent() . "\n";
    } else {
        echo "Success!\n";
    }
} catch (\Throwable $e) {
    echo "Exception: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
