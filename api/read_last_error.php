<?php
$logFile = 'storage/logs/laravel.log';
if (!file_exists($logFile)) {
    echo "Log file not found.\n";
    exit;
}

$lines = file($logFile);
$count = count($lines);
$found = false;
$buffer = [];

// Read backwards to find the last error
for ($i = $count - 1; $i >= 0; $i--) {
    $line = $lines[$i];
    array_unshift($buffer, $line);
    
    if (strpos($line, 'local.ERROR') !== false) {
        $found = true;
        // Verify it's recent (optional check, but good enough for now)
        // Check if it's related to our test
        // We will just print the last error block found.
        break;
    }
    
    // Limit buffer to avoid huge memory usage if no error found quickly
    if (count($buffer) > 500) {
        // Continue searching but trim buffer end if we want, 
        // but here we want the *last* error, so we should discard the *end* of the file if it's too far from an error?
        // No, we want the lines *after* the error.
        // If we haven't found 'local.ERROR' yet, we are just accumulating the stack trace.
    }
}

if ($found) {
    echo implode("", $buffer);
} else {
    echo "No error found in the last read portion (or file too large to process this way efficiently).\n";
}
