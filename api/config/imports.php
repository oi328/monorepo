<?php

return [
    // Feature flag: enables the new import-jobs system (parallel, non-breaking).
    // Keep legacy import endpoints working regardless.
    'enabled' => env('IMPORT_JOBS_ENABLED', false),

    // Whether to send duplicate notifications for imported duplicate leads.
    // Default false to avoid notification floods on large imports.
    'notify_duplicates' => env('IMPORT_JOBS_NOTIFY_DUPLICATES', false),
];

