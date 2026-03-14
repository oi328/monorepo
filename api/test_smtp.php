<?php

use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$to = 'eltramsyibrahim@gmail.com'; // Sending to self for testing
$subject = 'Test SMTP from Laravel Script';
$body = '<h1>This is a test email</h1><p>Sent via check script.</p>';

echo "Attempting to send email to $to...\n";

try {
    Mail::send([], [], function ($message) use ($to, $subject, $body) {
        $message->to($to)
            ->subject($subject)
            ->from(config('mail.from.address'), config('mail.from.name'))
            ->html($body);
    });
    
    echo "Mail::send completed successfully.\n";
} catch (\Exception $e) {
    echo "Mail::send failed with error:\n";
    echo $e->getMessage() . "\n";
}
