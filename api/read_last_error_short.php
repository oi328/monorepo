<?php
$logFile = 'storage/logs/laravel.log';
if (!file_exists($logFile)) {
    echo "Log file not found.\n";
    exit;
}

$lines = file($logFile);
$count = count($lines);
$foundIndex = -1;

// Read backwards to find the last error
for ($i = $count - 1; $i >= 0; $i--) {
    if (strpos($lines[$i], 'local.ERROR') !== false) {
        $foundIndex = $i;
        break;
    }
}

if ($foundIndex !== -1) {
    // Print the error line and the next 20 lines
    for ($j = $foundIndex; $j < min($foundIndex + 20, $count); $j++) {
        echo $lines[$j];
    }
} else {
    echo "No local.ERROR found.\n";
}
