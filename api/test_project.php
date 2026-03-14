<?php
$request = new \Illuminate\Http\Request();
$request->setMethod('POST');
$request->merge(['name' => 'Test Project Tinker 2']);

$controller = app(\App\Http\Controllers\ProjectController::class);
try {
    $response = $controller->store($request);
    if ($response === null) {
        echo "store() returned null\n";
    }
    else {
        echo "store() returned a response of type: " . get_class($response) . "\n";
        print_r($response->getContent());
    }
}
catch (\Throwable $e) {
    echo "CAUGHT EXCEPTION or ERROR:\n";
    echo get_class($e) . "\n";
    echo $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
