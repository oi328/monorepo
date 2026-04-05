<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

use App\Traits\ChecksNotificationSettings;

class InvoiceCreated extends Notification
{
    use Queueable, ChecksNotificationSettings;

    public $invoice;
    public $creatorName;

    public function __construct($invoice, $creatorName = 'System')
    {
        $this->invoice = $invoice;
        $this->creatorName = $creatorName;
    }

    public function via(object $notifiable): array
    {
        return $this->determineChannels($notifiable, ['database']);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'invoice_id' => $this->invoice->id,
            'invoice_number' => $this->invoice->invoice_number ?? $this->invoice->id,
            'amount' => $this->invoice->amount,
            'created_by' => $this->creatorName,
            'message' => "New invoice created: #{$this->invoice->invoice_number} for {$this->invoice->amount}",
            'link' => "/sales/invoices?invoice_id={$this->invoice->id}"
        ];
    }
}
