<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$req = \Illuminate\Http\Request::create("/api/projects", "POST", [
    "name" => "TINKER",
    "min_price" => 555,
    "developer" => "TestDev",
    "city" => "TestCity"
]);
$c = app(App\Http\Controllers\ProjectController::class);
echo $c->store($req)->getContent();
