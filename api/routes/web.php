<?php

use Illuminate\Support\Facades\Route;
use App\Http\Middleware\InitializeTenancy;
use App\Http\Middleware\SetTenantTimezone;
use App\Http\Middleware\ResolveTenant;
use App\Http\Controllers\ShareLinkPageController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

Route::middleware([InitializeTenancy::class, SetTenantTimezone::class])->group(function () {
    Route::get('/', function () {
        $index = public_path('index.html');
        if (is_file($index)) {
            return response()->file($index);
        }
        return view('welcome');
    });
});

Route::middleware([ResolveTenant::class, InitializeTenancy::class, SetTenantTimezone::class])->group(function () {
    Route::get('/l/{token}', [ShareLinkPageController::class, 'show']);
});

Route::get('/webhook', function (Request $request) {
    $verify_token = "000";
    $token = $request->query('hub_verify_token', $request->query('hub.verify_token'));
    $challenge = $request->query('hub_challenge', $request->query('hub.challenge'));
    if ($token === $verify_token) {
        return $challenge ?? '';
    }
    return response('Invalid token', 403);
});

Route::post('/webhook', function (Request $request) {
    Log::info($request->all());
    return response()->json(['status' => 'ok']);
});

Route::get('/{any}', function () {
    $index = public_path('index.html');
    if (is_file($index)) {
        return response()->file($index);
    }
    return view('welcome');
})->where('any', '^(?!api(?:/|$)).*');
