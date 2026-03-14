<?php

namespace App\Console\Commands;

use App\Models\MetaConnection;
use App\Services\MetaAuthService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class RefreshMetaTokens extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'meta:refresh-tokens';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Refresh Meta Long-Lived User Access Tokens before they expire';

    /**
     * Execute the console command.
     */
    public function handle(MetaAuthService $authService)
    {
        // Refresh tokens that expire within the next 7 days
        $expiringSoon = MetaConnection::whereNotNull('expires_at')
            ->where('expires_at', '<=', now()->addDays(7))
            ->get();

        $this->info("Found " . $expiringSoon->count() . " tokens expiring soon.");

        foreach ($expiringSoon as $connection) {
            $this->info("Refreshing token for connection: {$connection->id} (Tenant: {$connection->tenant_id})");
            try {
                $result = $authService->refreshToken($connection);
                if ($result) {
                    $this->info("Token refreshed successfully.");
                } else {
                    $this->error("Failed to refresh token.");
                }
            } catch (\Exception $e) {
                Log::error("Command error refreshing token for connection {$connection->id}: " . $e->getMessage());
                $this->error("Error: " . $e->getMessage());
            }
        }
        
        return 0;
    }
}
