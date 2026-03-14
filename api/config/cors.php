<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    */

    // أضفت '*' للسماح للـ Reverb والـ WebSockets بالعمل دون قيود الـ Path
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'broadcasting/auth', 'api/broadcasting/auth', 'reverb/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => ['*'], // في حال استخدام patterns، الـ origins يفضل أن تكون فارغة أو '*' حسب نسخة لارافل

    'allowed_origins_patterns' => [
        '#^http://localhost:\d+$#',
        '#^http://127\.0\.0\.1:\d+$#',
        '#^http://.*\.localhost:\d+$#',
        '#^https://.*\.besouholacrm\.net$#',
        '#^https://besouholacrm\.net$#',
        '#^https://www\.besouholacrm\.net$#', // Added explicit www support
       
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 3600,

    'supports_credentials' => true, // ضروري جداً لعمل الـ Login (Sanctum)

];