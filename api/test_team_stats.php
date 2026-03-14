<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = App\Models\User::first(); // Assuming first user is Tenant Admin
echo "User: " . $user->name . " (ID: " . $user->id . ")\n";
echo "Roles: " . $user->getRoleNames()->implode(', ') . "\n";

$request = Illuminate\Http\Request::create('/api/reports/team-stats', 'GET');
$request->setUserResolver(function () use ($user) {
    return $user;
});

$controller = new App\Http\Controllers\ReportsController();
$response = $controller->teamStats($request);

echo "Status: " . $response->getStatusCode() . "\n";
$data = $response->getData();
echo "Count: " . count($data) . "\n";
if (count($data) > 0) {
    echo "First Item: " . json_encode($data[0]) . "\n";
}
